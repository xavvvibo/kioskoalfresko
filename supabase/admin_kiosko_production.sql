create extension if not exists pgcrypto;

create table if not exists public.admin_production_batches (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  production_date date not null,
  production_time time,
  responsible text,
  batch_code text unique,
  source_supplier text,
  source_product text,
  source_batch_number text,
  input_quantity numeric,
  input_unit text,
  output_product text,
  output_quantity numeric,
  output_unit text,
  unit_weight numeric,
  storage_state text,
  expiry_date date,
  observations text,
  source_document_id uuid,
  source text default 'admin-kiosko-production'
);

create table if not exists public.admin_production_movements (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  batch_id uuid references public.admin_production_batches(id) on delete cascade,
  movement_date date not null,
  movement_time time,
  movement_type text,
  quantity numeric,
  unit text,
  from_state text,
  to_state text,
  reason text,
  responsible text,
  observations text
);

create table if not exists public.admin_internal_recipes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  recipe_name text not null,
  output_product text not null,
  expected_yield numeric,
  output_unit text,
  unit_weight numeric,
  instructions text,
  active boolean default true
);

create table if not exists public.admin_internal_recipe_inputs (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid references public.admin_internal_recipes(id) on delete cascade,
  input_product text not null,
  quantity numeric,
  unit text
);

alter table if exists public.admin_production_batches
  add column if not exists production_time time,
  add column if not exists responsible text,
  add column if not exists batch_code text unique,
  add column if not exists source_supplier text,
  add column if not exists source_product text,
  add column if not exists source_batch_number text,
  add column if not exists input_quantity numeric,
  add column if not exists input_unit text,
  add column if not exists output_product text,
  add column if not exists output_quantity numeric,
  add column if not exists output_unit text,
  add column if not exists unit_weight numeric,
  add column if not exists storage_state text,
  add column if not exists expiry_date date,
  add column if not exists observations text,
  add column if not exists source_document_id uuid,
  add column if not exists source text default 'admin-kiosko-production';

alter table if exists public.admin_production_movements
  add column if not exists batch_id uuid references public.admin_production_batches(id) on delete cascade,
  add column if not exists movement_time time,
  add column if not exists movement_type text,
  add column if not exists quantity numeric,
  add column if not exists unit text,
  add column if not exists from_state text,
  add column if not exists to_state text,
  add column if not exists reason text,
  add column if not exists responsible text,
  add column if not exists observations text;

alter table if exists public.admin_internal_recipes
  add column if not exists output_product text,
  add column if not exists expected_yield numeric,
  add column if not exists output_unit text,
  add column if not exists unit_weight numeric,
  add column if not exists instructions text,
  add column if not exists active boolean default true;

alter table if exists public.admin_internal_recipe_inputs
  add column if not exists recipe_id uuid references public.admin_internal_recipes(id) on delete cascade,
  add column if not exists input_product text,
  add column if not exists quantity numeric,
  add column if not exists unit text;

alter table public.admin_production_batches enable row level security;
alter table public.admin_production_movements enable row level security;
alter table public.admin_internal_recipes enable row level security;
alter table public.admin_internal_recipe_inputs enable row level security;

revoke all on public.admin_production_batches from anon, authenticated;
revoke all on public.admin_production_movements from anon, authenticated;
revoke all on public.admin_internal_recipes from anon, authenticated;
revoke all on public.admin_internal_recipe_inputs from anon, authenticated;

grant all on public.admin_production_batches to service_role;
grant all on public.admin_production_movements to service_role;
grant all on public.admin_internal_recipes to service_role;
grant all on public.admin_internal_recipe_inputs to service_role;

drop policy if exists "admin_production_batches_service_role_all" on public.admin_production_batches;
create policy "admin_production_batches_service_role_all"
  on public.admin_production_batches
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists "admin_production_movements_service_role_all" on public.admin_production_movements;
create policy "admin_production_movements_service_role_all"
  on public.admin_production_movements
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists "admin_internal_recipes_service_role_all" on public.admin_internal_recipes;
create policy "admin_internal_recipes_service_role_all"
  on public.admin_internal_recipes
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists "admin_internal_recipe_inputs_service_role_all" on public.admin_internal_recipe_inputs;
create policy "admin_internal_recipe_inputs_service_role_all"
  on public.admin_internal_recipe_inputs
  for all
  to service_role
  using (true)
  with check (true);

create index if not exists admin_production_batches_date_idx on public.admin_production_batches (production_date desc);
create index if not exists admin_production_batches_code_idx on public.admin_production_batches (batch_code);
create index if not exists admin_production_batches_supplier_idx on public.admin_production_batches (lower(source_supplier));
create index if not exists admin_production_batches_output_idx on public.admin_production_batches (lower(output_product));
create index if not exists admin_production_batches_expiry_idx on public.admin_production_batches (expiry_date);
create index if not exists admin_production_movements_date_idx on public.admin_production_movements (movement_date desc);
create index if not exists admin_production_movements_batch_idx on public.admin_production_movements (batch_id);
create index if not exists admin_internal_recipes_name_idx on public.admin_internal_recipes (lower(recipe_name));
create index if not exists admin_internal_recipe_inputs_recipe_idx on public.admin_internal_recipe_inputs (recipe_id);

comment on table public.admin_production_batches is 'Lotes internos de producción APPCC para elaboraciones, congelación, descongelación y salidas internas.';
comment on table public.admin_production_movements is 'Movimientos trazables de lotes internos de producción APPCC.';
comment on table public.admin_internal_recipes is 'Recetas base de producción interna APPCC.';
comment on table public.admin_internal_recipe_inputs is 'Materias primas asociadas a recetas internas APPCC.';
