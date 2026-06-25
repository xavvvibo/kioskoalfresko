-- Normalizacion de equipos APPCC de temperaturas.
-- No borra registros historicos. No modifica fechas, temperaturas, responsables ni estados.

update public.admin_temperature_records
set observations = 'No requiere control APPCC por contener únicamente bebidas envasadas.'
where equipment in (
  'Botellero 1 (Fantas y energéticas)',
  'Botellero 2 (Cocacola y Nestea)',
  'Botellero 3 (Cervezas)'
);

update public.admin_temperature_records
set equipment = case equipment
  when 'Botellero 4 (Desayunos)' then 'Botellero desayunos'
  when 'Refrigerador' then 'Arcón frío'
  when 'Cámara refrigeración' then 'Arcón frío'
  when 'Congelador' then 'Arcón congelador'
  else equipment
end
where equipment in (
  'Botellero 4 (Desayunos)',
  'Refrigerador',
  'Cámara refrigeración',
  'Congelador'
);

update public.admin_equipment_alerts
set equipment = case equipment
  when 'Botellero 4 (Desayunos)' then 'Botellero desayunos'
  when 'Refrigerador' then 'Arcón frío'
  when 'Cámara refrigeración' then 'Arcón frío'
  when 'Congelador' then 'Arcón congelador'
  else equipment
end
where equipment in (
  'Botellero 4 (Desayunos)',
  'Refrigerador',
  'Cámara refrigeración',
  'Congelador'
);

-- Comprobacion recomendada:
-- select equipment, count(*)
-- from public.admin_temperature_records
-- group by equipment
-- order by equipment;
