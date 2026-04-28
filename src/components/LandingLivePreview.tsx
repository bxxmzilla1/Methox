"use client";

import { PublicLanding } from "@/components/PublicLanding";
import type { ImageFocus, LandingCard } from "@/lib/landing-data";

type Props = {
  slug: string;
  displayName: string;
  handle: string;
  bio: string;
  heroUrl: string | null;
  heroFocus: ImageFocus;
  cards: LandingCard[];
};

export function LandingLivePreview({
  slug,
  displayName,
  handle,
  bio,
  heroUrl,
  heroFocus,
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
      {/* Classic full-screen phone portrait (e.g. 9 : 16) */}
      <div className="flex justify-center">
        <div className="mx-auto w-[min(320px,calc(100vw-2rem))] max-h-[min(92vh,820px)] shrink-0 overflow-hidden rounded-[2.25rem] border border-zinc-200 bg-zinc-950 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.35)] ring-1 ring-black/5 [aspect-ratio:9/16]">
          <div className="h-full min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain">
            <PublicLanding
              slug={slug}
            displayName={displayName}
            handle={handle}
            bio={bio}
              heroUrl={heroUrl}
              heroFocus={heroFocus}
              cards={cards}
              embedded
              isPreview
            />
          </div>
        </div>
      </div>
    </aside>
  );
}
