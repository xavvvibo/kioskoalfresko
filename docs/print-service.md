# PrintService ERP -> GoDEX G500

## Arquitectura validada

La impresion remota de la GoDEX G500 funciona en produccion. El ERP crea filas en `public.print_jobs`; el bridge Windows del kiosco lee Supabase, reclama trabajos y envia la impresion a la GoDEX G500.

```text
ERP backend -> public.print_jobs -> bridge Windows del kiosco -> GoDEX G500
```

No tocar el bridge Windows salvo mantenimiento del kiosco. El ERP no usa drivers locales, no abre conexion TCP con la impresora y no expone `SUPABASE_SERVICE_ROLE_KEY` al frontend.

## Configuracion

Printer key real:

```text
kiosko_godex_g500
```

Variables necesarias en backend:

```env
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
PRINT_JOBS_API_TOKEN=...
```

Todos los endpoints de impresion exigen:

```http
Authorization: Bearer PRINT_JOBS_API_TOKEN
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
- `prep_label_professional`: `{ prepName, productionDateTime?, expiryDateTime?, shelfLifeDays?, batchCode?, responsibleName?, storageCondition?, brandName?, qrUrl? }`

`prep_label_basic` imprime siempre:

```text
NOMBRE PREPARACION
ELAB dd/mm/yy HH:mm
CAD dd/mm/yy HH:mm
```

Si falta `productionDateTime`, se usa la hora actual del servidor. Si falta `expiryDateTime`, se calcula con `shelfLifeDays`. Los campos antiguos `productionDate` y `expiryDate` siguen aceptados por compatibilidad.

`prep_label_professional` genera EZPL especifico para GoDEX G500 80x50 mm desde backend cuando el bridge reclama el trabajo por `/api/print-jobs/pending`. La version actual es `professional_compact`: no imprime QR para priorizar legibilidad y evitar cortes. `qrUrl` queda persistido en `payload.data` para una version futura con QR si la validacion fisica lo permite.

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
    "brandName": "KIOSKO ALFRESKO"
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
