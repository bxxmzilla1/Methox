"use client";

import { useEffect, useMemo, useRef } from "react";

type StartRes = { sessionId: string } | { error: string };
type ChunkRes = { ok: true } | { error: string };

type Props = {
  linkId: string;
  enabled: boolean;
};

export function SessionRecorderClient({ linkId, enabled }: Props) {
  const started = useRef(false);
  const sessionIdRef = useRef<string | null>(null);
  const seqRef = useRef(0);
  const bufferRef = useRef<unknown[]>([]);
  const flushTimer = useRef<number | null>(null);

  const firstUrl = useMemo(() => {
    try {
      return typeof window !== "undefined" ? window.location.href : "";
    } catch {
      return "";
    }
  }, []);

  async function startSession(): Promise<string | null> {
    const res = await fetch("/api/session-recorder/start", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ linkId, firstUrl }),
      cache: "no-store",
    }).catch(() => null);

    if (!res || !res.ok) return null;
    const data = (await res.json().catch(() => null)) as StartRes | null;
    if (!data || "error" in data) return null;
    return data.sessionId;
  }

  async function sendChunk(opts?: { keepalive?: boolean }) {
    const events = bufferRef.current;
    if (!events.length) return;
    if (!sessionIdRef.current) {
      // Session not ready yet — keep buffering and retry soon.
      scheduleFlush();
      return;
    }
    bufferRef.current = [];
    const seq = seqRef.current++;

    const payload = {
      sessionId: sessionIdRef.current,
      seq,
      events,
      lastUrl: typeof window !== "undefined" ? window.location.href : "",
    };

    const keepalive = Boolean(opts?.keepalive);
    if (keepalive && typeof navigator !== "undefined" && "sendBeacon" in navigator) {
      try {
        const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
        // best effort — no response handling
        (navigator.sendBeacon as (url: string, data?: BodyInit | null) => boolean)("/api/session-recorder/chunk", blob);
        return;
      } catch {
        // fall through to fetch
      }
    }

    const res = await fetch("/api/session-recorder/chunk", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
      keepalive,
    }).catch(() => null);

    if (!res) return;
    const data = (await res.json().catch(() => null)) as ChunkRes | null;
    void data;
  }

  function scheduleFlush() {
    if (flushTimer.current) return;
    flushTimer.current = window.setTimeout(() => {
      flushTimer.current = null;
      void sendChunk();
    }, 2000);
  }

  useEffect(() => {
    if (!enabled) return;
    if (started.current) return;
    started.current = true;

    let stop: undefined | (() => void) = undefined;
    let cancelled = false;

    (async () => {
      // Start recording immediately (buffering events locally), then start the session and flush.
      const rrweb = await import("rrweb");
      if (cancelled) return;

      stop = rrweb.record({
        emit(event) {
          bufferRef.current.push(event as unknown);
          if (bufferRef.current.length >= 60) {
            void sendChunk();
            return;
          }
          scheduleFlush();
        },
      });

      const sid = await startSession();
      if (cancelled || !sid) return;
      sessionIdRef.current = sid;
      void sendChunk(); // flush buffered events as soon as session exists
    })();

    function onHide() {
      void sendChunk({ keepalive: true });
    }

    window.addEventListener("pagehide", onHide);
    window.addEventListener("beforeunload", onHide);

    return () => {
      cancelled = true;
      window.removeEventListener("pagehide", onHide);
      window.removeEventListener("beforeunload", onHide);
      if (flushTimer.current) {
        window.clearTimeout(flushTimer.current);
        flushTimer.current = null;
      }
      try {
        stop?.();
      } catch {
        // ignore
      }
    };
  }, [enabled, linkId]);

  return null;
}

