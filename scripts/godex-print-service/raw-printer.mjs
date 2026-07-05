import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";

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
