import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { APP_NAME } from "@/lib/constants";
import { SessionReplayDashboard } from "@/components/SessionReplayDashboard";

export default async function SessionsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug: rawSlug } = await params;
  const slug = decodeURIComponent(rawSlug).toLowerCase();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: linkRow } = await supabase
    .from("links")
    .select("id, slug")
    .eq("slug", slug)
    .eq("user_id", user.id)
    .single();

  if (!linkRow) notFound();

  const linkId = linkRow.id as string;

  const { data: sessions } = await supabase
    .from("session_replays")
    .select("id, visitor_id, first_url, created_at, updated_at")
    .eq("link_id", linkId)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="mx-auto min-h-full max-w-6xl px-4 py-10 sm:px-6">
      <Link
        href="/dashboard"
        className="text-sm font-medium text-emerald-600 transition hover:text-emerald-700"
      >
        ← Dashboard
      </Link>

      <p className="mt-6 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600/90">{APP_NAME}</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900">
        Session Recorder <span className="text-zinc-400">/</span>{" "}
        <code className="rounded-lg bg-emerald-50 px-2 py-0.5 text-emerald-800">/{linkRow.slug as string}</code>
      </h1>
      <p className="mt-2 text-sm text-zinc-600">
        Replays show viewer interactions (clicks, scrolls, taps, navigation) on your public page.
      </p>

      <div className="mt-8">
        <SessionReplayDashboard
          sessions={(sessions ?? []).map((s) => ({
            id: String(s.id),
            visitor_id: String(s.visitor_id ?? ""),
            first_url: String(s.first_url ?? ""),
            created_at: String(s.created_at),
            updated_at: String(s.updated_at),
          }))}
        />
      </div>
    </div>
  );
}

