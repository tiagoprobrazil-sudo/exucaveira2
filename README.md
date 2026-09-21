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
   GitHub, como os outros projetos do portfólio) e configurar as env vars
   lá (as não-secretas podem ir direto no `wrangler.jsonc`, como no
   projeto Tee Aqua — evita que se percam em edições manuais no painel).
2. **Decidir como `www.exucaveira.com.br/ww2` vai apontar pro Worker** —
   o domínio hoje **não está atrás da Cloudflare** (é hospedagem
   cPanel/LiteSpeed direta, mesma do site atual), diferente do Tampinha
   Legal. Isso precisa de uma decisão consciente antes do deploy final:
   mover o domínio inteiro para a Cloudflare tem impacto em e-mail e
   outros registros DNS existentes.
3. Confirmar se a confirmação de e-mail deve continuar ativada no projeto
   Supabase (hoje está — `CadastroForm` já trata os dois casos, com ou
   sem confirmação).

## O que foi propositalmente deixado de fora (ver escopo original)

Marketplace, pagamentos, upload de STL/3MF, loja do produtor, avaliações,
disputas, chat, painel administrativo — nada disso existe ainda. A
arquitetura (papéis múltiplos, R2 documentado, RLS) foi pensada para não
atrapalhar quando essas features forem adicionadas.
