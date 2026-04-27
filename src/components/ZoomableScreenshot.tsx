"use client";

import { useCallback, useRef, useState } from "react";

const SCALE = 2.25;

type Props = {
  src: string;
  alt?: string;
  className?: string;
};

export function ZoomableScreenshot({ src, alt = "", className = "" }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [origin, setOrigin] = useState("50% 50%");
  const [hover, setHover] = useState(false);

  const onMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = wrapRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 100;
    const y = ((e.clientY - r.top) / r.height) * 100;
    setOrigin(`${Math.min(100, Math.max(0, x))}% ${Math.min(100, Math.max(0, y))}%`);
  }, []);

  const onLeave = useCallback(() => {
    setHover(false);
    setOrigin("50% 50%");
  }, []);

  return (
    <div
      ref={wrapRef}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={onLeave}
      onMouseMove={onMove}
      className={`cursor-crosshair overflow-hidden ${className}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- dynamic Supabase URL */}
      <img
        src={src}
        alt={alt}
        className="h-full w-full object-cover will-change-transform"
        style={{
          transform: hover ? `scale(${SCALE})` : "scale(1)",
          transformOrigin: origin,
          transition: hover
            ? "transform 0.08s ease-out"
            : "transform 0.25s cubic-bezier(0.33, 1, 0.68, 1)",
        }}
        draggable={false}
      />
    </div>
  );
}
