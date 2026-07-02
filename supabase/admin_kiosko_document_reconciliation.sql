create extension if not exists pgcrypto;

-- Motor de conciliacion documental de Inbox OCR.
-- Genera propuestas revisables desde admin_uploaded_documents sin tocar stock,
-- contabilidad definitiva, APPCC ni produccion FEFO.

create table if not exists public.admin_document_reconciliations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  uploaded_document_id uuid not null,
  document_type text not null default 'purchase_invoice',
  supplier_name text,
  supplier_tax_id text,
  matched_supplier_id uuid,
  supplier_match_status text not null default 'unmatched',
  supplier_match_confidence numeric default 0,
  document_number text,
  document_date date,
  taxable_base numeric,
  vat_amount numeric,
  total_amount numeric,
  status text not null default 'pending_review',
  line_count integer not null default 0,
  matched_lines integer not null default 0,
  ambiguous_lines integer not null default 0,
  unrecognized_lines integer not null default 0,
  price_alerts integer not null default 0,
  tax_alerts integer not null default 0,
  unit_alerts integer not null default 0,
  warnings text[] not null default '{}'::text[],
  errors text[] not null default '{}'::text[],
  summary text,
  source text not null default 'admin-kiosko-inbox-reconciliation'
);

create table if not exists public.admin_document_reconciliation_lines (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  reconciliation_id uuid not null references public.admin_document_reconciliations(id) on delete cascade,
  uploaded_document_id uuid not null,
  line_index integer not null,
  product_name text,
  quantity numeric,
  unit text,
  unit_price numeric,
  taxable_base numeric,
  vat_rate numeric,
  vat_amount numeric,
  total_amount numeric,
  batch_number text,
  expiry_date date,
  reception_temperature numeric,
  matched_product_id uuid,
  match_status text not null default 'unrecognized',
  match_confidence numeric default 0,
  price_status text not null default 'no_history',
  historical_unit_price numeric,
  price_deviation_percent numeric,
  tax_status text not null default 'not_checked',
  unit_status text not null default 'not_checked',
  warnings text[] not null default '{}'::text[],
  raw_line jsonb not null default '{}'::jsonb
);

create table if not exists public.admin_document_product_matches (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  reconciliation_line_id uuid not null references public.admin_document_reconciliation_lines(id) on delete cascade,
  product_id uuid,
  product_name text,
  confidence numeric not null default 0,
  match_reason text,
  source text not null default 'admin-kiosko-inbox-reconciliation'
);

do $$
begin
  if to_regclass('public.admin_document_reconciliations') is not null then
    alter table public.admin_document_reconciliations
      add column if not exists uploaded_document_id uuid,
      add column if not exists matched_supplier_id uuid,
      add column if not exists supplier_match_status text not null default 'unmatched',
      add column if not exists supplier_match_confidence numeric default 0,
      add column if not exists warnings text[] not null default '{}'::text[],
      add column if not exists errors text[] not null default '{}'::text[];

  end if;

  if to_regclass('public.admin_document_reconciliation_lines') is not null then
    alter table public.admin_document_reconciliation_lines
      add column if not exists uploaded_document_id uuid,
      add column if not exists reception_temperature numeric,
      add column if not exists raw_line jsonb not null default '{}'::jsonb;
  end if;
end $$;

do $$
begin
  if to_regclass('public.admin_uploaded_documents') is not null
     and to_regclass('public.admin_document_reconciliations') is not null then
    alter table public.admin_document_reconciliations
      drop constraint if exists admin_document_reconciliations_uploaded_document_fk;
    alter table public.admin_document_reconciliations
      add constraint admin_document_reconciliations_uploaded_document_fk
      foreign key (uploaded_document_id) references public.admin_uploaded_documents(id) on delete cascade
      not valid;
  end if;

  if to_regclass('public.admin_supplier_records') is not null
     and to_regclass('public.admin_document_reconciliations') is not null then
    alter table public.admin_document_reconciliations
      drop constraint if exists admin_document_reconciliations_supplier_fk;
    alter table public.admin_document_reconciliations
      add constraint admin_document_reconciliations_supplier_fk
      foreign key (matched_supplier_id) references public.admin_supplier_records(id) on delete set null
      not valid;
  end if;

  if to_regclass('public.admin_uploaded_documents') is not null
     and to_regclass('public.admin_document_reconciliation_lines') is not null then
    alter table public.admin_document_reconciliation_lines
      drop constraint if exists admin_document_reconciliation_lines_uploaded_document_fk;
    alter table public.admin_document_reconciliation_lines
      add constraint admin_document_reconciliation_lines_uploaded_document_fk
      foreign key (uploaded_document_id) references public.admin_uploaded_documents(id) on delete cascade
      not valid;
  end if;

  if to_regclass('public.admin_inventory_products') is not null
     and to_regclass('public.admin_document_reconciliation_lines') is not null then
    alter table public.admin_document_reconciliation_lines
      drop constraint if exists admin_document_reconciliation_lines_product_fk;
    alter table public.admin_document_reconciliation_lines
      add constraint admin_document_reconciliation_lines_product_fk
      foreign key (matched_product_id) references public.admin_inventory_products(id) on delete set null
      not valid;

    alter table public.admin_document_product_matches
      drop constraint if exists admin_document_product_matches_product_fk;
    alter table public.admin_document_product_matches
      add constraint admin_document_product_matches_product_fk
      foreign key (product_id) references public.admin_inventory_products(id) on delete set null
      not valid;
  end if;
end $$;

create unique index if not exists admin_document_reconciliations_document_uidx
  on public.admin_document_reconciliations (uploaded_document_id);

create unique index if not exists admin_document_reconciliation_lines_line_uidx
  on public.admin_document_reconciliation_lines (reconciliation_id, line_index);

create unique index if not exists admin_document_product_matches_line_product_uidx
  on public.admin_document_product_matches (reconciliation_line_id, product_id)
  where product_id is not null;

create index if not exists admin_document_reconciliations_status_idx
  on public.admin_document_reconciliations (status, updated_at desc);

create index if not exists admin_document_reconciliations_supplier_idx
  on public.admin_document_reconciliations (matched_supplier_id, supplier_name);

create index if not exists admin_document_reconciliation_lines_document_idx
  on public.admin_document_reconciliation_lines (uploaded_document_id, line_index);

create index if not exists admin_document_reconciliation_lines_match_idx
  on public.admin_document_reconciliation_lines (match_status, price_status, tax_status);

do $$
begin
  if to_regclass('public.admin_document_reconciliations') is not null then
    alter table public.admin_document_reconciliations
      drop constraint if exists admin_document_reconciliations_status_chk;
    alter table public.admin_document_reconciliations
      add constraint admin_document_reconciliations_status_chk
      check (status in ('pending_review', 'partially_reconciled', 'reconciled', 'requires_intervention', 'failed'))
      not valid;

    alter table public.admin_document_reconciliations
      drop constraint if exists admin_document_reconciliations_supplier_status_chk;
    alter table public.admin_document_reconciliations
      add constraint admin_document_reconciliations_supplier_status_chk
      check (supplier_match_status in ('matched', 'ambiguous', 'unmatched'))
      not valid;

    alter table public.admin_document_reconciliation_lines
      drop constraint if exists admin_document_reconciliation_lines_match_status_chk;
    alter table public.admin_document_reconciliation_lines
      add constraint admin_document_reconciliation_lines_match_status_chk
      check (match_status in ('matched', 'ambiguous', 'new_product', 'unrecognized'))
      not valid;

    alter table public.admin_document_reconciliation_lines
      drop constraint if exists admin_document_reconciliation_lines_price_status_chk;
    alter table public.admin_document_reconciliation_lines
      add constraint admin_document_reconciliation_lines_price_status_chk
      check (price_status in ('ok', 'deviation', 'no_history', 'not_checked'))
      not valid;
  end if;
end $$;

alter table public.admin_document_reconciliations enable row level security;
alter table public.admin_document_reconciliation_lines enable row level security;
alter table public.admin_document_product_matches enable row level security;

revoke all on public.admin_document_reconciliations from anon, authenticated;
revoke all on public.admin_document_reconciliation_lines from anon, authenticated;
revoke all on public.admin_document_product_matches from anon, authenticated;
grant all on public.admin_document_reconciliations to service_role;
grant all on public.admin_document_reconciliation_lines to service_role;
grant all on public.admin_document_product_matches to service_role;

drop policy if exists "admin_document_reconciliations_service_role_all" on public.admin_document_reconciliations;
create policy "admin_document_reconciliations_service_role_all"
  on public.admin_document_reconciliations for all to service_role using (true) with check (true);

drop policy if exists "admin_document_reconciliation_lines_service_role_all" on public.admin_document_reconciliation_lines;
create policy "admin_document_reconciliation_lines_service_role_all"
  on public.admin_document_reconciliation_lines for all to service_role using (true) with check (true);

drop policy if exists "admin_document_product_matches_service_role_all" on public.admin_document_product_matches;
create policy "admin_document_product_matches_service_role_all"
  on public.admin_document_product_matches for all to service_role using (true) with check (true);

comment on table public.admin_document_reconciliations is 'Propuesta revisable de conciliacion generada desde OCR Inbox. No aplica stock ni contabilidad definitiva.';
comment on table public.admin_document_reconciliation_lines is 'Lineas OCR normalizadas para revisar matching de productos, precios, IVA, unidades y datos APPCC.';
comment on table public.admin_document_product_matches is 'Candidatos de producto para una linea OCR; permite resolver ambiguedades sin duplicar productos.';
comment on column public.admin_document_reconciliations.uploaded_document_id is 'Documento raiz en admin_uploaded_documents que origina esta propuesta. Una propuesta activa por documento.';
comment on column public.admin_document_reconciliations.status is 'Estado revisable: pending_review, partially_reconciled, reconciled, requires_intervention o failed.';
comment on column public.admin_document_reconciliations.matched_supplier_id is 'Proveedor maestro relacionado si el OCR permite una coincidencia razonable.';
comment on column public.admin_document_reconciliation_lines.matched_product_id is 'Producto maestro sugerido para esta linea OCR. No crea ni actualiza stock.';
comment on column public.admin_document_reconciliation_lines.raw_line is 'Linea OCR original conservada para auditoria y futuras mejoras de IA.';
comment on column public.admin_document_product_matches.confidence is 'Confianza de matching producto-linea calculada por normalizacion de texto y datos disponibles.';
