-- Preparacion de firma responsable para registros APPCC.
-- Ejecutar una vez en Supabase SQL Editor. Es idempotente.

alter table public.admin_temperature_records
  add column if not exists signed_by text,
  add column if not exists signed_at timestamptz,
  add column if not exists signature_note text;

alter table public.admin_cleaning_records
  add column if not exists signed_by text,
  add column if not exists signed_at timestamptz,
  add column if not exists signature_note text;

alter table public.admin_fryer_oil_records
  add column if not exists signed_by text,
  add column if not exists signed_at timestamptz,
  add column if not exists signature_note text;

alter table public.admin_goods_reception_records
  add column if not exists signed_by text,
  add column if not exists signed_at timestamptz,
  add column if not exists signature_note text;

alter table public.admin_incident_records
  add column if not exists signed_by text,
  add column if not exists signed_at timestamptz,
  add column if not exists signature_note text;

alter table public.admin_checklist_records
  add column if not exists signed_by text,
  add column if not exists signed_at timestamptz,
  add column if not exists signature_note text;
