param(
  [string]$ServiceName = "KioskoGodexBridge",
  [string]$ProjectDir = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path,
  [string]$NodeExe = "C:\Program Files\nodejs\node.exe",
  [string]$NssmExe = "nssm.exe",
  [string]$PrinterHost = "192.168.1.38",
  [int]$PrinterPort = 9100
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
$EnvExample = Join-Path $ProjectDir ".env.example"
$EnvFile = Join-Path $ProjectDir ".env.local"
$LogDir = Join-Path $ProjectDir "logs"
$StdoutLog = Join-Path $LogDir "godex-bridge.log"
$StderrLog = Join-Path $LogDir "godex-bridge-error.log"

Require-File $NodeExe "Node.js"
Require-File $ServerScript "Bridge server"
Require-File $EnvExample ".env.example"

if (-not (Test-Path $EnvFile)) {
  Copy-Item $EnvExample $EnvFile
  Write-Host ".env.local creado desde .env.example. Revisa ERP_API_TOKEN antes de operar en produccion."
}

New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

Push-Location $ProjectDir
try {
  Write-Host "Instalando dependencias..."
  npm install

  Write-Host "Verificando conectividad TCP $PrinterHost`:$PrinterPort..."
  $client = New-Object System.Net.Sockets.TcpClient
  $connect = $client.BeginConnect($PrinterHost, $PrinterPort, $null, $null)
  if (-not $connect.AsyncWaitHandle.WaitOne(5000, $false)) {
    $client.Close()
    throw "No hay conectividad TCP con la GoDEX en $PrinterHost`:$PrinterPort"
  }
  $client.EndConnect($connect)
  $client.Close()
} finally {
  Pop-Location
}

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
& $NssmPath set $ServiceName AppExit Default Restart
& $NssmPath set $ServiceName AppRestartDelay 5000
& $NssmPath start $ServiceName

Write-Host "Servicio instalado y arrancado: $ServiceName"
Write-Host "Proyecto: $ProjectDir"
Write-Host "Healthcheck: http://127.0.0.1:8787/health"
Write-Host "Estado NSSM:"
& $NssmPath status $ServiceName
Write-Host "Doctor:"
Push-Location $ProjectDir
try {
  npm run godex:doctor
} finally {
  Pop-Location
}
Write-Host "Logs:"
Write-Host "  $StdoutLog"
Write-Host "  $StderrLog"
