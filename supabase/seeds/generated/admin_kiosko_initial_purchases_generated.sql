-- Importador idempotente de compras históricas revisadas.
-- Ejecutar despues de:
--   1. supabase/admin_kiosko_accounting.sql
--   2. supabase/admin_kiosko_operations.sql
--   3. supabase/admin_kiosko_inventory_lots.sql
--   4. supabase/admin_kiosko_purchase_core.sql
--
-- Este archivo base no incluye datos reales. El generador TypeScript sustituye
-- purchase_data por el contenido revisado de:
--   supabase/seeds/historical-purchases/kiosko_initial_purchases.json

create extension if not exists pgcrypto;

do $$
declare
  purchase_data jsonb := '[
  {
    "supplier": "Makro Distribucion Mayorista S.A.",
    "tax_id": "A-28/647451",
    "notes": "Proveedor verificado desde facturas Makro indicadas. CIF introducido tal como aparece en la factura revisada.",
    "purchases": [
      {
        "document": {
          "type": "invoice",
          "number": "0/0(055)0201/(2026)001033",
          "date": "2026-05-02",
          "uploaded_document_id": null,
          "source_document_id": null,
          "notes": "Factura Makro revisada. Total verificado: 736,94 EUR. Lineas no importadas porque faltan cantidad/precio/IVA completos por linea en el contexto disponible."
        },
        "accounting": {
          "taxable_base": null,
          "iva": null,
          "total": 736.94,
          "accounting_category": "compras explotación"
        },
        "verified_traceability_references": [
          {
            "product": "Pollo alas",
            "manufacturer_lot": null,
            "origin_country": null,
            "notes": "La factura contiene lotes visibles segun revision externa, pero no se importan lineas sin cantidad, precio e IVA verificados."
          }
        ],
        "lines": []
      },
      {
        "document": {
          "type": "invoice",
          "number": "0/0(055)0202/(2026)005948",
          "date": "2026-05-03",
          "uploaded_document_id": null,
          "source_document_id": null,
          "notes": "Factura Makro revisada. Total verificado: 524,96 EUR. Lineas pendientes de revision completa."
        },
        "accounting": {
          "taxable_base": null,
          "iva": null,
          "total": 524.96,
          "accounting_category": "compras explotación"
        },
        "lines": []
      },
      {
        "document": {
          "type": "credit_note",
          "number": "0/0(055)0036/(2026)000700",
          "date": "2026-05-08",
          "uploaded_document_id": null,
          "source_document_id": null,
          "related_document_number": "0/0(055)0201/(2026)001033",
          "notes": "Factura de devolucion Makro revisada. Total verificado: -81,82 EUR. No debe generar entrada positiva de stock."
        },
        "accounting": {
          "taxable_base": null,
          "iva": null,
          "total": -81.82,
          "accounting_category": "devolución compras"
        },
        "lines": []
      },
      {
        "document": {
          "type": "credit_note",
          "number": "0/0(055)0036/(2026)000701",
          "date": "2026-05-08",
          "uploaded_document_id": null,
          "source_document_id": null,
          "related_document_number": "0/0(055)0202/(2026)005948",
          "notes": "Factura de devolucion Makro revisada. Total verificado: -55,03 EUR. No debe generar entrada positiva de stock."
        },
        "accounting": {
          "taxable_base": null,
          "iva": null,
          "total": -55.03,
          "accounting_category": "devolución compras"
        },
        "lines": []
      },
      {
        "document": {
          "type": "invoice",
          "number": "0/0(055)0201/(2026)001279",
          "date": "2026-05-08",
          "uploaded_document_id": null,
          "source_document_id": null,
          "notes": "Factura Makro revisada. Total verificado: 128,42 EUR. Lineas no importadas hasta completar cantidad, precio e IVA."
        },
        "accounting": {
          "taxable_base": null,
          "iva": null,
          "total": 128.42,
          "accounting_category": "compras explotación"
        },
        "verified_traceability_references": [
          {
            "product": "Cebolla guisos",
            "manufacturer_lot": "01245",
            "origin_country": null,
            "notes": "Lote indicado por el usuario. No se importa como stock porque faltan cantidad, precio e IVA por linea."
          }
        ],
        "lines": []
      },
      {
        "document": {
          "type": "invoice",
          "number": "0/0(055)0003/(2026)027254",
          "date": "2026-06-11",
          "uploaded_document_id": null,
          "source_document_id": null,
          "notes": "Factura Makro revisada. Total verificado: 334,14 EUR. Lineas pendientes de revision completa."
        },
        "accounting": {
          "taxable_base": null,
          "iva": null,
          "total": 334.14,
          "accounting_category": "compras explotación"
        },
        "verified_traceability_references": [
          {
            "product": "Patata agria",
            "manufacturer_lot": "01576",
            "origin_country": "SPAIN",
            "notes": "Referencia de trazabilidad indicada por el usuario. Pendiente cantidad/precio/IVA por linea."
          },
          {
            "product": "Tomate pera",
            "manufacturer_lot": "01596",
            "origin_country": "SPAIN",
            "notes": "Referencia de trazabilidad indicada por el usuario. Pendiente cantidad/precio/IVA por linea."
          },
          {
            "product": "Cebolla guisos",
            "manufacturer_lot": "01576",
            "origin_country": "SPAIN",
            "notes": "Referencia de trazabilidad indicada por el usuario. Pendiente cantidad/precio/IVA por linea."
          },
          {
            "product": "Patata lavada",
            "manufacturer_lot": "01556",
            "origin_country": "SPAIN",
            "notes": "Referencia de trazabilidad indicada por el usuario. Pendiente cantidad/precio/IVA por linea."
          },
          {
            "product": "Lechuga iceberg",
            "manufacturer_lot": "01606",
            "origin_country": "SPAIN",
            "notes": "Referencia de trazabilidad indicada por el usuario. Pendiente cantidad/precio/IVA por linea."
          }
        ],
        "lines": [
          {
            "product": "HVO CAMPERO M/L 30UDS MC PK",
            "quantity": 1,
            "unit": "pack",
            "price": 9.09,
            "iva": 4,
            "gtin": null,
            "ean": null,
            "manufacturer_lot": null,
            "origin_country": null,
            "expiry_date": null,
            "category": "food",
            "requires_traceability": true,
            "requires_appcc_reception": true,
            "generates_inventory_lot": true,
            "storage_temperature": "refrigerated",
            "default_location": "Cámara refrigerada",
            "notes": "Sin lote, caducidad, origen ni GTIN aportados."
          },
          {
            "product": "FIAMBRE YORK 11X11 PURLOM KG",
            "quantity": 2.85,
            "unit": "kg",
            "price": 11.09,
            "iva": 10,
            "gtin": null,
            "ean": null,
            "manufacturer_lot": null,
            "origin_country": null,
            "expiry_date": null,
            "category": "food",
            "requires_traceability": true,
            "requires_appcc_reception": true,
            "generates_inventory_lot": true,
            "storage_temperature": "refrigerated",
            "default_location": "Cámara refrigerada",
            "notes": "Sin lote, caducidad, origen ni GTIN aportados."
          },
          {
            "product": "LIMON MC C-4/5 MA 2KG",
            "quantity": 1,
            "unit": "pack",
            "price": 5.99,
            "iva": 4,
            "gtin": null,
            "ean": null,
            "manufacturer_lot": null,
            "origin_country": null,
            "expiry_date": null,
            "category": "food",
            "requires_traceability": true,
            "requires_appcc_reception": true,
            "generates_inventory_lot": true,
            "storage_temperature": "ambient",
            "default_location": "Almacén",
            "notes": "Sin lote, caducidad, origen ni GTIN aportados."
          },
          {
            "product": "PATATA CEP AGRIA MC C-50/80 25",
            "quantity": 1,
            "unit": "sack",
            "price": 12.99,
            "iva": 4,
            "gtin": "04337125014435",
            "ean": null,
            "manufacturer_lot": "01576",
            "origin_country": "Spain",
            "expiry_date": null,
            "category": "food",
            "requires_traceability": true,
            "requires_appcc_reception": true,
            "generates_inventory_lot": true,
            "storage_temperature": "ambient",
            "default_location": "Almacén",
            "notes": null
          },
          {
            "product": "TOMATE PERA C-M/MM MC 6KG",
            "quantity": 1,
            "unit": "box",
            "price": 11.29,
            "iva": 4,
            "gtin": "04337125008304",
            "ean": null,
            "manufacturer_lot": "01596",
            "origin_country": "Spain",
            "expiry_date": null,
            "category": "food",
            "requires_traceability": true,
            "requires_appcc_reception": true,
            "generates_inventory_lot": true,
            "storage_temperature": "ambient",
            "default_location": "Almacén",
            "notes": null
          },
          {
            "product": "CEBOLLA GUISOS MC C-60/80 SC",
            "quantity": 1,
            "unit": "sack",
            "price": 4.29,
            "iva": 4,
            "gtin": "08414892315517",
            "ean": null,
            "manufacturer_lot": "01576",
            "origin_country": "Spain",
            "expiry_date": null,
            "category": "food",
            "requires_traceability": true,
            "requires_appcc_reception": true,
            "generates_inventory_lot": true,
            "storage_temperature": "ambient",
            "default_location": "Almacén",
            "notes": null
          },
          {
            "product": "REPOLLO LISO MC PZ POR KG",
            "quantity": 2.25,
            "unit": "kg",
            "price": 3.35,
            "iva": 4,
            "gtin": null,
            "ean": null,
            "manufacturer_lot": null,
            "origin_country": null,
            "expiry_date": null,
            "category": "food",
            "requires_traceability": true,
            "requires_appcc_reception": true,
            "generates_inventory_lot": true,
            "storage_temperature": "ambient",
            "default_location": "Almacén",
            "notes": "Sin lote, caducidad, origen ni GTIN aportados."
          },
          {
            "product": "PATATA LAV MC C-80-90 20KG",
            "quantity": 1,
            "unit": "sack",
            "price": 21.25,
            "iva": 4,
            "gtin": "04337125014442",
            "ean": null,
            "manufacturer_lot": "01556",
            "origin_country": "Spain",
            "expiry_date": null,
            "category": "food",
            "requires_traceability": true,
            "requires_appcc_reception": true,
            "generates_inventory_lot": true,
            "storage_temperature": "ambient",
            "default_location": "Almacén",
            "notes": null
          },
          {
            "product": "LECHUGA ICEBERG MC C-9PZ",
            "quantity": 3,
            "unit": "unit",
            "price": 2.67,
            "iva": 4,
            "gtin": "08414892315548",
            "ean": null,
            "manufacturer_lot": "01606",
            "origin_country": "Spain",
            "expiry_date": null,
            "category": "food",
            "requires_traceability": true,
            "requires_appcc_reception": true,
            "generates_inventory_lot": true,
            "storage_temperature": "ambient",
            "default_location": "Almacén",
            "notes": null
          },
          {
            "product": "VINAGRE SIDRA MC 1L",
            "quantity": 2,
            "unit": "bottle",
            "price": 2.18,
            "iva": 10,
            "gtin": null,
            "ean": null,
            "manufacturer_lot": null,
            "origin_country": null,
            "expiry_date": null,
            "category": "food",
            "requires_traceability": true,
            "requires_appcc_reception": true,
            "generates_inventory_lot": true,
            "storage_temperature": "ambient",
            "default_location": "Almacén",
            "notes": "Sin lote, caducidad, origen ni GTIN aportados."
          },
          {
            "product": "ALIOLI RIOBA BIBERON 770ML",
            "quantity": 1,
            "unit": "bottle",
            "price": 3.99,
            "iva": 10,
            "gtin": null,
            "ean": null,
            "manufacturer_lot": null,
            "origin_country": null,
            "expiry_date": null,
            "category": "food",
            "requires_traceability": true,
            "requires_appcc_reception": true,
            "generates_inventory_lot": true,
            "storage_temperature": "ambient",
            "default_location": "Almacén",
            "notes": "Sin lote, caducidad, origen ni GTIN aportados."
          },
          {
            "product": "SSA BBQ RIOBA BIBERON 860G",
            "quantity": 1,
            "unit": "bottle",
            "price": 2.19,
            "iva": 10,
            "gtin": null,
            "ean": null,
            "manufacturer_lot": null,
            "origin_country": null,
            "expiry_date": null,
            "category": "food",
            "requires_traceability": true,
            "requires_appcc_reception": true,
            "generates_inventory_lot": true,
            "storage_temperature": "ambient",
            "default_location": "Almacén",
            "notes": "Sin lote, caducidad, origen ni GTIN aportados."
          },
          {
            "product": "MOSTAZA RIOBA BIBERON 300G",
            "quantity": 1,
            "unit": "bottle",
            "price": 1.25,
            "iva": 10,
            "gtin": null,
            "ean": null,
            "manufacturer_lot": null,
            "origin_country": null,
            "expiry_date": null,
            "category": "food",
            "requires_traceability": true,
            "requires_appcc_reception": true,
            "generates_inventory_lot": true,
            "storage_temperature": "ambient",
            "default_location": "Almacén",
            "notes": "Sin lote, caducidad, origen ni GTIN aportados."
          },
          {
            "product": "SSA BURGUER RIOBA BIBERON 780G",
            "quantity": 2,
            "unit": "unit",
            "price": 9.9,
            "iva": 10,
            "gtin": null,
            "ean": null,
            "manufacturer_lot": null,
            "origin_country": null,
            "expiry_date": null,
            "category": "food",
            "requires_traceability": true,
            "requires_appcc_reception": true,
            "generates_inventory_lot": true,
            "storage_temperature": "ambient",
            "default_location": "Almacén",
            "notes": "Sin lote, caducidad, origen ni GTIN aportados."
          },
          {
            "product": "COCACOLA LT 33CL REGULAR",
            "quantity": 24,
            "unit": "can",
            "price": 14.15,
            "iva": 21,
            "gtin": null,
            "ean": null,
            "manufacturer_lot": null,
            "origin_country": null,
            "expiry_date": null,
            "category": "beverage",
            "requires_traceability": false,
            "requires_appcc_reception": false,
            "generates_inventory_lot": true,
            "storage_temperature": null,
            "default_location": "Almacén bebidas",
            "notes": "Bebida envasada. Sin lote individual, caducidad ni GTIN aportados."
          },
          {
            "product": "FANTA LT 33CL LIMON",
            "quantity": 24,
            "unit": "can",
            "price": 11.76,
            "iva": 21,
            "gtin": null,
            "ean": null,
            "manufacturer_lot": null,
            "origin_country": null,
            "expiry_date": null,
            "category": "beverage",
            "requires_traceability": false,
            "requires_appcc_reception": false,
            "generates_inventory_lot": true,
            "storage_temperature": null,
            "default_location": "Almacén bebidas",
            "notes": "Bebida envasada. Sin lote individual, caducidad ni GTIN aportados."
          },
          {
            "product": "COCACOLA LT 33CL ZERO",
            "quantity": 24,
            "unit": "can",
            "price": 14.15,
            "iva": 21,
            "gtin": null,
            "ean": null,
            "manufacturer_lot": null,
            "origin_country": null,
            "expiry_date": null,
            "category": "beverage",
            "requires_traceability": false,
            "requires_appcc_reception": false,
            "generates_inventory_lot": true,
            "storage_temperature": null,
            "default_location": "Almacén bebidas",
            "notes": "Bebida envasada. Sin lote individual, caducidad ni GTIN aportados."
          },
          {
            "product": "AGUA LANJARON PT50CL",
            "quantity": 24,
            "unit": "bottle",
            "price": 8.15,
            "iva": 10,
            "gtin": null,
            "ean": null,
            "manufacturer_lot": null,
            "origin_country": null,
            "expiry_date": null,
            "category": "beverage",
            "requires_traceability": false,
            "requires_appcc_reception": false,
            "generates_inventory_lot": true,
            "storage_temperature": null,
            "default_location": "Almacén bebidas",
            "notes": "Bebida envasada. Sin lote individual, caducidad ni GTIN aportados."
          },
          {
            "product": "DESENGRASANTE PROFES MPRO 5LT",
            "quantity": 1,
            "unit": "bottle",
            "price": 6.69,
            "iva": 21,
            "gtin": null,
            "ean": null,
            "manufacturer_lot": null,
            "origin_country": null,
            "expiry_date": null,
            "category": "cleaning",
            "requires_traceability": false,
            "requires_appcc_reception": false,
            "generates_inventory_lot": false,
            "storage_temperature": null,
            "default_location": "Almacén limpieza",
            "notes": "Producto limpieza. No genera lote APPCC."
          },
          {
            "product": "AGUA FUERTE MPRO 1L",
            "quantity": 2,
            "unit": "bottle",
            "price": 1.9,
            "iva": 21,
            "gtin": null,
            "ean": null,
            "manufacturer_lot": null,
            "origin_country": null,
            "expiry_date": null,
            "category": "cleaning",
            "requires_traceability": false,
            "requires_appcc_reception": false,
            "generates_inventory_lot": false,
            "storage_temperature": null,
            "default_location": "Almacén limpieza",
            "notes": "Producto limpieza. No genera lote APPCC."
          },
          {
            "product": "LAVAVAJILLAS MANO MPRO 4L",
            "quantity": 1,
            "unit": "bottle",
            "price": 3.95,
            "iva": 21,
            "gtin": null,
            "ean": null,
            "manufacturer_lot": null,
            "origin_country": null,
            "expiry_date": null,
            "category": "cleaning",
            "requires_traceability": false,
            "requires_appcc_reception": false,
            "generates_inventory_lot": false,
            "storage_temperature": null,
            "default_location": "Almacén limpieza",
            "notes": "Producto limpieza. No genera lote APPCC."
          }
        ]
      },
      {
        "document": {
          "type": "invoice",
          "number": "0/0(055)0003/(2026)029566",
          "date": "2026-06-27",
          "uploaded_document_id": null,
          "source_document_id": null,
          "notes": "Factura Makro revisada. Total verificado: 502,01 EUR. Lineas pendientes de revision completa."
        },
        "accounting": {
          "taxable_base": null,
          "iva": null,
          "total": 502.01,
          "accounting_category": "compras explotación"
        },
        "lines": [
          {
            "product": "MARGARINA C/S 55% LUXMAR 400G",
            "quantity": 1,
            "unit": "unit",
            "price": 1.65,
            "iva": 10,
            "gtin": null,
            "ean": null,
            "manufacturer_lot": null,
            "origin_country": null,
            "expiry_date": null,
            "category": "food",
            "requires_traceability": true,
            "requires_appcc_reception": true,
            "generates_inventory_lot": true,
            "storage_temperature": "refrigerated",
            "default_location": "Cámara refrigerada",
            "notes": "Sin lote, caducidad, origen ni GTIN aportados."
          },
          {
            "product": "B.LACTEA HOST.LA CREME 1.5L",
            "quantity": 6,
            "unit": "bottle",
            "price": 9.13,
            "iva": 10,
            "gtin": null,
            "ean": null,
            "manufacturer_lot": null,
            "origin_country": null,
            "expiry_date": null,
            "category": "food",
            "requires_traceability": true,
            "requires_appcc_reception": true,
            "generates_inventory_lot": true,
            "storage_temperature": "refrigerated",
            "default_location": "Cámara refrigerada",
            "notes": "Sin lote, caducidad, origen ni GTIN aportados."
          },
          {
            "product": "LONC 48 C/CHED RJ 1KG AMERICAN",
            "quantity": 1,
            "unit": "tray",
            "price": 9.29,
            "iva": 4,
            "gtin": null,
            "ean": null,
            "manufacturer_lot": null,
            "origin_country": null,
            "expiry_date": null,
            "category": "food",
            "requires_traceability": true,
            "requires_appcc_reception": true,
            "generates_inventory_lot": true,
            "storage_temperature": "refrigerated",
            "default_location": "Cámara refrigerada",
            "notes": "Sin lote, caducidad, origen ni GTIN aportados."
          },
          {
            "product": "QSO RULO VACA-CABRA MC 1KG",
            "quantity": 1,
            "unit": "unit",
            "price": 9.35,
            "iva": 4,
            "gtin": null,
            "ean": null,
            "manufacturer_lot": null,
            "origin_country": null,
            "expiry_date": null,
            "category": "food",
            "requires_traceability": true,
            "requires_appcc_reception": true,
            "generates_inventory_lot": true,
            "storage_temperature": "refrigerated",
            "default_location": "Cámara refrigerada",
            "notes": "Sin lote, caducidad, origen ni GTIN aportados."
          },
          {
            "product": "QSO PROVOLONE C/OREGANO 200G",
            "quantity": 3,
            "unit": "unit",
            "price": 9.69,
            "iva": 4,
            "gtin": null,
            "ean": null,
            "manufacturer_lot": null,
            "origin_country": null,
            "expiry_date": null,
            "category": "food",
            "requires_traceability": true,
            "requires_appcc_reception": true,
            "generates_inventory_lot": true,
            "storage_temperature": "refrigerated",
            "default_location": "Cámara refrigerada",
            "notes": "Sin lote, caducidad, origen ni GTIN aportados."
          },
          {
            "product": "TORTILLITAS CAMARON MC 1KG",
            "quantity": 3,
            "unit": "bag",
            "price": 20.55,
            "iva": 10,
            "gtin": null,
            "ean": null,
            "manufacturer_lot": null,
            "origin_country": null,
            "expiry_date": null,
            "category": "frozen",
            "requires_traceability": true,
            "requires_appcc_reception": true,
            "generates_inventory_lot": true,
            "storage_temperature": "frozen",
            "default_location": "Congelador",
            "notes": "Congelado. Sin lote, caducidad, origen ni GTIN aportados."
          },
          {
            "product": "CROQUETAS MINI JAMON ARO 2KG",
            "quantity": 2,
            "unit": "bag",
            "price": 9.7,
            "iva": 10,
            "gtin": null,
            "ean": null,
            "manufacturer_lot": null,
            "origin_country": null,
            "expiry_date": null,
            "category": "frozen",
            "requires_traceability": true,
            "requires_appcc_reception": true,
            "generates_inventory_lot": true,
            "storage_temperature": "frozen",
            "default_location": "Congelador",
            "notes": "Congelado. Sin lote, caducidad, origen ni GTIN aportados."
          },
          {
            "product": "CINTA LOMO CERDO FTE 5MM VC KG",
            "quantity": 3.59,
            "unit": "kg",
            "price": 21.5,
            "iva": 10,
            "gtin": null,
            "ean": null,
            "manufacturer_lot": null,
            "origin_country": null,
            "expiry_date": null,
            "category": "meat",
            "requires_traceability": true,
            "requires_appcc_reception": true,
            "generates_inventory_lot": true,
            "storage_temperature": "refrigerated",
            "default_location": "Cámara refrigerada",
            "notes": "Carne refrigerada. Sin lote, caducidad, origen ni GTIN aportados."
          },
          {
            "product": "PATATA MC GUARNICION C/-35 BL5",
            "quantity": 3,
            "unit": "bag",
            "price": 21.27,
            "iva": 4,
            "gtin": null,
            "ean": null,
            "manufacturer_lot": null,
            "origin_country": null,
            "expiry_date": null,
            "category": "frozen",
            "requires_traceability": true,
            "requires_appcc_reception": true,
            "generates_inventory_lot": true,
            "storage_temperature": "frozen",
            "default_location": "Congelador",
            "notes": "Congelado. Sin lote, caducidad, origen ni GTIN aportados."
          },
          {
            "product": "ACT ALT REND ESP FRITUR MC 10L",
            "quantity": 1,
            "unit": "bottle",
            "price": 18.99,
            "iva": 10,
            "gtin": null,
            "ean": null,
            "manufacturer_lot": null,
            "origin_country": null,
            "expiry_date": null,
            "category": "food",
            "requires_traceability": true,
            "requires_appcc_reception": true,
            "generates_inventory_lot": true,
            "storage_temperature": "ambient",
            "default_location": "Almacén",
            "notes": "Sin lote, caducidad, origen ni GTIN aportados."
          },
          {
            "product": "ALIOLI ARO 1.85L",
            "quantity": 1,
            "unit": "tub",
            "price": 6.75,
            "iva": 10,
            "gtin": null,
            "ean": null,
            "manufacturer_lot": null,
            "origin_country": null,
            "expiry_date": null,
            "category": "food",
            "requires_traceability": true,
            "requires_appcc_reception": true,
            "generates_inventory_lot": true,
            "storage_temperature": "ambient",
            "default_location": "Almacén",
            "notes": "Sin lote, caducidad, origen ni GTIN aportados."
          },
          {
            "product": "SSA BBQ RIOBA BIBERON 860G",
            "quantity": 1,
            "unit": "bottle",
            "price": 2.19,
            "iva": 10,
            "gtin": null,
            "ean": null,
            "manufacturer_lot": null,
            "origin_country": null,
            "expiry_date": null,
            "category": "food",
            "requires_traceability": true,
            "requires_appcc_reception": true,
            "generates_inventory_lot": true,
            "storage_temperature": "ambient",
            "default_location": "Almacén",
            "notes": "Sin lote, caducidad, origen ni GTIN aportados."
          },
          {
            "product": "SSA BACONESA RIOBA BIBERON 770",
            "quantity": 1,
            "unit": "unit",
            "price": 4.95,
            "iva": 10,
            "gtin": null,
            "ean": null,
            "manufacturer_lot": null,
            "origin_country": null,
            "expiry_date": null,
            "category": "food",
            "requires_traceability": true,
            "requires_appcc_reception": true,
            "generates_inventory_lot": true,
            "storage_temperature": "ambient",
            "default_location": "Almacén",
            "notes": "Sin lote, caducidad, origen ni GTIN aportados."
          },
          {
            "product": "TORTILLA CHIPS MILD MC 750G",
            "quantity": 3,
            "unit": "bag",
            "price": 10.38,
            "iva": 10,
            "gtin": null,
            "ean": null,
            "manufacturer_lot": null,
            "origin_country": null,
            "expiry_date": null,
            "category": "food",
            "requires_traceability": true,
            "requires_appcc_reception": true,
            "generates_inventory_lot": true,
            "storage_temperature": "ambient",
            "default_location": "Almacén",
            "notes": "Sin lote, caducidad, origen ni GTIN aportados."
          },
          {
            "product": "CZA ALHAMBRA ESPECIAL BT33CL",
            "quantity": 96,
            "unit": "bottle",
            "price": 61.4,
            "iva": 21,
            "gtin": null,
            "ean": null,
            "manufacturer_lot": null,
            "origin_country": null,
            "expiry_date": null,
            "category": "alcohol",
            "requires_traceability": false,
            "requires_appcc_reception": false,
            "generates_inventory_lot": true,
            "storage_temperature": null,
            "default_location": "Almacén bebidas",
            "notes": "Bebida alcohólica envasada. Sin lote individual, caducidad ni GTIN aportados."
          },
          {
            "product": "AGUA LANJARON PT50CL",
            "quantity": 96,
            "unit": "bottle",
            "price": 32.6,
            "iva": 10,
            "gtin": null,
            "ean": null,
            "manufacturer_lot": null,
            "origin_country": null,
            "expiry_date": null,
            "category": "beverage",
            "requires_traceability": false,
            "requires_appcc_reception": false,
            "generates_inventory_lot": true,
            "storage_temperature": null,
            "default_location": "Almacén bebidas",
            "notes": "Bebida envasada. Sin lote individual, caducidad ni GTIN aportados."
          }
        ]
      }
    ]
  },
  {
    "supplier": "Transgourmet",
    "tax_id": null,
    "notes": "Proveedor verificado desde facturas Transgourmet indicadas. CIF no aportado. Cuando no hay lote individual visible, Transgourmet usa numero y fecha de factura como remesa.",
    "purchases": [
      {
        "document": {
          "type": "invoice",
          "number": "260202109012591",
          "date": "2026-04-24",
          "delivery_note_number": "008431253",
          "uploaded_document_id": null,
          "source_document_id": null,
          "notes": "Factura Transgourmet revisada. Albaran 008431253. Total verificado: 1.031,87 EUR. Lineas no importadas sin cantidad/precio/IVA completos."
        },
        "accounting": {
          "taxable_base": null,
          "iva": null,
          "total": 1031.87,
          "accounting_category": "compras explotación"
        },
        "traceability_rule": {
          "manufacturer_lot_pattern": "TG-260202109012591-20260424",
          "notes": "Transgourmet indica que utiliza número y fecha de factura como código de trazabilidad/remesa."
        },
        "lines": [
          {
            "product": "HUEVO M 53-63G 120U",
            "quantity": 1,
            "unit": "box",
            "price": 33.81,
            "iva": 4,
            "gtin": null,
            "ean": null,
            "manufacturer_lot": "TG-260202109012591-20260424",
            "origin_country": null,
            "expiry_date": null,
            "category": "food",
            "requires_traceability": true,
            "requires_appcc_reception": true,
            "generates_inventory_lot": true,
            "storage_temperature": "refrigerated",
            "default_location": "Cámara refrigerada",
            "notes": "Transgourmet indica que utiliza número y fecha de factura como código de trazabilidad/remesa."
          },
          {
            "product": "ALAS POLLO CONG.E/K",
            "quantity": 4,
            "unit": "kg",
            "price": 15.8,
            "iva": 10,
            "gtin": null,
            "ean": null,
            "manufacturer_lot": "TG-260202109012591-20260424",
            "origin_country": null,
            "expiry_date": null,
            "category": "meat",
            "requires_traceability": true,
            "requires_appcc_reception": true,
            "generates_inventory_lot": true,
            "storage_temperature": "frozen",
            "default_location": "Congelador",
            "notes": "Transgourmet indica que utiliza número y fecha de factura como código de trazabilidad/remesa."
          },
          {
            "product": "CACHOPO VACA CONG.21X200G E/K",
            "quantity": 4.005,
            "unit": "kg",
            "price": 83.22,
            "iva": 10,
            "gtin": null,
            "ean": null,
            "manufacturer_lot": "TG-260202109012591-20260424",
            "origin_country": null,
            "expiry_date": null,
            "category": "meat",
            "requires_traceability": true,
            "requires_appcc_reception": true,
            "generates_inventory_lot": true,
            "storage_temperature": "frozen",
            "default_location": "Congelador",
            "notes": "Transgourmet indica que utiliza número y fecha de factura como código de trazabilidad/remesa."
          },
          {
            "product": "CARNE PICADA ELPOZO MIXTA 800G",
            "quantity": 2,
            "unit": "unit",
            "price": 13.9,
            "iva": 10,
            "gtin": null,
            "ean": null,
            "manufacturer_lot": "TG-260202109012591-20260424",
            "origin_country": null,
            "expiry_date": null,
            "category": "meat",
            "requires_traceability": true,
            "requires_appcc_reception": true,
            "generates_inventory_lot": true,
            "storage_temperature": "refrigerated",
            "default_location": "Cámara refrigerada",
            "notes": "Transgourmet indica que utiliza número y fecha de factura como código de trazabilidad/remesa."
          },
          {
            "product": "COSTILLA TIRA BBQ.CERDO E/K",
            "quantity": 1.2,
            "unit": "kg",
            "price": 16.4,
            "iva": 10,
            "gtin": null,
            "ean": null,
            "manufacturer_lot": "TG-260202109012591-20260424",
            "origin_country": null,
            "expiry_date": null,
            "category": "meat",
            "requires_traceability": true,
            "requires_appcc_reception": true,
            "generates_inventory_lot": true,
            "storage_temperature": null,
            "default_location": "Almacén",
            "notes": "Transgourmet indica que utiliza número y fecha de factura como código de trazabilidad/remesa."
          },
          {
            "product": "BACON QUALITY LONCH.CDO.AHUM.E/K",
            "quantity": 1.5,
            "unit": "kg",
            "price": 15.44,
            "iva": 10,
            "gtin": null,
            "ean": null,
            "manufacturer_lot": "TG-260202109012591-20260424",
            "origin_country": null,
            "expiry_date": null,
            "category": "meat",
            "requires_traceability": true,
            "requires_appcc_reception": true,
            "generates_inventory_lot": true,
            "storage_temperature": "refrigerated",
            "default_location": "Cámara refrigerada",
            "notes": "Transgourmet indica que utiliza número y fecha de factura como código de trazabilidad/remesa."
          },
          {
            "product": "CROQUETA CULINARIA BOLETUS/TRUFA 1K",
            "quantity": 2,
            "unit": "bag",
            "price": 18.38,
            "iva": 10,
            "gtin": null,
            "ean": null,
            "manufacturer_lot": "TG-260202109012591-20260424",
            "origin_country": null,
            "expiry_date": null,
            "category": "frozen",
            "requires_traceability": true,
            "requires_appcc_reception": true,
            "generates_inventory_lot": true,
            "storage_temperature": "frozen",
            "default_location": "Congelador",
            "notes": "Transgourmet indica que utiliza número y fecha de factura como código de trazabilidad/remesa."
          },
          {
            "product": "CROQUETA CULINARIA JAMON IBER.1K",
            "quantity": 2,
            "unit": "bag",
            "price": 18.12,
            "iva": 10,
            "gtin": null,
            "ean": null,
            "manufacturer_lot": "TG-260202109012591-20260424",
            "origin_country": null,
            "expiry_date": null,
            "category": "frozen",
            "requires_traceability": true,
            "requires_appcc_reception": true,
            "generates_inventory_lot": true,
            "storage_temperature": "frozen",
            "default_location": "Congelador",
            "notes": "Transgourmet indica que utiliza número y fecha de factura como código de trazabilidad/remesa."
          },
          {
            "product": "CROQUETA CULINARIA Q.AZUL/CEBO.1K",
            "quantity": 2,
            "unit": "bag",
            "price": 18.88,
            "iva": 10,
            "gtin": null,
            "ean": null,
            "manufacturer_lot": "TG-260202109012591-20260424",
            "origin_country": null,
            "expiry_date": null,
            "category": "frozen",
            "requires_traceability": true,
            "requires_appcc_reception": true,
            "generates_inventory_lot": true,
            "storage_temperature": "frozen",
            "default_location": "Congelador",
            "notes": "Transgourmet indica que utiliza número y fecha de factura como código de trazabilidad/remesa."
          },
          {
            "product": "CROQUETA CULINARIA VACUNO 1K",
            "quantity": 2,
            "unit": "bag",
            "price": 23.98,
            "iva": 10,
            "gtin": null,
            "ean": null,
            "manufacturer_lot": "TG-260202109012591-20260424",
            "origin_country": null,
            "expiry_date": null,
            "category": "frozen",
            "requires_traceability": true,
            "requires_appcc_reception": true,
            "generates_inventory_lot": true,
            "storage_temperature": "frozen",
            "default_location": "Congelador",
            "notes": "Transgourmet indica que utiliza número y fecha de factura como código de trazabilidad/remesa."
          },
          {
            "product": "PATATA ESP.FREIR SACO 15K E/K",
            "quantity": 15,
            "unit": "kg",
            "price": 12.75,
            "iva": 4,
            "gtin": null,
            "ean": null,
            "manufacturer_lot": "TG-260202109012591-20260424",
            "origin_country": null,
            "expiry_date": null,
            "category": "food",
            "requires_traceability": true,
            "requires_appcc_reception": true,
            "generates_inventory_lot": true,
            "storage_temperature": null,
            "default_location": "Almacén",
            "notes": "Transgourmet indica que utiliza número y fecha de factura como código de trazabilidad/remesa."
          },
          {
            "product": "MOZARELLA GALBANI 100G",
            "quantity": 3,
            "unit": "unit",
            "price": 3.66,
            "iva": 4,
            "gtin": null,
            "ean": null,
            "manufacturer_lot": "TG-260202109012591-20260424",
            "origin_country": null,
            "expiry_date": null,
            "category": "food",
            "requires_traceability": true,
            "requires_appcc_reception": true,
            "generates_inventory_lot": true,
            "storage_temperature": "refrigerated",
            "default_location": "Cámara refrigerada",
            "notes": "Transgourmet indica que utiliza número y fecha de factura como código de trazabilidad/remesa."
          },
          {
            "product": "QUESO GRANAROLO PROVO.DOP 150G",
            "quantity": 5,
            "unit": "unit",
            "price": 14.45,
            "iva": 4,
            "gtin": null,
            "ean": null,
            "manufacturer_lot": "TG-260202109012591-20260424",
            "origin_country": null,
            "expiry_date": null,
            "category": "food",
            "requires_traceability": true,
            "requires_appcc_reception": true,
            "generates_inventory_lot": true,
            "storage_temperature": "refrigerated",
            "default_location": "Cámara refrigerada",
            "notes": "Transgourmet indica que utiliza número y fecha de factura como código de trazabilidad/remesa."
          },
          {
            "product": "QUESO QUALITY CABRA 100% RULO 1K",
            "quantity": 1,
            "unit": "unit",
            "price": 13.29,
            "iva": 4,
            "gtin": null,
            "ean": null,
            "manufacturer_lot": "TG-260202109012591-20260424",
            "origin_country": null,
            "expiry_date": null,
            "category": "food",
            "requires_traceability": true,
            "requires_appcc_reception": true,
            "generates_inventory_lot": true,
            "storage_temperature": "refrigerated",
            "default_location": "Cámara refrigerada",
            "notes": "Transgourmet indica que utiliza número y fecha de factura como código de trazabilidad/remesa."
          }
        ]
      },
      {
        "document": {
          "type": "credit_note",
          "number": "260202111000604",
          "date": "2026-05-07",
          "delivery_note_number": "008582567",
          "uploaded_document_id": null,
          "source_document_id": null,
          "related_document_number": "260202109012591",
          "notes": "Factura rectificativa Transgourmet revisada. Albaran 008582567. Total verificado: -13,26 EUR. No debe generar entrada positiva de stock."
        },
        "accounting": {
          "taxable_base": null,
          "iva": null,
          "total": -13.26,
          "accounting_category": "devolución compras"
        },
        "lines": [
          {
            "product": "PATATA ESP.FREIR SACO 15K E/K",
            "quantity": -15,
            "unit": "kg",
            "price": -12.75,
            "iva": 4,
            "gtin": null,
            "ean": null,
            "manufacturer_lot": "TG-260202109012591-20260424",
            "origin_country": null,
            "expiry_date": null,
            "category": "food",
            "requires_traceability": true,
            "requires_appcc_reception": true,
            "generates_inventory_lot": true,
            "storage_temperature": null,
            "default_location": "Almacén",
            "notes": "Devolución/rectificativa de factura 260202109012591. Transgourmet indica que utiliza número y fecha de factura como código de trazabilidad/remesa. No debe generar entrada positiva de stock."
          }
        ]
      },
      {
        "document": {
          "type": "invoice",
          "number": "260202109014285",
          "date": "2026-05-07",
          "delivery_note_number": "008586539",
          "uploaded_document_id": null,
          "source_document_id": null,
          "notes": "Factura Transgourmet revisada. Albaran 008586539. Total verificado: 239,82 EUR. Lineas no importadas sin cantidad/precio/IVA completos."
        },
        "accounting": {
          "taxable_base": null,
          "iva": null,
          "total": 239.82,
          "accounting_category": "compras explotación"
        },
        "traceability_rule": {
          "manufacturer_lot_pattern": "TG-260202109014285-20260507",
          "notes": "Transgourmet indica que utiliza número y fecha de factura como código de trazabilidad/remesa."
        },
        "lines": [
          {
            "product": "ACEITE ABACO VEG.ESP.FREIR 5L",
            "quantity": 2,
            "unit": "bottle",
            "price": 18.58,
            "iva": 10,
            "gtin": null,
            "ean": null,
            "manufacturer_lot": "TG-260202109014285-20260507",
            "origin_country": null,
            "expiry_date": null,
            "category": "food",
            "requires_traceability": true,
            "requires_appcc_reception": true,
            "generates_inventory_lot": true,
            "storage_temperature": null,
            "default_location": "Almacén",
            "notes": "Transgourmet indica que utiliza número y fecha de factura como código de trazabilidad/remesa."
          },
          {
            "product": "ACEITE GOURMET OLIVA SUAVE 5L",
            "quantity": 1,
            "unit": "bottle",
            "price": 19.31,
            "iva": 4,
            "gtin": null,
            "ean": null,
            "manufacturer_lot": "TG-260202109014285-20260507",
            "origin_country": null,
            "expiry_date": null,
            "category": "food",
            "requires_traceability": true,
            "requires_appcc_reception": true,
            "generates_inventory_lot": true,
            "storage_temperature": null,
            "default_location": "Almacén",
            "notes": "Transgourmet indica que utiliza número y fecha de factura como código de trazabilidad/remesa."
          },
          {
            "product": "BATIDO PULEVA CACAO 200ML 6U",
            "quantity": 1,
            "unit": "pack",
            "price": 2.75,
            "iva": 10,
            "gtin": null,
            "ean": null,
            "manufacturer_lot": "TG-260202109014285-20260507",
            "origin_country": null,
            "expiry_date": null,
            "category": "beverage",
            "requires_traceability": false,
            "requires_appcc_reception": false,
            "generates_inventory_lot": true,
            "storage_temperature": null,
            "default_location": "Almacén bebidas",
            "notes": "Transgourmet indica que utiliza número y fecha de factura como código de trazabilidad/remesa."
          },
          {
            "product": "DORITOS TEX-MEX 44G",
            "quantity": 20,
            "unit": "unit",
            "price": 17,
            "iva": 10,
            "gtin": null,
            "ean": null,
            "manufacturer_lot": "TG-260202109014285-20260507",
            "origin_country": null,
            "expiry_date": null,
            "category": "food",
            "requires_traceability": true,
            "requires_appcc_reception": true,
            "generates_inventory_lot": true,
            "storage_temperature": null,
            "default_location": "Almacén",
            "notes": "Transgourmet indica que utiliza número y fecha de factura como código de trazabilidad/remesa."
          },
          {
            "product": "LECHE QUALITY GRAN CREME.1,5L",
            "quantity": 6,
            "unit": "bottle",
            "price": 8.64,
            "iva": 4,
            "gtin": null,
            "ean": null,
            "manufacturer_lot": "TG-260202109014285-20260507",
            "origin_country": null,
            "expiry_date": null,
            "category": "food",
            "requires_traceability": true,
            "requires_appcc_reception": true,
            "generates_inventory_lot": true,
            "storage_temperature": null,
            "default_location": "Almacén",
            "notes": "Transgourmet indica que utiliza número y fecha de factura como código de trazabilidad/remesa."
          },
          {
            "product": "SAL QUALITY COCINA FINA 5K",
            "quantity": 1,
            "unit": "sack",
            "price": 1.89,
            "iva": 10,
            "gtin": null,
            "ean": null,
            "manufacturer_lot": "TG-260202109014285-20260507",
            "origin_country": null,
            "expiry_date": null,
            "category": "food",
            "requires_traceability": true,
            "requires_appcc_reception": true,
            "generates_inventory_lot": true,
            "storage_temperature": null,
            "default_location": "Almacén",
            "notes": "Transgourmet indica que utiliza número y fecha de factura como código de trazabilidad/remesa."
          },
          {
            "product": "FANTA NARAN.LATA 33CL",
            "quantity": 24,
            "unit": "can",
            "price": 13.68,
            "iva": 21,
            "gtin": null,
            "ean": null,
            "manufacturer_lot": "TG-260202109014285-20260507",
            "origin_country": null,
            "expiry_date": null,
            "category": "beverage",
            "requires_traceability": false,
            "requires_appcc_reception": false,
            "generates_inventory_lot": true,
            "storage_temperature": null,
            "default_location": "Almacén bebidas",
            "notes": "Transgourmet indica que utiliza número y fecha de factura como código de trazabilidad/remesa."
          },
          {
            "product": "HUEVO M 53-63G 120U",
            "quantity": 1,
            "unit": "box",
            "price": 33.81,
            "iva": 4,
            "gtin": null,
            "ean": null,
            "manufacturer_lot": "TG-260202109014285-20260507",
            "origin_country": null,
            "expiry_date": null,
            "category": "food",
            "requires_traceability": true,
            "requires_appcc_reception": true,
            "generates_inventory_lot": true,
            "storage_temperature": "refrigerated",
            "default_location": "Cámara refrigerada",
            "notes": "Transgourmet indica que utiliza número y fecha de factura como código de trazabilidad/remesa."
          },
          {
            "product": "CROQUETA CULINARIA BOLETUS/TRUFA 1K",
            "quantity": 2,
            "unit": "bag",
            "price": 18.38,
            "iva": 10,
            "gtin": null,
            "ean": null,
            "manufacturer_lot": "TG-260202109014285-20260507",
            "origin_country": null,
            "expiry_date": null,
            "category": "frozen",
            "requires_traceability": true,
            "requires_appcc_reception": true,
            "generates_inventory_lot": true,
            "storage_temperature": "frozen",
            "default_location": "Congelador",
            "notes": "Transgourmet indica que utiliza número y fecha de factura como código de trazabilidad/remesa."
          },
          {
            "product": "CROQUETA CULINARIA JAMON IBER.1K",
            "quantity": 2,
            "unit": "bag",
            "price": 18.12,
            "iva": 10,
            "gtin": null,
            "ean": null,
            "manufacturer_lot": "TG-260202109014285-20260507",
            "origin_country": null,
            "expiry_date": null,
            "category": "frozen",
            "requires_traceability": true,
            "requires_appcc_reception": true,
            "generates_inventory_lot": true,
            "storage_temperature": "frozen",
            "default_location": "Congelador",
            "notes": "Transgourmet indica que utiliza número y fecha de factura como código de trazabilidad/remesa."
          },
          {
            "product": "CROQUETA CULINARIA Q.AZUL/CEBO.1K",
            "quantity": 2,
            "unit": "bag",
            "price": 18.88,
            "iva": 10,
            "gtin": null,
            "ean": null,
            "manufacturer_lot": "TG-260202109014285-20260507",
            "origin_country": null,
            "expiry_date": null,
            "category": "frozen",
            "requires_traceability": true,
            "requires_appcc_reception": true,
            "generates_inventory_lot": true,
            "storage_temperature": "frozen",
            "default_location": "Congelador",
            "notes": "Transgourmet indica que utiliza número y fecha de factura como código de trazabilidad/remesa."
          },
          {
            "product": "CROQUETA CULINARIA VACUNO 1K",
            "quantity": 2,
            "unit": "bag",
            "price": 23.98,
            "iva": 10,
            "gtin": null,
            "ean": null,
            "manufacturer_lot": "TG-260202109014285-20260507",
            "origin_country": null,
            "expiry_date": null,
            "category": "frozen",
            "requires_traceability": true,
            "requires_appcc_reception": true,
            "generates_inventory_lot": true,
            "storage_temperature": "frozen",
            "default_location": "Congelador",
            "notes": "Transgourmet indica que utiliza número y fecha de factura como código de trazabilidad/remesa."
          },
          {
            "product": "GUACAMOLE GLOBAL HACIENDA SUAVE 95",
            "quantity": 1,
            "unit": "unit",
            "price": 6.39,
            "iva": 10,
            "gtin": null,
            "ean": null,
            "manufacturer_lot": "TG-260202109014285-20260507",
            "origin_country": null,
            "expiry_date": null,
            "category": "food",
            "requires_traceability": true,
            "requires_appcc_reception": true,
            "generates_inventory_lot": true,
            "storage_temperature": "refrigerated",
            "default_location": "Cámara refrigerada",
            "notes": "Transgourmet indica que utiliza número y fecha de factura como código de trazabilidad/remesa."
          },
          {
            "product": "PATATA CONSUMO SACO 15K E/K",
            "quantity": 15,
            "unit": "kg",
            "price": 10.8,
            "iva": 4,
            "gtin": null,
            "ean": null,
            "manufacturer_lot": "TG-260202109014285-20260507",
            "origin_country": null,
            "expiry_date": null,
            "category": "food",
            "requires_traceability": true,
            "requires_appcc_reception": true,
            "generates_inventory_lot": true,
            "storage_temperature": null,
            "default_location": "Almacén",
            "notes": "Transgourmet indica que utiliza número y fecha de factura como código de trazabilidad/remesa."
          }
        ]
      }
    ]
  },
  {
    "supplier": "Cash Alhambra",
    "tax_id": null,
    "notes": "Proveedor detectado. Pendiente completar CIF/NIF y documentos revisados.",
    "purchases": []
  },
  {
    "supplier": "Cárnicas Paquito",
    "tax_id": null,
    "notes": "Proveedor detectado. Priorizar carnes con lote, caducidad y temperatura de recepción visibles.",
    "purchases": []
  },
  {
    "supplier": "Mercadona",
    "tax_id": null,
    "notes": "Proveedor detectado. Cargar solo tickets/facturas con productos trazables revisados.",
    "purchases": []
  },
  {
    "supplier": "Alcampo",
    "tax_id": null,
    "notes": "Proveedor detectado. Cargar solo tickets/facturas con productos trazables revisados.",
    "purchases": []
  },
  {
    "supplier": "Brico Depot",
    "tax_id": null,
    "notes": "Proveedor detectado. Clasificación probable equipment/other; no genera APPCC salvo producto sanitario específico.",
    "purchases": []
  },
  {
    "supplier": "Ferrostock",
    "tax_id": null,
    "notes": "Proveedor detectado. Clasificación probable equipment/service; revisar antes de inventario.",
    "purchases": []
  },
  {
    "supplier": "Planet",
    "tax_id": null,
    "notes": "Proveedor detectado. Pendiente identificar familia real de compra.",
    "purchases": []
  },
  {
    "supplier": "Panadería La Gracia de Dios",
    "tax_id": null,
    "notes": "Proveedor detectado. Priorizar panadería con fecha de recepción y lote si aparece.",
    "purchases": []
  },
  {
    "supplier": "Sabocan",
    "tax_id": null,
    "notes": "Proveedor detectado. Pendiente revisar facturas/albaranes.",
    "purchases": []
  },
  {
    "supplier": "Alhambra Distribución",
    "tax_id": null,
    "notes": "Proveedor detectado. Clasificación probable alcohol/beverage; revisar lote y caducidad si aplica.",
    "purchases": []
  }
]'::jsonb;
  v_supplier jsonb;
  v_purchase jsonb;
  v_line jsonb;
  v_supplier_id uuid;
  v_product_id uuid;
  v_document_id uuid;
  v_item_id uuid;
  v_lot_id uuid;
  v_line_id uuid;
  v_supplier_name text;
  v_supplier_tax_id text;
  v_supplier_key text;
  v_document_type text;
  v_document_number text;
  v_document_date date;
  v_product_name text;
  v_product_key text;
  v_manufacturer_lot text;
  v_lot_code text;
  v_category text;
  v_quantity numeric;
  v_unit text;
  v_price numeric;
  v_requires_traceability boolean;
  v_requires_appcc boolean;
  v_generates_lot boolean;
  v_is_return boolean;
begin
  for v_supplier in select * from jsonb_array_elements(purchase_data)
  loop
    v_supplier_name := nullif(trim(v_supplier->>'supplier'), '');
    v_supplier_tax_id := nullif(regexp_replace(upper(coalesce(v_supplier->>'tax_id', '')), '[^A-Z0-9]', '', 'g'), '');
    v_supplier_key := regexp_replace(lower(coalesce(v_supplier_name, '')), '[^a-z0-9]+', ' ', 'g');

    if v_supplier_name is null then
      continue;
    end if;

    select id into v_supplier_id
    from public.admin_supplier_records sr
    where (v_supplier_tax_id is not null and regexp_replace(upper(coalesce(sr.cif, '')), '[^A-Z0-9]', '', 'g') = v_supplier_tax_id)
       or regexp_replace(lower(sr.supplier), '[^a-z0-9]+', ' ', 'g') = v_supplier_key
    order by sr.created_at asc
    limit 1;

    if v_supplier_id is null then
      insert into public.admin_supplier_records (supplier, cif, status, category, observations)
      values (
        v_supplier_name,
        v_supplier_tax_id,
        'pendiente_datos_administrativos',
        'Proveedor histórico',
        coalesce(v_supplier->>'notes', 'Proveedor creado desde importación histórica.')
      )
      returning id into v_supplier_id;
    else
      update public.admin_supplier_records
      set cif = coalesce(cif, v_supplier_tax_id),
          observations = coalesce(observations, v_supplier->>'notes')
      where id = v_supplier_id;
    end if;

    for v_purchase in select * from jsonb_array_elements(coalesce(v_supplier->'purchases', '[]'::jsonb))
    loop
      v_document_type := coalesce(v_purchase#>>'{document,type}', 'invoice');
      v_document_number := nullif(trim(coalesce(v_purchase#>>'{document,number}', '')), '');
      v_document_date := nullif(v_purchase#>>'{document,date}', '')::date;
      v_is_return := v_document_type in ('credit_note', 'refund', 'return', 'rectifying_invoice')
        or coalesce(nullif(v_purchase#>>'{accounting,total}', '')::numeric, 0) < 0;

      if v_document_number is null or v_document_date is null then
        raise notice 'Compra omitida para proveedor %: falta document.number o document.date', v_supplier_name;
        continue;
      end if;

      select id into v_document_id
      from public.admin_accounting_documents ad
      where ad.normalized_supplier_id = v_supplier_id
        and ad.document_number = v_document_number
        and ad.document_date = v_document_date
      limit 1;

      if v_document_id is null then
        insert into public.admin_accounting_documents (
          uploaded_document_id,
          supplier_id,
          normalized_supplier_id,
          supplier_name,
          supplier_tax_id,
          document_type,
          document_number,
          document_date,
          taxable_base,
          vat_amount,
          total_amount,
          purchase_status,
          accounting_category,
          observations,
          source
        )
        values (
          nullif(v_purchase#>>'{document,uploaded_document_id}', '')::uuid,
          v_supplier_id,
          v_supplier_id,
          v_supplier_name,
          v_supplier_tax_id,
          v_document_type,
          v_document_number,
          v_document_date,
          nullif(v_purchase#>>'{accounting,taxable_base}', '')::numeric,
          nullif(v_purchase#>>'{accounting,iva}', '')::numeric,
          nullif(v_purchase#>>'{accounting,total}', '')::numeric,
          'reviewed',
          nullif(v_purchase#>>'{accounting,accounting_category}', ''),
          coalesce(v_purchase#>>'{document,notes}', 'Importación histórica revisada.'),
          'admin-kiosko-historical-import'
        )
        returning id into v_document_id;
      else
        update public.admin_accounting_documents
        set normalized_supplier_id = v_supplier_id,
            supplier_id = coalesce(public.admin_accounting_documents.supplier_id, v_supplier_id),
            purchase_status = 'reviewed'
        where id = v_document_id;
      end if;

      for v_line in select * from jsonb_array_elements(coalesce(v_purchase->'lines', '[]'::jsonb))
      loop
        v_product_name := nullif(trim(coalesce(v_line->>'product', '')), '');
        if v_product_name is null then
          continue;
        end if;

        v_category := coalesce(nullif(v_line->>'category', ''), 'other');
        v_product_key := regexp_replace(lower(v_product_name), '[^a-z0-9]+', ' ', 'g');
        v_manufacturer_lot := nullif(trim(coalesce(v_line->>'manufacturer_lot', '')), '');
        v_quantity := nullif(v_line->>'quantity', '')::numeric;
        v_unit := coalesce(nullif(v_line->>'unit', ''), 'ud');
        v_price := nullif(v_line->>'price', '')::numeric;
        v_requires_traceability := coalesce((nullif(v_line->>'requires_traceability', ''))::boolean, false);
        v_requires_appcc := coalesce((nullif(v_line->>'requires_appcc_reception', ''))::boolean, false) and not v_is_return;
        v_generates_lot := coalesce((nullif(v_line->>'generates_inventory_lot', ''))::boolean, false)
          and not v_is_return
          and coalesce(v_quantity, 0) > 0;

        select id into v_product_id
        from public.admin_inventory_products ip
        where (nullif(regexp_replace(coalesce(v_line->>'gtin', ''), '\D', '', 'g'), '') is not null and ip.gtin = regexp_replace(coalesce(v_line->>'gtin', ''), '\D', '', 'g'))
           or (nullif(regexp_replace(coalesce(v_line->>'ean', ''), '\D', '', 'g'), '') is not null and ip.ean = regexp_replace(coalesce(v_line->>'ean', ''), '\D', '', 'g'))
           or regexp_replace(lower(ip.name), '[^a-z0-9]+', ' ', 'g') = v_product_key
        order by ip.created_at asc
        limit 1;

        if v_product_id is null then
          insert into public.admin_inventory_products (
            name,
            category,
            usual_supplier,
            unit,
            current_stock,
            minimum_stock,
            location,
            gtin,
            ean,
            product_family,
            accounting_category,
            storage_temperature,
            default_location,
            requires_traceability,
            requires_appcc_reception,
            generates_inventory_lot,
            observations,
            active
          )
          values (
            v_product_name,
            v_category,
            v_supplier_name,
            v_unit,
            0,
            0,
            coalesce(nullif(v_line->>'default_location', ''), 'Almacén'),
            nullif(regexp_replace(coalesce(v_line->>'gtin', ''), '\D', '', 'g'), ''),
            nullif(regexp_replace(coalesce(v_line->>'ean', ''), '\D', '', 'g'), ''),
            v_category,
            case when v_category = 'service' then 'servicios exteriores' when v_category = 'equipment' then 'equipamiento' else 'compras explotación' end,
            nullif(v_line->>'storage_temperature', ''),
            nullif(v_line->>'default_location', ''),
            v_requires_traceability,
            v_requires_appcc,
            v_generates_lot,
            coalesce(v_line->>'notes', 'Producto creado desde importación histórica.'),
            true
          )
          returning id into v_product_id;
        end if;

        select id, purchase_line_id into v_item_id, v_line_id
        from public.admin_accounting_document_items item
        where item.purchase_document_id = v_document_id
          and regexp_replace(lower(item.product_name), '[^a-z0-9]+', ' ', 'g') = v_product_key
          and coalesce(item.manufacturer_lot, item.batch_number, '') = coalesce(v_manufacturer_lot, '')
        limit 1;

        if v_item_id is null then
          v_line_id := gen_random_uuid();

          insert into public.admin_accounting_document_items (
            accounting_document_id,
            purchase_document_id,
            purchase_line_id,
            product_name,
            normalized_product_id,
            inventory_product_id,
            quantity,
            unit,
            unit_price,
            vat_rate,
            total_amount,
            gtin,
            ean,
            batch_number,
            manufacturer_lot,
            origin_country,
            expiry_date,
            requires_traceability,
            requires_appcc_reception,
            generates_inventory_lot,
            accounting_category,
            product_family,
            storage_temperature,
            default_location
          )
          values (
            v_document_id,
            v_document_id,
            v_line_id,
            v_product_name,
            v_product_id,
            v_product_id,
            v_quantity,
            v_unit,
            case
              when v_quantity is not null and v_quantity <> 0 and v_price is not null then v_price / v_quantity
              else v_price
            end,
            nullif(v_line->>'iva', '')::numeric,
            v_price,
            nullif(regexp_replace(coalesce(v_line->>'gtin', ''), '\D', '', 'g'), ''),
            nullif(regexp_replace(coalesce(v_line->>'ean', ''), '\D', '', 'g'), ''),
            v_manufacturer_lot,
            v_manufacturer_lot,
            nullif(v_line->>'origin_country', ''),
            nullif(v_line->>'expiry_date', '')::date,
            v_requires_traceability,
            v_requires_appcc,
            v_generates_lot,
            case when v_category = 'service' then 'servicios exteriores' when v_category = 'equipment' then 'equipamiento' else 'compras explotación' end,
            v_category,
            nullif(v_line->>'storage_temperature', ''),
            nullif(v_line->>'default_location', '')
          )
          returning id into v_item_id;
        end if;

        if v_generates_lot then
          v_lot_code := coalesce(
            v_manufacturer_lot,
            'INIT-' || to_char(v_document_date, 'YYYYMMDD') || '-' ||
            upper(regexp_replace(left(coalesce(v_supplier_name, 'SUPPLIER'), 12), '[^A-Za-z0-9]+', '', 'g')) || '-' ||
            upper(regexp_replace(left(coalesce(v_product_name, 'PRODUCT'), 12), '[^A-Za-z0-9]+', '', 'g'))
          );

          select id into v_lot_id
          from public.admin_inventory_lots lot
          where lot.product_id = v_product_id
            and lot.normalized_supplier_id = v_supplier_id
            and lot.batch_number = v_lot_code
            and lot.purchase_document_id = v_document_id
          limit 1;

          if v_lot_id is null then
            insert into public.admin_inventory_lots (
              product_id,
              normalized_product_id,
              product_name,
              supplier_id,
              normalized_supplier_id,
              supplier_name,
              purchase_document_id,
              purchase_line_id,
              batch_number,
              manufacturer_lot,
              origin_country,
              expiry_date,
              received_date,
              initial_quantity,
              current_quantity,
              unit,
              location,
              purchase_price,
              average_unit_cost,
              status,
              requires_traceability,
              requires_appcc_reception,
              generates_inventory_lot,
              accounting_category,
              product_family,
              storage_temperature,
              default_location,
              observations,
              source
            )
            values (
              v_product_id,
              v_product_id,
              v_product_name,
              v_supplier_id,
              v_supplier_id,
              v_supplier_name,
              v_document_id,
              v_line_id,
              v_lot_code,
              v_manufacturer_lot,
              nullif(v_line->>'origin_country', ''),
              nullif(v_line->>'expiry_date', '')::date,
              v_document_date,
              coalesce(v_quantity, 0),
              coalesce(v_quantity, 0),
              v_unit,
              coalesce(nullif(v_line->>'default_location', ''), 'Almacén'),
              case
                when v_quantity is not null and v_quantity <> 0 and v_price is not null then v_price / v_quantity
                else v_price
              end,
              case
                when v_quantity is not null and v_quantity <> 0 and v_price is not null then v_price / v_quantity
                else v_price
              end,
              'activo',
              v_requires_traceability,
              v_requires_appcc,
              true,
              case when v_category = 'service' then 'servicios exteriores' when v_category = 'equipment' then 'equipamiento' else 'compras explotación' end,
              v_category,
              nullif(v_line->>'storage_temperature', ''),
              nullif(v_line->>'default_location', ''),
              coalesce(v_line->>'notes', 'Lote creado desde importación histórica.'),
              'admin-kiosko-historical-import'
            )
            returning id into v_lot_id;

            insert into public.admin_inventory_lot_movements (
              lot_id,
              product_id,
              purchase_document_id,
              purchase_line_id,
              movement_type,
              movement_date,
              quantity,
              unit,
              to_location,
              reason,
              responsible,
              related_record_type,
              related_record_id,
              observations
            )
            values (
              v_lot_id,
              v_product_id,
              v_document_id,
              v_line_id,
              'entrada',
              v_document_date,
              coalesce(v_quantity, 0),
              v_unit,
              coalesce(nullif(v_line->>'default_location', ''), 'Almacén'),
              'Importación histórica revisada',
              'Sistema',
              'admin_accounting_documents',
              v_document_id,
              coalesce(v_line->>'notes', 'Entrada creada desde importación histórica.')
            );
          end if;
        end if;

        if v_requires_appcc then
          insert into public.admin_goods_reception_records (
            record_date,
            supplier,
            product,
            batch_number,
            expiry_date,
            accepted,
            status,
            observations,
            purchase_document_id,
            purchase_line_id,
            normalized_supplier_id,
            normalized_product_id,
            manufacturer_lot,
            origin_country,
            requires_traceability,
            requires_appcc_reception,
            generates_inventory_lot,
            storage_temperature,
            default_location,
            source
          )
          select
            v_document_date,
            v_supplier_name,
            v_product_name,
            v_manufacturer_lot,
            nullif(v_line->>'expiry_date', '')::date,
            true,
            'correcto',
            coalesce(v_line->>'notes', 'Recepción APPCC creada desde importación histórica revisada.'),
            v_document_id,
            v_line_id,
            v_supplier_id,
            v_product_id,
            v_manufacturer_lot,
            nullif(v_line->>'origin_country', ''),
            v_requires_traceability,
            true,
            v_generates_lot,
            nullif(v_line->>'storage_temperature', ''),
            nullif(v_line->>'default_location', ''),
            'admin-kiosko-historical-import'
          where not exists (
            select 1
            from public.admin_goods_reception_records gr
            where gr.purchase_document_id = v_document_id
              and gr.purchase_line_id = v_line_id
          );
        end if;
      end loop;
    end loop;
  end loop;
end $$;
