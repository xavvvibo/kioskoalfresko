-- Limpieza opcional de observaciones APPCC históricas.
-- No cambia fechas, no borra registros y solo sustituye el texto indicado.

update public.admin_temperature_records
set observations = 'Registro de control diario.'
where observations = 'Registro histórico generado a partir de días de apertura.';
