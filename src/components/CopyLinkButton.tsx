"use client";

import { useCallback, useState } from "react";

type Props = {
  url: string;
  className?: string;
};

export function CopyLinkButton({ url, className = "" }: Props) {
  const [state, setState] = useState<"idle" | "copied" | "err">("idle");

  const onCopy = useCallback(() => {
    void (async () => {
      try {
        await navigator.clipboard.writeText(url);
        setState("copied");
        setTimeout(() => setState("idle"), 2000);
      } catch {
        setState("err");
        setTimeout(() => setState("idle"), 2000);
      }
    })();
  }, [url]);

  const label =
    state === "copied" ? "Copied" : state === "err" ? "Failed" : "Copy link";

  return (
    <button
      type="button"
      onClick={onCopy}
      className={`rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-center text-xs font-medium text-zinc-800 shadow-sm transition hover:border-emerald-200 hover:bg-emerald-50/50 ${className}`}
    >
      {label}
    </button>
  );
}
