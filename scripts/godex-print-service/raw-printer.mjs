import fs from "node:fs/promises";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";

export const GODEX_PRINT_TRANSPORTS = {
  WINDOWS_SPOOLER: "windows_spooler",
  TCP_9100: "tcp_9100",
};

const rawPrinterPowerShell = String.raw`
param(
  [Parameter(Mandatory=$true)][string]$PrinterName,
  [Parameter(Mandatory=$true)][string]$FilePath
)

Add-Type -TypeDefinition @"
using System;
using System.IO;
using System.Runtime.InteropServices;

public class RawPrinterHelper {
  [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Ansi)]
  public class DOCINFOA {
    [MarshalAs(UnmanagedType.LPStr)] public string pDocName;
    [MarshalAs(UnmanagedType.LPStr)] public string pOutputFile;
    [MarshalAs(UnmanagedType.LPStr)] public string pDataType;
  }

  [DllImport("winspool.Drv", EntryPoint="OpenPrinterA", SetLastError=true, CharSet=CharSet.Ansi, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
  public static extern bool OpenPrinter(string szPrinter, out IntPtr hPrinter, IntPtr pd);

  [DllImport("winspool.Drv", EntryPoint="ClosePrinter", SetLastError=true, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
  public static extern bool ClosePrinter(IntPtr hPrinter);

  [DllImport("winspool.Drv", EntryPoint="StartDocPrinterA", SetLastError=true, CharSet=CharSet.Ansi, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
  public static extern bool StartDocPrinter(IntPtr hPrinter, Int32 level, [In, MarshalAs(UnmanagedType.LPStruct)] DOCINFOA di);

  [DllImport("winspool.Drv", EntryPoint="EndDocPrinter", SetLastError=true, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
  public static extern bool EndDocPrinter(IntPtr hPrinter);

  [DllImport("winspool.Drv", EntryPoint="StartPagePrinter", SetLastError=true, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
  public static extern bool StartPagePrinter(IntPtr hPrinter);

  [DllImport("winspool.Drv", EntryPoint="EndPagePrinter", SetLastError=true, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
  public static extern bool EndPagePrinter(IntPtr hPrinter);

  [DllImport("winspool.Drv", EntryPoint="WritePrinter", SetLastError=true, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
  public static extern bool WritePrinter(IntPtr hPrinter, IntPtr pBytes, Int32 dwCount, out Int32 dwWritten);

  public static void SendFile(string printerName, string filePath) {
    byte[] bytes = File.ReadAllBytes(filePath);
    IntPtr unmanagedBytes = Marshal.AllocCoTaskMem(bytes.Length);
    Marshal.Copy(bytes, 0, unmanagedBytes, bytes.Length);
    IntPtr printerHandle;

    if (!OpenPrinter(printerName.Normalize(), out printerHandle, IntPtr.Zero)) {
      throw new Exception("No se puede abrir la impresora: " + printerName);
    }

    DOCINFOA docInfo = new DOCINFOA();
    docInfo.pDocName = "Kiosko Alfresko Godex label";
    docInfo.pDataType = "RAW";

    try {
      if (!StartDocPrinter(printerHandle, 1, docInfo)) throw new Exception("StartDocPrinter fallo.");
      if (!StartPagePrinter(printerHandle)) throw new Exception("StartPagePrinter fallo.");
      int written;
      if (!WritePrinter(printerHandle, unmanagedBytes, bytes.Length, out written)) throw new Exception("WritePrinter fallo.");
      if (written != bytes.Length) throw new Exception("WritePrinter incompleto.");
      EndPagePrinter(printerHandle);
      EndDocPrinter(printerHandle);
    } finally {
      ClosePrinter(printerHandle);
      Marshal.FreeCoTaskMem(unmanagedBytes);
    }
  }
}
"@

[RawPrinterHelper]::SendFile($PrinterName, $FilePath)
`;

export async function sendRawToWindowsPrinter(rawCommand, windowsPrinterName) {
  const jobId = randomUUID();
  const tmpDir = os.tmpdir();
  const commandPath = path.join(tmpDir, `kiosko-godex-${jobId}.ezpl`);
  const scriptPath = path.join(tmpDir, `kiosko-godex-raw-printer-${jobId}.ps1`);

  await fs.writeFile(commandPath, rawCommand, "utf8");
  await fs.writeFile(scriptPath, rawPrinterPowerShell, "utf8");

  try {
    await new Promise((resolve, reject) => {
      execFile(
        "powershell.exe",
        ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", scriptPath, "-PrinterName", windowsPrinterName, "-FilePath", commandPath],
        { windowsHide: true, timeout: 30000 },
        (error, stdout, stderr) => {
          if (error) {
            reject(new Error((stderr || stdout || error.message).trim()));
            return;
          }
          resolve();
        },
      );
    });
  } finally {
    await fs.rm(commandPath, { force: true }).catch(() => undefined);
    await fs.rm(scriptPath, { force: true }).catch(() => undefined);
  }
}

export async function sendRawToTcpPrinter(rawCommand, host, port = 9100, timeoutMs = 5000) {
  const payload = Buffer.isBuffer(rawCommand) ? rawCommand : Buffer.from(String(rawCommand), "utf8");
  const printerPort = Number(port || 9100);
  const socketTimeoutMs = Math.max(1000, Number(timeoutMs || 5000));
  const debugTcp = process.env.PRINT_DEBUG_TCP === "true";

  if (!host) {
    throw new Error("Falta GODEX_HOST para transporte tcp_9100.");
  }
  if (!Number.isFinite(printerPort) || printerPort <= 0) {
    throw new Error(`Puerto TCP invalido para Godex: ${port}`);
  }

  await new Promise((resolve, reject) => {
    const socket = new net.Socket();
    let settled = false;
    let timer;
    let phase = "connect";
    const startedAt = Date.now();
    let connectStartedAt = startedAt;
    let writeStartedAt = 0;

    function tcpLog(message, meta = {}, debugOnly = false) {
      if (debugOnly && !debugTcp) return;
      process.stdout.write(`${new Date().toISOString()} ${message} ${JSON.stringify({
        host,
        port: printerPort,
        phase,
        ...meta,
      })}\n`);
    }

    function clearPhaseTimer() {
      if (timer) clearTimeout(timer);
      timer = undefined;
    }

    function armPhaseTimer(nextPhase) {
      phase = nextPhase;
      clearPhaseTimer();
      timer = setTimeout(() => {
        finish(new Error(`Timeout TCP Godex ${host}:${printerPort} durante ${phase} tras ${socketTimeoutMs}ms.`));
      }, socketTimeoutMs);
    }

    function finish(error) {
      if (settled) return;
      settled = true;
      clearPhaseTimer();
      tcpLog("[TCP SOCKET DESTROY]", {
        error: error instanceof Error ? error.message : undefined,
        totalDurationMs: Date.now() - startedAt,
      });
      socket.destroy();
      if (error) reject(error);
      else resolve();
    }

    socket.on("error", (error) => {
      tcpLog("[TCP ERROR]", {
        error: error.message,
        totalDurationMs: Date.now() - startedAt,
      }, true);
      finish(new Error(`Error TCP Godex ${host}:${printerPort}: ${error.message}`));
    });

    socket.on("timeout", () => {
      tcpLog("[TCP TIMEOUT EVENT]", {
        totalDurationMs: Date.now() - startedAt,
      }, true);
    });

    socket.on("end", () => {
      tcpLog("[TCP REMOTE END]", {
        totalDurationMs: Date.now() - startedAt,
      }, true);
    });

    socket.on("close", (hadError) => {
      tcpLog("[TCP REMOTE CLOSE]", {
        hadError,
        totalDurationMs: Date.now() - startedAt,
      }, true);
    });

    socket.on("drain", () => {
      tcpLog("[TCP DRAIN]", {
        bytes: payload.length,
        writeDurationMs: writeStartedAt ? Date.now() - writeStartedAt : undefined,
      });
    });

    socket.on("finish", () => {
      tcpLog("[TCP LOCAL FINISHED]", {
        totalDurationMs: Date.now() - startedAt,
      });
      finish();
    });

    armPhaseTimer("connect");
    connectStartedAt = Date.now();

    socket.connect(printerPort, host, () => {
      tcpLog("[TCP CONNECTED]", {
        connectDurationMs: Date.now() - connectStartedAt,
        totalDurationMs: Date.now() - startedAt,
      });

      armPhaseTimer("write");
      writeStartedAt = Date.now();
      tcpLog("[TCP WRITE START]", {
        bytes: payload.length,
      });

      const writeAccepted = socket.write(payload, (error) => {
        if (error) {
          finish(new Error(`No se pudo enviar EZPL a Godex ${host}:${printerPort}: ${error.message}`));
          return;
        }
        clearPhaseTimer();
        tcpLog("[TCP WRITE OK]", {
          bytes: payload.length,
          writeDurationMs: Date.now() - writeStartedAt,
          totalDurationMs: Date.now() - startedAt,
        });
        tcpLog("[TCP END SENT]", {
          totalDurationMs: Date.now() - startedAt,
        });
        socket.end();
      });

      if (!writeAccepted) {
        tcpLog("[TCP WRITE BACKPRESSURE]", {
          bytes: payload.length,
        }, true);
      }
    });
  });
}

export async function printRawEzpl(rawCommand, options = {}) {
  const transport = options.transport || GODEX_PRINT_TRANSPORTS.WINDOWS_SPOOLER;

  if (transport === GODEX_PRINT_TRANSPORTS.TCP_9100) {
    return sendRawToTcpPrinter(rawCommand, options.host, options.port || 9100, options.timeoutMs || 5000);
  }

  if (transport === GODEX_PRINT_TRANSPORTS.WINDOWS_SPOOLER) {
    return sendRawToWindowsPrinter(rawCommand, options.windowsPrinterName);
  }

  throw new Error(`Transporte Godex no soportado: ${transport}`);
}
