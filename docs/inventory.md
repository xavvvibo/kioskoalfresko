# Inventario y trazabilidad APPCC

## Split Carniceria Palomitas #017843

Pantalla interna:

```text
/admin-kiosko/trazabilidad/palomitas-017843
```

Uso operativo:

1. Abrir la pantalla desde el panel interno.
2. Seleccionar el lote real localizado por proveedor, ticket, fecha de compra o caducidad.
3. Registrar el split APPCC.
4. Revisar las dos previews 80x50.
5. Pulsar manualmente `Imprimir etiqueta A` y `Imprimir etiqueta B`.

El flujo no imprime automaticamente. Cada boton crea un `print_job` para `kiosko_godex_g500` con `raw_command` EZPL 80x50 validado.

### Politica sanitaria aplicada

- Compra: 17/06/2026.
- Congelacion: 18/06/2026.
- Caducidad original fresco conservada: 30/06/2026.
- Ticket/ref: #017843.
- Proveedor: Carniceria Palomitas, NIF/CIF 24065365-M.
- Split esperado: 1,000 kg descongelando/en uso y 1,800 kg congelado/reserva.
- La parte descongelando usa limite conservador de 24 horas desde las 00:00 del dia de registro si no hay politica interna mas restrictiva.
- La parte descongelando queda marcada con `NO RECONGELAR`.
- La parte congelada queda marcada con `NO RECONGELAR TRAS DESCONGELAR`.

### Trazabilidad registrada

El flujo usa tablas existentes:

- `admin_inventory_lots`: lote original y lote derivado descongelando.
- `admin_inventory_lot_movements`: congelacion documentada, division de lote y descongelacion.
- `print_jobs`: cola GoDEX/EZPL.
- `admin_label_records`: historial de etiqueta.

No se crea producto ficticio. Si no existe nombre de producto o lote interno/proveedor en el lote seleccionado, el sistema bloquea el split o la impresion.

## Inventario congelado 08/07/2026

Pantalla interna:

```text
/admin-kiosko/trazabilidad/inventario-congelado-20260708
```

Batch:

- `batch_code`: `FRZ-20260708`
- Fecha factura/albaran / recepcion real: pendiente de revision documental.
- Registro/inventario: `2026-07-08`
- Criterio de regularizacion autorizado: si un producto coincide de forma fiable con compras disponibles, se usa la fecha de compra mas reciente porque el stock anterior se considera consumido por ventas.
- Estado APPCC entrada: recibido congelado.
- Estado actual: congelado.
- Conservacion: `-18 C o inferior`.
- Fuente documental: `Inventario congelado 08jul2026.zip / fotos de producto y fichas`.
- Observacion: llego congelado segun factura/albaran y continua congelado.

Reglas:

- Cada envase fisico tiene lote interno propio `FRZ-20260708-XXX`.
- No se genera fecha de descongelacion.
- No se genera vida util 24h/48h porque no se ha descongelado.
- Las etiquetas aptas muestran `MANTENER CONGELADO` y `NO RECONGELAR TRAS DESCONGELACION`.
- Los productos con lote/caducidad/peso no visibles quedan en revision y la etiqueta muestra `REVISAR DATOS ANTES DE USAR`.
- Mini Burger de pollo queda en cuarentena por fecha visible anterior a recepcion y la etiqueta muestra `CUARENTENA · NO USAR`.

Impresion:

- La pantalla muestra preview GoDEX 80x50 por envase.
- `Imprimir todas las etiquetas aptas` encola solo etiquetas revisadas/aptas.
- `Imprimir etiquetas de revision/cuarentena` encola etiquetas con aviso operativo.
- Ambos botones piden confirmacion y crean trabajos nuevos en `print_jobs`; no hay impresion automatica.
- La impresion queda bloqueada si no se verifican exactamente 52 lotes en `public.admin_inventory_lots` con `batch_number` `FRZ-20260708-XXX`.
- En el batch congelado actual no se ha forzado ningun match aproximado con Makro: los productos congelados sin coincidencia exacta normalizada siguen en revision por fecha documental.

Consulta SQL de verificacion:

```sql
select
  count(*) as freezer_lots,
  count(*) filter (where status = 'activo' and appcc_review_status = 'revisado' and coalesce(document_date, received_at) is not null) as accepted_lots,
  count(*) filter (where status = 'bloqueado') as quarantine_lots,
  count(*) filter (where not (status = 'activo' and appcc_review_status = 'revisado' and coalesce(document_date, received_at) is not null) and status <> 'bloqueado') as review_lots
from public.admin_inventory_lots
where batch_number like 'FRZ-20260708-%';
```

Resultado esperado:

- `freezer_lots`: `52`
- `accepted_lots`: `0` hasta completar fecha factura/albaran real.
- `quarantine_lots`: `3`
- `review_lots`: `49`

## Fuente normalizada de compras Makro

Facturas consolidadas para regularizacion de stock:

- `201-0037200`: document_date/received_at `2026-07-03`, hora `11:54`.
- `003-313566`: document_date/received_at `2026-07-04`, hora `15:58`.
- `003-313571`: document_date/received_at `2026-07-04`, hora `16:06`.
- `003-314013`: document_date/received_at `2026-07-06`, hora `19:13`.

La fuente normalizada por producto conserva:

- `invoice_ref`
- `document_date`
- `document_datetime`
- `product_name_original`
- `normalized_product_name`
- `provider`
- `quantity`
- `unit`
- `supplier_lot` si consta
- `source = invoice`
- `notes`

Si un producto aparece en varias compras, se selecciona la compra mas reciente disponible por `normalized_product_name`. Ejemplo: `YOPRO DRINKS FRS/FRAMB 300G` queda asociado a `003-314013` (`2026-07-06`) para stock actual, porque tambien aparece en `003-313566` (`2026-07-04`).

Asociaciones FRZ autorizadas:

- `Alitas de pollo` se asocia de forma explícita a `POLLO ALAS VC AI KG` de factura `201-0037200`, document_date `2026-07-03`, lote proveedor `26002377`.
- Sigue en revision porque las cantidades documentadas (`1,312 kg + 1,372 kg + 1,224 kg`) deben cruzarse con los envases fisicos del batch antes de uso.
- La etiqueta debe indicar `REVISAR CANTIDAD/ENVASE ANTES DE USAR`.

## Recepcion Makro 04/07/2026 y 06/07/2026

Pantalla interna:

```text
/admin-kiosko/recepcion/makro-20260704-20260706
```

Facturas origen:

- `003-313566`, entrega `04/07/2026 15:58`.
- `003-313571`, entrega `04/07/2026 16:06`.
- `003-314013`, entrega `06/07/2026 19:13`.

Uso operativo:

1. Abrir la pantalla interna.
2. Revisar `Productos a recepcionar APPCC`, `Productos abiertos hoy`, `Transformados hoy`, `Productos solo stock` y `Productos omitidos`.
3. Pulsar `Registrar recepcion`.
4. Revisar o editar fecha/hora operativa y responsable.
5. Pulsar `Registrar aperturas` para pepino, ranchera, BBQ whiskey, mayonesa trufada, Corn Flakes y Panko.
6. Pulsar `Registrar transformacion pollo` para `POLLO CONTRAMUSLO VC KG` a `POLLO CONTRAMUSLO MARINADO`.
7. Revisar previews 80x50 y pulsar manualmente la impresion por grupo o por etiqueta.

No se imprime al cargar. Cada boton de impresion pide confirmacion y crea trabajos nuevos en `print_jobs` para GoDEX 80x50/EZPL.

Reglas APPCC:

- No se crean recepciones, lotes, movimientos ni etiquetas para productos omitidos: Yopro, jamon reserva lonchas y pechuga de pavo lonchas.
- La caducidad original no se inventa. Si no consta en factura, la etiqueta muestra `revisar envase`.
- Lote proveedor obligatorio cuando consta en factura: picadillo chorizo `16104415`, picadillo morcilla `16900919`, pollo contramuslo `26002392`.
- Las aperturas no se duplican para el mismo lote y fecha. Una reimpresion solo crea un nuevo trabajo de impresion y registro de etiqueta.
- El marinado del pollo no se duplica para lote `26002392`, fecha operativa y cantidad `1,846 kg`.
- Corn Flakes y Panko abiertos muestran: `NO REUTILIZAR SOBRANTE QUE HAYA TOCADO POLLO CRUDO` y `Mantener cerrado y seco`.

Etiquetas preparadas:

- Recepcion APPCC: cheddar, magreta, picadillos, salsa cheddar, mozzarella, queso Hochland, provolone, cebolleta y cebolla caramelizada.
- Apertura: pepino rodajas, salsa ranchera, salsa BBQ whiskey, mayonesa trufada, Corn Flakes y Panko.
- Transformacion: `POLLO CONTRAMUSLO MARINADO`, vinculado a `POLLO CONTRAMUSLO VC KG`, factura `003-314013`, lote proveedor `26002392`.

### Maquetacion fisica GoDEX 80x50

Las etiquetas Makro usan una version compacta para respetar la zona segura real de la GoDEX 80x50 a 203 dpi:

- Producto en maximo 2 lineas.
- Responsable abreviado, por ejemplo `RESP: FJB`.
- Conservacion abreviada, por ejemplo `CONSERV: REFRIG. 0-4C`.
- Avisos criticos separados en lineas cortas, por ejemplo `COCINAR COMPLETO` y `NO CONSUMIR CRUDO`.
- El lote interno largo no se fuerza al pie si no cabe; la traza completa queda en el QR.
- El contenido critico queda por encima de la zona inferior que se ha observado como recortable en impresion fisica.

Para `POLLO CONTRAMUSLO MARINADO`, la etiqueta debe priorizar:

- `MARINADO/CRUDO`
- cantidad
- proveedor/factura
- lote proveedor
- recepcion factura
- fecha/hora marinado
- uso interno
- conservacion
- responsable
- avisos de cocinado/no crudo

## Impresion remota segura GoDEX

Arquitectura operativa:

```text
Admin web / casa -> Supabase print_jobs -> bridge local en kiosko -> GoDEX <IP_DE_LA_GODEX>:9100
```

Reglas de seguridad:

- No abrir el puerto RAW `9100` a internet.
- No hacer port forwarding del router hacia `<IP_DE_LA_GODEX>`.
- El `SUPABASE_SERVICE_ROLE_KEY` solo se usa en el bridge local del kiosko, nunca en cliente web.
- La web interna solo encola `print_jobs` tras las validaciones APPCC del flujo correspondiente.
- El bridge no imprime trabajos ya `printed`, `error` o `cancelled`.
- `--since` manda sobre `GODEX_MIN_JOB_CREATED_AT`.
- Si no hay `--since` ni `GODEX_MIN_JOB_CREATED_AT`, el bridge solo procesa trabajos `queued` creados desde que arranca.
- Para dejar el bridge permanente en Windows, configurar `GODEX_MIN_JOB_CREATED_AT` en `.env.local` y no depender de la hora de arranque.

Arranque en el kiosko:

```bash
cd /Users/xavibocanegra/kioskoalfresko
npm run print:godex
```

Prueba sin imprimir ni modificar la cola:

```bash
cd /Users/xavibocanegra/kioskoalfresko
npm run print:godex:dry
```

Procesar una sola pasada:

```bash
cd /Users/xavibocanegra/kioskoalfresko
npm run print:godex:once
```

Evitar trabajos antiguos:

```bash
cd /Users/xavibocanegra/kioskoalfresko
node scripts/godex-print-bridge.mjs --since "2026-07-09T00:00:00+02:00"
```

Filtrar por batch o grupo cuando el `payload.metadata` lo tenga:

```bash
node scripts/godex-print-bridge.mjs --since "2026-07-09T00:00:00+02:00" --batch FRZ-20260708
node scripts/godex-print-bridge.mjs --since "2026-07-09T00:00:00+02:00" --job-group makro
```

Variables esperadas en `.env.local` del kiosko:

```text
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
PRINTER_KEY=kiosko_godex_g500
GODEX_HOST=<IP_DE_LA_GODEX>
GODEX_PORT=9100
GODEX_PRINTER_KEY=kiosko_godex_g500
GODEX_MIN_JOB_CREATED_AT=2026-07-09T09:00:00+02:00
GODEX_SOCKET_SETTLE_MS=1200
GODEX_BETWEEN_JOBS_MS=2000
GODEX_TCP_TIMEOUT_MS=10000
```

El bridge marca `claimed`, `sending` y finalmente `printed` cuando el comando TCP RAW se ha enviado a la GoDEX. `printed` no confirma visualmente la salida fisica del papel porque RAW 9100 no da ACK fiable. Si falla el transporte, marca `error` con detalle corto en la cola.

Para lotes grandes, imprimir primero 1 etiqueta y validar salida fisica antes de lanzar muchas etiquetas. No lanzar las 52 etiquetas FRZ sin haber validado salida real de papel en la GoDEX.

## Bridge GoDEX standalone para PC Windows del kiosko

El repositorio puede quedarse en el Mac de Xavi. El PC Windows del kiosko no necesita clonar el repo completo: solo necesita el paquete portable generado en:

```text
/Users/xavibocanegra/kioskoalfresko/dist/godex-print-bridge-windows/
```

Generacion desde el Mac:

```bash
cd /Users/xavibocanegra/kioskoalfresko
npm run build:godex-bridge
```

Copiar al PC Windows por USB/Drive, por ejemplo a:

```text
C:\godex-print-bridge
```

El PC Windows debe estar en la misma red local que la GoDEX `<IP_DE_LA_GODEX>:9100`. No abrir `9100` a internet y no hacer port forwarding.

Contenido del paquete:

- `godex-print-bridge.mjs`: bridge standalone Node.js.
- `package.json`: scripts minimos.
- `.env.example`: plantilla sin claves reales.
- `README-WINDOWS.md`: instrucciones operativas.
- `dry-run.ps1`: prueba sin imprimir.
- `once.ps1`: procesa una pasada.
- `start-bridge.ps1`: deja el bridge en polling.

En el PC Windows:

1. Instalar Node.js LTS.
2. Copiar `.env.example` a `.env.local`.
3. Rellenar `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `GODEX_HOST=<IP_DE_LA_GODEX>`, `GODEX_PORT=9100`, `GODEX_PRINTER_KEY=kiosko_godex_g500`, `GODEX_SOCKET_SETTLE_MS=1200`, `GODEX_BETWEEN_JOBS_MS=2000` y `GODEX_TCP_TIMEOUT_MS=10000`.
4. Probar sin imprimir:

```powershell
cd C:\godex-print-bridge
npm run print:godex:dry
```

5. Procesar una vez:

```powershell
npm run print:godex:once
```

6. Dejarlo corriendo:

```powershell
npm run print:godex
```

Para evitar trabajos antiguos:

```powershell
GODEX_MIN_JOB_CREATED_AT=2026-07-09T09:00:00+02:00
```

O de forma puntual por CLI:

```powershell
node godex-print-bridge.mjs --once --since "2026-07-09T09:00:00+02:00"
```

Para filtrar por batch:

```powershell
node godex-print-bridge.mjs --once --since "2026-07-09T09:00:00+02:00" --batch FRZ-20260708
```

Para instalarlo como Tarea Programada de Windows:

```powershell
powershell -ExecutionPolicy Bypass -File .\install-scheduled-task.ps1
```

Para desinstalar la tarea sin borrar archivos:

```powershell
powershell -ExecutionPolicy Bypass -File .\uninstall-scheduled-task.ps1
```
