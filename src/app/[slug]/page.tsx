import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { VisitorTracker } from "@/components/VisitorTracker";
import { publicScreenshotUrl } from "@/lib/storage";
import { RESERVED_SLUGS } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function PublicLinkPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug: rawSlug } = await params;
  const slug = decodeURIComponent(rawSlug).toLowerCase();
  if (RESERVED_SLUGS.has(slug)) notFound();

  const supabase = await createClient();
  const { data: link } = await supabase
    .from("links")
    .select("id, slug, bio, screenshot_path, destination_url")
    .eq("slug", slug)
    .single();

  if (!link) notFound();

  const imageUrl = publicScreenshotUrl(link.screenshot_path);

  return (
    <>
      <VisitorTracker linkId={link.id} />
      <div className="flex min-h-full flex-col items-center justify-center px-6 py-16">
        <article className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 shadow-xl shadow-black/40 sm:p-8">
          {imageUrl && (
            <div className="mx-auto mb-6 w-full max-w-[min(100%,15rem)] overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 shadow-lg shadow-black/30 aspect-[9/16]">
              {/* eslint-disable-next-line @next/next/no-img-element -- Supabase public URL; avoids remotePatterns at build */}
              <img src={imageUrl} alt="" className="h-full w-full object-cover" />
            </div>
          )}

          <h2 className="text-xs font-semibold uppercase tracking-widest text-emerald-500/90">Bio</h2>
          <div className="mt-3 whitespace-pre-wrap text-base leading-relaxed text-zinc-200">
            {link.bio?.trim() ? link.bio : <span className="text-zinc-500">No bio yet.</span>}
          </div>

          {link.destination_url && (
            <a
              href={link.destination_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-8 inline-flex w-full items-center justify-center rounded-xl bg-emerald-600 py-3 text-center font-medium text-white transition hover:bg-emerald-500"
            >
              Continue
            </a>
          )}
        </article>
      </div>
    </>
  );
}
