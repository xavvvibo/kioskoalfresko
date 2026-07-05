# PrintService ERP -> GoDEX G500

## Arquitectura final validada

La impresion remota de la GoDEX G500 funciona en produccion. El ERP crea filas en `public.print_jobs`; el bridge standalone del kiosco consume la API publica del ERP, reclama trabajos y envia la impresion a la GoDEX G500 por TCP RAW 9100.

```text
ERP backend -> public.print_jobs -> API publica ERP -> bridge kiosco -> TCP RAW 9100 -> GoDEX G500 80x50
```

Datos finales validados:

- `printer_key`: `kiosko_godex_g500`
- IP GoDEX G500: `192.168.1.38`
- Puerto RAW: `9100`
- Transporte: `tcp_9100`
- Etiqueta fisica: `80x50 mm`

El ERP no usa drivers locales, no abre conexion TCP con la impresora y no expone `SUPABASE_SERVICE_ROLE_KEY` al frontend. El bridge no debe depender de `localhost`; debe apuntar a `ERP_API_URL=https://kioskoalfresko.es` o la URL publica vigente del ERP.

## Variables validas

Variables del bridge standalone:

```env
ERP_API_URL=https://kioskoalfresko.es
ERP_API_TOKEN=...
PRINTER_KEY=kiosko_godex_g500
GODEX_PRINT_TRANSPORT=tcp_9100
GODEX_PRINTER_HOST=192.168.1.38
GODEX_PRINTER_PORT=9100
```

Variables opcionales del bridge:

```env
GODEX_TCP_TIMEOUT_MS=5000
PRINT_DEBUG_TCP=false
PRINT_DEBUG_EZPL=false
BRIDGE_HEALTH_HOST=127.0.0.1
BRIDGE_HEALTH_PORT=8787
POLL_INTERVAL_MS=2000
MAX_JOBS_PER_POLL=1
GODEX_DRY_RUN=false
DRY_RUN_MARK_PRINTED=false
```

Variables antiguas no validas:

- `GODEX_HOST`
- `GODEX_PORT`

Si aparecen en el PC del kiosco, eliminarlas. El caso validado que fallo fue un bridge antiguo con `GODEX_HOST=192.168.1.35`.

Variables backend del ERP:

- `PRINT_JOBS_API_TOKEN`: token que exige la API publica de impresion.
- `ERP_API_TOKEN`: mismo valor en el bridge para autenticarse contra el ERP.
- `SUPABASE_SERVICE_ROLE_KEY`: solo en servidor ERP, nunca en navegador ni bridge si no hace falta.

## Carga de entorno

El bridge y scripts GoDEX cargan automaticamente:

1. `.env`
2. `.env.local`

No hace falta ejecutar `export ...` para arrancar el bridge. En produccion del PC del kiosco usar `.env.local`.

## Instalacion Windows

PowerShell como administrador:

```powershell
cd C:\kioskoalfresko
powershell -ExecutionPolicy Bypass -File scripts\godex-print-service\install-service.ps1 -NssmExe C:\nssm\win64\nssm.exe
```

El instalador:

- ejecuta `npm install`;
- copia `.env.example` a `.env.local` si no existe;
- verifica conectividad TCP con `192.168.1.38:9100`;
- registra `KioskoGodexBridge` con NSSM;
- configura reinicio automatico;
- arranca el servicio;
- ejecuta `npm run godex:doctor`.

## Instalacion Mac

Uso de desarrollo o diagnostico:

```bash
cp .env.example .env.local
npm install
npm run godex:doctor
npm run godex:bridge:prod
```

En Mac no instalar servicio Windows. Para pruebas TCP directas desde una red con acceso a la GoDEX:

```bash
npm run godex:test-label:tcp:minimal
npm run godex:test-label:tcp
```

## Health check y doctor

Health local del bridge:

```text
GET http://127.0.0.1:8787/health
```

Doctor no destructivo:

```bash
npm run godex:doctor
```

Comprueba configuracion, ERP, token, TCP impresora, `printer_key`, health del bridge, polling, version y ultima impresion si hay credenciales Supabase de servidor disponibles.

## Recuperacion automatica

Cuando el bridge consulta `/api/print-jobs/pending`, el ERP recupera automaticamente jobs en `error` por conectividad:

- `ECONNREFUSED`
- `timeout`
- `timed out`
- `ETIMEDOUT`
- `EHOSTUNREACH`
- `ENETUNREACH`
- `ECONNRESET`

Tras `PRINT_JOBS_STALE_MINUTES` minutos, esos jobs vuelven a `queued` y quedan disponibles para que el bridge los reclame. No hay intervencion manual ni cambio de schema.

## Flujo ERP -> GoDEX

```text
ERP crea print_job con raw_command EZPL
  -> bridge llama GET /api/print-jobs/pending?printer_key=kiosko_godex_g500
  -> API reclama job
  -> bridge valida EZPL
  -> bridge envia por TCP 192.168.1.38:9100
  -> bridge marca printed o error
```

## API interna

Usar `printService.printLabel` desde codigo backend:

```ts
import { DEFAULT_GODEX_G500_PRINTER_KEY, printService } from "@/lib/admin-kiosko/printing/print-service";

await printService.printLabel({
  printerKey: DEFAULT_GODEX_G500_PRINTER_KEY,
  template: "prep_label_professional",
  data: {
    prepName: "GUACAMOLE",
    productionDateTime: "2026-07-04T12:30",
    expiryDateTime: "2026-07-06T12:30",
    batchCode: "GM-040726-01",
    responsibleName: "J. Bocanegra",
    storageCondition: "Refrigerado 0-4 C",
    brandName: "KIOSKO ALFRESKO",
  },
});
```

Templates soportados:

- `test_label`: `{ title, line1, line2 }`
- `product_label_basic`: `{ productName, internalCode?, lot?, expiryDate? }`
- `ingredient_label_basic`: `{ ingredientName, supplierName?, internalCode?, lot?, expiryDate? }`
- `prep_label_basic`: `{ prepName, productionDateTime?, expiryDateTime?, shelfLifeDays?, productionDate?, expiryDate?, batchCode? }`
- `prep_label_professional`: `{ prepName, productionDateTime?, expiryDateTime?, shelfLifeDays?, batchCode?, responsibleName?, storageCondition?, brandName?, qrUrl?, qrValue?, includeQr? }`

`prep_label_basic` imprime siempre:

```text
NOMBRE PREPARACION
ELAB dd/mm/yy HH:mm
CAD dd/mm/yy HH:mm
```

Si falta `productionDateTime`, se usa la hora actual del servidor. Si falta `expiryDateTime`, se calcula con `shelfLifeDays`. Los campos antiguos `productionDate` y `expiryDate` siguen aceptados por compatibilidad.

`prep_label_professional` genera EZPL especifico para GoDEX G500 80x50 mm desde backend cuando el bridge reclama el trabajo por `/api/print-jobs/pending`. Por defecto usa `professional_compact` sin QR. Si `includeQr` es `true`, usa una variante QR experimental que codifica `qrUrl` cuando existe y `qrValue` como fallback. La impresion QR queda desactivada por defecto hasta validacion fisica.

El payload final insertado es compatible extendido. El bridge sigue usando solo `payload.title`, `payload.line1` y `payload.line2`; `template`, `data` y `metadata` son trazabilidad ERP.

```json
{
  "title": "GUACAMOLE",
  "line1": "ELAB 04/07/26 12:30",
  "line2": "CAD 06/07/26 12:30",
  "template": "prep_label_professional",
  "data": {
    "prepName": "GUACAMOLE",
    "productionDateTime": "2026-07-04T10:30:00.000Z",
    "expiryDateTime": "2026-07-06T10:30:00.000Z",
    "batchCode": "GM-040726-01",
    "responsibleName": "J. Bocanegra",
    "storageCondition": "Refrigerado 0-4 C",
    "brandName": "KIOSKO ALFRESKO",
    "qrValue": "ERP:prep_batch:GM-040726-01",
    "qrUrl": "https://erp.example.com/admin-kiosko/qr/ERP%3Aprep_batch%3AGM-040726-01"
  },
  "metadata": {
    "requestedBy": "test",
    "module": "printing",
    "sourceType": "prep_batch",
    "sourceId": "test-prep-label",
    "createdFrom": "api",
    "reason": "test_prep_label"
  }
}
```

## Endpoints disponibles

- `POST /api/print-jobs`
- `GET /api/print-jobs/[id]`
- `POST /api/print-jobs/test-label`
- `POST /api/print-jobs/test-product-label`
- `POST /api/print-jobs/test-ingredient-label`
- `POST /api/print-jobs/test-prep-label`

## Vista de historial

Existe una vista interna segura en:

```text
/admin-kiosko/impresiones
```

La vista es server-side, exige sesión admin y lee `public.print_jobs` desde backend. No usa `PRINT_JOBS_API_TOKEN` en cliente y no llama desde navegador a `GET /api/print-jobs/[id]`.

Muestra:

- id corto;
- status;
- printer key;
- template;
- sourceType;
- sourceId;
- attempts;
- printed_at;
- error;
- created_at.

Para revisar estado de etiquetas desde UI:

1. Entrar en `/admin-kiosko/impresiones`.
2. Localizar el job por id corto, template o sourceId.
3. Confirmar transición `queued -> claimed -> printed` o revisar `error`.

Filtros disponibles:

- `status`: `queued`, `claimed`, `printed`, `error`.
- `template`: `test_label`, `product_label_basic`, `ingredient_label_basic`, `prep_label_basic`.
- `sourceType`: por ejemplo `ingredient`, `prep_batch`.
- `printer_key`: por ejemplo `kiosko_godex_g500`.

Busqueda simple:

- `id`;
- `sourceId`;
- `payload.title`.

Reimpresion:

- El boton `Reimprimir` crea siempre un nuevo `print_job`.
- No modifica el job original.
- Solo se habilita si el payload original contiene `title`, `line1`, `line2`, `template`, `data` y `metadata`.
- El nuevo payload mantiene los datos imprimibles y añade metadata:

```json
{
  "copiedFromJobId": "JOB_ORIGINAL",
  "reason": "reprint",
  "createdFrom": "erp_ui",
  "module": "printing"
}
```

SQL equivalente:

```sql
select
  id,
  printer_key,
  status,
  payload->>'template' as template,
  payload->'metadata'->>'sourceType' as source_type,
  payload->'metadata'->>'sourceId' as source_id,
  attempts,
  printed_at,
  error,
  created_at
from public.print_jobs
order by created_at desc
limit 50;
```

Detectar reimpresiones:

```sql
select
  id,
  status,
  payload->'metadata'->>'copiedFromJobId' as copied_from_job_id,
  payload->'metadata'->>'reason' as reason,
  payload->>'template' as template,
  payload->>'title' as title,
  created_at
from public.print_jobs
where payload->'metadata'->>'reason' = 'reprint'
order by created_at desc
limit 20;
```

## Flujo real desde inventario

El primer botón real está en `/admin-kiosko/inventario`, dentro de la tabla de productos/materias primas.

Flujo:

1. El usuario pulsa `Imprimir etiqueta` en una fila de producto.
2. La server action valida sesión interna de admin.
3. El backend carga el producto por id desde Supabase.
4. `PrintService` crea un job con template `ingredient_label_basic`.
5. El payload queda con `title`, `line1`, `line2`, `template`, `data` y `metadata`.
6. La UI muestra feedback con job id y estado inicial.
7. El bridge Windows reclama el job y Supabase debe pasar `queued -> claimed -> printed`.

Metadata del flujo real:

```json
{
  "requestedBy": "admin-kiosko",
  "module": "ingredients",
  "sourceType": "ingredient",
  "sourceId": "ID_PRODUCTO",
  "createdFrom": "erp_ui",
  "reason": "print_ingredient_label"
}
```

Para probar desde UI:

1. Entrar en `/admin-kiosko/inventario`.
2. Buscar una materia prima activa.
3. Pulsar `Imprimir etiqueta`.
4. Confirmar que aparece `Etiqueta enviada a GoDEX`, el job id y el estado inicial.
5. Verificar el job en Supabase con la SQL de trazabilidad.

## Uso urgente inspeccion: subelaboraciones

Ruta UI disponible:

```text
/admin-kiosko/etiquetas-prep
```

Esta pantalla interna exige sesion admin y no expone tokens. Usa `printPrepLabelAction`, `PrintService` y por defecto el template `prep_label_professional`.

Campos:

- Nombre preparacion.
- Plantilla: profesional compacta o basica compatible.
- Lote interno.
- Fecha/hora elaboracion, por defecto ahora.
- Fecha/hora caducidad, por defecto ahora + 2 dias.
- Responsable, por defecto `J. Bocanegra`.
- Conservacion, por defecto `Refrigerado 0-4 C`.

Para imprimir con hora actual:

1. Entrar en `/admin-kiosko/etiquetas-prep`.
2. Escribir el nombre, por ejemplo `GUACAMOLE`.
3. Dejar las fechas por defecto.
4. Pulsar `Imprimir etiqueta`.

Para imprimir algo elaborado ayer:

1. Entrar en `/admin-kiosko/etiquetas-prep`.
2. Escribir el nombre de la preparacion.
3. Cambiar `Fecha/hora elaboracion` a la fecha de ayer y la hora real de elaboracion.
4. Cambiar `Fecha/hora caducidad` a la fecha/hora que proceda segun vida util.
5. Pulsar `Imprimir etiqueta`.

Ejemplo final impreso:

```text
GUACAMOLE
ELAB 04/07/26 12:30
CAD 06/07/26 12:30
LOTE GM-040726-01
RESPONSABLE J. Bocanegra
CONSERVACION Refrigerado 0-4 C
KIOSKO ALFRESKO
```

Metadata del flujo UI urgente:

```json
{
  "requestedBy": "admin-kiosko",
  "module": "prep",
  "sourceType": "prep_batch",
  "sourceId": "GM-040726-01",
  "createdFrom": "erp_ui",
  "reason": "print_prep_label"
}
```

## Flujo real produccion

Ruta:

```text
/admin-kiosko/produccion
```

En el formulario `Registrar elaboracion` existe el checkbox `Imprimir etiqueta profesional al registrar`, activado por defecto. Si queda marcado:

1. El ERP registra el lote interno.
2. El backend crea un `print_job` con template `prep_label_professional`.
3. La UI vuelve a `/admin-kiosko/produccion#lotes` mostrando lote creado y job de impresion.
4. El bridge Windows reclama el job e imprime la etiqueta GoDEX 80x50 mm.

Si falta fecha de caducidad, el lote se registra pero no se imprime automaticamente. La UI muestra:

```text
No se puede imprimir etiqueta sin fecha de caducidad.
```

Diferencias:

- `/admin-kiosko/etiquetas-prep`: impresion manual urgente, no necesariamente vinculada a un lote real.
- `/admin-kiosko/produccion`: impresion vinculada al lote interno real creado por el registro de elaboracion.

Ficha interna de lote:

```text
/admin-kiosko/produccion/lotes/[id]
```

Desde la lista de lotes internos en `/admin-kiosko/produccion` se puede abrir `Ver ficha`. La ficha muestra preparacion, lote, elaboracion, caducidad, responsable, conservacion, estado, notas, materias primas utilizadas, print jobs asociados, APPCC, consumo posterior, documentos y timeline cronologico.

### Estado actual de trazabilidad

- Etiqueta profesional GoDEX 80x50 mm disponible para subelaboraciones.
- Ficha privada de lote disponible en `/admin-kiosko/produccion/lotes/[id]` con trazabilidad interna.
- QR interno preparado mediante `ERP:prep_batch:<lote>` y ruta privada `/admin-kiosko/qr/[value]`.
- QR fisico experimental: se puede probar manualmente, pero no queda activado por defecto.
- Checklist inspeccion visible en la ficha del lote para comprobar nombre, ELAB, CAD, lote, responsable, conservacion, etiqueta impresa y resolucion del QR.
- Consumo logico de lotes preparado en ficha privada sin descuento real de stock.
- Produccion automatica sin QR por defecto: `includeQr: false` se mantiene en el flujo operativo.
- Etiqueta manual desde `/admin-kiosko/etiquetas-prep` queda como plan B si hace falta reimprimir o resolver una urgencia.

### Consumo de lotes

La fase actual introduce la entidad logica `BatchConsumption` para preparar el ciclo de vida completo de subelaboraciones sin tocar schema Supabase.

Modelo logico:

```text
id
batchId
batchCode
recipeId
recipeName
quantity
unit
consumedAt
consumedBy
notes
status
```

Implementacion temporal:

- `BatchConsumption` se proyecta desde `admin_production_movements`.
- Los nuevos consumos usan `movement_type = consumo_logico`.
- El payload especifico del consumo se guarda en `observations` como JSON interno.
- No se llama a `createProductionMovement`, porque esa funcion descuenta cantidad y puede aplicar movimiento de inventario.
- No se modifica `output_quantity`, inventario, POS, OCR, etiquetas, QR ni bridge.
- Cuando exista tabla definitiva de consumos, solo debe cambiar el repositorio `batch-consumption.repository.ts`.

Ejemplo operativo:

```text
Lote KA-040726-001 · GUACAMOLE
Consumo: 2 kg
Receta destino: 10 Bocadillos Mexicanos
Estado: registered
Stock real: sin modificar en esta fase
```

La ficha del lote muestra:

- tabla `Consumos`;
- fecha;
- receta;
- cantidad;
- usuario;
- estado;
- resumen simulado de cantidad producida, consumida y pendiente.

El resumen de vida del lote es simulado mientras no exista tabla definitiva ni descuento real de stock. Sirve para validar trazabilidad y UX operativa.

Timeline previsto:

```text
Produccion registrada
Etiqueta GoDEX enviada/impresa/error
APPCC disponible
Consumo registrado
Consumo completo
```

`Consumo completo` aparece cuando el consumo logico acumulado alcanza o supera la cantidad producida simulada.

El valor QR interno queda preparado en el payload de etiquetas profesionales:

```text
ERP:prep_batch:KA-040726-001
```

Si existe `NEXT_PUBLIC_APP_BASE_URL`, el backend anade tambien una URL escaneable interna:

```text
https://erp.example.com/admin-kiosko/qr/ERP%3Aprep_batch%3AKA-040726-001
```

La ruta `/admin-kiosko/qr/[value]` exige sesion admin. Si el valor empieza por `ERP:prep_batch:`, resuelve el `batchCode` y redirige a `/admin-kiosko/produccion/lotes/[id]`.

Diferencia:

- `qrValue`: identificador interno estable del lote, por ejemplo `ERP:prep_batch:KA-040726-001`.
- `qrUrl`: URL protegida del ERP construida server-side con `NEXT_PUBLIC_APP_BASE_URL`.

El QR fisico es experimental y queda desactivado por defecto. Se puede activar desde `/admin-kiosko/etiquetas-prep` marcando `Incluir QR interno` o desde el endpoint de prueba con `?qr=1`. En produccion automatica sigue `includeQr: false`.

Si `NEXT_PUBLIC_APP_BASE_URL` no esta configurada, el QR experimental codifica `qrValue`; sirve para identificacion interna, pero no abre la ficha directamente al escanearlo.

### Prueba operativa QR

Configurar URL base del ERP en el entorno del servidor:

```bash
NEXT_PUBLIC_APP_BASE_URL=https://erp.example.com
```

No anadir barra final. Con esta variable, `prep_label_professional` prepara:

```text
qrValue = ERP:prep_batch:KA-040726-001
qrUrl = https://erp.example.com/admin-kiosko/qr/ERP%3Aprep_batch%3AKA-040726-001
```

Probar sin imprimir:

1. Abrir la ficha del lote en `/admin-kiosko/produccion/lotes/[id]`.
2. Revisar el bloque `QR interno preparado`.
3. Pulsar `Abrir ruta QR`.
4. Confirmar que redirige a la misma ficha.

Tambien se puede abrir manualmente:

```text
/admin-kiosko/qr/ERP%3Aprep_batch%3AKA-040726-001
```

Probar QR impreso:

1. Entrar en `/admin-kiosko/etiquetas-prep`.
2. Activar `Incluir QR interno`.
3. Imprimir etiqueta.
4. Escanear desde movil/tablet.
5. Iniciar sesion admin si lo pide.
6. Confirmar redireccion a la ficha del lote.

La ficha no es publica. La ruta QR siempre exige sesion admin.

## Arquitectura trazabilidad subelaboraciones

Fase 1 crea una capa de dominio `ProductionBatch` sobre los datos existentes. No cambia schema Supabase y no modifica el flujo de impresion.

Modelo de dominio:

- `id`
- `batchCode`
- `recipeId`
- `recipeName`
- `productionDateTime`
- `expiryDateTime`
- `status`
- `responsibleUser`
- `storageCondition`
- `notes`
- `ingredientsUsed[]`
- `printJobs[]`
- `documents[]`
- `appcc[]`
- `consumptions[]`

Estados soportados:

- `ACTIVE`: lote vigente.
- `NEAR_EXPIRY`: caduca en menos de 24 horas.
- `EXPIRED`: caducidad vencida.
- `BLOCKED`: lote marcado como bloqueado.
- `CONSUMED`: cantidad restante agotada o estado consumido.
- `DISCARDED`: lote descartado/mermado.

Calculo automatico en esta fase:

```text
ACTIVE -> NEAR_EXPIRY -> EXPIRED
```

Los estados `BLOCKED`, `CONSUMED` y `DISCARDED` se infieren de `storage_state` y cantidad restante cuando esa informacion existe. No hay consumo automatico nuevo en esta fase.

Relaciones actuales:

- `ingredientsUsed[]`: se alimenta de la materia prima origen registrada en el lote.
- `printJobs[]`: se localiza por `payload.data.batchCode`, `payload.metadata.batchCode` o `payload.metadata.sourceId`.
- `documents[]`: recoge documento origen y registros de etiqueta cuando existen.
- `appcc[]`: recoge caducidad, conservacion y registros de etiqueta disponibles.
- `consumptions[]`: recoge movimientos de consumo, merma, personal, invitacion y degustacion.

Timeline:

La ficha ordena cronologicamente:

- produccion registrada;
- movimientos del lote;
- etiqueta GoDEX enviada/impresa/error;
- controles APPCC disponibles.

Ejemplo:

```text
04/07 08:30  Produccion registrada
04/07 08:31  Etiqueta GoDEX impresa
04/07 13:10  APPCC: Caducidad
05/07 12:00  consumo parcial
06/07 09:00  consumo completo
```

Vida restante:

```text
Caduca en 2 dias 6 horas 18 minutos
Caducado hace 3 horas
```

QR preparado:

```text
ERP:prep_batch:KA-040726-001
```

Ese valor queda visible en `/admin-kiosko/produccion/lotes/[id]` y preparado para enlazar el QR fisico en una fase posterior.

Metadata del flujo real:

```json
{
  "requestedBy": "F. Javier Bocanegra Sanjuan",
  "module": "production",
  "sourceType": "prep_batch",
  "sourceId": "ID_LOTE_INTERNO",
  "createdFrom": "erp_ui",
  "reason": "print_after_production",
  "batchCode": "KA-040726-001"
}
```

## Checklist inspeccion

- [ ] Registrar elaboracion real en `/admin-kiosko/produccion`.
- [ ] Confirmar lote creado en la pantalla de produccion.
- [ ] Confirmar etiqueta impresa en GoDEX.
- [ ] Verificar nombre de preparacion.
- [ ] Verificar `ELAB` con fecha/hora correcta.
- [ ] Verificar `CAD` con fecha/hora correcta.
- [ ] Verificar conservacion.
- [ ] Verificar responsable.
- [ ] Si hay error o hay que corregir fecha/hora, usar `/admin-kiosko/etiquetas-prep` como impresion manual.

SQL rapido para inspeccion:

```sql
select
  id,
  status,
  payload->>'title' as nombre,
  payload->>'line1' as elaboracion,
  payload->>'line2' as caducidad,
  payload->'data'->>'batchCode' as lote,
  payload->'data'->>'responsibleName' as responsable,
  payload->'data'->>'storageCondition' as conservacion,
  created_at
from public.print_jobs
where payload->>'template' = 'prep_label_professional'
order by created_at desc
limit 20;
```

SQL para localizar print jobs por lote:

```sql
select id, status, payload, created_at
from public.print_jobs
where payload->'data'->>'batchCode' = 'KA-040726-001'
   or payload->'metadata'->>'batchCode' = 'KA-040726-001'
order by created_at desc;
```

## Ejemplos curl

Test label:

```bash
curl -X POST "http://localhost:3000/api/print-jobs/test-label" \
  -H "Authorization: Bearer PRINT_JOBS_API_TOKEN"
```

Producto:

```bash
curl -X POST "http://localhost:3000/api/print-jobs/test-product-label" \
  -H "Authorization: Bearer PRINT_JOBS_API_TOKEN"
```

Ingrediente:

```bash
curl -X POST "http://localhost:3000/api/print-jobs/test-ingredient-label" \
  -H "Authorization: Bearer PRINT_JOBS_API_TOKEN"
```

Elaboracion/prep:

```bash
curl -X POST "http://localhost:3000/api/print-jobs/test-prep-label" \
  -H "Authorization: Bearer PRINT_JOBS_API_TOKEN"
```

Elaboracion/prep con QR experimental:

```bash
curl -X POST "http://localhost:3000/api/print-jobs/test-prep-label?qr=1" \
  -H "Authorization: Bearer PRINT_JOBS_API_TOKEN"
```

## Impresion GoDEX por TCP/IP directa

La GoDEX G500 queda operativa en produccion con un unico transporte vigente:

- `tcp_9100`: envio RAW EZPL directo por socket TCP al puerto 9100 de la impresora.

El modo historico por spooler Windows ya no forma parte de la configuracion de produccion del kiosco.

Configuracion validada en red:

```text
IP impresora: 192.168.1.38
Puerto RAW: 9100
PC bridge Windows: 192.168.1.39
Etiqueta fisica: 80x50 mm
```

Variables `.env.local` para TCP/IP:

```env
GODEX_PRINT_TRANSPORT=tcp_9100
GODEX_PRINTER_HOST=192.168.1.38
GODEX_PRINTER_PORT=9100
GODEX_TCP_TIMEOUT_MS=5000
PRINT_DEBUG_EZPL=true
```

Dry-run sigue teniendo prioridad sobre cualquier transporte:

```env
GODEX_DRY_RUN=true
DRY_RUN_MARK_PRINTED=true
```

Con `GODEX_DRY_RUN=true`, el bridge no conecta con la impresora y puede marcar el job como printed si `DRY_RUN_MARK_PRINTED=true`.

Comandos de prueba en Windows:

```powershell
npm run godex:test-label:tcp
```

Ese comando envia una etiqueta EZPL de prueba directamente a `GODEX_PRINTER_HOST:GODEX_PRINTER_PORT`. No usa Supabase, no reclama `print_jobs` y no marca nada como `printed`.

Prueba minima si TCP conecta pero no sale etiqueta fisica:

```powershell
npm run godex:test-label:tcp:minimal
```

La prueba minima envia solo texto grande `TEST GODEX`, sin QR, sin barcode y con una sola copia. Ambos scripts imprimen el EZPL completo en consola antes de enviarlo.

Test real por cola:

```powershell
curl -X POST "http://localhost:3000/api/print-jobs/test-godex-real-path" -H "Authorization: Bearer PRINT_JOBS_API_TOKEN"
```

Este endpoint crea un `print_job` real con:

- `printer_key = kiosko_godex_g500`;
- `template = test_godex_real_path`;
- `raw_command` igual al EZPL usado por `npm run godex:test-label:tcp`;
- `metadata.reason = test_real_path_same_ezpl_as_tcp`.

Diferencia de diagnostico:

- TCP directo: `npm run godex:test-label:tcp` envia EZPL directo a `192.168.1.38:9100`, sin Supabase ni cola.
- Test real por cola: `POST /api/print-jobs/test-godex-real-path` crea un job en Supabase, el bridge lo reclama y envia el mismo EZPL.
- Templates reales: `prep_label_basic`, `prep_label_professional`, `ingredient_label_basic`, `product_label_basic` y `test_label` pasan por el generador comun GoDEX 80x50.

Lectura del resultado:

```text
A) TCP directo imprime
B) real-path imprime
C) templates reales no imprimen
=> problema en datos del template o generador especifico.
```

Si A imprime y B no imprime, el bridge no esta enviando el `raw_command` esperado o el job reclamado no contiene el payload correcto.

Arrancar bridge con TCP/IP:

```powershell
npm run godex:bridge:prod
```

El bridge registra por job:

- `id`;
- `template`;
- `printer_key`;
- transporte usado;
- host/puerto cuando usa `tcp_9100`;
- claves recibidas en el job;
- claves de `payload_json`, `payload_json.data` y `payload_json.metadata`;
- tamano del EZPL en bytes;
- primeras y ultimas lineas del EZPL;
- status anterior/nuevo;
- attempts;
- error y stack si falla.

Con `PRINT_DEBUG_EZPL=true`, el bridge imprime el EZPL completo antes de enviarlo a `printRawEzpl`. Esto permite comparar el job real con `npm run godex:test-label:tcp`.

Ejemplo de log esperado:

```text
[PRINT JOB EZPL INSPECT] {
  "id":"...",
  "template":"prep_label_professional",
  "printer_key":"kiosko_godex_g500",
  "payloadKeys":["data","line1","line2","metadata","template","title"],
  "payloadDataKeys":["batchCode","prepName","productionDateTime"],
  "ezplBytes":512,
  "firstLines":["^Q50,3","^W80","^H10","^S4","^P1","^C1","^R0","~Q+0"],
  "lastLines":["AA,18,286,1,1,1,0,0,CONSERVACION","AA,18,314,1,1,2,0,0,Refrigerado 0-4 C","AA,18,360,1,2,1,0,0,KIOSKO ALFRESKO","E"]
}
```

Si el comando no empieza por `^Q`, no contiene `^W` y `^L`, o no termina en `E`, el bridge no llama a la impresora y marca el job como error con:

```text
Invalid or empty EZPL payload
```

Troubleshooting TCP/IP:

```powershell
ping 192.168.1.38
Test-NetConnection 192.168.1.38 -Port 9100
```

Si `TcpTestSucceeded = False`:

- revisar que la impresora tenga IP fija o reserva DHCP;
- confirmar que el PC bridge esta en la misma red;
- revisar firewall Windows o antivirus;
- comprobar que el puerto RAW 9100 esta activo en la impresora.

Si la etiqueta sale en blanco:

- confirmar que la impresora esta en lenguaje EZPL;
- confirmar que el payload empieza por comandos EZPL y termina en `E`;
- revisar ribbon/papel y sensor de etiqueta;
- probar `npm run godex:test-label:tcp` antes del bridge.

Si TCP devuelve OK pero no imprime fisicamente:

- probar primero `npm run godex:test-label:tcp:minimal`;
- revisar que la impresora no este en modo dump/hex;
- comprobar LED de pausa, feed, error o tapa abierta;
- pulsar Feed y verificar que avanza una etiqueta;
- calibrar gap/media desde el panel o utilidad GoDEX;
- confirmar lenguaje de impresora EZPL;
- confirmar etiqueta fisica 80x50 mm y gap detectado;
- apagar/encender la impresora despues de cambiar lenguaje o media.

Si el tamano no cuadra:

- confirmar etiqueta fisica 80x50 mm;
- confirmar que el template GoDEX usa 80x50 mm;
- revisar calibracion de sensor en la G500.

Consultar estado por id:

```bash
curl "http://localhost:3000/api/print-jobs/JOB_ID" \
  -H "Authorization: Bearer PRINT_JOBS_API_TOKEN"
```

Crear job generico:

```bash
curl -X POST "http://localhost:3000/api/print-jobs" \
  -H "Authorization: Bearer PRINT_JOBS_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "printer_key": "kiosko_godex_g500",
    "template": "ingredient_label_basic",
    "data": {
      "ingredientName": "TOMATE RAF",
      "supplierName": "PROVEEDOR TEST",
      "internalCode": "MP-TOM-RAF",
      "lot": "LOTE TEST",
      "expiryDate": "2026-07-11"
    },
    "metadata": {
      "requestedBy": "test",
      "module": "printing",
      "sourceType": "ingredient",
      "sourceId": "manual-curl",
      "createdFrom": "api",
      "reason": "manual_test"
    }
  }'
```

En produccion, sustituir `http://localhost:3000` por el dominio del ERP.

## Smoke test desde Mac

El smoke test crea cuatro trabajos reales de impresion, uno por template. Usarlo solo cuando el bridge Windows y la GoDEX G500 esten preparados para imprimir.

Variables necesarias:

```bash
PRINT_JOBS_API_TOKEN=...
PRINT_JOBS_BASE_URL=http://localhost:3000
```

Comando:

```bash
PRINT_JOBS_API_TOKEN=... PRINT_JOBS_BASE_URL=http://localhost:3000 npm run print:smoke
```

El script hace POST secuencial a:

- `/api/print-jobs/test-label`
- `/api/print-jobs/test-product-label`
- `/api/print-jobs/test-ingredient-label`
- `/api/print-jobs/test-prep-label`

Por cada job muestra:

- endpoint probado;
- job id;
- estado inicial;
- curl equivalente;
- URL `GET /api/print-jobs/[id]` para revisar estado.

Para consultar cada job:

```bash
curl "http://localhost:3000/api/print-jobs/JOB_ID" \
  -H "Authorization: Bearer PRINT_JOBS_API_TOKEN"
```

## Revisar estado en Supabase

Cola reciente:

```sql
select id, printer_key, status, payload, attempts, claimed_at, printed_at, error, created_at, updated_at
from public.print_jobs
where printer_key = 'kiosko_godex_g500'
order by created_at desc
limit 20;
```

Trazabilidad del payload extendido:

```sql
select
  id,
  printer_key,
  status,
  payload->>'template' as template,
  payload->'data' as data,
  payload->'metadata' as metadata,
  attempts,
  claimed_at,
  printed_at,
  error,
  created_at
from public.print_jobs
where printer_key = 'kiosko_godex_g500'
order by created_at desc
limit 20;
```

Jobs creados desde inventario/materias primas:

```sql
select id, status, payload->>'template' as template, payload->'metadata' as metadata, created_at
from public.print_jobs
where payload->'metadata'->>'sourceType' = 'ingredient'
order by created_at desc
limit 20;
```

Estados:

- `queued`: el ERP ha creado el trabajo y esta pendiente del bridge.
- `claimed`: el bridge ha reclamado el trabajo.
- `printed`: el bridge ha confirmado la impresion fisica.
- `error`: el bridge ha reportado un fallo.

Transiciones esperadas:

```text
queued -> claimed -> printed
queued -> claimed -> error
```

Codigos HTTP:

- `400`: payload o template invalido.
- `401`: falta o no coincide `PRINT_JOBS_API_TOKEN`.
- `404`: `GET /api/print-jobs/[id]` no encuentra el trabajo.
- `500`: error seguro de backend/Supabase; revisar logs del ERP.

## Formato fisico

Las etiquetas fisicas actuales son 80x50 mm. El bridge sigue consumiendo solo `payload.title`, `payload.line1` y `payload.line2`; cualquier ajuste fino de composicion fisica debe validarse con impresiones reales sin cambiar este contrato.

## Nota UI etiquetas

La ruta `/admin-kiosko/etiquetas` separa controles y vista imprimible en dos columnas solo cuando hay ancho suficiente. En pantallas medianas o pequenas se apila verticalmente. La vista imprimible tiene scroll propio para no invadir el formulario ni forzar scroll horizontal global.

La ruta `/admin-kiosko/produccion#recetas` usa grids responsivos y campos con ancho contenido para evitar que selects largos de recetas o inventario rompan las columnas.

## Validacion fisica 80x50 mm

Checklist de aceptacion antes de conectar botones reales del ERP:

- [ ] `test_label` imprime.
- [ ] `product_label_basic` imprime.
- [ ] `ingredient_label_basic` imprime.
- [ ] `prep_label_basic` imprime.
- [ ] `prep_label_professional` imprime en 80x50 mm sin cortes.
- [ ] No corta texto lateral.
- [ ] No corta texto vertical.
- [ ] Orientacion correcta.
- [ ] Texto legible.
- [ ] Supabase pasa `queued -> claimed -> printed`.
- [ ] `GET /api/print-jobs/[id]` devuelve estado correcto.

Que observar fisicamente:

- `test_label`: debe mostrar `ERP OK`, `PRINT SERVICE` y fecha/hora.
- `product_label_basic`: debe mostrar `TOMATE RAF`, `MP-TOM-RAF` y fecha de caducidad.
- `ingredient_label_basic`: debe mostrar `TOMATE RAF`, `MP-TOM-RAF` y fecha de caducidad.
- `prep_label_basic`: debe mostrar `GUACAMOLE`, `ELAB dd/mm/yy HH:mm` y `CAD dd/mm/yy HH:mm`.
- `prep_label_professional`: debe mostrar nombre grande, `ELAB`, `CAD`, lote, responsable, conservacion y `KIOSKO ALFRESKO`.

Si alguna etiqueta corta texto o sale descentrada, no cambiar el bridge Windows ni el schema. Ajustar primero datos/template ERP o la configuracion fisica de etiqueta 80x50 mm validada en el kiosco.

## Etiquetas automaticas al cerrar lote

Produccion trata el registro de un lote interno como cierre/finalizacion operativa del lote. Al guardar una produccion, el ERP intenta crear automaticamente un `print_job` para la GoDEX G500.

Contrato del job:

- `printer_key`: `kiosko_godex_g500`
- `template`: `prep_label_professional`
- `payload.raw_command`: EZPL GoDEX 80x50 generado por el generador comun.
- `payload.data`: nombre/preparacion, lote, elaboracion, caducidad, cantidad si existe, unidad si existe, responsable y conservacion.
- `payload.metadata.module`: `production`
- `payload.metadata.sourceType`: `production_batch`
- `payload.metadata.sourceId`: id del lote.
- `payload.metadata.createdFrom`: `production_close`
- `payload.metadata.reason`: `auto_print_on_batch_close`

No se crean columnas nuevas. La relacion lote -> print_job se resuelve por `payload.metadata.sourceId` y `payload.metadata.reason`.

### Evitar duplicados

Antes de crear la etiqueta automatica, el ERP busca jobs existentes del mismo lote con:

- `template = prep_label_professional`
- `metadata.sourceId = batchId`
- `metadata.reason = auto_print_on_batch_close`

Si ya existe, no crea otro job automatico. La reimpresion manual sigue permitida y crea un job nuevo.

### Reimpresion manual

En `/admin-kiosko/produccion/lotes/[id]` hay un boton `Reimprimir etiqueta`.

Ese boton crea un nuevo `print_job` con:

- `metadata.createdFrom`: `production_batch_detail`
- `metadata.reason`: `manual_reprint_batch_label`

### Verificar print_jobs pendientes

Desde casa, sin impresora:

```bash
npm run dev
```

1. Entrar en `/admin-kiosko/produccion`.
2. Registrar/cerrar un lote de prueba con caducidad.
3. Abrir la ficha del lote.
4. Revisar el bloque `Impresiones`.

Consulta SQL recomendada:

```sql
select
  id,
  printer_key,
  status,
  payload->>'template' as template,
  payload->'metadata'->>'sourceId' as batch_id,
  payload->'metadata'->>'reason' as reason,
  length(payload->>'raw_command') as raw_command_length,
  left(payload->>'raw_command', 20) as raw_command_start,
  right(payload->>'raw_command', 5) as raw_command_end,
  attempts,
  claimed_at,
  printed_at,
  error,
  created_at
from public.print_jobs
where printer_key = 'kiosko_godex_g500'
  and payload->'metadata'->>'module' = 'production'
order by created_at desc
limit 20;
```

El `raw_command_start` debe empezar por `^Q50,3` y el final debe terminar en `E`.

Check local sin impresora:

```bash
npm run godex:check-production-label:auto
```

Este check valida:

- cerrar lote sin job previo permite crear print_job;
- no se duplica una etiqueta automatica ya existente;
- la reimpresion manual usa `manual_reprint_batch_label`;
- el EZPL simulado es GoDEX 80x50 valido.

### Pendiente de validar fisicamente en kiosko

Cuando el bridge este online en la red del kiosko:

1. Crear/cerrar un lote real de prueba desde Produccion.
2. Confirmar que aparece un `print_job` `queued`.
3. Confirmar transicion `queued -> claimed -> printed`.
4. Confirmar que sale una etiqueta fisica 80x50 mm.
5. Confirmar que la ficha del lote muestra `Ultima impresion correcta`.
6. Pulsar `Reimprimir etiqueta` y confirmar que crea e imprime un segundo job.
