"use client";

import type { ImageFocus, LandingCard } from "@/lib/landing-data";
import { DEFAULT_IMAGE_FOCUS, focusToObjectPosition, slugToDisplayName } from "@/lib/landing-data";
import { applyGeoPlaceholders, type ViewerGeo } from "@/lib/ipinfo";
import { cardGradientClass, type PlatformId } from "@/lib/platforms";
import { publicScreenshotUrl } from "@/lib/storage";
import { useEffect, useMemo, useState } from "react";

function formatHandle(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  return t.startsWith("@") ? t : `@${t}`;
}

function PlatformGlyph({ platform }: { platform: string }) {
  const p = platform as PlatformId;
  const common = "h-6 w-6";
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
  bio: string;
  heroUrl: string | null;
  heroFocus?: ImageFocus | null;
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
  bio,
  heroUrl,
  heroFocus,
  cards,
  embedded = false,
  isPreview = false,
}: PublicLandingProps) {
  const [viewerGeo, setViewerGeo] = useState<ViewerGeo | null>(null);

  useEffect(() => {
    if (embedded || isPreview) return;
    let cancelled = false;
    fetch("/api/viewer-geo")
      .then((r) => r.json() as Promise<ViewerGeo>)
      .then((data) => {
        if (cancelled) return;
        if (data.country || data.city) setViewerGeo(data);
        else setViewerGeo(null);
      })
      .catch(() => {
        if (!cancelled) setViewerGeo(null);
      });
    return () => {
      cancelled = true;
    };
  }, [embedded, isPreview]);

  const heroPos = focusToObjectPosition(heroFocus ?? DEFAULT_IMAGE_FOCUS);
  const name = displayName.trim() || slugToDisplayName(slug);
  const handleText = formatHandle(handle);
  const bioResolved = useMemo(
    () => applyGeoPlaceholders(bio.trim(), viewerGeo),
    [bio, viewerGeo]
  );
  // Order is list order: first card is always the taller “featured” bar (no UI toggle).
  const top = cards[0];
  const rest = cards.slice(1);

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
            ? /* ~upper half of a 9:16 frame at typical preview width (scales with phone column) */
              "relative aspect-[9/8] w-full overflow-hidden bg-zinc-900"
            : "relative h-[min(42vh,420px)] w-full overflow-hidden bg-zinc-900"
        }
      >
        {heroUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={heroUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            style={{ objectPosition: heroPos }}
          />
        ) : (
          <div className={`absolute inset-0 ${cardGradientClass("other")}`} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent" />
      </div>

      <div
        className={
          embedded
            ? "relative z-10 -mt-[4.25rem] max-w-full px-4 pb-14 pt-1"
            : "relative z-10 -mt-20 px-5 pb-16 pt-2"
        }
      >
        <div
          className={`mx-auto flex flex-col items-center text-center ${embedded ? "max-w-full" : "max-w-md"}`}
        >
          <h1
            className={`flex flex-wrap items-center justify-center gap-1.5 font-bold tracking-tight ${embedded ? "text-[1.65rem] leading-tight" : "text-3xl"}`}
          >
            <span>{name}</span>
            <span className="inline-flex shrink-0 text-blue-500" title="Verified">
              <svg className="h-7 w-7 sm:h-8 sm:w-8" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M12.01 2.011a3.2 3.2 0 0 1 2.113 .797l.154 .145l.698 .698a1.2 1.2 0 0 0 .71 .341l.135 .008h1a3.2 3.2 0 0 1 3.195 3.018l.005 .182v1c0 .27 .092 .533 .258 .743l.09 .1l.697 .698a3.2 3.2 0 0 1 .147 4.382l-.145 .154l-.698 .698a1.2 1.2 0 0 0 -.341 .71l-.008 .135v1a3.2 3.2 0 0 1 -3.018 3.195l-.182 .005h-1a1.2 1.2 0 0 0 -.743 .258l-.1 .09l-.698 .697a3.2 3.2 0 0 1 -4.382 .147l-.154 -.145l-.698 -.698a1.2 1.2 0 0 0 -.71 -.341l-.135 -.008h-1a3.2 3.2 0 0 1 -3.195 -3.018l-.005 -.182v-1a1.2 1.2 0 0 0 -.258 -.743l-.09 -.1l-.697 -.698a3.2 3.2 0 0 1 -.147 -4.382l.145 -.154l.698 -.698a1.2 1.2 0 0 0 .341 -.71l.008 -.135v-1l.005 -.182a3.2 3.2 0 0 1 3.013 -3.013l.182 -.005h1a1.2 1.2 0 0 0 .743 -.258l.1 -.09l.698 -.697a3.2 3.2 0 0 1 2.269 -.944zm3.697 7.282a1 1 0 0 0 -1.414 0l-3.293 3.292l-1.293 -1.292l-.094 -.083a1 1 0 0 0 -1.32 1.497l2 2l.094 .083a1 1 0 0 0 1.32 -.083l4 -4l.083 -.094a1 1 0 0 0 -.083 -1.32z" />
              </svg>
            </span>
          </h1>
          {handleText && <p className="mt-1 text-sm text-zinc-400">{handleText}</p>}

          {bio.trim() && (
            <p
              className={`max-w-prose whitespace-pre-wrap leading-relaxed text-zinc-200 ${embedded ? "mt-4 text-base" : "mt-5 text-base sm:text-lg"}`}
            >
              {bioResolved}
            </p>
          )}
        </div>

        {cards.length > 0 && (
          <div
            className={
              embedded
                ? "mx-auto mt-6 grid max-w-full grid-cols-1 gap-2.5 px-0"
                : "mx-auto mt-10 grid max-w-md grid-cols-1 gap-2.5 px-1"
            }
          >
            {top && (
              <LandingCardLink
                card={top}
                className={
                  embedded
                    ? "h-20 w-full"
                    : "h-[5.25rem] w-full sm:h-24"
                }
                isPreview={isPreview}
              />
            )}
            {rest.map((card, i) => (
              <LandingCardLink
                key={`${card.url}-${i}`}
                card={card}
                className={embedded ? "h-[4.75rem] w-full" : "h-[4.75rem] w-full sm:h-[5.25rem]"}
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
  const cardPos = focusToObjectPosition(card.image_focus ?? DEFAULT_IMAGE_FOCUS);
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
        <img
          src={bgUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          style={{ objectPosition: cardPos }}
        />
      ) : (
        <div className={`absolute inset-0 ${grad}`} />
      )}
      <div className="absolute inset-0 bg-gradient-to-l from-black/65 via-black/35 to-black/80" />
      <div
        className={
          isPreview
            ? "absolute inset-y-0 left-3.5 right-[3.75rem] flex items-center"
            : "absolute inset-y-0 left-3.5 right-[3.75rem] flex items-center sm:left-4 sm:right-[4.25rem]"
        }
      >
        <span
          className={`line-clamp-2 text-left font-bold tracking-tight ${isPreview ? "text-base" : "text-base sm:text-lg"}`}
        >
          {card.label}
        </span>
      </div>
      <div
        className={
          isPreview
            ? "absolute right-2.5 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 ring-1 ring-white/20"
            : "absolute right-2.5 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 ring-1 ring-white/20 sm:right-3 sm:h-12 sm:w-12"
        }
      >
        {card.locked ? (
          <svg className="h-5 w-5 text-white sm:h-6 sm:w-6" viewBox="0 0 24 24" aria-hidden>
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
