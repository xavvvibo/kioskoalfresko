-- Cleanup seguro de registros de temperatura Kiosko Alfresko.
-- Ejecutar después de aplicar admin_kiosko_schema.sql.
--
-- Objetivos:
-- 1. Normalizar el equipo antiguo "Cámara refrigeración" a "Refrigerador".
-- 2. Eliminar duplicados exactos manteniendo el registro más antiguo.
-- 3. No tocar registros seed correctos salvo que participen en un duplicado exacto real.

begin;

-- A) Normalización de nombre antiguo de equipo.
update public.admin_temperature_records
set equipment = 'Refrigerador'
where equipment = 'Cámara refrigeración';

-- B) Eliminación de duplicados exactos.
-- Definición de duplicado:
-- record_date + record_time + equipment + temperature + responsible + source.
-- Se mantiene el registro más antiguo por created_at y, si empata, por id.
with duplicates as (
  select
    id,
    row_number() over (
      partition by record_date, record_time, equipment, temperature, responsible, source
      order by created_at asc, id asc
    ) as duplicate_rank
  from public.admin_temperature_records
)
delete from public.admin_temperature_records
using duplicates
where public.admin_temperature_records.id = duplicates.id
  and duplicates.duplicate_rank > 1;

commit;

-- Queries de comprobación opcionales:
--
-- select equipment, count(*)
-- from public.admin_temperature_records
-- group by equipment
-- order by equipment;
--
-- select record_date, record_time, equipment, temperature, responsible, source, count(*)
-- from public.admin_temperature_records
-- group by record_date, record_time, equipment, temperature, responsible, source
-- having count(*) > 1;
