"use client";

import type { LandingCard } from "@/lib/landing-data";
import { slugToDisplayName } from "@/lib/landing-data";
import { cardGradientClass, type PlatformId } from "@/lib/platforms";
import { publicScreenshotUrl } from "@/lib/storage";

function formatHandle(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  return t.startsWith("@") ? t : `@${t}`;
}

function PlatformGlyph({ platform }: { platform: string }) {
  const p = platform as PlatformId;
  const common = "h-5 w-5";
  switch (p) {
    case "instagram":
      return (
        <svg className={common} viewBox="0 0 24 24" aria-hidden>
          <defs>
            <linearGradient id="ig" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#f09433" />
              <stop offset="50%" stopColor="#e6683c" />
              <stop offset="100%" stopColor="#bc1888" />
            </linearGradient>
          </defs>
          <rect width="24" height="24" rx="6" fill="url(#ig)" />
          <circle cx="12" cy="12" r="4.25" fill="none" stroke="white" strokeWidth="1.6" />
          <circle cx="17.2" cy="6.8" r="1.2" fill="white" />
        </svg>
      );
    case "tiktok":
      return (
        <svg className={common} viewBox="0 0 24 24" aria-hidden>
          <path
            fill="white"
            d="M14.5 3.5c.2 2.1 1.7 3.8 3.8 4v3.3a7.7 7.7 0 0 1-4.5-1.4v6.4c0 3.4-2.8 6.2-6.2 6.2S1.4 18.2 1.4 14.8s2.8-6.2 6.2-6.2c.6 0 1.2.1 1.8.3v3.7a2.8 2.8 0 1 0-.1 0V7.1A6.15 6.15 0 0 0 0 14.8C0 18.7 3.1 22 7 22s7-3.3 7-7.3V9.7a8.5 8.5 0 0 0 4.9 1.6V8a5.6 5.6 0 0 1-3.4-2.1 5.5 5.5 0 0 1-1-3.4h-3z"
          />
        </svg>
      );
    case "twitter":
      return (
        <svg className={common} viewBox="0 0 24 24" aria-hidden>
          <path
            fill="white"
            d="M18.2 3H21l-6.5 7.4L22 21h-6.3l-4.9-6.4L6.8 21H4l7-8L4 3h6.3l4.4 5.8L18.2 3z"
          />
        </svg>
      );
    case "snapchat":
      return (
        <svg className={common} viewBox="0 0 24 24" aria-hidden>
          <path
            fill="#000"
            d="M12 2C9 2 7.5 4.2 7.5 6.8c0 .8-.2 2.1-1 2.6-.3.2-.9.3-1.4.4-.5.1-1 .2-1.3.5-.4.4-.3 1.1.1 1.5.5.5 1.4.6 2.1.7.2 1.5 1.5 2.8 3 3.2.2.6.3 1.1.1 1.4-.2.4-.8.5-1.2.6l-.4.1c-.4.1-.8.3-.9.7-.1.5.3.9.8 1 1.1.2 2.1.3 3.2.3 1.2 0 2.4-.1 3.6-.4.5-.1.9-.5.8-1-.1-.4-.5-.6-.9-.7l-.4-.1c-.4-.1-1-.2-1.2-.6-.2-.3-.1-.8.1-1.4 1.5-.4 2.8-1.7 3-3.2.7-.1 1.6-.2 2.1-.7.4-.4.5-1.1.1-1.5-.3-.3-.8-.4-1.3-.5-.5-.1-1.1-.2-1.4-.4-.8-.5-1-1.8-1-2.6C16.5 4.2 15 2 12 2z"
          />
        </svg>
      );
    case "threads":
      return (
        <svg className={common} viewBox="0 0 24 24" aria-hidden>
          <path
            fill="white"
            d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm4.2 14.1c-1.3 1.3-3.4 1.4-4.9.4-1.3-.9-2-2.4-2-4.2 0-2.4 1.3-4 3.3-4 1.2 0 2.1.6 2.6 1.6l-1.2.8c-.4-.7-1-.9-1.6-.9-1.2 0-2 1.2-2 2.6 0 2.5 1.7 3.4 3 3.4 1.5 0 2.5-1 2.8-2.4h-2.6v-1.4h4.1c0 .2.1.5.1.8 0 2.1-.9 3.9-2.6 4.9z"
          />
        </svg>
      );
    case "onlyfans":
      return (
        <svg className={common} viewBox="0 0 24 24" aria-hidden>
          <circle cx="12" cy="12" r="10" fill="#00AFF0" />
          <path
            fill="white"
            d="M12 7.5c-1.7 0-3 1.3-3 3v3c0 1.7 1.3 3 3 3s3-1.3 3-3v-3c0-1.7-1.3-3-3-3zm0 1.5c.8 0 1.5.7 1.5 1.5v3c0 .8-.7 1.5-1.5 1.5S10.5 14.3 10.5 13.5v-3c0-.8.7-1.5 1.5-1.5z"
          />
        </svg>
      );
    case "youtube":
      return (
        <svg className={common} viewBox="0 0 24 24" aria-hidden>
          <path
            fill="#FF0033"
            d="M23.5 6.2A3 3 0 0 0 21.4 4c-1.9-.5-9.4-.5-9.4-.5s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 32 32 0 0 0 0 12a32 32 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.2c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.2A32 32 0 0 0 24 12a32 32 0 0 0-.5-5.8zM9.6 15.6V8.4L16 12 9.6 15.6z"
          />
        </svg>
      );
    default:
      return (
        <svg className={common} viewBox="0 0 24 24" aria-hidden>
          <circle cx="12" cy="12" r="9" fill="none" stroke="white" strokeWidth="1.5" />
          <path fill="white" d="M8 12h8M12 8v8" />
        </svg>
      );
  }
}

function cardBackgroundUrl(card: LandingCard): string | null {
  if (card.previewBgUrl) return card.previewBgUrl;
  if (card.image_path) return publicScreenshotUrl(card.image_path);
  if (card.image_url) return card.image_url;
  return null;
}

export type PublicLandingProps = {
  slug: string;
  displayName: string;
  handle: string;
  verified: boolean;
  bio: string;
  heroUrl: string | null;
  cards: LandingCard[];
  /** Shorter layout for dashboard live preview */
  embedded?: boolean;
  /** Block navigation (editor preview) */
  isPreview?: boolean;
};

export function PublicLanding({
  slug,
  displayName,
  handle,
  verified,
  bio,
  heroUrl,
  cards,
  embedded = false,
  isPreview = false,
}: PublicLandingProps) {
  const name = displayName.trim() || slugToDisplayName(slug);
  const handleText = formatHandle(handle);
  const sorted = [...cards].sort((a, b) => Number(b.featured) - Number(a.featured));
  const top = sorted.find((c) => c.featured);
  const rest = top ? sorted.filter((c) => c !== top) : sorted;

  return (
    <div
      className={
        embedded
          ? "min-h-0 rounded-b-[inherit] bg-zinc-950 text-white"
          : "min-h-[100dvh] bg-zinc-950 text-white"
      }
    >
      <div
        className={
          embedded
            ? "relative h-[min(36vh,300px)] w-full overflow-hidden bg-zinc-900"
            : "relative h-[min(42vh,420px)] w-full overflow-hidden bg-zinc-900"
        }
      >
        {heroUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={heroUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className={`absolute inset-0 ${cardGradientClass("other")}`} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent" />
      </div>

      <div className="relative z-10 -mt-20 px-5 pb-16 pt-2">
        <div className="mx-auto flex max-w-md flex-col items-center text-center">
          <h1 className="flex flex-wrap items-center justify-center gap-1.5 text-3xl font-bold tracking-tight">
            <span>{name}</span>
            {verified && (
              <span className="inline-flex text-indigo-400" title="Verified">
                <svg className="h-7 w-7" viewBox="0 0 24 24" aria-hidden>
                  <path
                    fill="currentColor"
                    d="M12 2l2.9 2.1L18 3l1.1 3.1L22 8l-1.1 3.1L22 14l-2.9 1.9L18 21l-3.1-1.1L12 22l-2.9-2.1L6 21l-1.1-3.1L2 14l1.1-3.1L2 8l2.9-1.9L6 3l3.1 1.1L12 2zm5.2 8.6l-6.2 6.2-3.2-3.2 1.4-1.4 1.8 1.8 4.8-4.8 1.4 1.4z"
                  />
                </svg>
              </span>
            )}
          </h1>
          {handleText && <p className="mt-1 text-sm text-zinc-400">{handleText}</p>}

          {bio.trim() && (
            <p className="mt-5 max-w-prose whitespace-pre-wrap text-sm leading-relaxed text-zinc-200">
              {bio.trim()}
            </p>
          )}
        </div>

        {sorted.length > 0 && (
          <div className="mx-auto mt-10 grid max-w-md grid-cols-1 gap-2.5 px-1">
            {top && (
              <LandingCardLink
                card={top}
                className="h-[4.25rem] w-full sm:h-[4.75rem]"
                isPreview={isPreview}
              />
            )}
            {rest.map((card, i) => (
              <LandingCardLink
                key={`${card.url}-${i}`}
                card={card}
                className="h-16 w-full sm:h-[4.25rem]"
                isPreview={isPreview}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function LandingCardLink({
  card,
  className,
  isPreview,
}: {
  card: LandingCard;
  className: string;
  isPreview?: boolean;
}) {
  const grad = cardGradientClass(card.platform);
  const bgUrl = cardBackgroundUrl(card);
  return (
    <a
      href={isPreview ? "#preview" : card.url}
      target={isPreview ? undefined : "_blank"}
      rel={isPreview ? undefined : "noopener noreferrer"}
      onClick={isPreview ? (e) => e.preventDefault() : undefined}
      className={`group relative block overflow-hidden rounded-2xl ring-1 ring-white/10 ${className}`}
    >
      {bgUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={bgUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <div className={`absolute inset-0 ${grad}`} />
      )}
      <div className="absolute inset-0 bg-gradient-to-l from-black/65 via-black/35 to-black/80" />
      <div className="absolute inset-y-0 left-3 right-[3.25rem] flex items-center sm:left-4 sm:right-16">
        <span className="line-clamp-2 text-left text-sm font-bold tracking-tight sm:text-base">
          {card.label}
        </span>
      </div>
      <div className="absolute right-2.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 ring-1 ring-white/20 sm:right-3 sm:h-10 sm:w-10">
        {card.locked ? (
          <svg className="h-4 w-4 text-white sm:h-5 sm:w-5" viewBox="0 0 24 24" aria-hidden>
            <path
              fill="currentColor"
              d="M12 2a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-1V7a5 5 0 0 0-5-5zm-3 8V7a3 3 0 1 1 6 0v3H9z"
            />
          </svg>
        ) : (
          <PlatformGlyph platform={card.platform} />
        )}
      </div>
    </a>
  );
}
