# Importación histórica de compras

Este procedimiento carga compras históricas reales ya revisadas al ERP APPCC sin usar la UI. El flujo es aditivo e idempotente: no borra datos, no sustituye OCR y no rompe inventario, producción ni contabilidad existentes.

## Archivos

- Fuente JSON: `supabase/seeds/historical-purchases/kiosko_initial_purchases.json`
- SQL importador base: `supabase/seeds/admin_kiosko_import_historical_purchases.sql`
- Generador opcional: `scripts/admin-kiosko/import-historical-purchases.ts`
- SQL generado: `supabase/seeds/generated/admin_kiosko_initial_purchases_generated.sql`

## Formato JSON

Cada proveedor tiene `supplier`, `tax_id`, `notes` y `purchases`.

Cada compra contiene:

```json
{
  "document": {
    "type": "invoice",
    "number": "FRA-123",
    "date": "2026-06-30",
    "uploaded_document_id": null,
    "source_document_id": null,
    "notes": "Factura revisada"
  },
  "accounting": {
    "taxable_base": 100,
    "iva": 10,
    "total": 110,
    "accounting_category": "compras explotación"
  },
  "lines": [
    {
      "product": "Carne fresca burgers",
      "quantity": 10,
      "unit": "kg",
      "price": 8.5,
      "iva": 10,
      "gtin": null,
      "ean": null,
      "manufacturer_lot": "L230624A",
      "origin_country": "ES",
      "expiry_date": "2026-07-05",
      "category": "food",
      "requires_traceability": true,
      "requires_appcc_reception": true,
      "generates_inventory_lot": true,
      "storage_temperature": "refrigerado",
      "default_location": "Cámara/arcón frío",
      "notes": "Datos verificados en factura/albarán"
    }
  ]
}
```

## Reglas anti-duplicado

Proveedor:

- usa `tax_id` si existe;
- si no, usa nombre normalizado.

Documento:

- usa `supplier_id + document_number + document_date`.

Producto:

- usa `gtin` o `ean` si existe;
- si no, usa nombre normalizado.

Lote:

- usa `product_id + supplier_id + manufacturer_lot + document_id`;
- si falta lote fabricante, genera `INIT-YYYYMMDD-SUPPLIER-PRODUCT`.

## Qué crea el importador

Cuando los datos son suficientes:

- proveedor;
- documento de compra en `admin_accounting_documents`;
- líneas en `admin_accounting_document_items`;
- producto maestro en `admin_inventory_products`;
- lote FEFO en `admin_inventory_lots`;
- movimiento de entrada en `admin_inventory_lot_movements`;
- recepción APPCC en `admin_goods_reception_records`;
- enlaces por `purchase_document_id` y `purchase_line_id`.

## Cómo generar SQL

El proyecto no incluye `tsx` como dependencia. Puedes ejecutar el generador con tu herramienta TypeScript habitual, por ejemplo:

```bash
npx tsx scripts/admin-kiosko/import-historical-purchases.ts
```

Salida:

```bash
cat supabase/seeds/generated/admin_kiosko_initial_purchases_generated.sql
```

## Cómo ejecutar en Supabase

Primero ejecuta los contratos:

```bash
cat supabase/admin_kiosko_purchase_core.sql
```

Después genera y revisa el SQL histórico:

```bash
cat supabase/seeds/generated/admin_kiosko_initial_purchases_generated.sql
```

Ejecuta el SQL generado solo después de revisar:

- proveedor correcto;
- número y fecha de documento;
- productos;
- cantidades;
- lote fabricante;
- caducidad;
- si requiere APPCC;
- si genera lote;
- ubicación y conservación.

## Después de importar

Revisar estas vistas:

- `admin_purchase_traceability_view`
- `admin_purchase_lines_pending_review_view`
- `admin_products_deduplication_candidates_view`
- `admin_stock_ready_for_labels_view`

Los lotes con trazabilidad y caducidad quedan preparados para etiquetas desde `admin_stock_ready_for_labels_view`.

## Datos iniciales incluidos

El JSON inicial incluye proveedores detectados, pero no líneas reales porque aún no se han aportado facturas verificadas en este sprint. No se inventan CIF, lotes, caducidades ni importes.
