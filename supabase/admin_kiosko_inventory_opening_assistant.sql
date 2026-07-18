create extension if not exists pgcrypto;

create table if not exists public.admin_inventory_opening_sessions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  location_names text[] default '{}',
  cutoff_at timestamptz not null,
  status text not null default 'draft',
  origin text not null default 'manual',
  created_by uuid null,
  approved_by uuid null,
  approved_at timestamptz null,
  applied_at timestamptz null,
  cancelled_at timestamptz null,
  notes text,
  image_count integer not null default 0,
  group_count integer not null default 0,
  confirmed_line_count integer not null default 0,
  issue_count integer not null default 0,
  theoretical_snapshot jsonb not null default '[]'::jsonb,
  proposed_adjustments jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_inventory_opening_sessions_status_chk check (status in ('draft','importing','reviewing','ready_for_approval','approved','applied','cancelled')),
  constraint admin_inventory_opening_sessions_origin_chk check (origin in ('photo_zip','manual','mixed')),
  constraint admin_inventory_opening_sessions_apply_once_chk check (not (status = 'applied' and applied_at is null))
);

create table if not exists public.admin_inventory_opening_images (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.admin_inventory_opening_sessions(id) on delete cascade,
  original_filename text not null,
  storage_bucket text not null default 'admin-private',
  storage_path text,
  mime_type text,
  size_bytes bigint,
  width integer,
  height integer,
  sha256 text not null,
  order_index integer not null default 0,
  duplicate_of_image_id uuid null references public.admin_inventory_opening_images(id) on delete set null,
  relation_status text not null default 'needs_review',
  review_status text not null default 'pending',
  signed_url_expires_at timestamptz null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_inventory_opening_images_relation_chk check (relation_status in ('exact_duplicate','probable_same_view','probable_same_product','probable_distinct_unit','needs_review')),
  constraint admin_inventory_opening_images_review_chk check (review_status in ('pending','grouped','irrelevant','confirmed'))
);

create table if not exists public.admin_inventory_opening_groups (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.admin_inventory_opening_sessions(id) on delete cascade,
  group_code text not null,
  relation_type text not null default 'needs_review',
  review_status text not null default 'pending',
  image_ids uuid[] not null default '{}',
  unit_interpretation text not null default 'needs_review',
  real_unit_count numeric null,
  quantity_per_unit numeric null,
  total_quantity numeric null,
  unit text null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_inventory_opening_groups_relation_chk check (relation_type in ('exact_duplicate','probable_same_view','probable_same_product','probable_distinct_unit','needs_review')),
  constraint admin_inventory_opening_groups_status_chk check (review_status in ('pending','reviewing','confirmed','excluded','conflict')),
  constraint admin_inventory_opening_groups_interpretation_chk check (unit_interpretation in ('one_unit_multiple_views','multiple_equal_units','box_with_units','partial_quantity','estimated_quantity','needs_review'))
);

create table if not exists public.admin_inventory_opening_lines (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.admin_inventory_opening_sessions(id) on delete cascade,
  group_id uuid null references public.admin_inventory_opening_groups(id) on delete set null,
  product_id uuid null references public.admin_inventory_products(id) on delete set null,
  detected_values jsonb not null default '{}'::jsonb,
  proposed_values jsonb not null default '{}'::jsonb,
  confirmed_values jsonb not null default '{}'::jsonb,
  detected_name text,
  confirmed_name text,
  brand text,
  ean text,
  format text,
  quantity_per_unit numeric,
  unit text,
  unit_count numeric,
  total_quantity numeric,
  manufacturer_lot text,
  expiry_date date,
  best_before_date date,
  proposed_supplier_id uuid null references public.admin_supplier_records(id) on delete set null,
  confirmed_supplier_id uuid null references public.admin_supplier_records(id) on delete set null,
  proposed_purchase_document_id uuid null references public.admin_accounting_documents(id) on delete set null,
  confirmed_purchase_document_id uuid null references public.admin_accounting_documents(id) on delete set null,
  proposed_purchase_line_id uuid null references public.admin_accounting_document_items(id) on delete set null,
  confirmed_purchase_line_id uuid null references public.admin_accounting_document_items(id) on delete set null,
  location_name text,
  conservation_status text,
  observations text,
  recognition_confidence numeric not null default 0,
  review_status text not null default 'pending_identification',
  identification_method text not null default 'manual',
  traceability_status text not null default 'unavailable',
  evidence_image_ids uuid[] not null default '{}',
  issues jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_inventory_opening_lines_status_chk check (review_status in ('pending_images','pending_identification','proposed','needs_review','confirmed','excluded','conflict')),
  constraint admin_inventory_opening_lines_identification_chk check (identification_method in ('barcode','exact_catalog_match','purchase_match','visual_match','filename','fallback','manual')),
  constraint admin_inventory_opening_lines_traceability_chk check (traceability_status in ('complete','partial','unavailable')),
  constraint admin_inventory_opening_lines_non_negative_qty_chk check (coalesce(unit_count, 0) >= 0 and coalesce(total_quantity, 0) >= 0)
);

create table if not exists public.admin_inventory_opening_match_proposals (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.admin_inventory_opening_sessions(id) on delete cascade,
  line_id uuid not null references public.admin_inventory_opening_lines(id) on delete cascade,
  target_type text not null,
  target_id uuid null,
  label text not null,
  confidence numeric not null default 0,
  method text not null,
  reasons jsonb not null default '[]'::jsonb,
  requires_review boolean not null default true,
  accepted boolean not null default false,
  created_at timestamptz not null default now(),
  constraint admin_inventory_opening_match_target_chk check (target_type in ('product','supplier','purchase_line','purchase_document')),
  constraint admin_inventory_opening_match_method_chk check (method in ('ean','exact_name_format','normalized_name','purchase_proximity','manual'))
);

create table if not exists public.admin_inventory_opening_adjustments (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.admin_inventory_opening_sessions(id) on delete cascade,
  line_id uuid null references public.admin_inventory_opening_lines(id) on delete set null,
  adjustment_type text not null,
  inventory_lot_id uuid null references public.admin_inventory_lots(id) on delete set null,
  proposed_quantity numeric not null default 0,
  unit text,
  reason text not null,
  responsible text,
  status text not null default 'draft',
  applied_movement_id uuid null references public.admin_inventory_lot_movements(id) on delete set null,
  before_snapshot jsonb not null default '{}'::jsonb,
  after_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  applied_at timestamptz null,
  constraint admin_inventory_opening_adjustments_type_chk check (adjustment_type in ('opening_balance','positive_adjustment','negative_adjustment','expired','waste','unidentified_previous_stock','exhausted_legacy_lot')),
  constraint admin_inventory_opening_adjustments_status_chk check (status in ('draft','approved','applied','cancelled')),
  constraint admin_inventory_opening_adjustments_non_negative_chk check (proposed_quantity >= 0)
);

create table if not exists public.admin_inventory_opening_audit_log (
  id uuid primary key default gen_random_uuid(),
  session_id uuid null references public.admin_inventory_opening_sessions(id) on delete set null,
  actor_user_id uuid null,
  action text not null,
  entity_type text not null,
  entity_id uuid null,
  before_data jsonb not null default '{}'::jsonb,
  after_data jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  reason text,
  created_at timestamptz not null default now()
);

create or replace function public.admin_inventory_opening_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists admin_inventory_opening_sessions_touch on public.admin_inventory_opening_sessions;
create trigger admin_inventory_opening_sessions_touch
  before update on public.admin_inventory_opening_sessions
  for each row execute function public.admin_inventory_opening_touch_updated_at();

drop trigger if exists admin_inventory_opening_images_touch on public.admin_inventory_opening_images;
create trigger admin_inventory_opening_images_touch
  before update on public.admin_inventory_opening_images
  for each row execute function public.admin_inventory_opening_touch_updated_at();

drop trigger if exists admin_inventory_opening_groups_touch on public.admin_inventory_opening_groups;
create trigger admin_inventory_opening_groups_touch
  before update on public.admin_inventory_opening_groups
  for each row execute function public.admin_inventory_opening_touch_updated_at();

drop trigger if exists admin_inventory_opening_lines_touch on public.admin_inventory_opening_lines;
create trigger admin_inventory_opening_lines_touch
  before update on public.admin_inventory_opening_lines
  for each row execute function public.admin_inventory_opening_touch_updated_at();

create or replace function public.admin_inventory_opening_block_audit_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'admin_inventory_opening_audit_log is immutable';
end;
$$;

drop trigger if exists admin_inventory_opening_audit_no_update on public.admin_inventory_opening_audit_log;
create trigger admin_inventory_opening_audit_no_update
  before update on public.admin_inventory_opening_audit_log
  for each row execute function public.admin_inventory_opening_block_audit_mutation();

drop trigger if exists admin_inventory_opening_audit_no_delete on public.admin_inventory_opening_audit_log;
create trigger admin_inventory_opening_audit_no_delete
  before delete on public.admin_inventory_opening_audit_log
  for each row execute function public.admin_inventory_opening_block_audit_mutation();

create or replace function public.admin_create_inventory_opening_session(
  p_name text,
  p_location_names text[],
  p_cutoff_at timestamptz,
  p_origin text,
  p_notes text default null,
  p_created_by uuid default null
)
returns public.admin_inventory_opening_sessions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session public.admin_inventory_opening_sessions;
  v_locations text[];
begin
  if nullif(btrim(coalesce(p_name, '')), '') is null then
    raise exception 'inventory opening session name is required';
  end if;

  if p_cutoff_at is null then
    raise exception 'inventory opening cutoff_at is required';
  end if;

  if p_origin not in ('photo_zip','manual','mixed') then
    raise exception 'invalid inventory opening origin: %', p_origin;
  end if;

  select coalesce(array_agg(distinct btrim(location)) filter (where btrim(location) <> ''), array[]::text[])
    into v_locations
  from unnest(coalesce(p_location_names, array[]::text[])) as location;

  insert into public.admin_inventory_opening_sessions (
    name,
    location_names,
    cutoff_at,
    origin,
    notes,
    created_by,
    status
  )
  values (
    btrim(p_name),
    v_locations,
    p_cutoff_at,
    p_origin,
    nullif(btrim(coalesce(p_notes, '')), ''),
    p_created_by,
    'draft'
  )
  returning * into v_session;

  insert into public.admin_inventory_opening_audit_log (
    session_id,
    actor_user_id,
    action,
    entity_type,
    entity_id,
    after_data,
    metadata
  )
  values (
    v_session.id,
    p_created_by,
    'session_created',
    'inventory_opening_session',
    v_session.id,
    jsonb_build_object(
      'name', v_session.name,
      'cutoff_at', v_session.cutoff_at,
      'origin', v_session.origin,
      'location_names', v_session.location_names
    ),
    jsonb_build_object('atomic_rpc', true)
  );

  return v_session;
end;
$$;

create index if not exists admin_inventory_opening_sessions_status_idx on public.admin_inventory_opening_sessions (status);
create index if not exists admin_inventory_opening_sessions_cutoff_idx on public.admin_inventory_opening_sessions (cutoff_at desc);
create index if not exists admin_inventory_opening_images_session_idx on public.admin_inventory_opening_images (session_id, order_index);
create index if not exists admin_inventory_opening_images_sha_idx on public.admin_inventory_opening_images (sha256);
create index if not exists admin_inventory_opening_groups_session_idx on public.admin_inventory_opening_groups (session_id);
create index if not exists admin_inventory_opening_lines_session_idx on public.admin_inventory_opening_lines (session_id, review_status);
create index if not exists admin_inventory_opening_lines_product_idx on public.admin_inventory_opening_lines (product_id);
create index if not exists admin_inventory_opening_lines_ean_idx on public.admin_inventory_opening_lines (ean);
create index if not exists admin_inventory_opening_lines_lot_idx on public.admin_inventory_opening_lines (manufacturer_lot);
create index if not exists admin_inventory_opening_match_line_idx on public.admin_inventory_opening_match_proposals (line_id, confidence desc);
create index if not exists admin_inventory_opening_adjustments_session_idx on public.admin_inventory_opening_adjustments (session_id, status);
create index if not exists admin_inventory_opening_audit_session_idx on public.admin_inventory_opening_audit_log (session_id, created_at desc);

alter table public.admin_inventory_opening_sessions enable row level security;
alter table public.admin_inventory_opening_images enable row level security;
alter table public.admin_inventory_opening_groups enable row level security;
alter table public.admin_inventory_opening_lines enable row level security;
alter table public.admin_inventory_opening_match_proposals enable row level security;
alter table public.admin_inventory_opening_adjustments enable row level security;
alter table public.admin_inventory_opening_audit_log enable row level security;

revoke all on public.admin_inventory_opening_sessions from anon, authenticated;
revoke all on public.admin_inventory_opening_images from anon, authenticated;
revoke all on public.admin_inventory_opening_groups from anon, authenticated;
revoke all on public.admin_inventory_opening_lines from anon, authenticated;
revoke all on public.admin_inventory_opening_match_proposals from anon, authenticated;
revoke all on public.admin_inventory_opening_adjustments from anon, authenticated;
revoke all on public.admin_inventory_opening_audit_log from anon, authenticated;

grant all on public.admin_inventory_opening_sessions to service_role;
grant all on public.admin_inventory_opening_images to service_role;
grant all on public.admin_inventory_opening_groups to service_role;
grant all on public.admin_inventory_opening_lines to service_role;
grant all on public.admin_inventory_opening_match_proposals to service_role;
grant all on public.admin_inventory_opening_adjustments to service_role;
grant all on public.admin_inventory_opening_audit_log to service_role;
revoke all on function public.admin_create_inventory_opening_session(text, text[], timestamptz, text, text, uuid) from public;
revoke all on function public.admin_create_inventory_opening_session(text, text[], timestamptz, text, text, uuid) from anon, authenticated;
grant execute on function public.admin_create_inventory_opening_session(text, text[], timestamptz, text, text, uuid) to service_role;

drop policy if exists "admin_inventory_opening_sessions_service_role_all" on public.admin_inventory_opening_sessions;
create policy "admin_inventory_opening_sessions_service_role_all" on public.admin_inventory_opening_sessions for all to service_role using (true) with check (true);
drop policy if exists "admin_inventory_opening_images_service_role_all" on public.admin_inventory_opening_images;
create policy "admin_inventory_opening_images_service_role_all" on public.admin_inventory_opening_images for all to service_role using (true) with check (true);
drop policy if exists "admin_inventory_opening_groups_service_role_all" on public.admin_inventory_opening_groups;
create policy "admin_inventory_opening_groups_service_role_all" on public.admin_inventory_opening_groups for all to service_role using (true) with check (true);
drop policy if exists "admin_inventory_opening_lines_service_role_all" on public.admin_inventory_opening_lines;
create policy "admin_inventory_opening_lines_service_role_all" on public.admin_inventory_opening_lines for all to service_role using (true) with check (true);
drop policy if exists "admin_inventory_opening_matches_service_role_all" on public.admin_inventory_opening_match_proposals;
create policy "admin_inventory_opening_matches_service_role_all" on public.admin_inventory_opening_match_proposals for all to service_role using (true) with check (true);
drop policy if exists "admin_inventory_opening_adjustments_service_role_all" on public.admin_inventory_opening_adjustments;
create policy "admin_inventory_opening_adjustments_service_role_all" on public.admin_inventory_opening_adjustments for all to service_role using (true) with check (true);
drop policy if exists "admin_inventory_opening_audit_service_role_all" on public.admin_inventory_opening_audit_log;
create policy "admin_inventory_opening_audit_service_role_all" on public.admin_inventory_opening_audit_log for all to service_role using (true) with check (true);

comment on table public.admin_inventory_opening_sessions is 'Sesiones revisables de inventario físico de apertura. No aplican stock por sí mismas.';
comment on table public.admin_inventory_opening_images is 'Evidencia fotográfica privada asociada a una sesión de inventario físico.';
comment on table public.admin_inventory_opening_groups is 'Agrupación humana/revisable de imágenes como vistas, unidades o productos similares.';
comment on table public.admin_inventory_opening_lines is 'Borrador de líneas de inventario con detected/proposed/confirmed separados.';
comment on table public.admin_inventory_opening_adjustments is 'Movimientos de regularización propuestos o aplicados tras aprobación explícita.';
comment on table public.admin_inventory_opening_audit_log is 'Auditoría inmutable del asistente de inventario inicial.';
