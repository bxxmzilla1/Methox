import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { VisitorTracker } from "@/components/VisitorTracker";
import { RedirectAfterTrack } from "@/components/RedirectAfterTrack";
import { PublicLanding } from "@/components/PublicLanding";
import { RESERVED_SLUGS } from "@/lib/constants";
import { coerceLandingCards, coerceLandingHeroFocus, slugToDisplayName } from "@/lib/landing-data";
import { publicScreenshotUrl } from "@/lib/storage";
import { landingBioFromRow } from "@/lib/link-bio";

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
  const { data: row } = await supabase.from("links").select("*").eq("slug", slug).single();

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

  const heroPath =
    (row.hero_image_path as string | null | undefined) ?? (row.screenshot_path as string | null) ?? null;
  const heroUrl = publicScreenshotUrl(heroPath);
  const heroFocus = coerceLandingHeroFocus(row.landing_hero_focus);
  const cards = coerceLandingCards(row.landing_cards);
  const publicBio = landingBioFromRow(row as Record<string, unknown>);

  return (
    <>
      <VisitorTracker linkId={linkId} />
      <PublicLanding
        slug={row.slug as string}
        linkId={linkId}
        displayName={(row.display_name as string) ?? ""}
        handle={(row.handle as string) ?? ""}
        bio={publicBio}
        heroUrl={heroUrl}
        heroFocus={heroFocus}
        cards={cards}
      />
    </>
  );
}
