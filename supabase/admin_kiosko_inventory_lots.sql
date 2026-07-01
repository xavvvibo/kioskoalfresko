create extension if not exists pgcrypto;

create table if not exists public.admin_inventory_lots (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  product_id uuid references public.admin_inventory_products(id) on delete cascade,
  product_name text,
  supplier_id uuid null,
  supplier_name text,
  supplier_document_id uuid null,
  uploaded_document_id uuid null,
  batch_number text,
  expiry_date date,
  received_date date,
  initial_quantity numeric default 0,
  current_quantity numeric default 0,
  unit text,
  location text,
  purchase_price numeric,
  average_unit_cost numeric,
  status text default 'activo',
  observations text,
  source text default 'admin-kiosko'
);

create table if not exists public.admin_inventory_lot_movements (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  lot_id uuid references public.admin_inventory_lots(id) on delete cascade,
  product_id uuid references public.admin_inventory_products(id) on delete set null,
  movement_type text,
  movement_date date,
  movement_time time,
  quantity numeric,
  unit text,
  from_location text,
  to_location text,
  reason text,
  responsible text,
  related_record_type text,
  related_record_id uuid,
  observations text
);

alter table if exists public.admin_inventory_lots
  add column if not exists updated_at timestamptz default now(),
  add column if not exists product_name text,
  add column if not exists supplier_id uuid null,
  add column if not exists supplier_name text,
  add column if not exists supplier_document_id uuid null,
  add column if not exists uploaded_document_id uuid null,
  add column if not exists batch_number text,
  add column if not exists expiry_date date,
  add column if not exists received_date date,
  add column if not exists initial_quantity numeric default 0,
  add column if not exists current_quantity numeric default 0,
  add column if not exists unit text,
  add column if not exists location text,
  add column if not exists purchase_price numeric,
  add column if not exists average_unit_cost numeric,
  add column if not exists status text default 'activo',
  add column if not exists observations text,
  add column if not exists source text default 'admin-kiosko';

alter table if exists public.admin_inventory_lot_movements
  add column if not exists lot_id uuid references public.admin_inventory_lots(id) on delete cascade,
  add column if not exists product_id uuid references public.admin_inventory_products(id) on delete set null,
  add column if not exists movement_type text,
  add column if not exists movement_date date,
  add column if not exists movement_time time,
  add column if not exists quantity numeric,
  add column if not exists unit text,
  add column if not exists from_location text,
  add column if not exists to_location text,
  add column if not exists reason text,
  add column if not exists responsible text,
  add column if not exists related_record_type text,
  add column if not exists related_record_id uuid,
  add column if not exists observations text;

alter table if exists public.admin_inventory_lots enable row level security;
alter table if exists public.admin_inventory_lot_movements enable row level security;

revoke all on public.admin_inventory_lots from anon, authenticated;
revoke all on public.admin_inventory_lot_movements from anon, authenticated;

grant all on public.admin_inventory_lots to service_role;
grant all on public.admin_inventory_lot_movements to service_role;

drop policy if exists "admin_inventory_lots_service_role_all" on public.admin_inventory_lots;
create policy "admin_inventory_lots_service_role_all"
  on public.admin_inventory_lots
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists "admin_inventory_lot_movements_service_role_all" on public.admin_inventory_lot_movements;
create policy "admin_inventory_lot_movements_service_role_all"
  on public.admin_inventory_lot_movements
  for all
  to service_role
  using (true)
  with check (true);

create index if not exists admin_inventory_lots_product_idx on public.admin_inventory_lots (product_id);
create index if not exists admin_inventory_lots_batch_idx on public.admin_inventory_lots (batch_number);
create index if not exists admin_inventory_lots_expiry_idx on public.admin_inventory_lots (expiry_date);
create index if not exists admin_inventory_lots_status_idx on public.admin_inventory_lots (status);
create index if not exists admin_inventory_lots_supplier_idx on public.admin_inventory_lots (lower(supplier_name));
create index if not exists admin_inventory_lot_movements_date_idx on public.admin_inventory_lot_movements (movement_date desc);
create index if not exists admin_inventory_lot_movements_lot_idx on public.admin_inventory_lot_movements (lot_id);
create index if not exists admin_inventory_lot_movements_product_idx on public.admin_inventory_lot_movements (product_id);

comment on table public.admin_inventory_lots is 'Lotes reales de inventario APPCC. Fuente de verdad para caducidad, ubicación, FEFO y stock por lote.';
comment on table public.admin_inventory_lot_movements is 'Movimientos trazables sobre lotes reales de inventario.';
comment on column public.admin_inventory_lots.status is 'Estado esperado: activo, agotado, caducado, bloqueado, regularizado.';
