"use client";

import { useEffect, useRef } from "react";
import { buttonClass, inputClass } from "@/components/ui";

export function SignOffPad({
  workOrderId,
  pending,
  onSubmit,
}: {
  workOrderId: string;
  pending: boolean;
  onSubmit: (form: FormData) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const ratio = window.devicePixelRatio || 1;
      const width = canvas.clientWidth;
      const height = 140;
      canvas.width = Math.floor(width * ratio);
      canvas.height = Math.floor(height * ratio);
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.strokeStyle = "#1b2744";
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  function point(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function start(event: React.PointerEvent<HTMLCanvasElement>) {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    drawing.current = true;
    const { x, y } = point(event);
    ctx.beginPath();
    ctx.moveTo(x, y);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function move(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = point(event);
    ctx.lineTo(x, y);
    ctx.stroke();
  }

  function end() {
    drawing.current = false;
  }

  function clear() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  return (
    <form
      className="mt-4 space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const canvas = canvasRef.current;
        if (canvas) {
          const blank = document.createElement("canvas");
          blank.width = canvas.width;
          blank.height = canvas.height;
          if (canvas.toDataURL() !== blank.toDataURL()) {
            form.set("signatureDataUrl", canvas.toDataURL("image/png"));
          }
        }
        onSubmit(form);
      }}
    >
      <input type="hidden" name="workOrderId" value={workOrderId} />
      <input name="signOffName" required placeholder="Manager name" className={inputClass} />
      <div>
        <p className="mb-1.5 text-xs font-medium text-ink-2">Signature</p>
        <canvas
          ref={canvasRef}
          className="h-[140px] w-full touch-none rounded-card bg-sunken"
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerLeave={end}
        />
        <button type="button" onClick={clear} className="mt-1 text-[11px] text-ink-3 hover:text-ink">
          Clear signature
        </button>
      </div>
      <button type="submit" disabled={pending} className={buttonClass("soft")}>
        {pending ? "Saving…" : "Record sign-off"}
      </button>
    </form>
  );
}
