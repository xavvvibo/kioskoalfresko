create extension if not exists pgcrypto;

create table if not exists public.print_jobs (
  id uuid primary key default gen_random_uuid(),
  printer_key text not null,
  label_type text not null,
  payload_json jsonb not null default '{}'::jsonb,
  status text not null default 'pending',
  attempts integer not null default 0,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  claimed_at timestamptz,
  printed_at timestamptz
);

alter table if exists public.print_jobs
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists claimed_at timestamptz;

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
  if to_regclass('public.print_jobs') is not null
     and not exists (select 1 from pg_constraint where conname = 'print_jobs_status_chk') then
    alter table public.print_jobs
      add constraint print_jobs_status_chk
      check (status in ('pending', 'printing', 'printed', 'error'));
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

create index if not exists print_jobs_stale_printing_idx
  on public.print_jobs (status, claimed_at asc)
  where status = 'printing';

create or replace function public.claim_next_print_jobs(
  p_printer_key text,
  p_limit integer default 1,
  p_max_attempts integer default 3
)
returns table (
  id uuid,
  printer_key text,
  label_type text,
  payload_json jsonb,
  status text,
  attempts integer,
  error_message text,
  created_at timestamptz,
  printed_at timestamptz,
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
      and pj.status in ('pending', 'error')
      and pj.attempts < least(greatest(p_max_attempts, 1), 3)
    order by
      case when pj.status = 'pending' then 0 else 1 end,
      pj.created_at asc
    for update skip locked
    limit least(greatest(p_limit, 1), 10)
  )
  update public.print_jobs pj
  set
    status = 'printing',
    attempts = pj.attempts + 1,
    error_message = null,
    claimed_at = now(),
    updated_at = now()
  from locked
  where pj.id = locked.id
  returning
    pj.id,
    pj.printer_key,
    pj.label_type,
    pj.payload_json,
    pj.status,
    pj.attempts,
    pj.error_message,
    pj.created_at,
    pj.printed_at,
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
  payload_json jsonb,
  status text,
  attempts integer,
  error_message text,
  created_at timestamptz,
  updated_at timestamptz,
  claimed_at timestamptz,
  printed_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  update public.print_jobs pj
  set
    status = 'error',
    error_message = concat(
      'Recuperado automaticamente: trabajo atascado en printing mas de ',
      least(greatest(p_stale_minutes, 1), 120)::text,
      ' minutos.'
    ),
    updated_at = now()
  where pj.status = 'printing'
    and coalesce(pj.claimed_at, pj.created_at) < now() - make_interval(mins => least(greatest(p_stale_minutes, 1), 120))
  returning
    pj.id,
    pj.printer_key,
    pj.label_type,
    pj.payload_json,
    pj.status,
    pj.attempts,
    pj.error_message,
    pj.created_at,
    pj.updated_at,
    pj.claimed_at,
    pj.printed_at;
end;
$$;

revoke all on function public.claim_next_print_jobs(text, integer, integer) from public, anon, authenticated;
grant execute on function public.claim_next_print_jobs(text, integer, integer) to service_role;

revoke all on function public.recover_stale_print_jobs(integer) from public, anon, authenticated;
grant execute on function public.recover_stale_print_jobs(integer) to service_role;

comment on table public.print_jobs is
  'Cola interna de impresion del ERP. El bridge Windows reclama trabajos, imprime RAW en la impresora local y reporta printed/error.';

comment on column public.print_jobs.printer_key is
  'Clave logica de impresora, por ejemplo godex_g500_kiosko.';

comment on column public.print_jobs.payload_json is
  'Payload funcional de etiqueta. El comando RAW se genera desde el backend al reclamar el trabajo.';

comment on column public.print_jobs.status is
  'Estado de cola: pending, printing, printed o error.';

comment on column public.print_jobs.attempts is
  'Intentos de impresion reclamados por el bridge. Maximo operativo: 3.';

comment on column public.print_jobs.claimed_at is
  'Fecha/hora en la que un bridge reclamo el trabajo y lo paso a printing.';

comment on function public.claim_next_print_jobs(text, integer, integer) is
  'Reclama trabajos de impresion de forma atomica con FOR UPDATE SKIP LOCKED. Evita doble impresion con varios bridges simultaneos.';

comment on function public.recover_stale_print_jobs(integer) is
  'Mueve a error trabajos atascados en printing durante mas del umbral indicado para permitir reintento controlado.';
