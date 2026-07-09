create extension if not exists pgcrypto;

-- Inventario congelado registrado el 08/07/2026.
-- Seguro e idempotente: no borra datos, no duplica lotes FRZ-20260708-XXX.

create unique index if not exists admin_inventory_products_name_unique_idx
  on public.admin_inventory_products (lower(name));

alter table if exists public.admin_inventory_products
  add column if not exists product_family text,
  add column if not exists accounting_category text,
  add column if not exists storage_temperature text,
  add column if not exists default_location text,
  add column if not exists requires_traceability boolean default false,
  add column if not exists requires_appcc_reception boolean default false,
  add column if not exists generates_inventory_lot boolean default false;

alter table if exists public.admin_inventory_lots
  add column if not exists manufacturer_lot text,
  add column if not exists document_date date,
  add column if not exists invoice_date date,
  add column if not exists delivery_note_date date,
  add column if not exists received_at date,
  add column if not exists inventory_checked_at date,
  add column if not exists storage_placed_at date,
  add column if not exists invoice_ref text,
  add column if not exists purchase_source text,
  add column if not exists source_note text,
  add column if not exists reconciliation_reason text,
  add column if not exists requires_traceability boolean default false,
  add column if not exists requires_appcc_reception boolean default false,
  add column if not exists generates_inventory_lot boolean default true,
  add column if not exists product_family text,
  add column if not exists storage_temperature text,
  add column if not exists default_location text,
  add column if not exists expiry_source text,
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by text,
  add column if not exists review_notes text,
  add column if not exists appcc_review_status text default 'pendiente_revision';

alter table if exists public.admin_inventory_lot_movements
  add column if not exists related_record_type text,
  add column if not exists related_record_id uuid;

with source_products as (
  select *
  from jsonb_to_recordset($json$
  [
    {"item_no":1,"product_name":"Croqueta de jamón ibérico","brand_supplier":"Makro / Precongelados Frisa S.L.U.","package_count":1,"package_weight_kg":1,"approx_units":"25 uds aprox.","manufacturer_lot":"26051C","expiry_date":"2027-08-19","expiry_visible":"19/08/2027","review_state":"accepted_frozen","allergens":"Leche, trigo/gluten, huevo, mantequilla. Puede contener crustáceos, pescados, soja, apio, mostaza, sulfitos y/o moluscos."},
    {"item_no":2,"product_name":"Boletus a la trufa","brand_supplier":"La Culinaria / Pastoret","package_count":6,"package_weight_kg":1,"manufacturer_lot":"25350A","expiry_date":"2027-06-06","expiry_visible":"06/06/2027","review_state":"accepted_frozen","allergens":"Leche, trigo/gluten, huevo; puede contener crustáceos, pescado, soja, apio, mostaza, sulfitos y moluscos."},
    {"item_no":3,"product_name":"Vacuno al vino tinto","brand_supplier":"La Culinaria / Pastoret","package_count":6,"package_weight_kg":1,"manufacturer_lot":"26019A","expiry_date":"2027-04-30","expiry_visible":"30/04/2027","review_state":"accepted_frozen","allergens":"Leche, trigo/gluten, sulfitos; puede contener crustáceos, huevo, pescado, soja, apio, mostaza y moluscos."},
    {"item_no":4,"product_name":"Queso azul y cebolla caramelizada","brand_supplier":"La Culinaria / Pastoret","package_count":5,"package_weight_kg":1,"manufacturer_lot":"25364A","expiry_date":"2027-02-16","expiry_visible":"16/02/2027","review_state":"accepted_frozen","allergens":"Leche, trigo/gluten, huevo; puede contener pescado, soja, apio, mostaza, moluscos y sulfitos."},
    {"item_no":5,"product_name":"Croqueta de boletus","brand_supplier":"Metro Premium","package_count":1,"package_weight_kg":1,"approx_units":"25 uds aprox.","review_state":"pending_review_for_missing_lot_expiry","review_note":"Lote/caducidad no visible en foto."},
    {"item_no":6,"product_name":"Croqueta de rabo de vacuno","brand_supplier":"Metro Premium","package_count":1,"package_weight_kg":1,"approx_units":"25 uds aprox.","review_state":"pending_review_for_missing_lot_expiry","review_note":"Lote/caducidad no visible en foto."},
    {"item_no":7,"product_name":"Tequeños con queso","brand_supplier":"K-T-DRA","package_count":1,"package_weight_kg":1.75,"approx_units":"50 uds","manufacturer_lot_visible":"LV141LB aprox.; revisar","expiry_visible":"10/2027 aprox.; revisar","review_state":"pending_review_for_missing_lot_expiry","allergens":"Gluten y leche; revisar ficha para exactitud.","review_note":"Lote y caducidad aproximados; falta validación documental exacta."},
    {"item_no":8,"product_name":"Verduras para paella","brand_supplier":"Metro Chef","package_count":2,"package_weight_kg":1,"ingredients":"Judía verde plana, garrofón, alubias blancas.","review_state":"pending_review_for_missing_lot_expiry","review_note":"Lote/caducidad no visible."},
    {"item_no":9,"product_name":"Tortillita de camarón","brand_supplier":"Metro Chef","package_count":3,"package_weight_kg":1,"approx_units":"30/37 uds por envase aprox.","manufacturer_lot_visible":"26:63 aprox.; revisar","expiry_date":"2027-12-12","expiry_visible":"12/12/2027","review_state":"pending_review_for_missing_lot_expiry","allergens":"Trigo/gluten, crustáceos/camarón, huevo, mostaza, soja. Puede contener leche, pescado y sulfitos.","review_note":"Lote visible aproximado; revisar."},
    {"item_no":10,"product_name":"Croquetas de ibérico","brand_supplier":"Metro Chef","package_count":1,"package_weight_kg":1,"approx_units":"28 uds aprox.","manufacturer_lot":"26101A","expiry_date":"2028-04-09","expiry_visible":"09/04/2028","review_state":"accepted_frozen"},
    {"item_no":11,"product_name":"Cream Cheese Jalapeños","brand_supplier":"Metro Chef","package_count":2,"package_weight_kg":1,"approx_units":"26-30 piezas","expiry_date":"2027-03-15","expiry_visible":"15/03/2027 aprox.","review_state":"pending_review_for_missing_lot_expiry","allergens":"Revisar ficha; probable leche/gluten.","review_note":"Lote no visible; alérgenos pendientes de ficha."},
    {"item_no":12,"product_name":"Croquetas de carne receta casera","brand_supplier":"Metro Chef","package_count":3,"package_weight_kg":null,"approx_units":"33 uds por envase aprox.","review_state":"pending_review_for_weight_lot_expiry","review_note":"Varios envases de 2 kg; revisar peso exacto por envase, lote y caducidad."},
    {"item_no":13,"product_name":"Croquetas de jamón receta casera","brand_supplier":"Metro Chef","package_count":2,"package_weight_kg":2,"approx_units":"33 uds por envase aprox.","review_state":"pending_review_for_missing_lot_expiry","review_note":"Lote/caducidad no visible."},
    {"item_no":14,"product_name":"Croquetas de pollo y cebolla","brand_supplier":"Metro Chef","package_count":1,"package_weight_kg":null,"review_state":"pending_review_for_weight_lot_expiry","review_note":"Peso probablemente 2 kg; revisar peso exacto, lote y caducidad."},
    {"item_no":15,"product_name":"Mini Burger de pollo","brand_supplier":"Simonini Food","package_count":3,"package_weight_kg":1,"expiry_visible":"11.06.26 visible; revisar","review_state":"quarantine_pending_date_validation","review_note":"Fecha visible anterior a recepción 08/07/2026. CUARENTENA: no usar hasta validar manualmente."},
    {"item_no":16,"product_name":"Nuggets de pollo rebozados","brand_supplier":"Quality","package_count":1,"package_weight_kg":1,"review_state":"pending_review_for_missing_lot_expiry","review_note":"Lote/caducidad no visible."},
    {"item_no":17,"product_name":"Pincho / preparado de pollo y bacon","brand_supplier":"Quality","package_count":1,"package_weight_kg":null,"manufacturer_lot":"L-020915","expiry_visible":"07/2027","review_state":"pending_review_for_weight_lot_expiry","allergens":"Leche/lactosa, soja, gluten/trigo, sulfitos; revisar ficha.","review_note":"Peso probablemente 1 kg y caducidad visible solo mes/año; revisar."},
    {"item_no":18,"product_name":"Gyoza Yasai","brand_supplier":"JapCook","package_count":1,"package_weight_kg":0.6,"ingredients":"Empanadillas japonesas vegetales.","review_state":"pending_review_for_missing_lot_expiry","allergens":"Gluten/trigo, soja, sésamo; revisar ficha.","review_note":"Lote/caducidad no visible."},
    {"item_no":19,"product_name":"Albóndigas / bolas de carne congeladas","brand_supplier":null,"package_count":1,"package_weight_kg":null,"review_state":"pending_review_manual_identification","review_note":"Proveedor, peso, lote y caducidad no visibles."},
    {"item_no":20,"product_name":"Longaniza fresca","brand_supplier":null,"package_count":1,"package_weight_kg":null,"review_state":"frozen_pending_review","review_note":"Etiqueta manuscrita requiere revisión frente a albarán. Recibido congelado según factura/albarán."},
    {"item_no":21,"product_name":"Contramuslo / pollo","brand_supplier":null,"package_count":1,"package_weight_kg":null,"review_state":"pending_review_manual_identification","review_note":"Peso/lote/caducidad a revisar."},
    {"item_no":22,"product_name":"Alitas de pollo","brand_supplier":"Makro Granada","document_date":"2026-07-03","invoice_ref":"201-0037200","package_count":2,"package_weight_kg":null,"manufacturer_lot":"26002377","review_state":"frozen_pending_review","review_note":"Asociado a POLLO ALAS VC AI KG de factura 201-0037200 por regla explícita. Cantidades documentadas 1,312 kg + 1,372 kg + 1,224 kg; revisar correspondencia por envase físico antes de usar."},
    {"item_no":23,"product_name":"Chorizo fresco","brand_supplier":null,"package_count":1,"package_weight_kg":null,"review_state":"frozen_pending_review","review_note":"Etiqueta manuscrita visible; revisar."},
    {"item_no":24,"product_name":"Chorizo criollo","brand_supplier":null,"package_count":2,"package_weight_kg":null,"review_state":"frozen_pending_review","review_note":"Etiquetas manuscritas visibles; revisar."},
    {"item_no":25,"product_name":"Panceta fresca","brand_supplier":null,"package_count":1,"package_weight_kg":null,"review_state":"frozen_pending_review","review_note":"Etiqueta manuscrita visible; revisar."},
    {"item_no":26,"product_name":"Morcilla cortijera","brand_supplier":"Cárnicas Paquito","package_count":1,"package_weight_kg":null,"review_state":"frozen_pending_review","review_note":"Peso/lote/caducidad a revisar desde etiqueta."},
    {"item_no":27,"product_name":"Guacamole","brand_supplier":null,"package_count":1,"package_weight_kg":0.95,"review_state":"pending_review_for_lot_expiry","review_note":"Marca, lote y caducidad a revisar."}
  ]
  $json$) as item(
    item_no int,
    product_name text,
    brand_supplier text,
    document_date date,
    invoice_ref text,
    package_count int,
    package_weight_kg numeric,
    approx_units text,
    manufacturer_lot text,
    manufacturer_lot_visible text,
    expiry_date date,
    expiry_visible text,
    review_state text,
    allergens text,
    ingredients text,
    review_note text
  )
),
upsert_products as (
  insert into public.admin_inventory_products (
    name, category, usual_supplier, unit, current_stock, location, current_batch, expiry_date,
    last_entry_date, observations, active, product_family, accounting_category, storage_temperature,
    default_location, requires_traceability, requires_appcc_reception, generates_inventory_lot
  )
  select
    sp.product_name,
    'congelado',
    sp.brand_supplier,
    case when sp.package_weight_kg is null then 'envase' else 'kg' end,
    sum(coalesce(sp.package_weight_kg, 1)) over (partition by sp.product_name),
    'Congelador -18 C',
    'FRZ-20260708',
    min(sp.expiry_date) over (partition by sp.product_name),
    '2026-07-08'::date,
    concat_ws(E'\n',
      'Batch: FRZ-20260708',
      'Fecha factura/albarán: pendiente de revisión documental.',
      'Fecha registro/inventario: 2026-07-08.',
      'Estado APPCC entrada: RECIBIDO CONGELADO pendiente de fecha documental.',
      'Estado actual: CONGELADO.',
      'Fuente documental: Inventario congelado 08jul2026.zip / fotos de producto y fichas.',
      'Observación general: Llegó congelado según factura/albarán y continúa congelado.',
    sp.review_note,
      sp.allergens,
      sp.ingredients
    ),
    true,
    'congelado',
    'food_frozen',
    '-18 C o inferior',
    'Congelador -18 C',
    true,
    true,
    true
  from source_products sp
  on conflict ((lower(name))) do update set
    updated_at = now(),
    category = excluded.category,
    usual_supplier = coalesce(excluded.usual_supplier, public.admin_inventory_products.usual_supplier),
    unit = excluded.unit,
    location = excluded.location,
    current_batch = excluded.current_batch,
    expiry_date = coalesce(public.admin_inventory_products.expiry_date, excluded.expiry_date),
    last_entry_date = excluded.last_entry_date,
    observations = excluded.observations,
    product_family = excluded.product_family,
    accounting_category = excluded.accounting_category,
    storage_temperature = excluded.storage_temperature,
    default_location = excluded.default_location,
    requires_traceability = true,
    requires_appcc_reception = true,
    generates_inventory_lot = true
  returning id, name
),
expanded_lots as (
  select
    sp.*,
    gs.package_index,
    ('FRZ-20260708-' || lpad(row_number() over (order by sp.item_no, gs.package_index)::text, 3, '0')) as internal_lot,
    case
      when sp.review_state = 'accepted_frozen' and sp.document_date is null then 'pending_review_for_document_date'
      else sp.review_state
    end as effective_review_state,
    case
      when sp.review_state = 'accepted_frozen' and sp.document_date is not null then 'activo'
      when sp.review_state = 'quarantine_pending_date_validation' then 'bloqueado'
      else 'activo'
    end as lot_status,
    case
      when sp.review_state = 'accepted_frozen' and sp.document_date is not null then 'revisado'
      when sp.review_state in ('quarantine_pending_date_validation', 'pending_review_manual_identification') or sp.document_date is null then 'requiere_documentacion'
      else 'requiere_documentacion'
    end as appcc_review_status
  from source_products sp
  cross join lateral generate_series(1, sp.package_count) as gs(package_index)
),
lot_payload as (
  select
    el.*,
    p.id as product_id,
    el.invoice_ref as latest_invoice_ref,
    'invoice'::text as purchase_source,
    case
      when el.document_date is null then 'Sin match documental fiable en facturas disponibles; requiere revisión de fecha factura/albarán.'
      else 'Regularización de stock autorizada por responsable; se usa compra más reciente disponible.'
    end as source_note,
    case
      when el.document_date is null then 'Pendiente de localizar factura/albarán fiable para este producto.'
      else 'Regularización de stock autorizada por responsable. Se asigna la fecha de compra más reciente disponible porque el stock de compras anteriores se considera consumido por ventas.'
    end as reconciliation_reason,
    concat_ws(E'\n',
      'BatchCode: FRZ-20260708',
      'DocumentDate: ' || coalesce(el.document_date::text, 'pendiente_revision'),
      'ReceivedAt: ' || coalesce(el.document_date::text, 'pendiente_revision'),
      'InventoryCheckedAt: 2026-07-08',
      'InvoiceRef: ' || coalesce(el.invoice_ref, 'pendiente_revision'),
      'StorageState: frozen',
      'AppccStatus: ' || case when el.effective_review_state = 'accepted_frozen' then 'accepted_frozen' else 'revision_fecha_documento' end,
      'Source: invoice_delivery_note_and_product_photos',
      'Fuente documental: Inventario congelado 08jul2026.zip / fotos de producto y fichas',
      'Observación general: Llegó congelado según factura/albarán y continúa congelado.',
      'Conservación: -18 C o inferior.',
      'Aviso etiqueta: MANTENER CONGELADO · NO RECONGELAR TRAS DESCONGELACIÓN.',
      case when el.document_date is null then 'SourceNote: Sin match documental fiable en facturas disponibles; requiere revisión de fecha factura/albarán.' end,
      case when el.effective_review_state = 'pending_review_for_document_date' then 'REVISAR FECHA FACTURA/ALBARÁN ANTES DE USAR.' end,
      case when el.review_state = 'quarantine_pending_date_validation' then 'CUARENTENA · REVISAR FECHA · NO USAR.' end,
      case when el.effective_review_state <> 'accepted_frozen' and el.effective_review_state <> 'quarantine_pending_date_validation' and el.effective_review_state <> 'pending_review_for_document_date' then 'REVISAR DATOS ANTES DE USAR.' end,
      'ReviewState: ' || el.effective_review_state,
      'Envase: ' || el.package_index || '/' || el.package_count,
      'Lote fabricante visible: ' || coalesce(el.manufacturer_lot, el.manufacturer_lot_visible, 'pendiente_revision'),
      'Caducidad visible: ' || coalesce(el.expiry_visible, 'pendiente_revision'),
      el.review_note,
      el.allergens,
      el.ingredients
    ) as lot_observations
  from expanded_lots el
  join public.admin_inventory_products p on lower(p.name) = lower(el.product_name)
),
inserted_lots as (
  insert into public.admin_inventory_lots (
    product_id, product_name, supplier_name, batch_number, manufacturer_lot, expiry_date,
    received_date, document_date, invoice_date, delivery_note_date, received_at,
    inventory_checked_at, storage_placed_at, invoice_ref, purchase_source, source_note,
    reconciliation_reason, initial_quantity, current_quantity, unit, location, status,
    requires_traceability, requires_appcc_reception, generates_inventory_lot, product_family,
    storage_temperature, default_location, expiry_source, reviewed_at, reviewed_by,
    review_notes, appcc_review_status, observations, source
  )
  select
    lp.product_id,
    lp.product_name,
    lp.brand_supplier,
    lp.internal_lot,
    lp.manufacturer_lot,
    lp.expiry_date,
    lp.document_date,
    lp.document_date,
    lp.document_date,
    lp.document_date,
    lp.document_date,
    '2026-07-08'::date,
    lp.document_date,
    lp.latest_invoice_ref,
    lp.purchase_source,
    lp.source_note,
    lp.reconciliation_reason,
    coalesce(lp.package_weight_kg, 1),
    coalesce(lp.package_weight_kg, 1),
    case when lp.package_weight_kg is null then 'envase' else 'kg' end,
    'Congelador -18 C',
    lp.lot_status,
    true,
    true,
    true,
    'congelado',
    '-18 C o inferior',
    'Congelador -18 C',
    case when lp.expiry_date is not null and lp.manufacturer_lot is not null and lp.document_date is not null then 'real_documentada' else null end,
    case when lp.effective_review_state = 'accepted_frozen' then now() else null end,
    case when lp.effective_review_state = 'accepted_frozen' then 'F. Javier Bocanegra Sanjuan' else null end,
    lp.review_note,
    lp.appcc_review_status,
    lp.lot_observations,
    'invoice_delivery_note_and_product_photos'
  from lot_payload lp
  where not exists (
    select 1 from public.admin_inventory_lots existing
    where existing.batch_number = lp.internal_lot
  )
  returning id, batch_number, product_id, current_quantity, unit
),
updated_lots as (
  update public.admin_inventory_lots lot
  set
    updated_at = now(),
    product_id = lp.product_id,
    product_name = lp.product_name,
    supplier_name = lp.brand_supplier,
    manufacturer_lot = lp.manufacturer_lot,
    expiry_date = lp.expiry_date,
    received_date = lp.document_date,
    document_date = lp.document_date,
    invoice_date = lp.document_date,
    delivery_note_date = lp.document_date,
    received_at = lp.document_date,
    inventory_checked_at = '2026-07-08'::date,
    storage_placed_at = lp.document_date,
    invoice_ref = lp.latest_invoice_ref,
    purchase_source = lp.purchase_source,
    source_note = lp.source_note,
    reconciliation_reason = lp.reconciliation_reason,
    initial_quantity = coalesce(lp.package_weight_kg, 1),
    current_quantity = coalesce(lot.current_quantity, coalesce(lp.package_weight_kg, 1)),
    unit = case when lp.package_weight_kg is null then 'envase' else 'kg' end,
    location = 'Congelador -18 C',
    status = lp.lot_status,
    requires_traceability = true,
    requires_appcc_reception = true,
    generates_inventory_lot = true,
    product_family = 'congelado',
    storage_temperature = '-18 C o inferior',
    default_location = 'Congelador -18 C',
    expiry_source = case when lp.expiry_date is not null and lp.manufacturer_lot is not null and lp.document_date is not null then 'real_documentada' else lot.expiry_source end,
    review_notes = lp.review_note,
    appcc_review_status = lp.appcc_review_status,
    observations = lp.lot_observations,
    source = 'invoice_delivery_note_and_product_photos'
  from lot_payload lp
  where lot.batch_number = lp.internal_lot
  returning lot.id, lot.batch_number, lot.product_id, lot.current_quantity, lot.unit
),
all_lots as (
  select * from inserted_lots
  union
  select * from updated_lots
)
insert into public.admin_inventory_lot_movements (
  lot_id, product_id, movement_type, movement_date, movement_time, quantity, unit,
  to_location, reason, responsible, related_record_type, related_record_id, observations
)
select
  al.id,
  al.product_id,
  'entrada',
  '2026-07-08'::date,
  '00:00'::time,
  al.current_quantity,
  al.unit,
  'Congelador -18 C',
  'Registro de inventario congelado FRZ-20260708. Fecha factura/albarán pendiente de revisión documental.',
  'F. Javier Bocanegra Sanjuan',
  'admin_inventory_lots',
  al.id,
  'IdempotencyKey: freezer_inventory_20260708:' || al.batch_number || E'\nFuente documental: Inventario congelado 08jul2026.zip / fotos de producto y fichas.'
from all_lots al
where not exists (
  select 1 from public.admin_inventory_lot_movements existing
  where existing.lot_id = al.id
    and existing.movement_type = 'entrada'
    and existing.observations ilike '%freezer_inventory_20260708:%'
);
