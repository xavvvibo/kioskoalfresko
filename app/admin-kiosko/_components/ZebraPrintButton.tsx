"use client";

import { useState } from "react";

type BrowserPrintDevice = {
  name?: string;
  send: (zpl: string, success?: () => void, error?: (message?: string) => void) => void;
};

type BrowserPrintApi = {
  getDefaultDevice: (type: string, success: (device: BrowserPrintDevice) => void, error?: (message?: string) => void) => void;
};

declare global {
  interface Window {
    BrowserPrint?: BrowserPrintApi;
  }
}

function downloadZpl(filename: string, zpl: string) {
  const blob = new Blob([zpl], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".zpl") ? filename : `${filename}.zpl`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function ZebraPrintButton({
  zpl,
  filename,
  historyPayload,
  label = "Imprimir Zebra",
}: {
  zpl: string;
  filename: string;
  historyPayload: Record<string, string | number | undefined>;
  label?: string;
}) {
  const [status, setStatus] = useState("");

  async function saveHistory(printer?: string) {
    await fetch("/admin-kiosko/etiquetas/zebra-print", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...historyPayload, printer }),
    });
  }

  async function print() {
    setStatus("Preparando etiqueta Zebra.");

    if (window.BrowserPrint) {
      window.BrowserPrint.getDefaultDevice("printer", (device) => {
        device.send(zpl, async () => {
          await saveHistory(device.name || "Zebra ZD421");
          setStatus("Etiqueta enviada a Zebra.");
        }, () => {
          downloadZpl(filename, zpl);
          void saveHistory("Archivo ZPL");
          setStatus("Browser Print no respondió. Archivo ZPL descargado.");
        });
      }, () => {
        downloadZpl(filename, zpl);
        void saveHistory("Archivo ZPL");
        setStatus("Browser Print no disponible. Archivo ZPL descargado.");
      });
      return;
    }

    downloadZpl(filename, zpl);
    await saveHistory("Archivo ZPL");
    setStatus("Archivo ZPL descargado.");
  }

  return (
    <div className="grid min-w-0 gap-2">
      <button
        type="button"
        onClick={print}
        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/8 px-4 py-3 text-center text-xs font-black uppercase tracking-[0.12em] text-white transition duration-150 hover:border-[#d94b2b] hover:bg-white/12 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f2c6bb] sm:w-auto"
      >
        <span className="grid h-5 w-5 place-items-center rounded-md border border-white/20 bg-black/20 text-[10px] text-white">Z</span>
        {label.replace(/^Imprimir\s+/i, "")}
      </button>
      {status ? <p className="text-xs font-semibold text-stone-300">{status}</p> : null}
    </div>
  );
}
