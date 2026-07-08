create extension if not exists pgcrypto;

create table if not exists public.print_jobs (
  id uuid primary key default gen_random_uuid(),
  printer_key text not null,
  label_type text not null default 'test_label',
  payload jsonb not null default '{}'::jsonb,
  payload_json jsonb not null default '{}'::jsonb,
  idempotency_key text,
  status text not null default 'queued',
  attempts integer not null default 0,
  error text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  claimed_at timestamptz,
  transport_started_at timestamptz,
  sent_at timestamptz,
  sent_unconfirmed_at timestamptz,
  printed_at timestamptz,
  transport_confirmed_at timestamptz,
  transport_confirmation_source text,
  transport_confirmed_by text,
  transport_confirmation_note text,
  cancelled_at timestamptz,
  cancelled_by text,
  cancel_reason text,
  last_transport_result jsonb
);

alter table if exists public.print_jobs
  add column if not exists label_type text not null default 'test_label',
  add column if not exists payload jsonb not null default '{}'::jsonb,
  add column if not exists payload_json jsonb not null default '{}'::jsonb,
  add column if not exists idempotency_key text,
  add column if not exists error text,
  add column if not exists error_message text,
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists claimed_at timestamptz,
  add column if not exists transport_started_at timestamptz,
  add column if not exists sent_at timestamptz,
  add column if not exists sent_unconfirmed_at timestamptz,
  add column if not exists printed_at timestamptz,
  add column if not exists transport_confirmed_at timestamptz,
  add column if not exists transport_confirmation_source text,
  add column if not exists transport_confirmed_by text,
  add column if not exists transport_confirmation_note text,
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancelled_by text,
  add column if not exists cancel_reason text,
  add column if not exists last_transport_result jsonb;

-- Canonicas: payload, error, idempotency_key.
-- Compatibilidad temporal: payload_json y error_message existen para codigo legacy y
-- pueden retirarse cuando ningun endpoint/bridge antiguo lea esas columnas.
update public.print_jobs
set payload = payload_json
where payload = '{}'::jsonb
  and payload_json <> '{}'::jsonb;

update public.print_jobs
set payload_json = payload
where payload_json = '{}'::jsonb
  and payload <> '{}'::jsonb;

update public.print_jobs
set error = error_message
where nullif(error, '') is null
  and nullif(error_message, '') is not null;

update public.print_jobs
set error_message = error
where nullif(error_message, '') is null
  and nullif(error, '') is not null;

update public.print_jobs
set idempotency_key = nullif(payload->'metadata'->>'idempotencyKey', '')
where nullif(idempotency_key, '') is null
  and nullif(payload->'metadata'->>'idempotencyKey', '') is not null;

update public.print_jobs
set status = case status
  when 'pending' then 'queued'
  when 'printing' then 'claimed'
  else status
end
where status in ('pending', 'printing');

do $$
declare
  v_duplicates text;
begin
  select string_agg(format('%s/%s ids=%s', printer_key, idempotency_key, ids), '; ')
  into v_duplicates
  from (
    select
      printer_key,
      idempotency_key,
      string_agg(id::text, ',' order by created_at, id) as ids
    from public.print_jobs
    where nullif(idempotency_key, '') is not null
    group by printer_key, idempotency_key
    having count(*) > 1
    limit 20
  ) duplicates;

  if v_duplicates is not null then
    raise exception 'print_jobs idempotency duplicates must be reconciled before creating unique index: %', v_duplicates
      using errcode = 'P0001';
  end if;
end $$;

alter table if exists public.print_jobs enable row level security;

revoke all on public.print_jobs from anon, authenticated;
grant all on public.print_jobs to service_role;

drop policy if exists "print_jobs_service_role_all" on public.print_jobs;
create policy "print_jobs_service_role_all"
  on public.print_jobs
  for all
  to service_role
  using (true)
  with check (true);

do $$
begin
  if to_regclass('public.print_jobs') is not null then
    alter table public.print_jobs drop constraint if exists print_jobs_status_chk;
    alter table public.print_jobs
      add constraint print_jobs_status_chk
      check (status in ('queued', 'claimed', 'sending', 'sent_unconfirmed', 'printed', 'error', 'cancelled'));
  end if;

  if to_regclass('public.print_jobs') is not null
     and not exists (select 1 from pg_constraint where conname = 'print_jobs_attempts_chk') then
    alter table public.print_jobs
      add constraint print_jobs_attempts_chk
      check (attempts >= 0 and attempts <= 3);
  end if;
end $$;

create index if not exists print_jobs_polling_idx
  on public.print_jobs (printer_key, status, attempts, created_at asc);

create index if not exists print_jobs_created_at_idx
  on public.print_jobs (created_at desc);

create index if not exists print_jobs_printed_at_idx
  on public.print_jobs (printed_at desc)
  where printed_at is not null;

create index if not exists print_jobs_claimed_idx
  on public.print_jobs (status, claimed_at asc)
  where status = 'claimed';

create index if not exists print_jobs_sending_idx
  on public.print_jobs (printer_key, transport_started_at asc)
  where status = 'sending';

create index if not exists print_jobs_sent_unconfirmed_idx
  on public.print_jobs (printer_key, sent_unconfirmed_at asc)
  where status = 'sent_unconfirmed';

create index if not exists print_jobs_payload_template_idx
  on public.print_jobs ((payload->>'template'));

create index if not exists print_jobs_payload_source_idx
  on public.print_jobs ((payload->'metadata'->>'sourceId'));

create index if not exists print_jobs_idempotency_idx
  on public.print_jobs (idempotency_key)
  where nullif(idempotency_key, '') is not null;

create unique index if not exists print_jobs_printer_idempotency_uidx
  on public.print_jobs (printer_key, idempotency_key)
  where idempotency_key is not null and idempotency_key <> '';

drop function if exists public.claim_next_print_jobs(text, integer);

create or replace function public.claim_next_print_jobs(
  p_printer_key text,
  p_limit integer default 1,
  p_max_attempts integer default 3
)
returns table (
  id uuid,
  printer_key text,
  label_type text,
  payload jsonb,
  payload_json jsonb,
  idempotency_key text,
  status text,
  attempts integer,
  error text,
  error_message text,
  created_at timestamptz,
  updated_at timestamptz,
  claimed_at timestamptz,
  transport_started_at timestamptz,
  printed_at timestamptz,
  sent_at timestamptz,
  sent_unconfirmed_at timestamptz,
  transport_confirmed_at timestamptz,
  transport_confirmation_source text,
  transport_confirmed_by text,
  transport_confirmation_note text,
  cancelled_at timestamptz,
  cancelled_by text,
  cancel_reason text,
  last_transport_result jsonb,
  claimed_from_status text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with locked as (
    select
      pj.id,
      pj.status as previous_status
    from public.print_jobs pj
    where pj.printer_key = p_printer_key
      and pj.status = 'queued'
      and pj.attempts < least(greatest(p_max_attempts, 1), 3)
    order by pj.created_at asc
    for update skip locked
    limit least(greatest(p_limit, 1), 10)
  )
  update public.print_jobs pj
  set
    status = 'claimed',
    attempts = pj.attempts + 1,
    error = null,
    error_message = null,
    claimed_at = now(),
    updated_at = now()
  from locked
  where pj.id = locked.id
  returning
    pj.id,
    pj.printer_key,
    coalesce(nullif(pj.label_type, ''), pj.payload->>'template', 'test_label') as label_type,
    pj.payload,
    pj.payload_json,
    pj.idempotency_key,
    pj.status,
    pj.attempts,
    pj.error,
    pj.error_message,
    pj.created_at,
    pj.updated_at,
    pj.claimed_at,
    pj.transport_started_at,
    pj.printed_at,
    pj.sent_at,
    pj.sent_unconfirmed_at,
    pj.transport_confirmed_at,
    pj.transport_confirmation_source,
    pj.transport_confirmed_by,
    pj.transport_confirmation_note,
    pj.cancelled_at,
    pj.cancelled_by,
    pj.cancel_reason,
    pj.last_transport_result,
    locked.previous_status as claimed_from_status;
end;
$$;

create or replace function public.recover_stale_print_jobs(
  p_stale_minutes integer default 10
)
returns table (
  id uuid,
  printer_key text,
  label_type text,
  payload jsonb,
  payload_json jsonb,
  idempotency_key text,
  status text,
  attempts integer,
  error text,
  error_message text,
  created_at timestamptz,
  updated_at timestamptz,
  claimed_at timestamptz,
  transport_started_at timestamptz,
  printed_at timestamptz,
  sent_at timestamptz,
  sent_unconfirmed_at timestamptz,
  transport_confirmed_at timestamptz,
  transport_confirmation_source text,
  transport_confirmed_by text,
  transport_confirmation_note text,
  cancelled_at timestamptz,
  cancelled_by text,
  cancel_reason text,
  last_transport_result jsonb
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_error text;
begin
  v_error := concat(
    'Resultado incierto: trabajo atascado antes de confirmacion mas de ',
    least(greatest(p_stale_minutes, 1), 120)::text,
    ' minutos. No se reimprime automaticamente.'
  );

  return query
  update public.print_jobs pj
  set
    status = 'sent_unconfirmed',
    sent_unconfirmed_at = coalesce(pj.sent_unconfirmed_at, now()),
    error = v_error,
    error_message = v_error,
    updated_at = now()
  where pj.status in ('claimed', 'sending')
    and coalesce(pj.transport_started_at, pj.claimed_at, pj.created_at) < now() - make_interval(mins => least(greatest(p_stale_minutes, 1), 120))
  returning
    pj.id,
    pj.printer_key,
    coalesce(nullif(pj.label_type, ''), pj.payload->>'template', 'test_label') as label_type,
    pj.payload,
    pj.payload_json,
    pj.idempotency_key,
    pj.status,
    pj.attempts,
    pj.error,
    pj.error_message,
    pj.created_at,
    pj.updated_at,
    pj.claimed_at,
    pj.transport_started_at,
    pj.printed_at,
    pj.sent_at,
    pj.sent_unconfirmed_at,
    pj.transport_confirmed_at,
    pj.transport_confirmation_source,
    pj.transport_confirmed_by,
    pj.transport_confirmation_note,
    pj.cancelled_at,
    pj.cancelled_by,
    pj.cancel_reason,
    pj.last_transport_result;
end;
$$;

revoke all on function public.claim_next_print_jobs(text, integer, integer) from public, anon, authenticated;
grant execute on function public.claim_next_print_jobs(text, integer, integer) to service_role;

revoke all on function public.recover_stale_print_jobs(integer) from public, anon, authenticated;
grant execute on function public.recover_stale_print_jobs(integer) to service_role;

comment on table public.print_jobs is
  'Cola interna de impresion del ERP. El bridge local reclama trabajos, persiste sending antes del TCP RAW y reporta accepted/error.';

comment on column public.print_jobs.payload is
  'Payload canonico de etiqueta y metadatos minimos de auditoria.';

comment on column public.print_jobs.payload_json is
  'Compatibilidad legacy temporal; payload es canonico. Retirar cuando no queden bridges/endpoints antiguos.';

comment on column public.print_jobs.error is
  'Error canonico de cola/transporte.';

comment on column public.print_jobs.error_message is
  'Compatibilidad legacy temporal; error es canonico. Retirar cuando no queden bridges/endpoints antiguos.';

comment on column public.print_jobs.idempotency_key is
  'Clave real de idempotencia por impresora. Se inicializa desde payload.metadata.idempotencyKey.';

comment on column public.print_jobs.status is
  'Estados: queued, claimed, sending, sent_unconfirmed, printed, error, cancelled. Estados claimed/sending/sent_unconfirmed no son reclamables automaticamente.';

comment on column public.print_jobs.transport_started_at is
  'Fecha/hora persistida antes de abrir/escribir el socket TCP.';

comment on function public.claim_next_print_jobs(text, integer, integer) is
  'Reclama solo queued de forma atomica con FOR UPDATE SKIP LOCKED. No reintenta error/sending/sent_unconfirmed automaticamente.';

comment on function public.recover_stale_print_jobs(integer) is
  'Marca trabajos antiguos claimed/sending como resultado incierto. No habilita reimpresion automatica.';
