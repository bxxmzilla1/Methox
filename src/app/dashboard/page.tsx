import Link from "next/link";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/SignOutButton";
import { DashboardSidebarClient } from "@/components/DashboardSidebarClient";
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
    .select("id, slug, username, bio, screenshot_path, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const ids = (links ?? []).map((l) => l.id);
  let clickRows: { link_id: string; visitor_id: string; country: string }[] | null = null;
  if (ids.length) {
    const { data } = await supabase.from("clicks").select("link_id, visitor_id, country").in("link_id", ids);
    clickRows = data;
  }

  const stats = statsForLinks(clickRows);
  const statsByLinkId = Object.fromEntries(stats);

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const proto = h.get("x-forwarded-proto") ?? "https";
  const siteBase = (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
    (host ? `${proto}://${host}` : "")
  );

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <header className="sticky top-0 z-20 shrink-0 border-b border-zinc-200/80 bg-white/85 px-4 py-4 backdrop-blur-md sm:px-6">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4">
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
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/new"
              className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-md shadow-emerald-600/20 transition hover:bg-emerald-500"
            >
              New link
            </Link>
            <SignOutButton />
          </div>
        </div>
      </header>

      {!links?.length ? (
        <main className="mx-auto w-full max-w-lg flex-1 px-6 py-16">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Your links</h1>
          <p className="mt-2 text-sm text-zinc-600">
            Create a link to see it in the sidebar and open its details here.
          </p>
          <p className="mt-10 rounded-2xl border border-dashed border-zinc-200 bg-white/80 px-6 py-14 text-center text-zinc-500 shadow-sm">
            No links yet. Create one to get a page at{" "}
            <code className="rounded-md bg-zinc-100 px-1.5 py-0.5 text-zinc-800">/your-handle</code>.
          </p>
        </main>
      ) : (
        <DashboardSidebarClient
          links={links}
          statsByLinkId={statsByLinkId}
          siteBase={siteBase}
        />
      )}
    </div>
  );
}
