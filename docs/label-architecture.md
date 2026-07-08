# Arquitectura de etiquetas

El ERP queda orientado a eventos. Las paginas no deben decidir plantilla, impresora ni payload de impresion.

## Flujo base

```text
Server action
  -> valida sesion y datos
  -> emite evento automatico o invoca servicio manual
  -> labelEventService decide politica
  -> printService genera raw_command EZPL
  -> print_jobs queued
  -> bridge imprime raw_command
```

## Capas

```text
app/admin-kiosko/actions.ts
  Autorizacion, validacion minima, revalidate/redirect.

lib/admin-kiosko/domain/label-events.ts
  Nombres de eventos, claves de idempotencia y contratos de decision.

lib/admin-kiosko/domain/label-event.service.ts
  Politica de etiquetas:
  - imprimir o no imprimir
  - plantilla
  - printer_key
  - copias
  - metadata
  - idempotencia

La decision pura y la ejecucion estan separadas dentro del servicio. Las decisiones automaticas pueden buscar duplicados; las solicitudes manuales crean un job nuevo si la validacion pasa.

lib/admin-kiosko/printing/print-service.ts
  Generacion final de payload y raw_command EZPL.

public.print_jobs
  Cola persistente consumida por el bridge.
```

## Produccion

```text
ProductionBatchClosed
  -> requestProductionBatchClosedLabel()
  -> idempotencyKey production_label:<batchId>:auto_print_on_batch_close:prep_label_professional
  -> prep_label_professional
  -> kiosko_godex_g500
```

La action emite `ProductionBatchClosed` y usa el resultado del handler para mostrar feedback. No hay segunda llamada de impresion desde la action. Si ya existe un job equivalente, no se crea otro.

La reimpresion manual usa `requestProductionBatchManualLabel()` y crea un job nuevo por solicitud.

## Preparaciones

```text
PrepCreated
  -> requestPrepCreatedLabel()
  -> si hay batchCode y caducidad: prep_label_professional
  -> si falta lote/caducidad: no imprime
```

No se emite `PrepCreated` desde una receta activa sin lote real. No se genera lote fisico desde una receta activa sin datos de lote.

La impresion manual desde `/admin-kiosko/etiquetas-prep` usa `requestPrepManualLabel()` y no aplica deduplicacion automatica.

## Recepcion de mercancia

```text
/admin-kiosko/compras
  -> registerManualGoodsReceptionAction()
  -> goodsReceptionService.registerManualReception()
  -> admin_goods_reception_records
  -> applyInventoryMovement(entrada)
  -> GoodsReceived
  -> requestGoodsReceivedLabel()
  -> ingredient_label_basic
  -> kiosko_godex_g500
```

La politica activa exige `productName` y `batchCode` en el payload top-level del evento. Los eventos heredados de OCR basados en `items` no imprimen automaticamente para no cambiar el comportamiento OCR en esta fase.

La idempotencia usa:

```text
goods_reception_manual:<supplierName>:<productId>:<batchCode>:<quantity>:<unit>:<receivedDate>
```

Antes de crear una nueva recepcion manual, el servicio busca una recepcion equivalente reciente con la misma clave operativa guardada en observaciones. Si existe, no crea otro movimiento de inventario ni otra etiqueta automatica. La garantia fuerte sigue requiriendo una constraint/RPC transaccional futura.

Tras `applyInventoryMovement()`, el servicio verifica que exista un lote para `productId + batchCode`. Si no puede confirmarlo, no emite `GoodsReceived` ni etiqueta.

## Etiqueta manual actual

La UI existente de `/admin-kiosko/etiquetas` sigue funcionando, pero ya no crea `print_jobs` legacy. Llama a:

```text
requestManualGodexLabel()
  -> prep_label_professional si hay caducidad valida
  -> product_label_basic como fallback compatible
```

## Eventos preparados

```text
GoodsReceived
InventoryAdjusted
RecipeProduced
RecipeConsumed
TransferCreated
WasteCreated
CustomerOrderPacked
BatchSplit
BatchRepacked
BatchReturned
BatchChanged
```

Estos eventos estan documentados y preparados conceptualmente. No activan impresion hasta que exista payload estable.

`PrintJobCreated` es audit-only. No tiene handler propio ni debe disparar impresion.
