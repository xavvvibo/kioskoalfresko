# Godex G500 Print Bridge

Servicio local para Windows. Consulta la cola `print_jobs` del ERP y envia comandos RAW/EZPL a la Godex G500 instalada por USB.

## Configuracion local

Crea `scripts/godex-print-service/.env` en el PC Windows:

```env
ERP_API_URL=https://kioskoalfresko.es
ERP_API_TOKEN=change-me-internal-print-token
PRINTER_KEY=godex_g500_kiosko
WINDOWS_PRINTER_NAME=GoDEX G500
POLL_INTERVAL_MS=2000
MAX_JOBS_PER_POLL=1
GODEX_DRY_RUN=false
DRY_RUN_MARK_PRINTED=false
```

`ERP_API_TOKEN` debe coincidir con `PRINT_JOBS_API_TOKEN` en el servidor ERP.

## Arranque manual

```powershell
npm run godex:bridge
```

El proceso escribe logs en stdout/stderr con:

- arranque del bridge
- trabajos reclamados
- trabajos impresos
- errores de spooler o API

## Prueba directa de spooler

```powershell
npm run godex:test-label
```

Simulacion sin imprimir:

```powershell
$env:GODEX_DRY_RUN="true"
npm run godex:test-label
```

## Dry-run del bridge

Con `GODEX_DRY_RUN=true`, el bridge reclama trabajos, muestra el EZPL y no imprime fisicamente. Solo marca `printed` si tambien defines `DRY_RUN_MARK_PRINTED=true`.

## Listar impresoras

```powershell
npm run godex:list-printers
```

Copia el campo `Name` exacto a `WINDOWS_PRINTER_NAME`.

## Prueba de cola

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
