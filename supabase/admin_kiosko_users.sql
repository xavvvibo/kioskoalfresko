create extension if not exists pgcrypto;

create table if not exists public.admin_users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  username text not null unique,
  display_name text not null,
  role text not null check (role in ('owner', 'employee')),
  status text not null default 'active' check (status in ('active', 'disabled')),
  password_hash text,
  pin_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_login_at timestamptz,
  created_by uuid references public.admin_users(id) on delete set null,
  disabled_at timestamptz
);

create table if not exists public.admin_user_permissions (
  user_id uuid not null references public.admin_users(id) on delete cascade,
  permission text not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, permission)
);

create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references public.admin_users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists admin_users_role_status_idx on public.admin_users(role, status);
create index if not exists admin_audit_log_actor_created_idx on public.admin_audit_log(actor_user_id, created_at desc);
create index if not exists admin_audit_log_action_created_idx on public.admin_audit_log(action, created_at desc);

create or replace function public.set_admin_kiosko_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists admin_users_set_updated_at on public.admin_users;
create trigger admin_users_set_updated_at
before update on public.admin_users
for each row execute function public.set_admin_kiosko_updated_at();

drop trigger if exists admin_user_permissions_set_updated_at on public.admin_user_permissions;
create trigger admin_user_permissions_set_updated_at
before update on public.admin_user_permissions
for each row execute function public.set_admin_kiosko_updated_at();

alter table public.admin_users enable row level security;
alter table public.admin_user_permissions enable row level security;
alter table public.admin_audit_log enable row level security;

grant all on public.admin_users to service_role;
grant all on public.admin_user_permissions to service_role;
grant all on public.admin_audit_log to service_role;

drop policy if exists "admin_users_service_role_all" on public.admin_users;
create policy "admin_users_service_role_all"
  on public.admin_users
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists "admin_user_permissions_service_role_all" on public.admin_user_permissions;
create policy "admin_user_permissions_service_role_all"
  on public.admin_user_permissions
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists "admin_audit_log_service_role_all" on public.admin_audit_log;
create policy "admin_audit_log_service_role_all"
  on public.admin_audit_log
  for all
  to service_role
  using (true)
  with check (true);

-- Owner inicial:
-- 1. Entra temporalmente con ADMIN_KIOSKO_PASSWORD.
-- 2. Abre /admin-kiosko/usuarios y crea el owner real con contraseña temporal.
-- 3. Desactiva la contraseña global cuando todos los accesos sean nominales.
--
-- Alternativa SQL idempotente: genera un hash scrypt fuera del repo con el mismo
-- algoritmo de lib/admin-kiosko/auth.ts y sustituye el placeholder antes de ejecutar.
--
-- insert into public.admin_users (username, email, display_name, role, status, password_hash)
-- values ('xavi', null, 'F. Javier Bocanegra Sanjuan', 'owner', 'active', 'scrypt:REEMPLAZAR_SALT:REEMPLAZAR_HASH')
-- on conflict (username) do update
-- set role = 'owner',
--     status = 'active',
--     display_name = excluded.display_name,
--     password_hash = excluded.password_hash,
--     disabled_at = null;
