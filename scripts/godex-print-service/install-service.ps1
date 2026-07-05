param(
  [string]$ServiceName = "KioskoGodexBridge",
  [string]$ProjectDir = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path,
  [string]$NodeExe = "C:\Program Files\nodejs\node.exe",
  [string]$NssmExe = "nssm.exe"
)

$ErrorActionPreference = "Stop"

function Require-File($Path, $Label) {
  if (-not (Test-Path $Path)) {
    throw "$Label no encontrado: $Path"
  }
}

function Resolve-Nssm($Command) {
  $resolved = Get-Command $Command -ErrorAction SilentlyContinue
  if ($resolved) {
    return $resolved.Source
  }

  if (Test-Path $Command) {
    return (Resolve-Path $Command).Path
  }

  throw "NSSM no encontrado. Instala NSSM o pasa -NssmExe C:\ruta\nssm.exe"
}

$NssmPath = Resolve-Nssm $NssmExe
$ServerScript = Join-Path $ProjectDir "scripts\godex-print-service\server.mjs"
$EnvFile = Join-Path $ProjectDir "bridge.env"
$LogDir = Join-Path $ProjectDir "logs"
$StdoutLog = Join-Path $LogDir "godex-bridge.log"
$StderrLog = Join-Path $LogDir "godex-bridge-error.log"

Require-File $NodeExe "Node.js"
Require-File $ServerScript "Bridge server"
Require-File $EnvFile "bridge.env"

New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

& $NssmPath stop $ServiceName 2>$null | Out-Null
& $NssmPath remove $ServiceName confirm 2>$null | Out-Null

& $NssmPath install $ServiceName $NodeExe $ServerScript
& $NssmPath set $ServiceName AppDirectory $ProjectDir
& $NssmPath set $ServiceName AppEnvironmentExtra NODE_ENV=production
& $NssmPath set $ServiceName AppStdout $StdoutLog
& $NssmPath set $ServiceName AppStderr $StderrLog
& $NssmPath set $ServiceName AppRotateFiles 1
& $NssmPath set $ServiceName AppRotateOnline 1
& $NssmPath set $ServiceName AppRotateBytes 10485760
& $NssmPath set $ServiceName Start SERVICE_AUTO_START
& $NssmPath start $ServiceName

Write-Host "Servicio instalado y arrancado: $ServiceName"
Write-Host "Proyecto: $ProjectDir"
Write-Host "Healthcheck: http://127.0.0.1:8787/health"
Write-Host "Logs:"
Write-Host "  $StdoutLog"
Write-Host "  $StderrLog"
