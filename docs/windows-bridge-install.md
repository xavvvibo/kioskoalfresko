# Instalacion Windows del bridge GoDEX

Este documento deja el bridge GoDEX funcionando en un PC Windows 10/11 sin levantar Next.js en local. El bridge consume la API publica del ERP configurada en `ERP_API_URL` y envia EZPL a la GoDEX G500 por TCP/IP.

## Arquitectura de produccion

- PC bridge Windows: ejecuta Node.js y el servicio `KioskoGodexBridge`.
- ERP: URL publica configurada en `ERP_API_URL`.
- Cola de impresion: el bridge reclama trabajos por la API del ERP.
- Impresora: GoDEX G500 en red, RAW TCP `192.168.1.37:9100`.
- Healthcheck local: `http://127.0.0.1:8787/health`.

El PC del kiosko no debe usar `localhost` como ERP. Debe apuntar a la URL real, por ejemplo `https://kioskoalfresko.es`.

## 1. Instalar Node LTS

1. Descargar Node.js LTS desde `https://nodejs.org/`.
2. Instalar con las opciones por defecto.
3. Abrir PowerShell y comprobar:

```powershell
node -v
npm -v
```

## 2. Clonar o actualizar el proyecto

Ruta recomendada:

```powershell
cd C:\
git clone https://github.com/<ORG>/<REPO>.git kioskoalfresko
cd C:\kioskoalfresko
npm install
```

Si el proyecto ya existe:

```powershell
cd C:\kioskoalfresko
git pull
npm install
```

## 3. Crear `.env.local`

Copiar el ejemplo:

```powershell
copy .env.example .env.local
notepad .env.local
```

Contenido esperado:

```dotenv
ERP_API_URL=https://kioskoalfresko.es
ERP_API_TOKEN=<token_api_impresion>
PRINTER_KEY=kiosko_godex_g500
GODEX_PRINT_TRANSPORT=tcp_9100
GODEX_PRINTER_HOST=192.168.1.37
GODEX_PRINTER_PORT=9100
GODEX_TCP_TIMEOUT_MS=5000
PRINT_DEBUG_TCP=false
PRINT_DEBUG_EZPL=false
BRIDGE_HEALTH_HOST=127.0.0.1
BRIDGE_HEALTH_PORT=8787
```

Notas:

- `ERP_API_URL` no debe ser `localhost`.
- `ERP_API_TOKEN` debe coincidir con el token aceptado por la API de impresion.
- `PRINTER_KEY` debe ser `kiosko_godex_g500`.
- En produccion normal mantener `PRINT_DEBUG_TCP=false` y `PRINT_DEBUG_EZPL=false`.

## 4. Pruebas manuales

Desde `C:\kioskoalfresko`:

```powershell
npm run godex:test-label:tcp:minimal
npm run godex:test-label:tcp
npm run godex:bridge:prod
npm run godex:doctor
```

En otra ventana de PowerShell:

```powershell
Invoke-RestMethod http://127.0.0.1:8787/health
```

Respuesta esperada:

```json
{
  "status": "OK",
  "api": "OK",
  "printerTcp": "OK",
  "version": "0.1.0",
  "printerKey": "kiosko_godex_g500",
  "transport": "tcp_9100"
}
```

Para parar la prueba manual del bridge, pulsar `Ctrl+C`.

## 5. Instalar NSSM

1. Descargar NSSM desde `https://nssm.cc/download`.
2. Descomprimir, por ejemplo en `C:\nssm`.
3. Usar la version adecuada: `C:\nssm\win64\nssm.exe`.

## 6. Instalar el servicio Windows

Abrir PowerShell como administrador:

```powershell
cd C:\kioskoalfresko
powershell -ExecutionPolicy Bypass -File scripts\godex-print-service\install-service.ps1 -NssmExe C:\nssm\win64\nssm.exe
```

Ese unico comando:

- ejecuta `npm install`;
- copia `.env.example` a `.env.local` si falta;
- verifica conectividad TCP con `192.168.1.37:9100`;
- registra el bridge como servicio NSSM;
- configura reinicio automatico;
- arranca el servicio;
- ejecuta `npm run godex:doctor`;
- muestra estado final.

El instalador crea y arranca:

- Servicio: `KioskoGodexBridge`
- Script: `scripts\godex-print-service\server.mjs`
- Directorio de trabajo: `C:\kioskoalfresko`
- Logs:
  - `C:\kioskoalfresko\logs\godex-bridge.log`
  - `C:\kioskoalfresko\logs\godex-bridge-error.log`

Comprobar estado:

```powershell
nssm status KioskoGodexBridge
Invoke-RestMethod http://127.0.0.1:8787/health
```

## 7. Actualizacion

Abrir PowerShell como administrador:

```powershell
cd C:\kioskoalfresko
nssm stop KioskoGodexBridge
git pull
npm install
nssm start KioskoGodexBridge
Invoke-RestMethod http://127.0.0.1:8787/health
```

Si cambia `.env.example`, revisar si hay variables nuevas y actualizar `.env.local` manualmente.

## 8. Recuperacion tras reinicio del PC

El servicio queda configurado como automatico. Tras reiniciar Windows:

```powershell
nssm status KioskoGodexBridge
Invoke-RestMethod http://127.0.0.1:8787/health
```

Si no esta arrancado:

```powershell
nssm start KioskoGodexBridge
```

Si el healthcheck falla:

```powershell
Get-Content C:\kioskoalfresko\logs\godex-bridge.log -Tail 80
Get-Content C:\kioskoalfresko\logs\godex-bridge-error.log -Tail 80
Test-NetConnection 192.168.1.37 -Port 9100
```

## 9. Recuperacion rapida

API no accesible:

- Revisar conexion a internet.
- Confirmar `ERP_API_URL`.
- Confirmar `ERP_API_TOKEN`.

Impresora no accesible:

- Confirmar que la GoDEX esta encendida.
- Ejecutar `Test-NetConnection 192.168.1.37 -Port 9100`.
- Confirmar IP fija o reserva DHCP.
- Revisar firewall o aislamiento de red.

Servicio arranca pero no imprime:

- Ejecutar `npm run godex:test-label:tcp:minimal`.
- Revisar `printer_key` en logs.
- Activar temporalmente `PRINT_DEBUG_EZPL=true` en `.env.local`.
- Reiniciar servicio con `nssm restart KioskoGodexBridge`.

## 10. Comandos utiles

```powershell
nssm status KioskoGodexBridge
nssm restart KioskoGodexBridge
nssm stop KioskoGodexBridge
nssm start KioskoGodexBridge
Invoke-RestMethod http://127.0.0.1:8787/health
```
