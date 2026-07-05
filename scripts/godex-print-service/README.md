# GoDEX G500 Print Bridge

Bridge standalone para el PC del kiosco. Consume la API publica del ERP y envia EZPL por TCP RAW 9100 a la GoDEX G500.

Configuracion final:

```env
ERP_API_URL=https://kioskoalfresko.es
ERP_API_TOKEN=change-me-internal-print-token
PRINTER_KEY=kiosko_godex_g500
GODEX_PRINT_TRANSPORT=tcp_9100
GODEX_PRINTER_HOST=192.168.1.38
GODEX_PRINTER_PORT=9100
```

El bridge carga automaticamente `.env` y `.env.local`.

Arranque manual:

```powershell
npm run godex:bridge:prod
```

Diagnostico:

```powershell
npm run godex:doctor
```

Prueba TCP directa:

```powershell
npm run godex:test-label:tcp:minimal
npm run godex:test-label:tcp
```

Instalacion Windows como servicio:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\godex-print-service\install-service.ps1 -NssmExe C:\nssm\win64\nssm.exe
```
