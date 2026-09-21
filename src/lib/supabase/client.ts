import { createBrowserClient } from '@supabase/ssr';

// Cliente para uso em componentes React hidratados no navegador (ex.:
// formulário de cadastro/login). Usa as chaves públicas, expostas via
// PUBLIC_* (baked no build pelo Vite) — nunca a service role aqui.
export function createBrowserSupabaseClient() {
  const url = import.meta.env.PUBLIC_SUPABASE_URL;
  const anonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error('Supabase não configurado (PUBLIC_SUPABASE_URL / PUBLIC_SUPABASE_ANON_KEY ausentes).');
  }
  return createBrowserClient(url, anonKey);
}
