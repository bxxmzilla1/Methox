"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type SessionRow = {
  id: string;
  visitor_id: string;
  first_url: string;
  created_at: string;
  updated_at: string;
};

type ReplayRes = { sessionId: string; events: unknown[] } | { error: string };

export function SessionReplayDashboard({ sessions }: { sessions: SessionRow[] }) {
  const [selected, setSelected] = useState<string | null>(sessions[0]?.id ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<unknown[] | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);

  const selectedSession = useMemo(
    () => (selected ? sessions.find((s) => s.id === selected) ?? null : null),
    [selected, sessions]
  );

  useEffect(() => {
    if (!selected) {
      setEvents(null);
      setError(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/session-recorder/replay/${encodeURIComponent(selected)}`, { cache: "no-store" })
      .then((r) => r.json() as Promise<ReplayRes>)
      .then((data) => {
        if (cancelled) return;
        if ("error" in data) {
          setError(data.error);
          setEvents(null);
          return;
        }
        setEvents(Array.isArray(data.events) ? data.events : []);
      })
      .catch((e) => {
        if (!cancelled) setError(e?.message ? String(e.message) : "Could not load replay.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selected]);

  useEffect(() => {
    if (!containerRef.current) return;
    if (playerRef.current) {
      try {
        playerRef.current.$destroy?.();
      } catch {
        // ignore
      }
      playerRef.current = null;
    }
    if (!selected || !events?.length) return;

    let cancelled = false;
    (async () => {
      const mod = await import("rrweb-player");
      if (cancelled || !containerRef.current) return;
      const Player = (mod as any).default ?? (mod as any);
      containerRef.current.innerHTML = "";
      playerRef.current = new Player({
        target: containerRef.current,
        props: {
          events,
          width: 360,
          autoPlay: false,
        },
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [events, selected]);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)] lg:items-start">
      <div className="rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-zinc-500">Recent sessions</p>
          {selected ? (
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-medium text-zinc-700 transition hover:bg-zinc-100"
            >
              Clear
            </button>
          ) : null}
        </div>

        {!sessions.length ? (
          <p className="mt-3 rounded-xl border border-dashed border-zinc-200 bg-zinc-50/60 px-4 py-6 text-sm text-zinc-600">
            No sessions recorded yet. Visit your public page to generate a replay.
          </p>
        ) : (
          <ul className="mt-3 max-h-[70vh] space-y-2 overflow-y-auto pr-1 [scrollbar-width:thin]">
            {sessions.map((s) => {
              const active = s.id === selected;
              const created = new Date(s.created_at);
              const visitor = String(s.visitor_id ?? "").slice(0, 8);
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(s.id)}
                    className={`w-full rounded-xl border px-3 py-2 text-left transition ${
                      active
                        ? "border-emerald-200 bg-emerald-50 ring-1 ring-emerald-500/10"
                        : "border-zinc-200 bg-white hover:bg-zinc-50"
                    }`}
                  >
                    <p className="truncate text-sm font-medium text-zinc-900">{created.toLocaleString()}</p>
                    <p className="truncate text-xs text-zinc-500">{visitor ? `visitor ${visitor}…` : "visitor"}</p>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-zinc-500">Replay</p>
            <p className="mt-1 text-sm text-zinc-600">
              {!selected
                ? "Select a session on the left."
                : loading
                  ? "Loading…"
                  : error
                    ? "Could not load."
                    : events?.length
                      ? "Ready."
                      : "No events recorded for this session."}
            </p>
            {selectedSession?.first_url ? (
              <p className="mt-1 truncate text-xs text-zinc-500" title={selectedSession.first_url}>
                {selectedSession.first_url}
              </p>
            ) : null}
          </div>
        </div>

        {error ? (
          <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>
        ) : null}

        <div className="mt-4 flex justify-center">
          <div
            ref={containerRef}
            className="w-full max-w-[420px] overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50"
          >
            {!(selected && events?.length) ? (
              <div className="flex min-h-64 items-center justify-center px-6 py-10 text-center text-sm text-zinc-500">
                {!selected ? "Pick a session to preview." : loading ? "Loading replay…" : "No replay data yet."}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

