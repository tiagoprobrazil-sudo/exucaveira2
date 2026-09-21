import type { SupabaseClient } from '@supabase/supabase-js';
import type { Profile, RoleRow } from '../../types/auth';

export interface AccountData {
  profile: Profile | null;
  roles: RoleRow[];
}

// Busca perfil + papéis do usuário logado. RLS garante que só é possível
// ler as próprias linhas (ver supabase/migrations).
export async function getAccountData(supabase: SupabaseClient, userId: string): Promise<AccountData> {
  const [{ data: profile }, { data: roleRows }] = await Promise.all([
    supabase.from('profiles').select('*').eq('user_id', userId).maybeSingle(),
    supabase.from('user_roles').select('roles(id, slug, name)').eq('user_id', userId),
  ]);

  const roles = (roleRows ?? [])
    .map((row) => (row as unknown as { roles: RoleRow | null }).roles)
    .filter((role): role is RoleRow => role !== null);

  return { profile: (profile as Profile | null) ?? null, roles };
}
