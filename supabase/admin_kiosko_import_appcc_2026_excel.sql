create extension if not exists pgcrypto;

-- Import histórico real desde APPCC_2026(2).xlsx, hoja "Registro Diario".
-- No modifica created_at: queda como fecha/hora real de importación.
-- No crea datos simulados. Todos los registros se marcan con source APPCC_2026_import.

do $$
begin
  if to_regclass('public.admin_temperature_records') is not null then
    alter table public.admin_temperature_records add column if not exists source text default 'admin-kiosko';
  end if;
  if to_regclass('public.admin_cleaning_records') is not null then
    alter table public.admin_cleaning_records add column if not exists source text default 'admin-kiosko';
  end if;
  if to_regclass('public.admin_fryer_oil_records') is not null then
    alter table public.admin_fryer_oil_records add column if not exists source text default 'admin-kiosko';
  end if;
  if to_regclass('public.admin_incident_records') is not null then
    alter table public.admin_incident_records add column if not exists source text default 'admin-kiosko';
  end if;
  if to_regclass('public.admin_equipment_alerts') is not null then
    alter table public.admin_equipment_alerts add column if not exists source text default 'admin-kiosko';
  end if;
end $$;

with source_rows (
  record_date,
  congelador_cocina,
  refrigerador_cocina,
  congelador_almacen,
  refrigerador_desayunos,
  aceite_control_visual,
  aceite_estado,
  aceite_observaciones,
  limpieza_cierre_cocina,
  limpieza_barra,
  limpieza_freidoras_plancha,
  limpieza_superficies_contacto,
  limpieza_residuos,
  incidencias,
  recomendacion
) as (
  values
  ('2026-04-26'::date, -21.3, 2.8, -19.1, 4.0, 'Realizado', 'Correcto', 'Nivel y densidad adecuados.', 'OK', 'OK', 'OK', 'OK', 'OK', 'Sin incidencias.', 'Estándar'),
  ('2026-05-01'::date, -19.1, 2.7, -19.0, 3.5, 'Realizado', 'Correcto', 'Nivel y densidad adecuados.', 'OK', 'OK', 'OK', 'OK', 'OK', 'Sin incidencias.', 'Estándar'),
  ('2026-05-02'::date, -21.5, 2.8, -21.8, 4.7, 'Realizado', 'Filtrar', 'Filtrado de sedimentos al cierre.', 'OK', 'OK', 'OK', 'OK', 'OK', 'Sin incidencias. Alta ocupación por evento.', 'REFORZADO'),
  ('2026-05-03'::date, -18.3, 2.4, -20.8, 4.2, 'Realizado', 'Cambiar', 'Aceite con signos de degradación. Sustitución completa y limpieza de cuba.', 'OK', 'OK', 'OK', 'OK', 'OK', 'Sin incidencias. Alta ocupación por evento.', 'REFORZADO'),
  ('2026-05-07'::date, -21.0, 1.8, -21.3, 2.9, 'Realizado', 'Correcto', 'Nivel y densidad adecuados.', 'OK', 'OK', 'OK', 'OK', 'OK', 'Sin incidencias.', 'Estándar'),
  ('2026-05-08'::date, -19.5, 4.6, -21.2, 4.8, 'Realizado', 'Correcto', 'Nivel y densidad adecuados.', 'OK', 'OK', 'OK', 'OK', 'OK', 'Sin incidencias.', 'Estándar'),
  ('2026-05-10'::date, -19.7, 4.4, -18.9, 2.3, 'Realizado', 'Filtrar', 'Filtrado de sedimentos al cierre.', 'OK', 'OK', 'OK', 'OK', 'OK', 'Sin incidencias.', 'Estándar'),
  ('2026-05-14'::date, -19.4, 6.2, -22.0, 3.0, 'Realizado', 'Filtrar', 'Filtrado de sedimentos al cierre.', 'OK', 'OK', 'OK', 'OK', 'OK', 'Desviación temp. Ref. Cocina (6.2°C). Puerta mal cerrada. Tras corregir, baja a 3.8°C.', 'Estándar'),
  ('2026-05-16'::date, -18.9, 3.2, -21.3, 4.4, 'Realizado', 'Cambiar', 'Aceite con signos de degradación. Sustitución completa y limpieza de cuba.', 'OK', 'OK', 'OK', 'OK', 'OK', 'Sin incidencias.', 'Estándar'),
  ('2026-05-17'::date, -18.4, 2.0, -20.3, 3.8, 'Realizado', 'Correcto', 'Nivel y densidad adecuados.', 'OK', 'OK', 'OK', 'OK', 'OK', 'Sin incidencias.', 'Estándar'),
  ('2026-05-21'::date, -18.5, 1.6, -19.9, 4.8, 'Realizado', 'Correcto', 'Nivel y densidad adecuados.', 'OK', 'OK', 'OK', 'OK', 'OK', 'Sin incidencias.', 'Estándar'),
  ('2026-05-22'::date, -19.5, 3.7, -19.1, 3.4, 'Realizado', 'Filtrar', 'Filtrado de sedimentos al cierre.', 'OK', 'OK', 'OK', 'OK', 'OK', 'Sin incidencias. Alta ocupación por evento.', 'REFORZADO'),
  ('2026-05-23'::date, -20.7, 3.3, -20.0, 2.9, 'Realizado', 'Cambiar', 'Aceite con signos de degradación. Sustitución completa y limpieza de cuba.', 'OK', 'OK', 'OK', 'OK', 'OK', 'Sin incidencias. Alta ocupación por evento.', 'REFORZADO'),
  ('2026-05-24'::date, -18.6, 2.5, -20.2, 4.2, 'Realizado', 'Correcto', 'Nivel y densidad adecuados.', 'OK', 'OK', 'OK', 'OK', 'OK', 'Sin incidencias. Alta ocupación por evento.', 'REFORZADO'),
  ('2026-06-11'::date, -18.8, 4.3, -19.5, 2.6, 'Realizado', 'Correcto', 'Nivel y densidad adecuados.', 'OK', 'OK', 'OK', 'OK', 'OK', 'Sin incidencias.', 'Estándar'),
  ('2026-06-12'::date, -18.7, 4.4, -19.3, 4.2, 'Realizado', 'Filtrar', 'Filtrado de sedimentos al cierre.', 'OK', 'OK', 'OK', 'OK', 'OK', 'Sin incidencias. Alta ocupación por evento.', 'REFORZADO'),
  ('2026-06-13'::date, -19.9, 2.9, -19.8, 2.3, 'Realizado', 'Cambiar', 'Aceite con signos de degradación. Sustitución completa y limpieza de cuba.', 'OK', 'OK', 'OK', 'OK', 'OK', 'Sin incidencias. Alta ocupación por evento.', 'REFORZADO'),
  ('2026-06-17'::date, -19.3, 4.2, -21.4, 4.1, 'Realizado', 'Correcto', 'Nivel y densidad adecuados.', 'OK', 'OK', 'OK', 'OK', 'OK', 'Sin incidencias.', 'Estándar'),
  ('2026-06-18'::date, -19.2, 1.6, -21.8, 3.6, 'Realizado', 'Correcto', 'Nivel y densidad adecuados.', 'OK', 'OK', 'OK', 'OK', 'OK', 'Sin incidencias.', 'Estándar'),
  ('2026-06-19'::date, -21.0, 2.3, -19.6, 3.8, 'Realizado', 'Filtrar', 'Filtrado de sedimentos al cierre.', 'OK', 'OK', 'OK', 'OK', 'OK', 'Reposición de jabón higienizante en zona de lavado. Todo correcto.', 'Estándar'),
  ('2026-06-24'::date, -19.0, 3.2, -20.7, 1.8, 'Realizado', 'Filtrar', 'Filtrado de sedimentos al cierre.', 'OK', 'OK', 'OK', 'OK', 'OK', 'Sin incidencias.', 'Estándar'),
  ('2026-06-25'::date, -21.4, 1.9, -20.0, 4.0, 'Realizado', 'Cambiar', 'Aceite con signos de degradación. Sustitución completa y limpieza de cuba.', 'OK', 'OK', 'OK', 'OK', 'OK', 'Sin incidencias.', 'Estándar'),
  ('2026-06-26'::date, -21.0, 2.6, -18.4, 3.0, 'Realizado', 'Correcto', 'Nivel y densidad adecuados.', 'OK', 'OK', 'OK', 'OK', 'OK', 'Sin incidencias. Alta ocupación por evento.', 'REFORZADO'),
  ('2026-06-27'::date, -19.2, 3.4, -19.5, 3.3, 'Realizado', 'Filtrar', 'Filtrado de sedimentos al cierre.', 'OK', 'OK', 'OK', 'OK', 'OK', 'Sin incidencias. Alta ocupación por evento.', 'REFORZADO'),
  ('2026-06-28'::date, -19.8, 3.7, -21.4, 4.3, 'Realizado', 'Filtrar', 'Filtrado de sedimentos al cierre.', 'OK', 'OK', 'OK', 'OK', 'OK', 'Sin incidencias. Alta ocupación por evento.', 'REFORZADO'),
  ('2026-07-01'::date, -18.6, 1.4, -21.2, 2.6, 'Realizado', 'Filtrar', 'Filtrado rutinario tras servicio de mediodía.', 'OK', 'OK', 'OK', 'OK', 'OK', 'Sin incidencias.', 'Estándar'),
  ('2026-07-02'::date, -21.5, 1.7, -19.6, 2.2, 'Realizado', 'Correcto', 'Coloración y rendimiento óptimos.', 'OK', 'OK', 'OK', 'OK', 'OK', 'Revisión preventiva previa a la activación del congelador de hielo programada para mañana.', 'Estándar')
),
temperature_rows as (
  select
    source_rows.record_date,
    equipment,
    temperature,
    case
      when source_rows.record_date = '2026-05-14'::date and equipment = 'Arcón frío' then 'incidencia'
      when equipment in ('Arcón congelador', 'Arcón hielo grande') and temperature > -18 then 'revisar'
      when equipment in ('Botellero desayunos', 'Arcón frío') and temperature > 5 then 'revisar'
      else 'correcto'
    end as status,
    case
      when source_rows.record_date = '2026-05-14'::date and equipment = 'Arcón frío'
        then 'Origen histórico: APPCC_2026(2).xlsx / sistema anterior. Desviación sanitaria documentada: Refrigerador Cocina 6.2°C. Acción correctiva: puerta mal cerrada; tras corregir, baja a 3.8°C. Recomendación: Estándar.'
      else 'Origen histórico: APPCC_2026(2).xlsx / sistema anterior. Recomendación de control: ' || source_rows.recomendacion || '.'
    end as observations
  from source_rows
  cross join lateral (
    values
      ('Arcón congelador', source_rows.congelador_cocina),
      ('Arcón frío', source_rows.refrigerador_cocina),
      ('Arcón hielo grande', source_rows.congelador_almacen),
      ('Botellero desayunos', source_rows.refrigerador_desayunos)
  ) as mapped(equipment, temperature)
)
insert into public.admin_temperature_records (
  record_date, record_time, responsible, status, observations, created_by, source, equipment, temperature
)
select
  record_date,
  null::time,
  'Sistema anterior APPCC',
  status,
  observations,
  'Importación APPCC_2026(2).xlsx',
  'APPCC_2026_import',
  equipment,
  temperature
from temperature_rows
where not exists (
  select 1
  from public.admin_temperature_records existing
  where existing.record_date = temperature_rows.record_date
    and existing.equipment = temperature_rows.equipment
    and existing.source = 'APPCC_2026_import'
);

with source_rows (
  record_date,
  congelador_cocina,
  refrigerador_cocina,
  congelador_almacen,
  refrigerador_desayunos,
  aceite_control_visual,
  aceite_estado,
  aceite_observaciones,
  limpieza_cierre_cocina,
  limpieza_barra,
  limpieza_freidoras_plancha,
  limpieza_superficies_contacto,
  limpieza_residuos,
  incidencias,
  recomendacion
) as (
  values
  ('2026-04-26'::date, -21.3, 2.8, -19.1, 4.0, 'Realizado', 'Correcto', 'Nivel y densidad adecuados.', 'OK', 'OK', 'OK', 'OK', 'OK', 'Sin incidencias.', 'Estándar'),
  ('2026-05-01'::date, -19.1, 2.7, -19.0, 3.5, 'Realizado', 'Correcto', 'Nivel y densidad adecuados.', 'OK', 'OK', 'OK', 'OK', 'OK', 'Sin incidencias.', 'Estándar'),
  ('2026-05-02'::date, -21.5, 2.8, -21.8, 4.7, 'Realizado', 'Filtrar', 'Filtrado de sedimentos al cierre.', 'OK', 'OK', 'OK', 'OK', 'OK', 'Sin incidencias. Alta ocupación por evento.', 'REFORZADO'),
  ('2026-05-03'::date, -18.3, 2.4, -20.8, 4.2, 'Realizado', 'Cambiar', 'Aceite con signos de degradación. Sustitución completa y limpieza de cuba.', 'OK', 'OK', 'OK', 'OK', 'OK', 'Sin incidencias. Alta ocupación por evento.', 'REFORZADO'),
  ('2026-05-07'::date, -21.0, 1.8, -21.3, 2.9, 'Realizado', 'Correcto', 'Nivel y densidad adecuados.', 'OK', 'OK', 'OK', 'OK', 'OK', 'Sin incidencias.', 'Estándar'),
  ('2026-05-08'::date, -19.5, 4.6, -21.2, 4.8, 'Realizado', 'Correcto', 'Nivel y densidad adecuados.', 'OK', 'OK', 'OK', 'OK', 'OK', 'Sin incidencias.', 'Estándar'),
  ('2026-05-10'::date, -19.7, 4.4, -18.9, 2.3, 'Realizado', 'Filtrar', 'Filtrado de sedimentos al cierre.', 'OK', 'OK', 'OK', 'OK', 'OK', 'Sin incidencias.', 'Estándar'),
  ('2026-05-14'::date, -19.4, 6.2, -22.0, 3.0, 'Realizado', 'Filtrar', 'Filtrado de sedimentos al cierre.', 'OK', 'OK', 'OK', 'OK', 'OK', 'Desviación temp. Ref. Cocina (6.2°C). Puerta mal cerrada. Tras corregir, baja a 3.8°C.', 'Estándar'),
  ('2026-05-16'::date, -18.9, 3.2, -21.3, 4.4, 'Realizado', 'Cambiar', 'Aceite con signos de degradación. Sustitución completa y limpieza de cuba.', 'OK', 'OK', 'OK', 'OK', 'OK', 'Sin incidencias.', 'Estándar'),
  ('2026-05-17'::date, -18.4, 2.0, -20.3, 3.8, 'Realizado', 'Correcto', 'Nivel y densidad adecuados.', 'OK', 'OK', 'OK', 'OK', 'OK', 'Sin incidencias.', 'Estándar'),
  ('2026-05-21'::date, -18.5, 1.6, -19.9, 4.8, 'Realizado', 'Correcto', 'Nivel y densidad adecuados.', 'OK', 'OK', 'OK', 'OK', 'OK', 'Sin incidencias.', 'Estándar'),
  ('2026-05-22'::date, -19.5, 3.7, -19.1, 3.4, 'Realizado', 'Filtrar', 'Filtrado de sedimentos al cierre.', 'OK', 'OK', 'OK', 'OK', 'OK', 'Sin incidencias. Alta ocupación por evento.', 'REFORZADO'),
  ('2026-05-23'::date, -20.7, 3.3, -20.0, 2.9, 'Realizado', 'Cambiar', 'Aceite con signos de degradación. Sustitución completa y limpieza de cuba.', 'OK', 'OK', 'OK', 'OK', 'OK', 'Sin incidencias. Alta ocupación por evento.', 'REFORZADO'),
  ('2026-05-24'::date, -18.6, 2.5, -20.2, 4.2, 'Realizado', 'Correcto', 'Nivel y densidad adecuados.', 'OK', 'OK', 'OK', 'OK', 'OK', 'Sin incidencias. Alta ocupación por evento.', 'REFORZADO'),
  ('2026-06-11'::date, -18.8, 4.3, -19.5, 2.6, 'Realizado', 'Correcto', 'Nivel y densidad adecuados.', 'OK', 'OK', 'OK', 'OK', 'OK', 'Sin incidencias.', 'Estándar'),
  ('2026-06-12'::date, -18.7, 4.4, -19.3, 4.2, 'Realizado', 'Filtrar', 'Filtrado de sedimentos al cierre.', 'OK', 'OK', 'OK', 'OK', 'OK', 'Sin incidencias. Alta ocupación por evento.', 'REFORZADO'),
  ('2026-06-13'::date, -19.9, 2.9, -19.8, 2.3, 'Realizado', 'Cambiar', 'Aceite con signos de degradación. Sustitución completa y limpieza de cuba.', 'OK', 'OK', 'OK', 'OK', 'OK', 'Sin incidencias. Alta ocupación por evento.', 'REFORZADO'),
  ('2026-06-17'::date, -19.3, 4.2, -21.4, 4.1, 'Realizado', 'Correcto', 'Nivel y densidad adecuados.', 'OK', 'OK', 'OK', 'OK', 'OK', 'Sin incidencias.', 'Estándar'),
  ('2026-06-18'::date, -19.2, 1.6, -21.8, 3.6, 'Realizado', 'Correcto', 'Nivel y densidad adecuados.', 'OK', 'OK', 'OK', 'OK', 'OK', 'Sin incidencias.', 'Estándar'),
  ('2026-06-19'::date, -21.0, 2.3, -19.6, 3.8, 'Realizado', 'Filtrar', 'Filtrado de sedimentos al cierre.', 'OK', 'OK', 'OK', 'OK', 'OK', 'Reposición de jabón higienizante en zona de lavado. Todo correcto.', 'Estándar'),
  ('2026-06-24'::date, -19.0, 3.2, -20.7, 1.8, 'Realizado', 'Filtrar', 'Filtrado de sedimentos al cierre.', 'OK', 'OK', 'OK', 'OK', 'OK', 'Sin incidencias.', 'Estándar'),
  ('2026-06-25'::date, -21.4, 1.9, -20.0, 4.0, 'Realizado', 'Cambiar', 'Aceite con signos de degradación. Sustitución completa y limpieza de cuba.', 'OK', 'OK', 'OK', 'OK', 'OK', 'Sin incidencias.', 'Estándar'),
  ('2026-06-26'::date, -21.0, 2.6, -18.4, 3.0, 'Realizado', 'Correcto', 'Nivel y densidad adecuados.', 'OK', 'OK', 'OK', 'OK', 'OK', 'Sin incidencias. Alta ocupación por evento.', 'REFORZADO'),
  ('2026-06-27'::date, -19.2, 3.4, -19.5, 3.3, 'Realizado', 'Filtrar', 'Filtrado de sedimentos al cierre.', 'OK', 'OK', 'OK', 'OK', 'OK', 'Sin incidencias. Alta ocupación por evento.', 'REFORZADO'),
  ('2026-06-28'::date, -19.8, 3.7, -21.4, 4.3, 'Realizado', 'Filtrar', 'Filtrado de sedimentos al cierre.', 'OK', 'OK', 'OK', 'OK', 'OK', 'Sin incidencias. Alta ocupación por evento.', 'REFORZADO'),
  ('2026-07-01'::date, -18.6, 1.4, -21.2, 2.6, 'Realizado', 'Filtrar', 'Filtrado rutinario tras servicio de mediodía.', 'OK', 'OK', 'OK', 'OK', 'OK', 'Sin incidencias.', 'Estándar'),
  ('2026-07-02'::date, -21.5, 1.7, -19.6, 2.2, 'Realizado', 'Correcto', 'Coloración y rendimiento óptimos.', 'OK', 'OK', 'OK', 'OK', 'OK', 'Revisión preventiva previa a la activación del congelador de hielo programada para mañana.', 'Estándar')
)
insert into public.admin_fryer_oil_records (
  record_date, record_time, responsible, status, observations, created_by, source, fryer, oil_status, oil_changed, polar_compounds, color_smell_check
)
select
  record_date,
  null::time,
  'Sistema anterior APPCC',
  case when aceite_estado = 'Cambiar' then 'revisar' else 'correcto' end,
  'Origen histórico: APPCC_2026(2).xlsx / sistema anterior. Control visual: ' || aceite_control_visual || '. Recomendación de control: ' || recomendacion || '.',
  'Importación APPCC_2026(2).xlsx',
  'APPCC_2026_import',
  'Freidora principal',
  aceite_estado,
  aceite_estado = 'Cambiar',
  null,
  aceite_observaciones
from source_rows
where not exists (
  select 1
  from public.admin_fryer_oil_records existing
  where existing.record_date = source_rows.record_date
    and existing.fryer = 'Freidora principal'
    and existing.source = 'APPCC_2026_import'
);

with source_rows (
  record_date,
  congelador_cocina,
  refrigerador_cocina,
  congelador_almacen,
  refrigerador_desayunos,
  aceite_control_visual,
  aceite_estado,
  aceite_observaciones,
  limpieza_cierre_cocina,
  limpieza_barra,
  limpieza_freidoras_plancha,
  limpieza_superficies_contacto,
  limpieza_residuos,
  incidencias,
  recomendacion
) as (
  values
  ('2026-04-26'::date, -21.3, 2.8, -19.1, 4.0, 'Realizado', 'Correcto', 'Nivel y densidad adecuados.', 'OK', 'OK', 'OK', 'OK', 'OK', 'Sin incidencias.', 'Estándar'),
  ('2026-05-01'::date, -19.1, 2.7, -19.0, 3.5, 'Realizado', 'Correcto', 'Nivel y densidad adecuados.', 'OK', 'OK', 'OK', 'OK', 'OK', 'Sin incidencias.', 'Estándar'),
  ('2026-05-02'::date, -21.5, 2.8, -21.8, 4.7, 'Realizado', 'Filtrar', 'Filtrado de sedimentos al cierre.', 'OK', 'OK', 'OK', 'OK', 'OK', 'Sin incidencias. Alta ocupación por evento.', 'REFORZADO'),
  ('2026-05-03'::date, -18.3, 2.4, -20.8, 4.2, 'Realizado', 'Cambiar', 'Aceite con signos de degradación. Sustitución completa y limpieza de cuba.', 'OK', 'OK', 'OK', 'OK', 'OK', 'Sin incidencias. Alta ocupación por evento.', 'REFORZADO'),
  ('2026-05-07'::date, -21.0, 1.8, -21.3, 2.9, 'Realizado', 'Correcto', 'Nivel y densidad adecuados.', 'OK', 'OK', 'OK', 'OK', 'OK', 'Sin incidencias.', 'Estándar'),
  ('2026-05-08'::date, -19.5, 4.6, -21.2, 4.8, 'Realizado', 'Correcto', 'Nivel y densidad adecuados.', 'OK', 'OK', 'OK', 'OK', 'OK', 'Sin incidencias.', 'Estándar'),
  ('2026-05-10'::date, -19.7, 4.4, -18.9, 2.3, 'Realizado', 'Filtrar', 'Filtrado de sedimentos al cierre.', 'OK', 'OK', 'OK', 'OK', 'OK', 'Sin incidencias.', 'Estándar'),
  ('2026-05-14'::date, -19.4, 6.2, -22.0, 3.0, 'Realizado', 'Filtrar', 'Filtrado de sedimentos al cierre.', 'OK', 'OK', 'OK', 'OK', 'OK', 'Desviación temp. Ref. Cocina (6.2°C). Puerta mal cerrada. Tras corregir, baja a 3.8°C.', 'Estándar'),
  ('2026-05-16'::date, -18.9, 3.2, -21.3, 4.4, 'Realizado', 'Cambiar', 'Aceite con signos de degradación. Sustitución completa y limpieza de cuba.', 'OK', 'OK', 'OK', 'OK', 'OK', 'Sin incidencias.', 'Estándar'),
  ('2026-05-17'::date, -18.4, 2.0, -20.3, 3.8, 'Realizado', 'Correcto', 'Nivel y densidad adecuados.', 'OK', 'OK', 'OK', 'OK', 'OK', 'Sin incidencias.', 'Estándar'),
  ('2026-05-21'::date, -18.5, 1.6, -19.9, 4.8, 'Realizado', 'Correcto', 'Nivel y densidad adecuados.', 'OK', 'OK', 'OK', 'OK', 'OK', 'Sin incidencias.', 'Estándar'),
  ('2026-05-22'::date, -19.5, 3.7, -19.1, 3.4, 'Realizado', 'Filtrar', 'Filtrado de sedimentos al cierre.', 'OK', 'OK', 'OK', 'OK', 'OK', 'Sin incidencias. Alta ocupación por evento.', 'REFORZADO'),
  ('2026-05-23'::date, -20.7, 3.3, -20.0, 2.9, 'Realizado', 'Cambiar', 'Aceite con signos de degradación. Sustitución completa y limpieza de cuba.', 'OK', 'OK', 'OK', 'OK', 'OK', 'Sin incidencias. Alta ocupación por evento.', 'REFORZADO'),
  ('2026-05-24'::date, -18.6, 2.5, -20.2, 4.2, 'Realizado', 'Correcto', 'Nivel y densidad adecuados.', 'OK', 'OK', 'OK', 'OK', 'OK', 'Sin incidencias. Alta ocupación por evento.', 'REFORZADO'),
  ('2026-06-11'::date, -18.8, 4.3, -19.5, 2.6, 'Realizado', 'Correcto', 'Nivel y densidad adecuados.', 'OK', 'OK', 'OK', 'OK', 'OK', 'Sin incidencias.', 'Estándar'),
  ('2026-06-12'::date, -18.7, 4.4, -19.3, 4.2, 'Realizado', 'Filtrar', 'Filtrado de sedimentos al cierre.', 'OK', 'OK', 'OK', 'OK', 'OK', 'Sin incidencias. Alta ocupación por evento.', 'REFORZADO'),
  ('2026-06-13'::date, -19.9, 2.9, -19.8, 2.3, 'Realizado', 'Cambiar', 'Aceite con signos de degradación. Sustitución completa y limpieza de cuba.', 'OK', 'OK', 'OK', 'OK', 'OK', 'Sin incidencias. Alta ocupación por evento.', 'REFORZADO'),
  ('2026-06-17'::date, -19.3, 4.2, -21.4, 4.1, 'Realizado', 'Correcto', 'Nivel y densidad adecuados.', 'OK', 'OK', 'OK', 'OK', 'OK', 'Sin incidencias.', 'Estándar'),
  ('2026-06-18'::date, -19.2, 1.6, -21.8, 3.6, 'Realizado', 'Correcto', 'Nivel y densidad adecuados.', 'OK', 'OK', 'OK', 'OK', 'OK', 'Sin incidencias.', 'Estándar'),
  ('2026-06-19'::date, -21.0, 2.3, -19.6, 3.8, 'Realizado', 'Filtrar', 'Filtrado de sedimentos al cierre.', 'OK', 'OK', 'OK', 'OK', 'OK', 'Reposición de jabón higienizante en zona de lavado. Todo correcto.', 'Estándar'),
  ('2026-06-24'::date, -19.0, 3.2, -20.7, 1.8, 'Realizado', 'Filtrar', 'Filtrado de sedimentos al cierre.', 'OK', 'OK', 'OK', 'OK', 'OK', 'Sin incidencias.', 'Estándar'),
  ('2026-06-25'::date, -21.4, 1.9, -20.0, 4.0, 'Realizado', 'Cambiar', 'Aceite con signos de degradación. Sustitución completa y limpieza de cuba.', 'OK', 'OK', 'OK', 'OK', 'OK', 'Sin incidencias.', 'Estándar'),
  ('2026-06-26'::date, -21.0, 2.6, -18.4, 3.0, 'Realizado', 'Correcto', 'Nivel y densidad adecuados.', 'OK', 'OK', 'OK', 'OK', 'OK', 'Sin incidencias. Alta ocupación por evento.', 'REFORZADO'),
  ('2026-06-27'::date, -19.2, 3.4, -19.5, 3.3, 'Realizado', 'Filtrar', 'Filtrado de sedimentos al cierre.', 'OK', 'OK', 'OK', 'OK', 'OK', 'Sin incidencias. Alta ocupación por evento.', 'REFORZADO'),
  ('2026-06-28'::date, -19.8, 3.7, -21.4, 4.3, 'Realizado', 'Filtrar', 'Filtrado de sedimentos al cierre.', 'OK', 'OK', 'OK', 'OK', 'OK', 'Sin incidencias. Alta ocupación por evento.', 'REFORZADO'),
  ('2026-07-01'::date, -18.6, 1.4, -21.2, 2.6, 'Realizado', 'Filtrar', 'Filtrado rutinario tras servicio de mediodía.', 'OK', 'OK', 'OK', 'OK', 'OK', 'Sin incidencias.', 'Estándar'),
  ('2026-07-02'::date, -21.5, 1.7, -19.6, 2.2, 'Realizado', 'Correcto', 'Coloración y rendimiento óptimos.', 'OK', 'OK', 'OK', 'OK', 'OK', 'Revisión preventiva previa a la activación del congelador de hielo programada para mañana.', 'Estándar')
)
insert into public.admin_cleaning_records (
  record_date, record_time, responsible, status, observations, created_by, source, area, shift, cleaning_done, products_used
)
select
  record_date,
  null::time,
  'Sistema anterior APPCC',
  'correcto',
  'Origen histórico: APPCC_2026(2).xlsx / sistema anterior. Cierre cocina: ' || limpieza_cierre_cocina || '. Barra: ' || limpieza_barra || '. Freidoras/Plancha: ' || limpieza_freidoras_plancha || '. Superficies contacto: ' || limpieza_superficies_contacto || '. Residuos: ' || limpieza_residuos || '. Recomendación de control: ' || recomendacion || '.',
  'Importación APPCC_2026(2).xlsx',
  'APPCC_2026_import',
  'Cierre APPCC diario',
  'Cierre',
  true,
  'Según plan de limpieza y desinfección'
from source_rows
where not exists (
  select 1
  from public.admin_cleaning_records existing
  where existing.record_date = source_rows.record_date
    and existing.area = 'Cierre APPCC diario'
    and existing.source = 'APPCC_2026_import'
);

with source_rows (
  record_date,
  incidencias,
  recomendacion
) as (
  values
  ('2026-04-26'::date, 'Sin incidencias.', 'Estándar'),
  ('2026-05-01'::date, 'Sin incidencias.', 'Estándar'),
  ('2026-05-02'::date, 'Sin incidencias. Alta ocupación por evento.', 'REFORZADO'),
  ('2026-05-03'::date, 'Sin incidencias. Alta ocupación por evento.', 'REFORZADO'),
  ('2026-05-07'::date, 'Sin incidencias.', 'Estándar'),
  ('2026-05-08'::date, 'Sin incidencias.', 'Estándar'),
  ('2026-05-10'::date, 'Sin incidencias.', 'Estándar'),
  ('2026-05-14'::date, 'Desviación temp. Ref. Cocina (6.2°C). Puerta mal cerrada. Tras corregir, baja a 3.8°C.', 'Estándar'),
  ('2026-05-16'::date, 'Sin incidencias.', 'Estándar'),
  ('2026-05-17'::date, 'Sin incidencias.', 'Estándar'),
  ('2026-05-21'::date, 'Sin incidencias.', 'Estándar'),
  ('2026-05-22'::date, 'Sin incidencias. Alta ocupación por evento.', 'REFORZADO'),
  ('2026-05-23'::date, 'Sin incidencias. Alta ocupación por evento.', 'REFORZADO'),
  ('2026-05-24'::date, 'Sin incidencias. Alta ocupación por evento.', 'REFORZADO'),
  ('2026-06-11'::date, 'Sin incidencias.', 'Estándar'),
  ('2026-06-12'::date, 'Sin incidencias. Alta ocupación por evento.', 'REFORZADO'),
  ('2026-06-13'::date, 'Sin incidencias. Alta ocupación por evento.', 'REFORZADO'),
  ('2026-06-17'::date, 'Sin incidencias.', 'Estándar'),
  ('2026-06-18'::date, 'Sin incidencias.', 'Estándar'),
  ('2026-06-19'::date, 'Reposición de jabón higienizante en zona de lavado. Todo correcto.', 'Estándar'),
  ('2026-06-24'::date, 'Sin incidencias.', 'Estándar'),
  ('2026-06-25'::date, 'Sin incidencias.', 'Estándar'),
  ('2026-06-26'::date, 'Sin incidencias. Alta ocupación por evento.', 'REFORZADO'),
  ('2026-06-27'::date, 'Sin incidencias. Alta ocupación por evento.', 'REFORZADO'),
  ('2026-06-28'::date, 'Sin incidencias. Alta ocupación por evento.', 'REFORZADO'),
  ('2026-07-01'::date, 'Sin incidencias.', 'Estándar'),
  ('2026-07-02'::date, 'Revisión preventiva previa a la activación del congelador de hielo programada para mañana.', 'Estándar')
)
insert into public.admin_incident_records (
  record_date, record_time, responsible, status, observations, created_by, source, incident_type, severity, corrective_action, resolved
)
select
  record_date,
  null::time,
  'Sistema anterior APPCC',
  case when record_date = '2026-05-14'::date then 'resuelta' else 'correcto' end,
  'Origen histórico: APPCC_2026(2).xlsx / sistema anterior. Registro de incidencias: ' || incidencias || ' Recomendación de control: ' || recomendacion || '.',
  'Importación APPCC_2026(2).xlsx',
  'APPCC_2026_import',
  case when record_date = '2026-05-14'::date then 'Desviación temperatura Refrigerador Cocina' else 'Registro diario de incidencias' end,
  case when record_date = '2026-05-14'::date then 'incidencia_resuelta' else 'sin_incidencias' end,
  case when record_date = '2026-05-14'::date then 'Puerta mal cerrada. Tras corregir, baja a 3.8°C.' else null end,
  true
from source_rows
where not exists (
  select 1
  from public.admin_incident_records existing
  where existing.record_date = source_rows.record_date
    and existing.incident_type = case when source_rows.record_date = '2026-05-14'::date then 'Desviación temperatura Refrigerador Cocina' else 'Registro diario de incidencias' end
    and existing.source = 'APPCC_2026_import'
);

insert into public.admin_equipment_alerts (
  equipment, alert_date, alert_time, temperature, alert_level, status, description, corrective_action, resolved_at, resolved_by, source
)
select
  'Arcón frío',
  '2026-05-14'::date,
  null::time,
  6.2,
  'aviso',
  'solventado',
  'Importación histórica APPCC_2026(2).xlsx: desviación temp. Refrigerador Cocina 6.2°C.',
  'Puerta mal cerrada. Tras corregir, baja a 3.8°C.',
  now(),
  'Sistema anterior APPCC',
  'APPCC_2026_import'
where not exists (
  select 1
  from public.admin_equipment_alerts existing
  where existing.alert_date = '2026-05-14'::date
    and existing.equipment = 'Arcón frío'
    and existing.source = 'APPCC_2026_import'
);

do $$
begin
  if to_regclass('public.admin_domain_events') is not null then
    insert into public.admin_domain_events (
      event_id,
      event_type,
      occurred_at,
      correlation_id,
      actor_id,
      actor_role,
      source,
      trace,
      payload,
      status
    )
    select
      'historical-appcc-records-imported-appcc-2026-2',
      'HistoricalAppccRecordsImported',
      now(),
      'APPCC_2026_import',
      'Sistema anterior APPCC',
      'system',
      'appcc',
      '{"source_file":"APPCC_2026(2).xlsx","sheet":"Registro Diario"}'::jsonb,
      jsonb_build_object(
        'temperature_records', 108,
        'cleaning_records', 27,
        'fryer_oil_records', 27,
        'incident_records', 27,
        'equipment_alerts', 1,
        'source', 'APPCC_2026_import',
        'audit_note', 'created_at conserva fecha real de importación; fechas históricas se guardan en record_date'
      ),
      'recorded'
    where not exists (
      select 1
      from public.admin_domain_events existing
      where existing.event_id = 'historical-appcc-records-imported-appcc-2026-2'
    );
  end if;
end $$;
