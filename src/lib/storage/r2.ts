// Integração com Cloudflare R2 — estrutura preparada, NÃO implementada
// neste MVP (não há upload de arquivos 3D ainda, ver seção 12 do escopo).
//
// Quando o upload de STL/3MF entrar em cena, este arquivo deve concentrar:
//
// - upload(bucket, key, file)          — grava o objeto no bucket privado
// - getSignedDownloadUrl(bucket, key)  — gera URL temporária/assinada de
//                                         download (nunca uma URL pública
//                                         permanente para arquivo 3D privado)
// - remove(bucket, key)                — exclui o objeto
// - metadata: tamanho, content-type, checksum etc. ficam no Postgres
//   (Supabase), nunca no R2 — o bucket guarda só o binário.
//
// O binding do bucket é injetado pelo Cloudflare Worker em runtime
// (`env.MODELOS_3D_BUCKET`, ver wrangler.jsonc) — configurar lá quando o
// bucket for criado. Nenhuma credencial de R2 deve chegar ao navegador;
// toda operação de storage roda em endpoints server-side (Astro API
// routes), nunca em componentes React do cliente.

export {};
