import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { VisitorTracker } from "@/components/VisitorTracker";
import { RESERVED_SLUGS } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function PublicLinkPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug: rawSlug } = await params;
  const slug = decodeURIComponent(rawSlug).toLowerCase();
  if (RESERVED_SLUGS.has(slug)) notFound();

  const supabase = await createClient();
  const { data: link } = await supabase.from("links").select("id").eq("slug", slug).single();

  if (!link) notFound();

  return (
    <>
      <VisitorTracker linkId={link.id} />
      <div className="flex min-h-full flex-1 flex-col items-center justify-center bg-white px-6 py-16 text-neutral-500">
        <p className="text-lg font-medium tracking-wide text-neutral-400">coming soon...</p>
      </div>
    </>
  );
}
