# Plataforma 3D (nome temporário) — exucaveira-ww2

Fundação técnica de um futuro marketplace de modelos 3D e fabricação de
peças físicas, conectando **modeladores**, **produtores** e **clientes**.
Projeto novo e independente do site atual em `D:\WEB\ArtBit\Sagrado` — o
plano é publicá-lo em `www.exucaveira.com.br/ww2` sem alterar nada do site
existente.

Nesta etapa só existe a fundação: home com a escolha de perfil, cadastro
via Supabase Auth, login, e uma página `/conta` simples. Nenhuma feature de
marketplace (pagamentos, upload de STL, loja, etc.) foi implementada — ver
"O que falta" no fim deste arquivo.

## Stack

- Astro 7 (SSR, `output: 'server'`) + adapter `@astrojs/cloudflare`
- React 19 só nos dois formulários interativos (cadastro/login) — o resto
  do site é HTML estático renderizado no servidor, sem hidratação.
- TypeScript estrito, Zod para validação
- Supabase (Postgres + Auth) via `@supabase/ssr` (cookies, sessão válida em
  SSR) e `@supabase/supabase-js`
- Cloudflare R2 preparado, mas **não implementado** neste MVP
  (`src/lib/storage/r2.ts` documenta onde entrará)

## Supabase

Projeto real já criado e em uso: **exucaveira**, região São Paulo (`sa-east-1`),
ref `lehsmhnrvxfhhiedkkcl`, organização Supabase própria (conta nova, separada
da conta usada nos outros projetos do portfólio).

A migration `supabase/migrations/20260920230000_init.sql` já foi aplicada
(`supabase db push`) e testada de ponta a ponta: cadastro real via
`supabase.auth.signUp()` cria a linha em `profiles` e associa o papel
inicial em `user_roles` automaticamente (trigger `handle_new_user`, roda
mesmo com confirmação de e-mail pendente).

Resumo do schema:

- `roles` — catálogo fixo: `modelador`, `produtor`, `cliente`.
- `profiles` — um por usuário (`user_id` único), criado pelo trigger.
- `user_roles` — junção `user_id` × `role_id`. **Um usuário pode ter mais
  de um papel** — nunca modelar como campo único.
- RLS habilitado em tudo: cada usuário só lê/altera os próprios
  `profiles`/`user_roles`; `roles` é de leitura pública.

**Nota sobre tokens de acesso da CLI:** essa conta Supabase é nova e, por
padrão, veio com "scoped access tokens" (restritos a um projeto) — esse
tipo de token dá erro de permissão até em `supabase projects list`/`link`.
O que funcionou foi gerar um "legacy token" (link **"Create legacy token"**
na tela de gerar token, com acesso à conta toda) em
`supabase.com/dashboard/account/tokens`.

## Variáveis de ambiente

Ver `.env.example`. Nenhum valor real está commitado (`.env` e `.dev.vars`
estão no `.gitignore`, mas existem localmente com as credenciais reais do
projeto **exucaveira** para desenvolvimento).

| Variável | Onde é usada | Pode ir no client? |
|---|---|---|
| `SUPABASE_URL` / `SUPABASE_ANON_KEY` | SSR (middleware, páginas) via `cloudflare:workers` env | Não (mas não é secreta) |
| `SUPABASE_SERVICE_ROLE_KEY` | Só endpoints server-side que precisem ignorar RLS (nenhum ainda) | **Nunca** |
| `PUBLIC_SUPABASE_URL` / `PUBLIC_SUPABASE_ANON_KEY` | Componentes React (cadastro/login chamam `supabase.auth` direto do navegador) | Sim (são as públicas) |

## Rodando local

```bash
npm install
npm run build
npx wrangler dev --local   # roda o Worker de verdade a partir de dist/
```

`npm run dev` (Vite puro) também funciona para iterar na UI, mas não passa
pelo adapter Cloudflare — para validar middleware/sessão, use `wrangler dev`.

## Testado e funcionando (2026-09-20)

- `npx astro check` — 0 erros.
- `npm run build` — build limpo.
- Via `wrangler dev --local`: `/`, `/cadastro?perfil=modelador`, `/entrar`
  respondem 200; `/conta` sem sessão redireciona 302 para `/entrar`.
- Cadastro real testado no navegador: `supabase.auth.signUp()` funcionou,
  o trigger criou `profiles` + `user_roles` corretamente (conferido direto
  via REST API com a service role). Usuário de teste removido depois.

## O que falta para colocar no ar

1. **Criar o Worker no Cloudflare** (Workers Builds conectado a um repo
   GitHub, como os outros projetos do portfólio). As env vars não-secretas
   (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `PUBLIC_SUPABASE_URL`,
   `PUBLIC_SUPABASE_ANON_KEY`) já estão em `wrangler.jsonc` (bloco `vars`)
   — só falta `SUPABASE_SERVICE_ROLE_KEY` como secret no painel do Worker
   depois que ele existir.
   - **KV namespace de sessão pendente**: o adapter `@astrojs/cloudflare`
     injeta automaticamente um binding `SESSION` (`kv_namespaces` no
     `wrangler.jsonc` gerado em `dist/server/wrangler.json`), mas sem um
     `id` real de namespace ele não faz deploy em produção. Precisa criar
     um KV namespace no painel Cloudflare (Workers & Pages → KV → Create)
     e adicionar em `wrangler.jsonc`:
     ```jsonc
     "kv_namespaces": [{ "binding": "SESSION", "id": "<id do namespace>" }]
     ```
2. **Decidido (2026-09-23): subdomínio `ww2.exucaveira.com.br`**, não
   `/ww2` como path — o domínio raiz não está na Cloudflare e o Tiago
   preferiu não migrar as nameservers (evita risco em MX/e-mail e no site
   atual). Caminho técnico: delegar só o subdomínio via registro **NS** no
   provedor DNS atual do domínio, apontando pras nameservers que a
   Cloudflare atribuir a uma zona nova "ww2.exucaveira.com.br" — os
   registros do domínio raiz (A, MX, etc.) não são tocados. Ver passo a
   passo em "Deploy — passo a passo" abaixo.
3. Confirmar se a confirmação de e-mail deve continuar ativada no projeto
   Supabase (hoje está — `CadastroForm` já trata os dois casos, com ou
   sem confirmação).

## Deploy — passo a passo (partes que só dá pra fazer logado nas contas)

Nada disso o Claude consegue fazer sozinho neste ambiente — `gh` e
`wrangler` não estão autenticados aqui, e criar repositório/zona DNS exige
login nas contas reais do Tiago.

1. **Criar o repositório no GitHub** (github.com/new, ex: `exucaveira-ww2`,
   privado ou público, sem README/gitignore — o projeto já tem os dele):
   ```bash
   git remote add origin https://github.com/<seu-usuario>/exucaveira-ww2.git
   git push -u origin master
   ```
2. **Cloudflare → Workers & Pages → Create application → Import a Git
   repository** → conectar o repo `exucaveira-ww2` recém-criado. Build
   command `npm run build`, output do adapter já é gerenciado pelo
   `wrangler.jsonc` do próprio repo (Workers Builds lê esse arquivo
   automaticamente).
3. **Criar o KV namespace de sessão**: Workers & Pages → KV → Create a
   namespace (ex: `exucaveira-ww2-sessions`) → copiar o `id` gerado →
   editar `wrangler.jsonc` local adicionando:
   ```jsonc
   "kv_namespaces": [{ "binding": "SESSION", "id": "<id copiado>" }]
   ```
   → commit + push (Workers Builds reimplanta automaticamente a cada push).
4. **Configurar o secret**: no Worker recém-criado → Settings → Variables
   and Secrets → adicionar `SUPABASE_SERVICE_ROLE_KEY` como **Secret**
   (nunca como var normal, nunca no `wrangler.jsonc`) com o valor que está
   em `.dev.vars` local.
5. **Subdomínio `ww2.exucaveira.com.br`** (decisão de 2026-09-23 — sem
   mexer no domínio raiz nem no e-mail):
   - Cloudflare → Add a Site → digitar `ww2.exucaveira.com.br` (a
     Cloudflare trata isso como uma zona própria, separada do domínio
     raiz).
   - A Cloudflare vai dar 2 nameservers pra essa zona nova.
   - No provedor DNS atual do domínio (onde `exucaveira.com.br` está
     hospedado hoje — Registro.br ou o painel do próprio host cPanel),
     criar um registro **NS** para o host `ww2` apontando pras 2
     nameservers da Cloudflare. Isso delega só o `ww2`, sem tocar em A/MX/
     outros registros do domínio raiz.
   - Depois que a zona `ww2.exucaveira.com.br` estiver ativa na
     Cloudflare, ir no Worker → Settings → Domains & Routes → Add Custom
     Domain → `ww2.exucaveira.com.br`.
6. Testar `ww2.exucaveira.com.br` no ar antes de divulgar (propagação de
   NS pode levar de minutos a algumas horas).

## O que foi propositalmente deixado de fora (ver escopo original)

Marketplace, pagamentos, upload de STL/3MF, loja do produtor, avaliações,
disputas, chat, painel administrativo — nada disso existe ainda. A
arquitetura (papéis múltiplos, R2 documentado, RLS) foi pensada para não
atrapalhar quando essas features forem adicionadas.
