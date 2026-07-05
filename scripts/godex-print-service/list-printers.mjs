import { execFile } from "node:child_process";

function logInfo(message, meta = {}) {
  process.stdout.write(`${new Date().toISOString()} ${message} ${JSON.stringify(meta)}\n`);
}

function logError(message, meta = {}) {
  process.stderr.write(`${new Date().toISOString()} ${message} ${JSON.stringify(meta)}\n`);
}

const command = [
  "-NoProfile",
  "-Command",
  "Get-Printer | Select-Object Name,DriverName,PortName,PrinterStatus | ConvertTo-Json -Depth 3",
];

execFile("powershell.exe", command, { windowsHide: true, timeout: 15000 }, (error, stdout, stderr) => {
  if (error) {
    logError("[GODEX LIST PRINTERS ERROR]", {
      error: (stderr || stdout || error.message).trim(),
    });
    process.exitCode = 1;
    return;
  }

  logInfo("[GODEX LIST PRINTERS]", {
    note: "Copia el campo Name exacto en WINDOWS_PRINTER_NAME.",
  });
  process.stdout.write(`${stdout.trim()}\n`);
});
