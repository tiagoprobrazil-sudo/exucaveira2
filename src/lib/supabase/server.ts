import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { env } from 'cloudflare:workers';
import type { AstroCookies } from 'astro';

export const supabaseConfigured = () => Boolean(env.SUPABASE_URL && env.SUPABASE_ANON_KEY);

// Cliente autenticado como o visitante da requisição (RLS aplicado pelo
// próprio Postgres a partir do JWT nos cookies) — usar em toda leitura/
// escrita feita "em nome do usuário" durante SSR (middleware, páginas,
// endpoints de página).
export function createSessionClient(cookies: AstroCookies, secure: boolean, cookieHeader: string) {
  if (!supabaseConfigured()) return null;
  return createServerClient(env.SUPABASE_URL!, env.SUPABASE_ANON_KEY!, {
    cookieOptions: { httpOnly: true, secure, sameSite: 'lax', path: '/' },
    cookies: {
      getAll: () =>
        cookieHeader
          .split(';')
          .map((part) => part.trim())
          .filter(Boolean)
          .map((part) => {
            const idx = part.indexOf('=');
            return { name: decodeURIComponent(part.slice(0, idx)), value: decodeURIComponent(part.slice(idx + 1)) };
          }),
      setAll: (values) => values.forEach(({ name, value, options }) => cookies.set(name, value, options)),
    },
  });
}

// Cliente com a service role — SOMENTE em endpoints server-side que
// precisem ignorar RLS de propósito (ex.: tarefas administrativas
// futuras). Nunca importar isto em código que roda no navegador.
export function createServiceClient() {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) return null;
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
