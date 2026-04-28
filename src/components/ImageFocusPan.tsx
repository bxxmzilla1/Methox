"use client";

import { useCallback, useRef } from "react";
import type { ImageFocus } from "@/lib/landing-data";
import { DEFAULT_IMAGE_FOCUS, clampFocus, focusToObjectPosition } from "@/lib/landing-data";

type Props = {
  imageUrl: string | null;
  value: ImageFocus;
  onChange: (next: ImageFocus) => void;
  /** Tailwind aspect ratio class, e.g. aspect-[9/16] or aspect-[21/9] */
  aspectClassName: string;
  label: string;
  hint?: string;
};

export function ImageFocusPan({
  imageUrl,
  value,
  onChange,
  aspectClassName,
  label,
  hint = "Drag on the image to set what stays centered on phones (object-position).",
}: Props) {
  const dragRef = useRef<{ px: number; py: number; fx: number; fy: number } | null>(null);

  const applyPointer = useCallback(
    (clientX: number, clientY: number, start: { px: number; py: number; fx: number; fy: number }) => {
      const dx = clientX - start.px;
      const dy = clientY - start.py;
      const scale = 0.22;
      onChange(
        clampFocus({
          x: start.fx + dx * scale,
          y: start.fy + dy * scale,
        })
      );
    },
    [onChange]
  );

  const onPointerDown = (e: React.PointerEvent) => {
    if (!imageUrl) return;
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = { px: e.clientX, py: e.clientY, fx: value.x, fy: value.y };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const start = dragRef.current;
    if (!start) return;
    applyPointer(e.clientX, e.clientY, start);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (dragRef.current) {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    }
    dragRef.current = null;
  };

  const pos = focusToObjectPosition(value);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-medium text-zinc-700">{label}</span>
        <button
          type="button"
          className="text-[11px] font-medium text-emerald-700 hover:underline"
          onClick={() => onChange({ ...DEFAULT_IMAGE_FOCUS })}
        >
          Reset center
        </button>
      </div>
      <div
        className={`relative w-full max-w-full overflow-hidden rounded-xl bg-zinc-100 ring-1 ring-zinc-200/90 ${aspectClassName} ${
          imageUrl ? "cursor-grab active:cursor-grabbing touch-none" : "opacity-60"
        }`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt=""
            draggable={false}
            className="pointer-events-none h-full w-full select-none object-cover"
            style={{ objectPosition: pos }}
          />
        ) : (
          <div className="flex h-full items-center justify-center px-4 text-center text-[11px] text-zinc-400">
            Add an image to adjust framing
          </div>
        )}
        {imageUrl ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 to-transparent px-2 py-1.5 text-[10px] text-white/90">
            Mobile crop preview · {Math.round(value.x)}% · {Math.round(value.y)}%
          </div>
        ) : null}
      </div>
      <p className="text-[11px] leading-snug text-zinc-500">{hint}</p>
    </div>
  );
}
