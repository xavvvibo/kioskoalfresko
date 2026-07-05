# Checklist Godex G500

## Antes de instalar

- Godex G500 encendida y conectada por USB al PC Windows del kiosko.
- Driver Godex instalado.
- La pagina de prueba de Windows imprime correctamente.
- El nombre exacto de impresora esta copiado con `npm run godex:list-printers`.
- `PRINT_JOBS_API_TOKEN` configurado en el ERP.
- `scripts/godex-print-service/.env` creado desde `.env.example`.

## Prueba local Windows

1. En el PC Windows, abrir PowerShell en la raiz del proyecto.
2. Ejecutar `npm run godex:test-label`.
3. Confirmar que sale una etiqueta de prueba.

## Prueba ERP

1. Ejecutar `npm run godex:bridge`.
2. Crear una etiqueta desde `/admin-kiosko/etiquetas`.
3. Confirmar logs `PRINT JOB START` y `PRINT JOB PRINTED`.
4. Confirmar en `print_jobs` que el estado queda `printed`.

## Si falla

- Revisar `WINDOWS_PRINTER_NAME`.
- Revisar token `ERP_API_TOKEN` contra `PRINT_JOBS_API_TOKEN`.
- Revisar conectividad desde Windows a `ERP_API_URL`.
- Consultar `error_message` en `print_jobs`.
- No marcar manualmente `printed` salvo que la etiqueta haya salido fisicamente.
