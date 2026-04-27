import Link from "next/link";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/SignOutButton";
import { DeleteLinkButton } from "@/components/DeleteLinkButton";
import { CopyLinkButton } from "@/components/CopyLinkButton";
import { CountryChart } from "@/components/CountryChart";
import { ScreenshotLightbox } from "@/components/ScreenshotLightbox";
import { APP_NAME } from "@/lib/constants";
import { publicScreenshotUrl } from "@/lib/storage";
import { statsForLinks } from "@/lib/stats";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: links } = await supabase
    .from("links")
    .select("id, slug, username, bio, screenshot_path, destination_url, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const ids = (links ?? []).map((l) => l.id);
  let clickRows: { link_id: string; visitor_id: string; country: string }[] | null = null;
  if (ids.length) {
    const { data } = await supabase.from("clicks").select("link_id, visitor_id, country").in("link_id", ids);
    clickRows = data;
  }

  const stats = statsForLinks(clickRows);

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const proto = h.get("x-forwarded-proto") ?? "https";
  const siteBase = (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
    (host ? `${proto}://${host}` : "")
  );

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-10 border-b border-zinc-200/80 bg-white/80 px-6 py-4 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-sm font-semibold text-transparent"
            >
              {APP_NAME}
            </Link>
            <span className="text-zinc-300">/</span>
            <span className="text-sm font-medium text-zinc-600">Dashboard</span>
          </div>
          <SignOutButton />
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Your links</h1>
            <p className="mt-1 text-sm text-zinc-600">
              Paths, bios, screenshots, and visitor analytics.
            </p>
          </div>
          <Link
            href="/dashboard/new"
            className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white shadow-md shadow-emerald-600/20 transition hover:bg-emerald-500"
          >
            New link
          </Link>
        </div>

        {!links?.length ? (
          <p className="mt-12 rounded-2xl border border-dashed border-zinc-200 bg-white/80 px-6 py-14 text-center text-zinc-500 shadow-sm">
            No links yet. Create one to get a page at{" "}
            <code className="rounded-md bg-zinc-100 px-1.5 py-0.5 text-zinc-800">/your-path</code>.
          </p>
        ) : (
          <ul className="mt-8 flex flex-col gap-4">
            {links.map((link) => {
              const s = stats.get(link.id);
              const shotUrl = publicScreenshotUrl(link.screenshot_path);
              const publicUrl = siteBase ? `${siteBase}/${link.slug}` : `/${link.slug}`;
              return (
                <li
                  key={link.id}
                  className="rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-sm shadow-zinc-900/5 transition-shadow hover:shadow-md"
                >
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-stretch">
                    <div className="flex shrink-0 justify-center sm:justify-start">
                      {shotUrl ? (
                        <ScreenshotLightbox
                          src={shotUrl}
                          thumbClassName="relative w-36 overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-100 shadow-md shadow-zinc-900/10 ring-1 ring-zinc-100 sm:w-40 aspect-[9/16]"
                        />
                      ) : (
                        <div className="flex w-36 items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 text-center text-xs leading-snug text-zinc-400 sm:w-40 aspect-[9/16]">
                          No screenshot
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1 space-y-4">
                      <div className="flex flex-wrap items-center gap-2">
                        {link.username?.trim() && (
                          <span className="rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-0.5 text-sm font-medium text-zinc-800">
                            @{link.username.trim()}
                          </span>
                        )}
                        <code className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-sm font-medium text-emerald-800">
                          /{link.slug}
                        </code>
                        <span className="text-xs text-zinc-500">
                          {s ? (
                            <>
                              <span className="font-medium text-zinc-700">{s.totalClicks}</span> visits ·{" "}
                              <span className="font-medium text-zinc-700">{s.uniqueVisitors}</span> uniques
                            </>
                          ) : (
                            "No visits yet"
                          )}
                        </span>
                      </div>
                      {s && s.countries.length > 0 && (
                        <CountryChart items={s.countries} totalClicks={s.totalClicks} />
                      )}
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-widest text-emerald-600/90">
                          Bio
                        </p>
                        <p className="mt-1.5 max-h-32 overflow-y-auto text-sm leading-relaxed whitespace-pre-wrap text-zinc-700">
                          {link.bio?.trim() ? link.bio : (
                            <span className="text-zinc-400">No bio yet.</span>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-wrap gap-2 sm:flex-col sm:justify-start">
                      <CopyLinkButton url={publicUrl} />
                      <Link
                        href={`/${link.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-center text-xs font-medium text-zinc-800 shadow-sm transition hover:bg-zinc-50"
                      >
                        Open
                      </Link>
                      <Link
                        href={`/dashboard/${encodeURIComponent(link.slug)}/edit`}
                        className="rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-center text-xs font-medium text-zinc-800 shadow-sm transition hover:bg-zinc-50"
                      >
                        Edit
                      </Link>
                      <DeleteLinkButton linkId={link.id} />
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}
