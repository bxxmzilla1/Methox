import { normalizeHttpUrl } from "@/lib/urls";

/** Percentages for CSS object-position (0–100). */
export type ImageFocus = { x: number; y: number };

export const DEFAULT_IMAGE_FOCUS: ImageFocus = { x: 50, y: 50 };

export function clampFocus(f: Partial<ImageFocus> | null | undefined): ImageFocus {
  const x = Number(f?.x);
  const y = Number(f?.y);
  return {
    x: Number.isFinite(x) ? Math.min(100, Math.max(0, x)) : DEFAULT_IMAGE_FOCUS.x,
    y: Number.isFinite(y) ? Math.min(100, Math.max(0, y)) : DEFAULT_IMAGE_FOCUS.y,
  };
}

export function focusToObjectPosition(f: ImageFocus): string {
  const c = clampFocus(f);
  return `${c.x}% ${c.y}%`;
}

export type SocialLink = { platform: string; url: string };
export type LandingCard = {
  label: string;
  url: string;
  platform: string;
  featured?: boolean;
  locked?: boolean;
  /** Pulsing glow on the lock icon (public landing only). */
  locked_glow?: boolean;
  /** Show “Press and Hold to Unlock” under the card label when locked. */
  locked_hint?: boolean;
  /** Storage object path in screenshots bucket (userId/linkId/cards/...) */
  image_path?: string | null;
  /** Legacy external image URL */
  image_url?: string | null;
  /** Focal point for background image (object-position) */
  image_focus?: ImageFocus | null;
  /** Editor / preview only — not persisted */
  previewBgUrl?: string | null;
};

const MAX_SOCIAL = 12;
const MAX_CARDS = 24;

export function defaultSocialLinks(): SocialLink[] {
  return [];
}

export function defaultLandingCards(): LandingCard[] {
  return [];
}

/** First card is always the full-width top bar; others are secondary. */
export function normalizeFeaturedFirst(cards: LandingCard[]): LandingCard[] {
  if (cards.length === 0) return cards;
  return cards.map((c, i) => ({ ...c, featured: i === 0 }));
}

export function parseSocialLinksJson(raw: string): { ok: true; data: SocialLink[] } | { ok: false; error: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw || "[]");
  } catch {
    return { ok: false, error: "Social links must be valid JSON." };
  }
  if (!Array.isArray(parsed)) return { ok: false, error: "Social links must be an array." };
  const out: SocialLink[] = [];
  for (const item of parsed.slice(0, MAX_SOCIAL)) {
    if (!item || typeof item !== "object") continue;
    const rec = item as Record<string, unknown>;
    const platform = String(rec.platform ?? "other").slice(0, 64);
    const urlNorm = normalizeHttpUrl(String(rec.url ?? ""));
    if (!urlNorm) continue;
    out.push({ platform, url: urlNorm });
  }
  return { ok: true, data: out };
}

export function parseLandingCardsJson(raw: string): { ok: true; data: LandingCard[] } | { ok: false; error: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw || "[]");
  } catch {
    return { ok: false, error: "Link cards must be valid JSON." };
  }
  if (!Array.isArray(parsed)) return { ok: false, error: "Link cards must be an array." };
  const out: LandingCard[] = [];
  for (const item of parsed.slice(0, MAX_CARDS)) {
    if (!item || typeof item !== "object") continue;
    const rec = item as Record<string, unknown>;
    const label = String(rec.label ?? "").trim().slice(0, 120);
    const urlNorm = normalizeHttpUrl(String(rec.url ?? ""));
    if (!label || !urlNorm) continue;
    const platform = String(rec.platform ?? "other").slice(0, 64);
    const featured = Boolean(rec.featured);
    const locked = Boolean(rec.locked);
    const locked_glow = Boolean(rec.locked_glow);
    const locked_hint = Boolean(rec.locked_hint);
    let image_url: string | null | undefined = undefined;
    if (rec.image_url != null && String(rec.image_url).trim()) {
      const img = String(rec.image_url).trim().slice(0, 2048);
      const imgNorm = normalizeHttpUrl(img) ?? (img.startsWith("https://") || img.startsWith("http://") ? img : null);
      image_url = imgNorm;
    }
    let image_path: string | null | undefined = undefined;
    if (rec.image_path != null && String(rec.image_path).trim()) {
      const p = String(rec.image_path).trim().slice(0, 512);
      if (!p.includes("..") && /^[a-zA-Z0-9_.\-/]+$/.test(p)) {
        image_path = p;
      }
    }
    let image_focus: ImageFocus | null | undefined = undefined;
    if (rec.image_focus != null && typeof rec.image_focus === "object") {
      const o = rec.image_focus as Record<string, unknown>;
      image_focus = clampFocus({ x: Number(o.x), y: Number(o.y) });
    }
    out.push({
      label,
      url: urlNorm,
      platform,
      featured,
      locked,
      locked_glow,
      locked_hint,
      image_url: image_url ?? null,
      image_path: image_path ?? null,
      image_focus: image_focus ?? null,
    });
  }
  return { ok: true, data: out };
}

export function slugToDisplayName(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function coerceSocialLinks(raw: unknown): SocialLink[] {
  const res = parseSocialLinksJson(typeof raw === "string" ? raw : JSON.stringify(raw ?? []));
  return res.ok ? res.data : [];
}

export function coerceLandingCards(raw: unknown): LandingCard[] {
  const res = parseLandingCardsJson(typeof raw === "string" ? raw : JSON.stringify(raw ?? []));
  return res.ok ? res.data : [];
}

export function parseLandingHeroFocusJson(
  raw: string
): { ok: true; data: ImageFocus } | { ok: false; error: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw || "{}");
  } catch {
    return { ok: false, error: "Hero framing must be valid JSON." };
  }
  if (!parsed || typeof parsed !== "object") {
    return { ok: true, data: DEFAULT_IMAGE_FOCUS };
  }
  const rec = parsed as Record<string, unknown>;
  return { ok: true, data: clampFocus({ x: Number(rec.x), y: Number(rec.y) }) };
}

export function coerceLandingHeroFocus(raw: unknown): ImageFocus {
  const res = parseLandingHeroFocusJson(typeof raw === "string" ? raw : JSON.stringify(raw ?? {}));
  return res.ok ? res.data : DEFAULT_IMAGE_FOCUS;
}
