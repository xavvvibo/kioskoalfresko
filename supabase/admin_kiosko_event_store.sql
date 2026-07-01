create extension if not exists pgcrypto;

create table if not exists public.admin_domain_events (
  id uuid primary key default gen_random_uuid(),
  event_id text unique not null,
  event_type text not null,
  occurred_at timestamptz not null,
  correlation_id text,
  causation_id text,
  actor_id text,
  actor_role text,
  source text,
  trace jsonb default '{}'::jsonb,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'recorded',
  handler_status jsonb default '{}'::jsonb,
  error_message text,
  retry_count integer not null default 0,
  created_at timestamptz not null default now()
);

alter table if exists public.admin_domain_events enable row level security;

revoke all on public.admin_domain_events from anon, authenticated;
grant all on public.admin_domain_events to service_role;

drop policy if exists "admin_domain_events_service_role_all" on public.admin_domain_events;
create policy "admin_domain_events_service_role_all"
  on public.admin_domain_events
  for all
  to service_role
  using (true)
  with check (true);

do $$
begin
  if to_regclass('public.admin_domain_events') is not null
     and not exists (select 1 from pg_constraint where conname = 'admin_domain_events_status_chk') then
    alter table public.admin_domain_events
      add constraint admin_domain_events_status_chk
      check (status in ('recorded', 'handled', 'failed', 'ignored'))
      not valid;
  end if;

  if to_regclass('public.admin_domain_events') is not null
     and not exists (select 1 from pg_constraint where conname = 'admin_domain_events_retry_count_chk') then
    alter table public.admin_domain_events
      add constraint admin_domain_events_retry_count_chk
      check (retry_count >= 0)
      not valid;
  end if;
end $$;

create index if not exists admin_domain_events_event_type_idx
  on public.admin_domain_events (event_type);

create index if not exists admin_domain_events_occurred_at_idx
  on public.admin_domain_events (occurred_at desc);

create index if not exists admin_domain_events_correlation_idx
  on public.admin_domain_events (correlation_id);

create index if not exists admin_domain_events_causation_idx
  on public.admin_domain_events (causation_id);

create index if not exists admin_domain_events_status_idx
  on public.admin_domain_events (status);

create index if not exists admin_domain_events_trace_gin_idx
  on public.admin_domain_events using gin (trace);

create index if not exists admin_domain_events_payload_gin_idx
  on public.admin_domain_events using gin (payload);

comment on table public.admin_domain_events is
  'Event Store interno del ERP APPCC. Registra eventos de dominio para auditoria, inspeccion sanitaria, debugging, trazabilidad y reconstruccion futura de expedientes. No es event sourcing operativo todavia.';

comment on column public.admin_domain_events.event_id is
  'Identificador del evento emitido por la capa de dominio. Unico para evitar registros duplicados.';

comment on column public.admin_domain_events.event_type is
  'Nombre canonico del evento de dominio, por ejemplo DocumentConfirmed, GoodsReceived o TemperatureRecorded.';

comment on column public.admin_domain_events.occurred_at is
  'Fecha/hora en la que ocurrio el evento en el dominio.';

comment on column public.admin_domain_events.correlation_id is
  'Identificador para agrupar eventos de un mismo flujo o expediente.';

comment on column public.admin_domain_events.causation_id is
  'Identificador del evento que causo este evento cuando aplique.';

comment on column public.admin_domain_events.trace is
  'Referencias transversales a documento, proveedor, lote, produccion, etiqueta, contabilidad, APPCC o incidencia.';

comment on column public.admin_domain_events.payload is
  'Datos propios del evento. Debe ser suficiente para auditoria y observabilidad, no necesariamente para reconstruccion completa todavia.';

comment on column public.admin_domain_events.status is
  'Estado de auditoria del evento: recorded, handled, failed, ignored.';

comment on column public.admin_domain_events.handler_status is
  'Estado por handler. Permite ver que boundaries procesaron el evento sin mover efectos reales todavia.';

comment on column public.admin_domain_events.error_message is
  'Ultimo error de persistencia/handler asociado al evento cuando aplique.';

comment on column public.admin_domain_events.retry_count is
  'Contador de fallos de handlers o reprocesos futuros.';
