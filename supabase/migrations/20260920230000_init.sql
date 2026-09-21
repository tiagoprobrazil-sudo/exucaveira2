-- Fundação do projeto: perfis + papéis (modelador/produtor/cliente).
-- Um usuário pode acumular mais de um papel — por isso a associação vive
-- numa tabela de junção (user_roles), nunca num campo único em auth.users
-- ou profiles.

create table public.roles (
  id smallint generated always as identity primary key,
  slug text not null unique check (slug ~ '^[a-z][a-z0-9_]*$'),
  name text not null
);

insert into public.roles (slug, name) values
  ('modelador', 'Modelador'),
  ('produtor', 'Produtor'),
  ('cliente', 'Cliente');

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_roles (
  user_id uuid not null references auth.users (id) on delete cascade,
  role_id smallint not null references public.roles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, role_id)
);

create index user_roles_user_id_idx on public.user_roles (user_id);

-- updated_at automático em profiles
create function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row
  execute function public.set_updated_at();

-- Criação automática de profile (+ papel inicial, se informado e válido)
-- quando um usuário se cadastra via Supabase Auth. Roda como o dono da
-- função (security definer), então não depende de RLS nem de o cliente
-- ter permissão de INSERT em profiles — o client nunca insere profile
-- diretamente, só lê/atualiza o próprio.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role_id smallint;
  v_perfil text;
begin
  insert into public.profiles (user_id, display_name)
  values (new.id, new.raw_user_meta_data ->> 'display_name');

  v_perfil := new.raw_user_meta_data ->> 'perfil_inicial';
  if v_perfil is not null then
    select id into v_role_id from public.roles where slug = v_perfil;
    if v_role_id is not null then
      insert into public.user_roles (user_id, role_id) values (new.id, v_role_id)
      on conflict do nothing;
    end if;
  end if;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- RLS ------------------------------------------------------------------

alter table public.roles enable row level security;
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;

-- roles: catálogo público de leitura (front precisa exibir nomes/slugs)
create policy "roles são visíveis para todos"
  on public.roles for select
  using (true);

-- profiles: cada usuário só enxerga e altera o próprio
create policy "usuário lê o próprio perfil"
  on public.profiles for select
  using (auth.uid() = user_id);

create policy "usuário atualiza o próprio perfil"
  on public.profiles for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Sem policy de INSERT/DELETE em profiles para usuários comuns: a linha
-- é criada só pelo trigger (security definer) e não deve ser apagada pelo
-- próprio usuário nesta etapa.

-- user_roles: cada usuário só enxerga os próprios papéis, e pode se
-- autoatribuir um papel adicional no futuro (a FK garante que só role_id
-- existentes — modelador/produtor/cliente — podem ser inseridos).
create policy "usuário lê os próprios papéis"
  on public.user_roles for select
  using (auth.uid() = user_id);

create policy "usuário pode se autoatribuir um papel"
  on public.user_roles for insert
  with check (auth.uid() = user_id);

create policy "usuário pode remover um papel próprio"
  on public.user_roles for delete
  using (auth.uid() = user_id);
