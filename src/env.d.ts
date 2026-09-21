/// <reference path="../.astro/types.d.ts" />

declare namespace App {
  interface Locals {
    supabase: import('@supabase/supabase-js').SupabaseClient | null;
    user: import('@supabase/supabase-js').User | null;
  }
}

interface Env {
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
}

declare module 'cloudflare:workers' {
  export const env: Env;
}
