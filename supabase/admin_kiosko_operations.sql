create extension if not exists pgcrypto;

create table if not exists public.admin_inventory_products (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  name text not null,
  category text,
  usual_supplier text,
  unit text,
  current_stock numeric default 0,
  minimum_stock numeric default 0,
  recommended_stock numeric default 0,
  average_purchase_price numeric default 0,
  last_purchase_price numeric default 0,
  location text,
  current_batch text,
  expiry_date date,
  last_entry_date date,
  last_exit_date date,
  observations text,
  active boolean default true
);

alter table if exists public.admin_inventory_products
  add column if not exists recommended_stock numeric default 0,
  add column if not exists average_purchase_price numeric default 0,
  add column if not exists last_purchase_price numeric default 0;

alter table if exists public.admin_inventory_products
  alter column recommended_stock set default 0,
  alter column average_purchase_price set default 0,
  alter column last_purchase_price set default 0;

create table if not exists public.admin_inventory_movements (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  product_id uuid references public.admin_inventory_products(id) on delete set null,
  movement_type text not null,
  quantity numeric,
  unit text,
  purchase_price numeric,
  supplier text,
  batch_number text,
  expiry_date date,
  source_document_id uuid references public.admin_supplier_documents(id) on delete set null,
  observations text,
  source text default 'admin-kiosko'
);

alter table if exists public.admin_inventory_movements
  add column if not exists purchase_price numeric;

create table if not exists public.admin_ai_learning_memory (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  memory_type text not null,
  original_value text not null,
  corrected_value text not null,
  supplier_name text,
  supplier_tax_id text,
  product_category text,
  product_family text,
  conservation_type text,
  usage_count int default 1,
  source text default 'admin-kiosko-ai'
);

create table if not exists public.admin_label_records (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  model text not null,
  product text,
  batch text,
  supplier text,
  elaboration_date date,
  opening_date date,
  freezing_date date,
  defrosting_date date,
  best_before_date date,
  responsible text,
  print_format text default 'a4',
  copies int default 8,
  qr_payload text,
  source text default 'admin-kiosko'
);

alter table if exists public.admin_label_records
  add column if not exists supplier text;

alter table if exists public.admin_supplier_records
  add column if not exists contact text,
  add column if not exists responsible_person text,
  add column if not exists schedule text,
  add column if not exists usual_products text,
  add column if not exists health_register text,
  add column if not exists appcc text,
  add column if not exists invoices text,
  add column if not exists delivery_notes text,
  add column if not exists ocr_documents text,
  add column if not exists receptions text,
  add column if not exists incidents text,
  add column if not exists reception_temperatures text,
  add column if not exists ai_history text;

alter table public.admin_inventory_products enable row level security;
alter table public.admin_inventory_movements enable row level security;
alter table public.admin_ai_learning_memory enable row level security;
alter table public.admin_label_records enable row level security;

revoke all on public.admin_inventory_products from anon, authenticated;
revoke all on public.admin_inventory_movements from anon, authenticated;
revoke all on public.admin_ai_learning_memory from anon, authenticated;
revoke all on public.admin_label_records from anon, authenticated;

grant all on public.admin_inventory_products to service_role;
grant all on public.admin_inventory_movements to service_role;
grant all on public.admin_ai_learning_memory to service_role;
grant all on public.admin_label_records to service_role;

drop policy if exists "admin_inventory_products_service_role_all" on public.admin_inventory_products;
create policy "admin_inventory_products_service_role_all"
  on public.admin_inventory_products
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists "admin_inventory_movements_service_role_all" on public.admin_inventory_movements;
create policy "admin_inventory_movements_service_role_all"
  on public.admin_inventory_movements
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists "admin_ai_learning_memory_service_role_all" on public.admin_ai_learning_memory;
create policy "admin_ai_learning_memory_service_role_all"
  on public.admin_ai_learning_memory
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists "admin_label_records_service_role_all" on public.admin_label_records;
create policy "admin_label_records_service_role_all"
  on public.admin_label_records
  for all
  to service_role
  using (true)
  with check (true);

create unique index if not exists admin_inventory_products_name_unique_idx on public.admin_inventory_products (lower(name));
create index if not exists admin_inventory_products_created_at_idx on public.admin_inventory_products (created_at desc);
create index if not exists admin_inventory_products_expiry_idx on public.admin_inventory_products (expiry_date);
create index if not exists admin_inventory_products_active_idx on public.admin_inventory_products (active);
create index if not exists admin_inventory_products_stock_idx on public.admin_inventory_products (current_stock, minimum_stock);
create index if not exists admin_inventory_products_recommended_stock_idx on public.admin_inventory_products (recommended_stock);
create index if not exists admin_inventory_products_purchase_price_idx on public.admin_inventory_products (average_purchase_price);
create index if not exists admin_inventory_products_batch_idx on public.admin_inventory_products (lower(current_batch));
create index if not exists admin_inventory_movements_created_at_idx on public.admin_inventory_movements (created_at desc);
create index if not exists admin_inventory_movements_product_idx on public.admin_inventory_movements (product_id);
create index if not exists admin_inventory_movements_batch_idx on public.admin_inventory_movements (lower(batch_number));
create index if not exists admin_inventory_movements_type_idx on public.admin_inventory_movements (movement_type);
create index if not exists admin_ai_learning_memory_created_at_idx on public.admin_ai_learning_memory (created_at desc);
create index if not exists admin_ai_learning_memory_lookup_idx on public.admin_ai_learning_memory (memory_type, lower(original_value));
create index if not exists admin_label_records_created_at_idx on public.admin_label_records (created_at desc);
create index if not exists admin_label_records_batch_idx on public.admin_label_records (lower(batch));
create index if not exists admin_label_records_supplier_idx on public.admin_label_records (lower(supplier));

comment on table public.admin_inventory_products is 'Productos de inventario APPCC con stock operativo, lote actual y caducidad.';
comment on table public.admin_inventory_movements is 'Histórico de entradas, consumos, mermas, regularizaciones y bajas de inventario APPCC.';
comment on table public.admin_ai_learning_memory is 'Memoria de normalización para correcciones OCR APPCC.';
comment on table public.admin_label_records is 'Historial de etiquetas APPCC generadas para reimpresión.';
comment on column public.admin_inventory_movements.source_document_id is 'Documento OCR de proveedor que origina el movimiento cuando procede.';
comment on column public.admin_inventory_products.recommended_stock is 'Stock recomendado para reposición operativa.';
comment on column public.admin_inventory_products.average_purchase_price is 'Precio medio de compra calculado desde entradas registradas.';
comment on column public.admin_inventory_products.last_purchase_price is 'Último precio de compra registrado.';
comment on column public.admin_inventory_movements.purchase_price is 'Precio de compra asociado al movimiento cuando procede.';
