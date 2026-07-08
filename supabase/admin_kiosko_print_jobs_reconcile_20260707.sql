begin;

do $$
declare
  v_missing text;
  v_event_id_type text;
  v_bad_count integer;
begin
  select string_agg(column_name, ', ' order by column_name)
  into v_missing
  from (
    values
      ('payload'), ('payload_json'), ('error'), ('error_message'), ('idempotency_key'), ('status'),
      ('claimed_at'), ('transport_started_at'), ('transport_confirmed_at'),
      ('transport_confirmation_source'), ('transport_confirmed_by'), ('transport_confirmation_note'),
      ('sent_unconfirmed_at'), ('printed_at'), ('cancelled_at'), ('cancelled_by'),
      ('cancel_reason'), ('attempts'), ('updated_at')
  ) required(column_name)
  where not exists (
    select 1
    from information_schema.columns c
    where c.table_schema = 'public'
      and c.table_name = 'print_jobs'
      and c.column_name = required.column_name
  );

  if v_missing is not null then
    raise exception 'Faltan columnas requeridas en public.print_jobs: %', v_missing;
  end if;

  select udt_name
  into v_event_id_type
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'admin_domain_events'
    and column_name = 'event_id';

  if v_event_id_type is null then
    raise exception 'No existe public.admin_domain_events.event_id';
  end if;

  perform 1
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'admin_domain_events'
    and column_name = 'correlation_id'
    and data_type = 'text';
  if not found then raise exception 'admin_domain_events.correlation_id debe ser text'; end if;

  perform 1
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'admin_domain_events'
    and column_name = 'actor_id'
    and data_type = 'text';
  if not found then raise exception 'admin_domain_events.actor_id debe ser text'; end if;

  perform 1
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'admin_domain_events'
    and column_name = 'trace'
    and udt_name = 'jsonb';
  if not found then raise exception 'admin_domain_events.trace debe ser jsonb'; end if;

  perform 1
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'admin_domain_events'
    and column_name = 'payload'
    and udt_name = 'jsonb';
  if not found then raise exception 'admin_domain_events.payload debe ser jsonb'; end if;

  perform 1
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'admin_domain_events'
    and column_name = 'handler_status'
    and udt_name = 'jsonb';
  if not found then raise exception 'admin_domain_events.handler_status debe ser jsonb'; end if;

  select count(*)
  into v_bad_count
  from public.print_jobs
  where id in (
    'a1aadfee-e6bd-4000-ac17-0f2a9b5a3474'::uuid,
    '95d0cf8f-04f8-4fea-b30d-6083a8675981'::uuid,
    'c006313a-7496-478f-a9f2-64f63b1ff43d'::uuid,
    'fdf8ec3c-c15f-4885-9b4b-7bd756e5d5cb'::uuid,
    '3efa2c80-0877-4aaf-9fe6-e6d5e382c789'::uuid
  )
  and status <> 'claimed';

  if v_bad_count > 0 then
    raise exception 'Preflight abortado: alguno de los cinco trabajos esperados claimed no esta en claimed';
  end if;

  select count(*)
  into v_bad_count
  from public.print_jobs
  where id in (
    'b5a37527-d499-4c2f-88f3-e3e38c148e17'::uuid,
    'cb78963d-913a-4816-bc17-e17d06b2bbc5'::uuid
  )
  and status <> 'queued';

  if v_bad_count > 0 then
    raise exception 'Preflight abortado: alguno de los dos trabajos esperados queued no esta en queued';
  end if;
end $$;

select 'preflight_target_rows' as section, *
from public.print_jobs
where id in (
  'a1aadfee-e6bd-4000-ac17-0f2a9b5a3474'::uuid,
  '95d0cf8f-04f8-4fea-b30d-6083a8675981'::uuid,
  'c006313a-7496-478f-a9f2-64f63b1ff43d'::uuid,
  'fdf8ec3c-c15f-4885-9b4b-7bd756e5d5cb'::uuid,
  '3efa2c80-0877-4aaf-9fe6-e6d5e382c789'::uuid,
  'b5a37527-d499-4c2f-88f3-e3e38c148e17'::uuid,
  'cb78963d-913a-4816-bc17-e17d06b2bbc5'::uuid
)
order by created_at, id;

with printed_targets(id) as (
  values
    ('a1aadfee-e6bd-4000-ac17-0f2a9b5a3474'::uuid),
    ('95d0cf8f-04f8-4fea-b30d-6083a8675981'::uuid),
    ('c006313a-7496-478f-a9f2-64f63b1ff43d'::uuid),
    ('fdf8ec3c-c15f-4885-9b4b-7bd756e5d5cb'::uuid),
    ('3efa2c80-0877-4aaf-9fe6-e6d5e382c789'::uuid)
)
update public.print_jobs pj
set
  status = 'printed',
  printed_at = coalesce(pj.printed_at, now()),
  transport_confirmed_at = coalesce(pj.transport_confirmed_at, now()),
  transport_confirmation_source = 'manual',
  transport_confirmed_by = 'xavibocanegra',
  transport_confirmation_note = 'Salida física confirmada por el usuario durante puesta en marcha de GoDEX',
  error = null,
  error_message = null,
  updated_at = now()
from printed_targets target
where pj.id = target.id
  and pj.status = 'claimed';

with cancelled_targets(id) as (
  values
    ('b5a37527-d499-4c2f-88f3-e3e38c148e17'::uuid),
    ('cb78963d-913a-4816-bc17-e17d06b2bbc5'::uuid)
)
update public.print_jobs pj
set
  status = 'cancelled',
  cancelled_at = coalesce(pj.cancelled_at, now()),
  cancelled_by = 'xavibocanegra',
  cancel_reason = 'Cancelado durante puesta en marcha de GoDEX; trabajo histórico no requerido',
  updated_at = now()
from cancelled_targets target
where pj.id = target.id
  and pj.status = 'queued';

create temp table if not exists pg_temp.print_job_reconcile_events on commit drop as
select
  case
    when pj.status = 'printed' then 'PrintJobManuallyConfirmed'
    when pj.status = 'cancelled' then 'PrintJobCancelled'
  end as event_type,
  pj.id::text as correlation_id,
  jsonb_build_object('printJobId', pj.id, 'printerKey', pj.printer_key) as trace,
  jsonb_build_object(
    'printJobId', pj.id,
    'status', pj.status,
    'transportConfirmationSource', pj.transport_confirmation_source,
    'transportConfirmedBy', pj.transport_confirmed_by,
    'transportConfirmationNote', pj.transport_confirmation_note,
    'cancelledBy', pj.cancelled_by,
    'cancelReason', pj.cancel_reason
  ) as payload
from public.print_jobs pj
where pj.id in (
  'a1aadfee-e6bd-4000-ac17-0f2a9b5a3474'::uuid,
  '95d0cf8f-04f8-4fea-b30d-6083a8675981'::uuid,
  'c006313a-7496-478f-a9f2-64f63b1ff43d'::uuid,
  'fdf8ec3c-c15f-4885-9b4b-7bd756e5d5cb'::uuid,
  '3efa2c80-0877-4aaf-9fe6-e6d5e382c789'::uuid,
  'b5a37527-d499-4c2f-88f3-e3e38c148e17'::uuid,
  'cb78963d-913a-4816-bc17-e17d06b2bbc5'::uuid
);

do $$
declare
  v_event_id_type text;
begin
  select udt_name
  into v_event_id_type
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'admin_domain_events'
    and column_name = 'event_id';

  if v_event_id_type = 'uuid' then
    insert into public.admin_domain_events (
      event_id, event_type, occurred_at, correlation_id, actor_id, actor_role,
      source, trace, payload, status, handler_status
    )
    select
      gen_random_uuid(),
      te.event_type,
      now(),
      te.correlation_id,
      'xavibocanegra',
      'admin',
      'print_jobs_reconcile_20260707',
      te.trace,
      te.payload,
      'recorded',
      '{}'::jsonb
    from pg_temp.print_job_reconcile_events te
    where not exists (
      select 1
      from public.admin_domain_events existing
      where existing.event_type = te.event_type
        and existing.correlation_id = te.correlation_id
        and existing.source = 'print_jobs_reconcile_20260707'
    );
  else
    insert into public.admin_domain_events (
      event_id, event_type, occurred_at, correlation_id, actor_id, actor_role,
      source, trace, payload, status, handler_status
    )
    select
      concat('print-job-reconcile-20260707:', te.event_type, ':', te.correlation_id),
      te.event_type,
      now(),
      te.correlation_id,
      'xavibocanegra',
      'admin',
      'print_jobs_reconcile_20260707',
      te.trace,
      te.payload,
      'recorded',
      '{}'::jsonb
    from pg_temp.print_job_reconcile_events te
    where not exists (
      select 1
      from public.admin_domain_events existing
      where existing.event_type = te.event_type
        and existing.correlation_id = te.correlation_id
        and existing.source = 'print_jobs_reconcile_20260707'
    );
  end if;
end $$;

do $$
declare
  v_bad_count integer;
begin
  select count(*)
  into v_bad_count
  from public.print_jobs
  where id in (
    'a1aadfee-e6bd-4000-ac17-0f2a9b5a3474'::uuid,
    '95d0cf8f-04f8-4fea-b30d-6083a8675981'::uuid,
    'c006313a-7496-478f-a9f2-64f63b1ff43d'::uuid,
    'fdf8ec3c-c15f-4885-9b4b-7bd756e5d5cb'::uuid,
    '3efa2c80-0877-4aaf-9fe6-e6d5e382c789'::uuid
  )
  and status <> 'printed';
  if v_bad_count > 0 then raise exception 'Postflight abortado: no todos los claimed quedaron printed'; end if;

  select count(*)
  into v_bad_count
  from public.print_jobs
  where id in (
    'b5a37527-d499-4c2f-88f3-e3e38c148e17'::uuid,
    'cb78963d-913a-4816-bc17-e17d06b2bbc5'::uuid
  )
  and status <> 'cancelled';
  if v_bad_count > 0 then raise exception 'Postflight abortado: no todos los queued quedaron cancelled'; end if;
end $$;

select 'counts_by_status' as section, status, count(*) as jobs
from public.print_jobs
group by status
order by status;

select 'target_rows' as section, *
from public.print_jobs
where id in (
  'a1aadfee-e6bd-4000-ac17-0f2a9b5a3474'::uuid,
  '95d0cf8f-04f8-4fea-b30d-6083a8675981'::uuid,
  'c006313a-7496-478f-a9f2-64f63b1ff43d'::uuid,
  'fdf8ec3c-c15f-4885-9b4b-7bd756e5d5cb'::uuid,
  '3efa2c80-0877-4aaf-9fe6-e6d5e382c789'::uuid,
  'b5a37527-d499-4c2f-88f3-e3e38c148e17'::uuid,
  'cb78963d-913a-4816-bc17-e17d06b2bbc5'::uuid
)
order by created_at, id;

select 'audit_events' as section, event_id, event_type, correlation_id, occurred_at, actor_id, source, trace, payload
from public.admin_domain_events
where source = 'print_jobs_reconcile_20260707'
order by occurred_at, event_type, correlation_id;

select 'remaining_reclaimable_or_uncertain' as section, *
from public.print_jobs
where status in ('queued', 'claimed', 'sending', 'sent_unconfirmed')
order by created_at, id;

commit;
