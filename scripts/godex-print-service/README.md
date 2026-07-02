# Godex G500 Print Service

Servicio local para imprimir EZPL nativo Godex desde el ERP interno.

## Requisitos

- Windows 10 en el PC conectado por USB a la Godex G500.
- Node.js instalado en ese PC.
- La impresora debe estar compartida en Windows, por ejemplo como `GodexG500`.

## Variables

```powershell
$env:PRINT_SERVICE_PORT="9105"
$env:PRINT_SERVICE_HOST="0.0.0.0"
$env:GODEX_PRINTER_SHARE="\\localhost\GodexG500"
```

Opcional para preparar autenticacion futura:

```powershell
$env:PRINT_SERVICE_API_KEY="clave-interna"
```

## Arranque manual

Desde la raiz del proyecto:

```powershell
node scripts/godex-print-service/server.mjs
```

El ERP debe tener:

```env
PRINT_SERVICE_URL=http://192.168.1.44:9105
```

Si se define `PRINT_SERVICE_API_KEY` tambien debe estar en el entorno del ERP.

## Prueba

```powershell
Invoke-RestMethod `
  -Method Post `
  -Uri http://127.0.0.1:9105/print `
  -ContentType "application/json" `
  -Body '{"ezpl":"^Q40,3\n^W58\n^H10\n^S4\n^P1\n^L\nAA,20,20,1,1,1,0,0,KIOSKO ALFRESKO\nE"}'
```

El servicio registra fecha, tamano del trabajo, duracion y errores. No guarda el contenido de la etiqueta.
