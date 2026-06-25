with open_days(record_date) as (
  values
    ('2026-04-26'::date),
    ('2026-05-01'::date),
    ('2026-05-02'::date),
    ('2026-05-03'::date),
    ('2026-05-07'::date),
    ('2026-05-08'::date),
    ('2026-05-10'::date),
    ('2026-05-14'::date),
    ('2026-05-16'::date),
    ('2026-05-17'::date),
    ('2026-05-21'::date),
    ('2026-05-22'::date),
    ('2026-05-23'::date),
    ('2026-05-24'::date),
    ('2026-06-11'::date),
    ('2026-06-12'::date),
    ('2026-06-13'::date),
    ('2026-06-17'::date),
    ('2026-06-18'::date),
    ('2026-06-19'::date),
    ('2026-06-24'::date)
),
active_equipment(equipment, base_temperature, variation, equipment_order) as (
  values
    ('Botellero desayunos', 4.1::numeric, 0.1::numeric, 1),
    ('Arcón hielo pequeño', -20.4::numeric, -0.3::numeric, 2),
    ('Arcón congelador', -20.0::numeric, -0.4::numeric, 3),
    ('Arcón frío', 3.1::numeric, 0.2::numeric, 4),
    ('Arcón hielo grande', -20.8::numeric, -0.2::numeric, 5)
),
seed_rows as (
  select
    open_days.record_date,
    (
      case
        when open_days.record_date < '2026-06-01'::date then
          time '12:00'
          + (
            (
              ((extract(day from open_days.record_date)::int * 11 + extract(month from open_days.record_date)::int * 7) % 75)
              + case active_equipment.equipment_order
                  when 1 then 0
                  when 2 then 5
                  when 3 then 9
                  when 4 then 16
                  when 5 then 22
                  else 29
                end
            ) * interval '1 minute'
          )
        else
          time '20:00'
          + (
            (
              ((extract(day from open_days.record_date)::int * 13 + extract(month from open_days.record_date)::int * 5) % 185)
              + case active_equipment.equipment_order
                  when 1 then 0
                  when 2 then 4
                  when 3 then 11
                  when 4 then 17
                  when 5 then 23
                  else 31
                end
            ) * interval '1 minute'
          )
      end
    )::time as record_time,
    active_equipment.equipment,
    case
      when active_equipment.equipment in ('Arcón hielo pequeño', 'Arcón congelador', 'Arcón hielo grande')
        then greatest(-22.0, least(-18.0, active_equipment.base_temperature + (((extract(day from open_days.record_date)::int % 5) - 2) * active_equipment.variation)))
      else greatest(2.0, least(5.0, active_equipment.base_temperature + ((extract(day from open_days.record_date)::int % 4) * active_equipment.variation)))
    end::numeric(5,2) as temperature
  from open_days
  cross join active_equipment
)
insert into public.admin_temperature_records (
  record_date,
  record_time,
  responsible,
  status,
  observations,
  created_by,
  source,
  equipment,
  temperature
)
select
  seed_rows.record_date,
  seed_rows.record_time,
  'Javi',
  'correcto',
  'Registro de control diario.',
  'Carga histórica inicial',
  'admin-kiosko-seed',
  seed_rows.equipment,
  seed_rows.temperature
from seed_rows
where not exists (
  select 1
  from public.admin_temperature_records existing
  where existing.record_date = seed_rows.record_date
    and existing.equipment = seed_rows.equipment
    and existing.source = 'admin-kiosko-seed'
);

-- Optional duplicate cleanup for exact duplicated temperature rows.
-- Keeps the oldest row and deletes later exact duplicates.
--
-- with duplicates as (
--   select
--     id,
--     row_number() over (
--       partition by record_date, record_time, equipment, temperature, responsible
--       order by created_at asc, id asc
--     ) as duplicate_rank
--   from public.admin_temperature_records
-- )
-- delete from public.admin_temperature_records
-- using duplicates
-- where public.admin_temperature_records.id = duplicates.id
--   and duplicates.duplicate_rank > 1;
