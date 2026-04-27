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
      className={`rounded-lg border border-zinc-600 px-3 py-1.5 text-center text-xs font-medium text-zinc-200 transition hover:bg-zinc-800 ${className}`}
    >
      {label}
    </button>
  );
}
