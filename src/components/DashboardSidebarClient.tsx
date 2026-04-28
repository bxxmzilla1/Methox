"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { LinkStats } from "@/lib/stats";
import { publicScreenshotUrl } from "@/lib/storage";
import { CopyLinkButton } from "@/components/CopyLinkButton";
import { DeleteLinkButton } from "@/components/DeleteLinkButton";
import { CountryChart } from "@/components/CountryChart";
import { ScreenshotLightbox } from "@/components/ScreenshotLightbox";

export type DashboardLinkRow = {
  id: string;
  slug: string;
  username: string;
  bio: string;
  screenshot_path: string | null;
  created_at: string;
};

type Props = {
  links: DashboardLinkRow[];
  statsByLinkId: Record<string, LinkStats>;
  siteBase: string;
};

export function DashboardSidebarClient({ links, statsByLinkId, siteBase }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(links[0]?.id ?? null);

  useEffect(() => {
    if (!links.length) {
      setSelectedId(null);
      return;
    }
    setSelectedId((prev) => (prev && links.some((l) => l.id === prev) ? prev : links[0].id));
  }, [links]);

  const selected = useMemo(
    () => links.find((l) => l.id === selectedId) ?? null,
    [links, selectedId]
  );

  const stats = selected ? statsByLinkId[selected.id] : undefined;
  const shotUrl = selected ? publicScreenshotUrl(selected.screenshot_path) : null;
  const publicUrl = selected
    ? siteBase
      ? `${siteBase}/${selected.slug}`
      : `/${selected.slug}`
    : "";

  if (!links.length) return null;

  return (
    <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
      {/* Sidebar */}
      <aside className="flex shrink-0 flex-col border-b border-zinc-200/90 bg-white lg:w-80 lg:border-b-0 lg:border-r xl:w-[20rem]">
        <div className="border-b border-zinc-100 px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-400">
            Your links
          </p>
          <p className="text-xs text-zinc-500">{links.length} total</p>
        </div>
        <nav className="flex max-h-[42vh] gap-2 overflow-x-auto overflow-y-auto p-3 lg:max-h-none lg:flex-col lg:gap-1 lg:overflow-x-visible">
          {links.map((link) => {
            const s = statsByLinkId[link.id];
            const thumb = publicScreenshotUrl(link.screenshot_path);
            const active = link.id === selectedId;
            return (
              <button
                key={link.id}
                type="button"
                onClick={() => setSelectedId(link.id)}
                className={`flex w-full min-w-[200px] shrink-0 items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition lg:min-w-0 ${
                  active
                    ? "border-emerald-200 bg-emerald-50/90 shadow-sm shadow-emerald-900/5 ring-1 ring-emerald-500/15"
                    : "border-transparent bg-zinc-50/50 hover:border-zinc-200 hover:bg-white"
                }`}
              >
                <div className="relative h-14 w-11 shrink-0 overflow-hidden rounded-xl bg-zinc-100 ring-1 ring-zinc-200/80">
                  {thumb ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={thumb} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-[10px] text-zinc-400">
                      —
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-zinc-900">/{link.slug}</p>
                  <p className="text-xs text-zinc-500">
                    {s ? (
                      <>
                        {s.totalClicks} visits · {s.uniqueVisitors} uniques
                      </>
                    ) : (
                      "No visits yet"
                    )}
                  </p>
                </div>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Detail */}
      {selected && (
        <section className="relative flex min-h-0 flex-1 flex-col overflow-y-auto">
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(16,185,129,0.12),transparent)]"
            aria-hidden
          />
          <div className="relative flex flex-1 flex-col gap-8 p-5 sm:p-8 lg:p-10">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl">
                  <span className="text-emerald-600">/</span>
                  {selected.slug}
                </h2>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {selected.username?.trim() && (
                    <span className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-700 shadow-sm">
                      <span className="text-zinc-500">Target model</span> ·{" "}
                      {selected.username.trim()}
                    </span>
                  )}
                  {stats && (
                    <span className="rounded-full border border-emerald-100 bg-emerald-50/80 px-3 py-1 text-xs font-medium text-emerald-900">
                      {stats.totalClicks} visits · {stats.uniqueVisitors} uniques
                    </span>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <CopyLinkButton url={publicUrl} />
                <Link
                  href={`/${selected.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-800 shadow-sm transition hover:bg-zinc-50"
                >
                  Open
                </Link>
                <Link
                  href={`/dashboard/${encodeURIComponent(selected.slug)}/edit`}
                  className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-800 shadow-sm transition hover:bg-zinc-50"
                >
                  Edit
                </Link>
                <DeleteLinkButton linkId={selected.id} />
              </div>
            </div>

            <div className="grid flex-1 gap-8 lg:grid-cols-[minmax(0,320px)_1fr] lg:items-start xl:grid-cols-[minmax(0,360px)_1fr] xl:gap-12">
              {/* Screenshot hero */}
              <div className="flex justify-center lg:justify-start">
                <div className="relative w-full max-w-[280px]">
                  <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-emerald-200/30 via-teal-100/20 to-transparent blur-2xl" />
                  <div className="relative rounded-[2rem] bg-gradient-to-b from-white to-zinc-50 p-4 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.12)] ring-1 ring-zinc-200/80">
                    {shotUrl ? (
                      <ScreenshotLightbox
                        src={shotUrl}
                        thumbClassName="relative mx-auto aspect-[9/16] w-full max-w-[240px] overflow-hidden rounded-2xl bg-zinc-100 shadow-inner ring-1 ring-black/5"
                      />
                    ) : (
                      <div className="flex aspect-[9/16] w-full max-w-[240px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-zinc-200 bg-zinc-50/80 text-center text-sm text-zinc-400">
                        No screenshot
                      </div>
                    )}
                    <p className="mt-3 text-center text-[11px] font-medium text-zinc-400">
                      Tap to view full screen
                    </p>
                  </div>
                </div>
              </div>

              {/* Content stack */}
              <div className="flex min-w-0 flex-col gap-6">
                <div className="rounded-2xl border border-zinc-200/90 bg-white/90 p-6 shadow-sm backdrop-blur-sm">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-emerald-600/90">
                    Bio
                  </p>
                  <p className="mt-3 max-h-48 overflow-y-auto text-base leading-relaxed whitespace-pre-wrap text-zinc-700">
                    {selected.bio?.trim() ? (
                      selected.bio
                    ) : (
                      <span className="text-zinc-400">No bio yet.</span>
                    )}
                  </p>
                </div>

                {stats && stats.countries.length > 0 && (
                  <CountryChart items={stats.countries} totalClicks={stats.totalClicks} />
                )}
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
