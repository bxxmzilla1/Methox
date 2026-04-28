"use client";

import { PublicLanding } from "@/components/PublicLanding";
import type { LandingCard } from "@/lib/landing-data";

type Props = {
  slug: string;
  displayName: string;
  handle: string;
  verified: boolean;
  bio: string;
  heroUrl: string | null;
  cards: LandingCard[];
};

export function LandingLivePreview({
  slug,
  displayName,
  handle,
  verified,
  bio,
  heroUrl,
  cards,
}: Props) {
  return (
    <aside className="flex flex-col gap-3 lg:sticky lg:top-6">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">Live preview</p>
        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-600">
          Updates as you type
        </span>
      </div>
      <div className="overflow-hidden rounded-[1.75rem] border border-zinc-200 bg-zinc-950 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.35)] ring-1 ring-black/5">
        <div className="max-h-[min(85vh,820px)] overflow-y-auto overflow-x-hidden overscroll-contain">
          <PublicLanding
            slug={slug}
            displayName={displayName}
            handle={handle}
            verified={verified}
            bio={bio}
            heroUrl={heroUrl}
            cards={cards}
            embedded
            isPreview
          />
        </div>
      </div>
    </aside>
  );
}
