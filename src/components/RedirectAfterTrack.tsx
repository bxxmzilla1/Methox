"use client";

import { recordClick } from "@/app/actions/track-click";
import { useEffect, useRef, useState } from "react";

type Props = { linkId: string; href: string };

export function RedirectAfterTrack({ linkId, href }: Props) {
  const ran = useRef(false);
  const [showFallback, setShowFallback] = useState(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    let cancelled = false;
    void (async () => {
      await recordClick(linkId);
      if (cancelled) return;
      window.location.assign(href);
      window.setTimeout(() => {
        if (!cancelled) setShowFallback(true);
      }, 4000);
    })();
    return () => {
      cancelled = true;
    };
  }, [linkId, href]);

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-zinc-950 px-6 text-center">
      <p className="text-sm font-medium text-zinc-400">Redirecting…</p>
      {showFallback && (
        <a
          href={href}
          className="mt-6 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-200"
        >
          Continue
        </a>
      )}
    </div>
  );
}
