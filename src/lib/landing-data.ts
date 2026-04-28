import { normalizeHttpUrl } from "@/lib/urls";

export type SocialLink = { platform: string; url: string };
export type LandingCard = {
  label: string;
  url: string;
  platform: string;
  featured?: boolean;
  locked?: boolean;
  image_url?: string | null;
};

const MAX_SOCIAL = 12;
const MAX_CARDS = 24;

export function defaultSocialLinks(): SocialLink[] {
  return [];
}

export function defaultLandingCards(): LandingCard[] {
  return [];
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
    let image_url: string | null | undefined = undefined;
    if (rec.image_url != null && String(rec.image_url).trim()) {
      const img = String(rec.image_url).trim().slice(0, 2048);
      const imgNorm = normalizeHttpUrl(img) ?? (img.startsWith("https://") || img.startsWith("http://") ? img : null);
      image_url = imgNorm;
    }
    out.push({ label, url: urlNorm, platform, featured, locked, image_url: image_url ?? null });
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
