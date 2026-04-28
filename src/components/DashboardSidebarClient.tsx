"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { updateDashboardLinkProfile } from "@/app/actions/links";
import type { LinkStats } from "@/lib/stats";
import { publicScreenshotUrl } from "@/lib/storage";
import { CopyLinkButton } from "@/components/CopyLinkButton";
import { DeleteLinkButton } from "@/components/DeleteLinkButton";
import { CountryChart } from "@/components/CountryChart";
import { ScreenshotLightbox } from "@/components/ScreenshotLightbox";

export type DashboardLinkRow = {
  id: string;
  slug: string;
  bio: string;
  screenshot_path: string | null;
  hero_image_path?: string | null;
  public_page_mode?: string | null;
  created_at: string;
};

type Props = {
  links: DashboardLinkRow[];
  statsByLinkId: Record<string, LinkStats>;
  siteBase: string;
};

const fieldClass =
  "w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none ring-emerald-500/0 transition placeholder:text-zinc-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20";

export function DashboardSidebarClient({ links, statsByLinkId, siteBase }: Props) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(links[0]?.id ?? null);

  const [draftSlug, setDraftSlug] = useState("");
  const [draftBio, setDraftBio] = useState("");
  const [dashFile, setDashFile] = useState<File | null>(null);
  const [dashPreviewUrl, setDashPreviewUrl] = useState<string | null>(null);
  const [clearDashShot, setClearDashShot] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

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

  useEffect(() => {
    if (!selected) return;
    setDraftSlug(selected.slug);
    setDraftBio(selected.bio ?? "");
    setDashFile(null);
    setClearDashShot(false);
    setFormError(null);
  }, [selected?.id, selected?.slug, selected?.bio, selected?.screenshot_path]);

  useEffect(() => {
    if (!dashFile) {
      setDashPreviewUrl(null);
      return;
    }
    const u = URL.createObjectURL(dashFile);
    setDashPreviewUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [dashFile]);

  const stats = selected ? statsByLinkId[selected.id] : undefined;

  const savedShotUrl = selected ? publicScreenshotUrl(selected.screenshot_path) : null;
  const displayShotUrl = clearDashShot ? null : (dashPreviewUrl ?? savedShotUrl);

  const publicUrl = selected
    ? siteBase
      ? `${siteBase}/${selected.slug}`
      : `/${selected.slug}`
    : "";

  async function onSaveDashboard(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selected) return;
    setFormError(null);
    setSaving(true);
    const fd = new FormData();
    fd.append("link_id", selected.id);
    fd.append("current_slug", selected.slug);
    fd.append("slug", draftSlug.trim().toLowerCase());
    fd.append("bio", draftBio);
    if (clearDashShot) fd.append("clear_dashboard_screenshot", "1");
    if (dashFile && dashFile.size > 0) fd.append("dashboard_screenshot", dashFile, dashFile.name);

    try {
      const res = await updateDashboardLinkProfile(fd);
      if ("error" in res && res.error) {
        setFormError(res.error);
        setSaving(false);
        return;
      }
      setDashFile(null);
      setClearDashShot(false);
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setFormError(`Could not save: ${msg || "Network error"}`);
    } finally {
      setSaving(false);
    }
  }

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
            const thumb = publicScreenshotUrl(link.screenshot_path ?? link.hero_image_path ?? null);
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
                  <p className="flex flex-wrap items-center gap-2 truncate font-semibold text-zinc-900">
                    <span className="truncate">/{link.slug}</span>
                    {link.public_page_mode === "redirect" ? (
                      <span className="shrink-0 rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800 ring-1 ring-amber-200/80">
                        Redirect
                      </span>
                    ) : null}
                  </p>
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
          <div className="relative flex flex-1 flex-col gap-6 p-5 sm:p-8 lg:p-10">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-400">
                  Dashboard (path & preview)
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  Separate from the public landing editor (hero & link cards). Use <strong>Edit</strong> for those.
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
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
                  Edit landing
                </Link>
                <DeleteLinkButton linkId={selected.id} />
              </div>
            </div>

            <form
              onSubmit={(e) => void onSaveDashboard(e)}
              className="flex flex-1 flex-col gap-8"
            >
              <div className="grid flex-1 gap-8 lg:grid-cols-[minmax(0,320px)_1fr] lg:items-start xl:grid-cols-[minmax(0,360px)_1fr] xl:gap-12">
                <div className="flex flex-col gap-3 lg:justify-start">
                  <div className="flex justify-center lg:justify-start">
                    <div className="relative w-full max-w-[280px]">
                      <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-emerald-200/30 via-teal-100/20 to-transparent blur-2xl" />
                      <div className="relative rounded-[2rem] bg-gradient-to-b from-white to-zinc-50 p-4 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.12)] ring-1 ring-zinc-200/80">
                        {displayShotUrl ? (
                          <ScreenshotLightbox
                            src={displayShotUrl}
                            thumbClassName="relative mx-auto aspect-[9/16] w-full max-w-[240px] overflow-hidden rounded-2xl bg-zinc-100 shadow-inner ring-1 ring-black/5"
                          />
                        ) : (
                          <div className="flex aspect-[9/16] w-full max-w-[240px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-zinc-200 bg-zinc-50/80 text-center text-sm text-zinc-400">
                            No dashboard preview
                          </div>
                        )}
                        <p className="mt-3 text-center text-[11px] font-medium text-zinc-400">
                          Tap image to view full screen
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="mx-auto w-full max-w-[280px] space-y-2 lg:mx-0">
                    <label className="block text-xs font-medium text-zinc-600">
                      Dashboard preview image
                      <input
                        type="file"
                        accept="image/*"
                        className="mt-1.5 block w-full text-xs text-zinc-600 file:mr-2 file:cursor-pointer file:rounded-lg file:border-0 file:bg-zinc-200 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-zinc-800 hover:file:bg-zinc-300"
                        onChange={(e) => {
                          const f = e.target.files?.[0] ?? null;
                          setDashFile(f);
                          setClearDashShot(false);
                        }}
                      />
                    </label>
                    {(selected.screenshot_path || dashFile) && !clearDashShot ? (
                      <button
                        type="button"
                        onClick={() => {
                          setClearDashShot(true);
                          setDashFile(null);
                        }}
                        className="text-xs font-medium text-red-600 hover:underline"
                      >
                        Remove preview image
                      </button>
                    ) : null}
                    {clearDashShot ? (
                      <p className="text-xs text-amber-700">Preview will be removed when you save.</p>
                    ) : null}
                  </div>
                </div>

                <div className="flex min-w-0 flex-col gap-5">
                  <div>
                    <label htmlFor={`dash-slug-${selected.id}`} className="text-xs font-medium text-zinc-600">
                      Path after your domain
                    </label>
                    <div className="mt-1.5 flex items-center gap-1 rounded-xl border border-zinc-200 bg-white px-3 py-2 ring-emerald-500/0 transition focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20">
                      <span className="shrink-0 text-lg font-semibold text-emerald-600">/</span>
                      <input
                        id={`dash-slug-${selected.id}`}
                        value={draftSlug}
                        onChange={(e) => setDraftSlug(e.target.value)}
                        autoComplete="off"
                        className="min-w-0 flex-1 border-0 bg-transparent py-1 text-lg font-semibold tracking-tight text-zinc-900 outline-none"
                        placeholder="your-handle"
                      />
                    </div>
                    {siteBase ? (
                      <p className="mt-1 text-xs text-zinc-500">
                        Live URL:{" "}
                        <code className="rounded bg-zinc-100 px-1 py-0.5 text-zinc-700">
                          {siteBase}/{draftSlug.trim() || "…"}
                        </code>
                      </p>
                    ) : null}
                  </div>

                  <div>
                    <label htmlFor={`dash-bio-${selected.id}`} className="text-xs font-medium text-zinc-600">
                      Bio
                    </label>
                    <p className="mt-0.5 text-[11px] text-zinc-500">
                      Edited here only — not in the landing editor. Still the same bio shown on your public page.
                    </p>
                    <textarea
                      id={`dash-bio-${selected.id}`}
                      value={draftBio}
                      onChange={(e) => setDraftBio(e.target.value)}
                      rows={6}
                      placeholder="Short bio…"
                      className={`${fieldClass} mt-1.5 resize-y`}
                    />
                  </div>

                  {formError ? (
                    <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                      {formError}
                    </p>
                  ) : null}

                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full max-w-xs rounded-xl bg-emerald-600 px-4 py-3 text-sm font-medium text-white shadow-md shadow-emerald-600/20 transition hover:bg-emerald-500 disabled:opacity-50 sm:w-auto"
                  >
                    {saving ? "Saving…" : "Save path, bio & preview"}
                  </button>
                </div>
              </div>

              {stats && stats.countries.length > 0 && (
                <CountryChart items={stats.countries} totalClicks={stats.totalClicks} />
              )}
            </form>
          </div>
        </section>
      )}
    </div>
  );
}
