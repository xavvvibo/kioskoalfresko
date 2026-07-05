# Godex G500 Print Bridge

## Arquitectura

El ERP no imprime desde el navegador. El flujo es:

ERP backend -> `print_jobs` -> bridge local Windows -> impresora Windows `GoDEX G500` -> Godex G500 por USB.

El bridge consulta `/api/print-jobs/pending?printer_key=godex_g500_kiosko`, reclama trabajos como `printing`, envia RAW/EZPL a Windows y marca `printed` o `error`.

## Instalar la Godex G500 en Windows

1. Enciende la Godex G500 y conecta el cable USB al PC Windows del kiosko.
2. Instala el driver oficial de Godex G500 si Windows no la reconoce automaticamente.
3. En Windows, abre `Configuracion > Bluetooth y dispositivos > Impresoras y escaneres`.
4. Busca la impresora y copia su nombre exacto. Ejemplo: `GoDEX G500`.
5. Entra en la impresora y pulsa `Imprimir pagina de prueba`.
6. Si la pagina de prueba de Windows no sale, arregla primero driver/cable/impresora antes de probar el ERP.

## Configurar el ERP

Ejecuta la migracion:

```sql
supabase/admin_kiosko_print_jobs.sql
```

Configura en el servidor:

```env
PRINT_JOBS_API_TOKEN=change-me-internal-print-token
PRINT_JOBS_STALE_MINUTES=10
```

El token protege todos los endpoints de impresion:

- `POST /api/print-jobs`
- `GET /api/print-jobs/pending?printer_key=godex_g500_kiosko`
- `PATCH /api/print-jobs/[id]/printed`
- `PATCH /api/print-jobs/[id]/error`

## Configurar el bridge Windows

Crea `scripts/godex-print-service/.env` en el PC del kiosko:

```env
ERP_API_URL=https://kioskoalfresko.es
ERP_API_TOKEN=change-me-internal-print-token
PRINTER_KEY=godex_g500_kiosko
WINDOWS_PRINTER_NAME=GoDEX G500
POLL_INTERVAL_MS=2000
GODEX_DRY_RUN=false
DRY_RUN_MARK_PRINTED=false
```

Puedes partir de:

```powershell
copy scripts\godex-print-service\.env.example scripts\godex-print-service\.env
notepad scripts\godex-print-service\.env
```

Arranque manual:

```powershell
npm run godex:bridge
```

Debe aparecer un log parecido a:

```text
[PRINT BRIDGE START] {"erpApiUrl":"https://kioskoalfresko.es","printerKey":"godex_g500_kiosko","windowsPrinterName":"GoDEX G500"}
```

## Listar impresoras de Windows

Para copiar el nombre exacto de la impresora:

```powershell
npm run godex:list-printers
```

Usa el campo `Name` como `WINDOWS_PRINTER_NAME`.

## Instalar como servicio Windows

### Opcion NSSM

1. Descarga NSSM en el PC Windows.
2. Abre PowerShell como administrador.
3. Ejecuta:

```powershell
nssm install KioskoGodexBridge
```

En la ventana de NSSM:

- `Application path`: ruta a `node.exe`, por ejemplo `C:\Program Files\nodejs\node.exe`.
- `Startup directory`: ruta raiz del proyecto, por ejemplo `C:\kioskoalfresko`.
- `Arguments`: `scripts\godex-print-service\server.mjs`.

Despues:

```powershell
nssm set KioskoGodexBridge AppStdout C:\kioskoalfresko\logs\godex-bridge.log
nssm set KioskoGodexBridge AppStderr C:\kioskoalfresko\logs\godex-bridge-error.log
nssm start KioskoGodexBridge
```

### Opcion PM2

```powershell
npm install -g pm2
pm2 start scripts/godex-print-service/server.mjs --name kiosko-godex-bridge
pm2 save
pm2 startup
```

PM2 es comodo para pruebas. Para un PC fijo de kiosko, NSSM suele ser mas simple de revisar desde Servicios de Windows.

## Probar la impresora sin ERP

Esta prueba envia una etiqueta RAW EZPL directamente al spooler de Windows. Sirve para confirmar driver, nombre de impresora y USB.

Desde la raiz del proyecto:

```powershell
npm run godex:test-label
```

Modo simulacion, sin imprimir fisicamente:

```powershell
$env:GODEX_DRY_RUN="true"
npm run godex:test-label
```

Si funciona, veras:

```text
[GODEX TEST LABEL OK]
```

## Probar el flujo completo ERP -> cola -> bridge

1. Deja arrancado el bridge con `node scripts/godex-print-service/server.mjs`.
2. Crea un trabajo en el ERP con este comando PowerShell:

```powershell
$token="change-me-internal-print-token"
$body = @{
  printer_key = "godex_g500_kiosko"
  label_type = "kitchen_inventory"
  payload_json = @{
    nombre_producto = "Tortilla prueba"
    lote = "TEST-001"
    fecha_elaboracion = "2026-07-03"
    fecha_caducidad = "2026-07-05"
    alergenos = @("huevo")
    codigo_barras = "TEST-001"
    cantidad = "1 ud"
  }
} | ConvertTo-Json -Depth 5

Invoke-RestMethod `
  -Method Post `
  -Uri "https://kioskoalfresko.es/api/print-jobs" `
  -Headers @{ Authorization = "Bearer $token" } `
  -ContentType "application/json" `
  -Body $body
```

3. El bridge debe mostrar:

```text
[PRINT JOB START]
[PRINT JOB PRINTED]
```

4. En base de datos, el trabajo debe quedar `printed`.

## Modo dry-run del bridge

Para simular el flujo sin imprimir fisicamente:

```env
GODEX_DRY_RUN=true
DRY_RUN_MARK_PRINTED=false
```

Con `GODEX_DRY_RUN=true`, el bridge:

- reclama el trabajo y lo cambia a `printing`;
- muestra el EZPL por consola;
- no envia nada al spooler de Windows;
- no marca `printed` salvo que `DRY_RUN_MARK_PRINTED=true`.

Si quieres validar todo el ciclo de estados en simulacion:

```env
GODEX_DRY_RUN=true
DRY_RUN_MARK_PRINTED=true
```

Usa `DRY_RUN_MARK_PRINTED=true` solo para pruebas controladas.

## Revisar errores

Consulta `print_jobs`:

```sql
select id, printer_key, label_type, status, attempts, error_message, created_at, printed_at
from public.print_jobs
order by created_at desc
limit 50;
```

Reglas operativas:

- `pending`: pendiente de reclamar.
- `printing`: reclamado por el bridge antes de imprimir.
- `printed`: impreso correctamente.
- `error`: fallo reportado por el bridge.
- `attempts`: maximo 3. El endpoint de pendientes reintentara trabajos `error` con menos de 3 intentos.

El claim de trabajos se hace con la funcion SQL `claim_next_print_jobs`, usando `FOR UPDATE SKIP LOCKED`. Esto evita que dos bridges simultaneos reclamen e impriman el mismo trabajo.

## Troubleshooting

### Impresora no encontrada

Sintoma: el log dice `No se puede abrir la impresora`.

Acciones:

1. Abre `Configuracion > Impresoras y escaneres`.
2. Copia el nombre exacto.
3. Pon ese valor en `WINDOWS_PRINTER_NAME`.
4. Reinicia el bridge.

### Driver no instalado

Sintoma: Windows no imprime pagina de prueba o la impresora aparece como dispositivo desconocido.

Acciones:

1. Instala el driver oficial Godex G500.
2. Desconecta y reconecta USB.
3. Reinicia Windows si el driver lo pide.
4. Repite `npm run godex:test-label`.

### Nombre de impresora incorrecto

Sintoma: Windows imprime desde otras apps, pero el bridge falla.

Acciones:

1. Revisa espacios, mayusculas y acentos en `WINDOWS_PRINTER_NAME`.
2. Prueba con el nombre visible exacto: `GoDEX G500`.
3. Evita usar el nombre compartido de red si la impresora esta instalada localmente.

### Token incorrecto

Sintoma: logs con `HTTP 401` o `No autorizado`.

Acciones:

1. En el ERP, revisa `PRINT_JOBS_API_TOKEN`.
2. En Windows, revisa `ERP_API_TOKEN`.
3. Deben ser exactamente iguales.
4. Reinicia ERP y bridge tras cambiar variables.

### ERP inaccesible desde Windows

Sintoma: errores de red, DNS o timeout en `[PRINT BRIDGE POLL ERROR]`.

Acciones:

1. Abre `ERP_API_URL` desde el navegador del PC Windows.
2. Revisa Wi-Fi/red local.
3. Si usas entorno local, confirma puerto y firewall.
4. Comprueba que `ERP_API_URL` no termina en `/`.

### Cola bloqueada en `printing`

Sintoma: un job queda en `printing` y no avanza.

Acciones:

1. Revisa logs del bridge alrededor del job id.
2. El endpoint de pending recupera automaticamente trabajos `printing` atascados durante mas de `PRINT_JOBS_STALE_MINUTES` minutos.
3. Si necesitas recuperarlo manualmente:

```sql
update public.print_jobs
set status = 'error', error_message = 'Reset manual: bridge interrumpido durante printing'
where id = 'JOB_ID' and status = 'printing';
```

4. No marques `printed` manualmente salvo que hayas visto salir la etiqueta.

### Etiqueta sale en blanco

Acciones:

1. Confirma que el rollo esta colocado con la cara termica correcta.
2. Ejecuta calibracion de papel desde la Godex.
3. Sube oscuridad en la configuracion de la impresora.
4. Repite `npm run godex:test-label`.

### Tamaño de etiqueta incorrecto

Acciones:

1. Confirma que el rollo fisico es 58 x 40 mm.
2. Revisa gap/separacion de etiquetas.
3. Calibra sensor de gap en la Godex.
4. Ajusta la plantilla EZPL en `lib/admin-kiosko/printing/godex-ezpl.ts` si el rollo real cambia.
