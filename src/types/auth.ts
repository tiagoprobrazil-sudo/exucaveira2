// Papéis disponíveis nesta etapa do projeto. Um usuário pode acumular
// mais de um — nunca modelar como um campo único "tipo de conta".
export const ROLE_SLUGS = ['modelador', 'produtor', 'cliente'] as const;
export type RoleSlug = (typeof ROLE_SLUGS)[number];

export function isRoleSlug(value: unknown): value is RoleSlug {
  return typeof value === 'string' && (ROLE_SLUGS as readonly string[]).includes(value);
}

export interface Profile {
  id: string;
  user_id: string;
  display_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface RoleRow {
  id: number;
  slug: RoleSlug;
  name: string;
}
