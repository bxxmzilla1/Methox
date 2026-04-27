import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/SignOutButton";
import { DeleteLinkButton } from "@/components/DeleteLinkButton";
import { APP_NAME } from "@/lib/constants";
import { statsForLinks } from "@/lib/stats";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: links } = await supabase
    .from("links")
    .select("id, slug, bio, destination_url, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const ids = (links ?? []).map((l) => l.id);
  let clickRows: { link_id: string; visitor_id: string; country: string }[] | null = null;
  if (ids.length) {
    const { data } = await supabase.from("clicks").select("link_id, visitor_id, country").in("link_id", ids);
    clickRows = data;
  }

  const stats = statsForLinks(clickRows);

  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b border-zinc-800 px-6 py-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-sm font-semibold text-emerald-400">
              {APP_NAME}
            </Link>
            <span className="text-zinc-600">/</span>
            <span className="text-sm text-zinc-400">Dashboard</span>
          </div>
          <SignOutButton />
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-white">Your links</h1>
            <p className="mt-1 text-sm text-zinc-400">Paths, bios, screenshots, and visitor analytics.</p>
          </div>
          <Link
            href="/dashboard/new"
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-500"
          >
            New link
          </Link>
        </div>

        {!links?.length ? (
          <p className="mt-12 rounded-xl border border-dashed border-zinc-700 bg-zinc-900/40 px-6 py-12 text-center text-zinc-500">
            No links yet. Create one to get a page at{" "}
            <code className="text-zinc-400">/your-path</code>.
          </p>
        ) : (
          <ul className="mt-8 flex flex-col gap-3">
            {links.map((link) => {
              const s = stats.get(link.id);
              return (
                <li
                  key={link.id}
                  className="flex flex-col gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <code className="rounded bg-zinc-800 px-2 py-0.5 text-sm text-emerald-300">/{link.slug}</code>
                      <span className="text-xs text-zinc-500">
                        {s ? (
                          <>
                            <span className="text-zinc-400">{s.totalClicks}</span> visits ·{" "}
                            <span className="text-zinc-400">{s.uniqueVisitors}</span> uniques
                          </>
                        ) : (
                          "No visits yet"
                        )}
                      </span>
                    </div>
                    {s && s.topCountries.length > 0 && (
                      <p className="mt-1.5 text-xs text-zinc-500">
                        Countries:{" "}
                        {s.topCountries.map((c) => (
                          <span key={c.code} className="mr-2 inline-block text-zinc-400">
                            {c.code} ({c.count})
                          </span>
                        ))}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Link
                      href={`/${link.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg border border-zinc-600 px-3 py-1.5 text-xs font-medium text-zinc-200 transition hover:bg-zinc-800"
                    >
                      Open
                    </Link>
                    <Link
                      href={`/dashboard/${encodeURIComponent(link.slug)}/edit`}
                      className="rounded-lg border border-zinc-600 px-3 py-1.5 text-xs font-medium text-zinc-200 transition hover:bg-zinc-800"
                    >
                      Edit
                    </Link>
                    <DeleteLinkButton linkId={link.id} />
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
