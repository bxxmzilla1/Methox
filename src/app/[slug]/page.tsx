import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { VisitorTracker } from "@/components/VisitorTracker";
import { RedirectAfterTrack } from "@/components/RedirectAfterTrack";
import { PublicLanding } from "@/components/PublicLanding";
import { RESERVED_SLUGS } from "@/lib/constants";
import { coerceLandingCards, coerceSocialLinks, slugToDisplayName } from "@/lib/landing-data";
import { publicScreenshotUrl } from "@/lib/storage";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug: rawSlug } = await params;
  const slug = decodeURIComponent(rawSlug).toLowerCase();
  if (RESERVED_SLUGS.has(slug)) return { title: "Not found" };

  const supabase = await createClient();
  const { data: row } = await supabase
    .from("links")
    .select("display_name, slug")
    .eq("slug", slug)
    .single();

  if (!row) return { title: "Not found" };

  const title = (row.display_name as string | null)?.trim() || slugToDisplayName(row.slug as string);
  return { title: `${title} · Flinky.Bio` };
}

export default async function PublicLinkPage({ params }: PageProps) {
  const { slug: rawSlug } = await params;
  const slug = decodeURIComponent(rawSlug).toLowerCase();
  if (RESERVED_SLUGS.has(slug)) notFound();

  const supabase = await createClient();
  const { data: row } = await supabase
    .from("links")
    .select(
      "id, slug, bio, screenshot_path, destination_url, public_page_mode, display_name, handle, verified, follower_summary, social_links, landing_cards"
    )
    .eq("slug", slug)
    .single();

  if (!row) notFound();

  const linkId = row.id as string;
  const mode = row.public_page_mode === "redirect" ? "redirect" : "landing";
  const destinationUrl = row.destination_url as string | null;

  if (mode === "redirect") {
    if (!destinationUrl) {
      return (
        <>
          <VisitorTracker linkId={linkId} />
          <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-zinc-950 px-6 text-center">
            <p className="text-sm text-zinc-400">This page is not configured with a redirect URL yet.</p>
          </div>
        </>
      );
    }
    return <RedirectAfterTrack linkId={linkId} href={destinationUrl} />;
  }

  const heroUrl = publicScreenshotUrl((row.screenshot_path as string | null) ?? null);
  const socialLinks = coerceSocialLinks(row.social_links);
  const cards = coerceLandingCards(row.landing_cards);

  return (
    <>
      <VisitorTracker linkId={linkId} />
      <PublicLanding
        slug={row.slug as string}
        displayName={(row.display_name as string) ?? ""}
        handle={(row.handle as string) ?? ""}
        verified={Boolean(row.verified)}
        followerSummary={(row.follower_summary as string) ?? ""}
        bio={(row.bio as string) ?? ""}
        heroUrl={heroUrl}
        socialLinks={socialLinks}
        cards={cards}
      />
    </>
  );
}
