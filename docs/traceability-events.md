# Eventos de trazabilidad Kiosko Alfresko

Este documento audita donde nacen lotes, preparaciones y movimientos relevantes para trazabilidad. No implica cambios de schema.

## Eventos implementados

### Produccion

Origen: `/admin-kiosko/produccion`

- `ProductionBatchCreated`: se emite al registrar un lote interno.
- `FinishedProductLotCreated`: se emite cuando la produccion genera lote de salida.
- `InventoryLotConsumed`: se emite cuando una receta consume lotes de inventario.
- `ProductionBatchClosed`: preparado como evento de cierre operativo de lote. La politica de etiqueta la resuelve `labelEventService`.
- `ProductionBatchConsumed`: consumo logico de lote interno, sin mutacion real de stock en esta fase.
- `PrintJobCreated`: auditoria cuando se crea o reutiliza un trabajo de etiqueta. Es audit-only y no dispara impresion.

Regla actual:

```text
ProductionBatchClosed
  -> labelEventService
  -> print_jobs queued
  -> PrintJobCreated
```

### Preparaciones

Origen: recetas/preparaciones internas y `/admin-kiosko/etiquetas-prep`.

- `PrepCreated`: evento preparado para una preparacion imprimible con lote real.
- `PrintJobCreated`: auditoria cuando una preparacion con lote/caducidad genera etiqueta.

Regla actual:

```text
PrepCreated
  -> si no hay lote/caducidad: no imprime
  -> si hay lote/caducidad: etiqueta prep profesional
```

No se inventa lote fisico desde una receta activa y no se emite `PrepCreated` si no hay lote real. La impresion real requiere lote/caducidad.

### Recepcion de mercancia

Origen: `/admin-kiosko/recepcion-mercancia`, Inbox/OCR confirmado.

- `GoodsReceived`: recepcion APPCC manual o desde documento.
- `InventoryLotCreated`: lote FEFO preparado/creado desde recepcion o importacion.

Regla futura:

```text
GoodsReceived
  -> labelEventService
  -> etiqueta recepcion/lote proveedor si el lote queda validado
```

### Movimientos internos

Origen: lote interno y movimientos de inventario/produccion.

- `InventoryLotConsumed`: consumo de materias primas por produccion.
- `ProductionBatchConsumed`: consumo logico de subelaboracion.

Eventos preparados:

- `BatchSplit`: fraccionamiento de lote.
- `BatchRepacked`: reenvasado.
- `BatchReturned`: devolucion.
- `BatchChanged`: cambio de lote.
- `WasteCreated`: merma.
- `InventoryAdjusted`: regularizacion.
- `TransferCreated`: transferencia interna.
- `RecipeProduced`: receta producida.
- `RecipeConsumed`: receta consumida.
- `CustomerOrderPacked`: pedido empaquetado.

## Puntos auditados

| Area | Punto actual | Evento actual | Etiqueta automatica |
| --- | --- | --- | --- |
| Recepcion manual | `saveGoodsReceptionRecordAction` | `GoodsReceived` | Preparada, no activa |
| Recepcion IA/OCR | `saveAiReceptionAction` | `GoodsReceived`, `InventoryLotCreated` | Preparada, no activa |
| Produccion directa | `saveProductionBatchAction` | `ProductionBatchCreated`, `ProductionBatchClosed`, `PrintJobCreated` | Activa |
| Produccion por receta | `registerProductionMovements` desde action | `ProductionBatchCreated`, `FinishedProductLotCreated`, `InventoryLotConsumed`, `ProductionBatchClosed`, `PrintJobCreated` | Activa |
| Preparacion activa | `saveInternalRecipeAction` | Pendiente de evento imprimible con lote | No activa |
| Consumo logico lote | `registerBatchConsumption` | `ProductionBatchConsumed` | No aplica |
| Merma/devolucion/cambio | movimientos de produccion/inventario | Preparado | Pendiente |

## Deuda tecnica

- Garantia fuerte de idempotencia requiere indice unico futuro en `print_jobs` sobre clave logica de metadata.
- Recepcion, fraccionamiento, reenvasado y devoluciones necesitan payloads definitivos antes de activar etiquetas.
- La etiqueta de ingrediente sigue siendo accion directa existente; no se ha migrado para evitar ampliar alcance.
