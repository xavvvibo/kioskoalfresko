# Checklist GoDEX G500

## Estado validado

- GoDEX G500 en red.
- IP impresora: `192.168.1.37`.
- Puerto RAW: `9100`.
- Etiquetas fisicas: `80x50 mm`.
- `printer_key`: `kiosko_godex_g500`.
- Transporte: `tcp_9100`.

## Antes de operar

- `.env.local` creado desde `.env.example`.
- `ERP_API_URL` apunta a la URL publica del ERP, no a `localhost`.
- `ERP_API_TOKEN` coincide con el token de la API de impresion del ERP.
- No existen variables antiguas `GODEX_HOST` ni `GODEX_PORT`.
- `npm run godex:doctor` no muestra errores de configuracion.

## Prueba local

```powershell
npm run godex:test-label:tcp:minimal
npm run godex:test-label:tcp
```

## Prueba ERP

1. Ejecutar el bridge o tener activo el servicio `KioskoGodexBridge`.
2. Crear/cerrar un lote desde Produccion.
3. Confirmar logs `PRINT JOB START` y `PRINT JOB PRINTED`.
4. Confirmar en `print_jobs` que el estado queda `printed` (transporte aceptado).

## Si falla

- Ejecutar `npm run godex:doctor`.
- Revisar `GODEX_PRINTER_HOST=192.168.1.37`.
- Revisar `GODEX_PRINTER_PORT=9100`.
- Revisar conectividad desde Windows: `Test-NetConnection 192.168.1.37 -Port 9100`.
- Revisar token `ERP_API_TOKEN`.
- Consultar `error` en `print_jobs`.
- No marcar manualmente `printed` salvo que la etiqueta haya salido fisicamente.
