import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LinkForm } from "@/components/LinkForm";
import type { LinkRow } from "@/app/actions/links";
import { APP_NAME } from "@/lib/constants";
import { coerceLandingCards, coerceLandingHeroFocus, coerceSocialLinks } from "@/lib/landing-data";
import { landingBioFromRow } from "@/lib/link-bio";

export default async function EditLinkPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug: rawSlug } = await params;
  const slug = decodeURIComponent(rawSlug).toLowerCase();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: row } = await supabase
    .from("links")
    .select("*")
    .eq("slug", slug)
    .eq("user_id", user.id)
    .single();

  if (!row) notFound();

  const r = row as Record<string, unknown>;

  const link: LinkRow = {
    id: row.id as string,
    user_id: row.user_id as string,
    slug: row.slug as string,
    username: (row.username as string) ?? "",
    bio: (row.bio as string) ?? "",
    landing_bio: landingBioFromRow(r),
    screenshot_path: row.screenshot_path,
    hero_image_path: row.hero_image_path ?? null,
    landing_hero_focus: coerceLandingHeroFocus(row.landing_hero_focus),
    destination_url: row.destination_url,
    public_page_mode: row.public_page_mode === "redirect" ? "redirect" : "landing",
    display_name: row.display_name ?? "",
    handle: row.handle ?? "",
    verified: Boolean(row.verified),
    follower_summary: row.follower_summary ?? "",
    social_links: coerceSocialLinks(row.social_links),
    landing_cards: coerceLandingCards(row.landing_cards),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };

  return (
    <div className="mx-auto min-h-full max-w-6xl px-4 py-10 sm:px-6">
      <Link
        href="/dashboard"
        className="text-sm font-medium text-emerald-600 transition hover:text-emerald-700"
      >
        ← Dashboard
      </Link>
      <p className="mt-6 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600/90">
        {APP_NAME}
      </p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900">
        Edit <code className="rounded-lg bg-emerald-50 px-2 py-0.5 text-emerald-800">/{link.slug}</code>
      </h1>

      <div className="mt-8 rounded-2xl border border-zinc-200/90 bg-white p-8 shadow-lg shadow-zinc-200/30">
        <LinkForm mode="edit" link={link} />
      </div>
    </div>
  );
}
