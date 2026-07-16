#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = path.join(repoRoot, "dist", "godex-print-bridge-windows");

const packageJson = {
  type: "module",
  scripts: {
    "print:godex": "node godex-print-bridge.mjs",
    "print:godex:once": "node godex-print-bridge.mjs --once",
    "print:godex:dry": "node godex-print-bridge.mjs --dry-run --once",
  },
};

const envExample = `# Copiar este archivo a .env.local en el PC Windows del kiosko.
# No guardar claves reales en el repositorio.
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
GODEX_HOST=
GODEX_PORT=9100
GODEX_PRINTER_KEY=kiosko_godex_g500
GODEX_MIN_JOB_CREATED_AT=2026-07-09T09:00:00+02:00
GODEX_SOCKET_SETTLE_MS=1200
GODEX_BETWEEN_JOBS_MS=2000
GODEX_TCP_TIMEOUT_MS=10000
`;

const readme = `# GoDEX print bridge Windows

Bridge local para ejecutar en el PC Windows del kiosko, en la misma LAN que la GoDEX.

Arquitectura:

\`\`\`text
Admin web / casa -> Supabase print_jobs -> bridge local Windows -> GoDEX TCP RAW
\`\`\`

## Seguridad

- No abrir el puerto 9100 a internet.
- No hacer port forwarding hacia la impresora.
- No poner claves reales en archivos versionados.
- No imprime automaticamente al copiar esta carpeta.
- El bridge solo procesa trabajos \`queued\` de \`print_jobs\` para \`kiosko_godex_g500\`.
- \`GODEX_MIN_JOB_CREATED_AT\` evita imprimir trabajos antiguos aunque el PC se apague y vuelva a arrancar.

## Instalacion

1. Instalar Node.js LTS en el PC Windows.
2. Copiar la carpeta \`godex-print-bridge-windows\` al PC, por ejemplo:

\`\`\`powershell
C:\\godex-print-bridge
\`\`\`

3. Copiar \`.env.example\` a \`.env.local\`.
4. Rellenar en \`.env.local\`:

\`\`\`text
NEXT_PUBLIC_SUPABASE_URL=https://...
SUPABASE_SERVICE_ROLE_KEY=...
GODEX_HOST=<IP_DE_LA_GODEX>
GODEX_PORT=9100
GODEX_PRINTER_KEY=kiosko_godex_g500
GODEX_MIN_JOB_CREATED_AT=2026-07-09T09:00:00+02:00
GODEX_SOCKET_SETTLE_MS=1200
GODEX_BETWEEN_JOBS_MS=2000
GODEX_TCP_TIMEOUT_MS=10000
\`\`\`

## Probar sin imprimir

\`\`\`powershell
cd C:\\godex-print-bridge
npm run print:godex:dry
\`\`\`

Tambien puede ejecutarse:

\`\`\`powershell
.\\dry-run.ps1
\`\`\`

## Procesar una vez

\`\`\`powershell
npm run print:godex:once
\`\`\`

o:

\`\`\`powershell
.\\once.ps1
\`\`\`

Para lotes grandes, imprimir primero 1 etiqueta y validar salida fisica antes de lanzar muchas etiquetas.

## Dejarlo corriendo

\`\`\`powershell
npm run print:godex
\`\`\`

o:

\`\`\`powershell
.\\start-bridge.ps1
\`\`\`

## Instalar tarea programada

La tarea se llama \`Kiosko GoDEX Print Bridge\` y arranca al iniciar sesion del usuario de Windows.

\`\`\`powershell
powershell -ExecutionPolicy Bypass -File .\\install-scheduled-task.ps1
\`\`\`

Logs:

\`\`\`text
bridge.log
bridge-error.log
\`\`\`

## Desinstalar tarea programada

\`\`\`powershell
powershell -ExecutionPolicy Bypass -File .\\uninstall-scheduled-task.ps1
\`\`\`

No borra archivos ni \`.env.local\`.

## Evitar jobs antiguos

Por defecto el bridge solo procesa trabajos creados desde que arranca. Para fijar una fecha minima:

\`\`\`text
GODEX_MIN_JOB_CREATED_AT=2026-07-09T09:00:00+02:00
\`\`\`

La opcion CLI \`--since\` manda sobre \`GODEX_MIN_JOB_CREATED_AT\`:

\`\`\`powershell
node godex-print-bridge.mjs --once --since "2026-07-09T09:00:00+02:00"
\`\`\`

## Filtrar batch

\`\`\`powershell
node godex-print-bridge.mjs --once --since "2026-07-09T09:00:00+02:00" --batch FRZ-20260708
\`\`\`

## Flujo APPCC

Las validaciones APPCC y la generacion del EZPL 80x50 ocurren antes, en el ERP, al crear \`print_jobs\`. El payload debe traer \`raw_command\` con el EZPL completo y terminado en CRLF. Este bridge imprime ese comando tal cual por TCP RAW. Durante la retirada del flujo antiguo, mantiene fallback limitado desde \`payload.title\`, \`payload.line1\` y \`payload.line2\` si no existe \`raw_command\`.

## Estado printed

En Supabase, \`printed\` significa que el bridge ha enviado el TCP RAW a la GoDEX. La salida fisica del papel no tiene ACK fiable; revisar visualmente la impresora, especialmente antes de lotes grandes.
`;

const powerShellScripts = {
  "dry-run.ps1": `Set-Location $PSScriptRoot
npm run print:godex:dry
`,
  "once.ps1": `Set-Location $PSScriptRoot
npm run print:godex:once
`,
  "start-bridge.ps1": `$LogPath = Join-Path $PSScriptRoot "bridge.log"
$ErrorLogPath = Join-Path $PSScriptRoot "bridge-error.log"
Set-Location $PSScriptRoot
npm run print:godex >> $LogPath 2>> $ErrorLogPath
`,
  "install-scheduled-task.ps1": `$TaskName = "Kiosko GoDEX Print Bridge"
$ScriptPath = Join-Path $PSScriptRoot "start-bridge.ps1"

if (-not (Test-Path $ScriptPath)) {
  throw "No se encuentra start-bridge.ps1 en $PSScriptRoot"
}

$Action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument ('-NoProfile -ExecutionPolicy Bypass -File "' + $ScriptPath + '"') -WorkingDirectory $PSScriptRoot
$Trigger = New-ScheduledTaskTrigger -AtLogOn
$Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit (New-TimeSpan -Days 30) -MultipleInstances IgnoreNew

Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Settings $Settings -Description "Bridge local Kiosko Alfresko: Supabase print_jobs -> GoDEX TCP RAW" -Force

Write-Host "Tarea programada instalada: $TaskName"
Write-Host "Carpeta: $PSScriptRoot"
Write-Host "Logs: bridge.log / bridge-error.log"
`,
  "uninstall-scheduled-task.ps1": `$TaskName = "Kiosko GoDEX Print Bridge"

if (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue) {
  Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
  Write-Host "Tarea programada eliminada: $TaskName"
} else {
  Write-Host "No existe la tarea programada: $TaskName"
}
`,
};

async function writeText(filePath, content) {
  await fs.writeFile(filePath, content.replace(/\n/g, "\r\n"), "utf8");
}

async function main() {
  await fs.rm(outputDir, { recursive: true, force: true });
  await fs.mkdir(outputDir, { recursive: true });

  await fs.copyFile(
    path.join(repoRoot, "scripts", "godex-print-bridge.mjs"),
    path.join(outputDir, "godex-print-bridge.mjs"),
  );
  await writeText(path.join(outputDir, "package.json"), `${JSON.stringify(packageJson, null, 2)}\n`);
  await writeText(path.join(outputDir, ".env.example"), envExample);
  await writeText(path.join(outputDir, "README-WINDOWS.md"), readme);

  for (const [filename, content] of Object.entries(powerShellScripts)) {
    await writeText(path.join(outputDir, filename), content);
  }

  console.log(`Paquete GoDEX Windows generado en: ${outputDir}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
