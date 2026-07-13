"use client";

import { useEffect, useRef, useState } from "react";

export function SignatureCanvas({
  name = "signatureImageDataUrl",
  consentName = "signatureConsent",
}: {
  name?: string;
  consentName?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [drawing, setDrawing] = useState(false);
  const [dataUrl, setDataUrl] = useState("");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.lineWidth = 3;
    context.lineCap = "round";
    context.strokeStyle = "#111111";
  }, []);

  function point(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * (canvas.width / rect.width),
      y: (event.clientY - rect.top) * (canvas.height / rect.height),
    };
  }

  function start(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    setDrawing(true);
    canvas.setPointerCapture(event.pointerId);
    const current = point(event);
    context.beginPath();
    context.moveTo(current.x, current.y);
  }

  function move(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing) return;
    const context = canvasRef.current?.getContext("2d");
    if (!context) return;
    const current = point(event);
    context.lineTo(current.x, current.y);
    context.stroke();
    setDataUrl(canvasRef.current?.toDataURL("image/png") || "");
  }

  function stop() {
    setDrawing(false);
    setDataUrl(canvasRef.current?.toDataURL("image/png") || "");
  }

  function clear() {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
    setDataUrl("");
  }

  return (
    <div className="grid gap-3">
      <canvas
        ref={canvasRef}
        width={900}
        height={260}
        className="h-44 w-full touch-none rounded-2xl border border-stone-300 bg-white"
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={stop}
        onPointerCancel={stop}
        aria-label="Área de firma manuscrita"
      />
      <input type="hidden" name={name} value={dataUrl} />
      <label className="text-sm font-bold text-stone-200">
        <input name={consentName} type="checkbox" required className="mr-2" />
        Confirmo que la firma manuscrita representa mi conformidad con el contenido mostrado.
      </label>
      <button type="button" onClick={clear} className="rounded-full border border-white/15 bg-white/8 px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-white">
        Limpiar firma
      </button>
    </div>
  );
}
