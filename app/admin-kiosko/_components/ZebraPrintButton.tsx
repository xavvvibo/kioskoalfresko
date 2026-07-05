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
        className="w-full rounded-full border border-[#d94b2b] bg-[#d94b2b] px-5 py-3 text-center text-xs font-black uppercase tracking-[0.14em] text-white transition hover:bg-stone-950 sm:w-auto"
      >
        {label}
      </button>
      {status ? <p className="text-xs font-semibold text-stone-300">{status}</p> : null}
    </div>
  );
}
