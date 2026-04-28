"use server";

import { createClient } from "@/lib/supabase/server";
import { isValidSlug } from "@/lib/constants";
import { revalidatePath } from "next/cache";
import {
  coerceLandingCards,
  parseLandingCardsJson,
  parseSocialLinksJson,
  type LandingCard,
  type SocialLink,
} from "@/lib/landing-data";
import { uploadHeroScreenshot, uploadLinkCardImage } from "@/lib/storage-upload";
import { normalizeHttpUrl } from "@/lib/urls";

export type LinkRow = {
  id: string;
  user_id: string;
  slug: string;
  username: string;
  bio: string;
  screenshot_path: string | null;
  destination_url: string | null;
  public_page_mode: "landing" | "redirect";
  display_name: string;
  handle: string;
  verified: boolean;
  follower_summary: string;
  social_links: SocialLink[];
  landing_cards: LandingCard[];
  created_at: string;
  updated_at: string;
};

function readPageMode(formData: FormData): "landing" | "redirect" {
  const v = String(formData.get("public_page_mode") ?? "landing").toLowerCase();
  return v === "redirect" ? "redirect" : "landing";
}

function readLandingPayload(formData: FormData) {
  const socialRaw = String(formData.get("social_links_json") ?? "[]");
  const cardsRaw = String(formData.get("landing_cards_json") ?? "[]");
  const social = parseSocialLinksJson(socialRaw);
  if (!social.ok) return { error: social.error as string };
  const cards = parseLandingCardsJson(cardsRaw);
  if (!cards.ok) return { error: cards.error as string };
  return {
    social_links: social.data,
    landing_cards: cards.data,
  };
}

function cardImagePrefix(userId: string, linkId: string) {
  return `${userId}/${linkId}/cards/`;
}

function safeCardImagePath(userId: string, linkId: string, p: string | null | undefined): string | null {
  if (!p || !String(p).trim()) return null;
  const prefix = cardImagePrefix(userId, linkId);
  const s = String(p).trim();
  if (s.includes("..") || !s.startsWith(prefix)) return null;
  return s.slice(0, 512);
}

function stripCardForInsert(c: LandingCard): LandingCard {
  return {
    label: c.label,
    url: c.url,
    platform: c.platform,
    featured: c.featured,
    locked: c.locked,
    image_path: null,
    image_url: null,
  };
}

async function applyLandingCardImages(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  linkId: string,
  formData: FormData,
  cards: LandingCard[],
  previousCards: LandingCard[] | null
): Promise<{ ok: true; cards: LandingCard[] } | { ok: false; message: string }> {
  const prev = previousCards ?? [];
  const next: LandingCard[] = cards.map((c) => ({
    ...c,
    image_path: safeCardImagePath(userId, linkId, c.image_path ?? null),
    image_url: c.image_url ?? null,
  }));

  for (let i = 0; i < next.length; i++) {
    if (formData.get(`card_clear_image_${i}`) === "1") {
      const old =
        next[i].image_path ?? safeCardImagePath(userId, linkId, prev[i]?.image_path ?? null);
      if (old) {
        await supabase.storage.from("screenshots").remove([old]).catch(() => undefined);
      }
      next[i] = { ...next[i], image_path: null, image_url: null };
      continue;
    }
    const file = formData.get(`card_image_${i}`);
    if (file instanceof File && file.size > 0) {
      const old =
        next[i].image_path ?? safeCardImagePath(userId, linkId, prev[i]?.image_path ?? null);
      const up = await uploadLinkCardImage(supabase, userId, linkId, i, file);
      if (!up.ok) return { ok: false, message: `Card ${i + 1} image: ${up.message}` };
      if (old && old !== up.path) {
        await supabase.storage.from("screenshots").remove([old]).catch(() => undefined);
      }
      next[i] = { ...next[i], image_path: up.path, image_url: null };
    }
  }

  for (let i = 0; i < next.length; i++) {
    if (formData.get(`card_clear_image_${i}`) === "1") continue;
    if (next[i].image_path) continue;
    const keep = safeCardImagePath(userId, linkId, prev[i]?.image_path ?? null);
    if (keep) {
      next[i] = {
        ...next[i],
        image_path: keep,
        image_url: next[i].image_url ?? prev[i]?.image_url ?? null,
      };
    }
  }

  return { ok: true, cards: next };
}

async function rollbackNewLink(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  linkId: string,
  screenshotPath: string | null
) {
  if (screenshotPath) {
    await supabase.storage.from("screenshots").remove([screenshotPath]).catch(() => undefined);
  }
  await supabase.from("links").delete().eq("id", linkId).eq("user_id", userId);
}

export async function createLink(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in required." };

  const slug = String(formData.get("slug") ?? "").trim().toLowerCase();
  const bio = String(formData.get("bio") ?? "");
  const destinationRaw = String(formData.get("destination_url") ?? "").trim();
  const destinationNorm = normalizeHttpUrl(destinationRaw);
  const public_page_mode = readPageMode(formData);

  if (public_page_mode === "redirect") {
    if (!destinationNorm) {
      return { error: "Redirect mode requires a valid http(s) destination URL." };
    }
  }

  const destination_url = destinationNorm;

  const display_name = String(formData.get("display_name") ?? "").trim().slice(0, 120);
  const handle = String(formData.get("handle") ?? "").trim().slice(0, 120);
  const verified = String(formData.get("verified") ?? "") === "on";
  const follower_summary = String(formData.get("follower_summary") ?? "").trim().slice(0, 160);

  const payload = readLandingPayload(formData);
  if ("error" in payload) return { error: payload.error };

  if (!isValidSlug(slug)) {
    return { error: "Slug must be 2–64 chars: lowercase letters, numbers, single hyphens." };
  }

  const cardsForInsert =
    public_page_mode === "landing"
      ? payload.landing_cards.map(stripCardForInsert)
      : payload.landing_cards;

  const { data, error } = await supabase
    .from("links")
    .insert({
      user_id: user.id,
      slug,
      username: "",
      bio,
      destination_url,
      public_page_mode,
      display_name,
      handle,
      verified,
      follower_summary,
      social_links: payload.social_links,
      landing_cards: cardsForInsert,
    })
    .select("id, slug")
    .single();

  if (error) {
    if (error.code === "23505") return { error: "That path is already taken." };
    return { error: error.message };
  }

  let heroPath: string | null = null;
  const shot = formData.get("screenshot");
  if (shot instanceof File && shot.size > 0) {
    const up = await uploadHeroScreenshot(supabase, user.id, data.id, shot);
    if (!up.ok) {
      await rollbackNewLink(supabase, user.id, data.id, null);
      return { error: `Screenshot upload failed: ${up.message}` };
    }
    heroPath = up.path;
    const { error: pathErr } = await supabase
      .from("links")
      .update({ screenshot_path: up.path, updated_at: new Date().toISOString() })
      .eq("id", data.id)
      .eq("user_id", user.id);
    if (pathErr) {
      await rollbackNewLink(supabase, user.id, data.id, up.path);
      return { error: pathErr.message };
    }
  }

  if (public_page_mode === "landing" && payload.landing_cards.length > 0) {
    const applied = await applyLandingCardImages(
      supabase,
      user.id,
      data.id,
      formData,
      cardsForInsert,
      null
    );
    if (!applied.ok) {
      await rollbackNewLink(supabase, user.id, data.id, heroPath);
      return { error: applied.message };
    }
    const { error: cardErr } = await supabase
      .from("links")
      .update({ landing_cards: applied.cards, updated_at: new Date().toISOString() })
      .eq("id", data.id)
      .eq("user_id", user.id);
    if (cardErr) {
      await rollbackNewLink(supabase, user.id, data.id, heroPath);
      return { error: cardErr.message };
    }
  }

  revalidatePath("/dashboard");
  return { data };
}

export async function updateLink(linkId: string, slug: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in required." };

  const bio = String(formData.get("bio") ?? "");
  const destinationRaw = String(formData.get("destination_url") ?? "").trim();
  const destinationNorm = normalizeHttpUrl(destinationRaw);
  const public_page_mode = readPageMode(formData);

  if (public_page_mode === "redirect") {
    if (!destinationNorm) {
      return { error: "Redirect mode requires a valid http(s) destination URL." };
    }
  }

  const destination_url = destinationNorm;

  const patch: Record<string, unknown> = {
    bio,
    destination_url,
    public_page_mode,
    updated_at: new Date().toISOString(),
  };

  if (public_page_mode === "landing") {
    const display_name = String(formData.get("display_name") ?? "").trim().slice(0, 120);
    const handle = String(formData.get("handle") ?? "").trim().slice(0, 120);
    const verified = String(formData.get("verified") ?? "") === "on";
    const follower_summary = String(formData.get("follower_summary") ?? "").trim().slice(0, 160);

    const payload = readLandingPayload(formData);
    if ("error" in payload) return { error: payload.error };

    const { data: existingRow } = await supabase
      .from("links")
      .select("landing_cards")
      .eq("id", linkId)
      .eq("user_id", user.id)
      .single();

    const prevCards = coerceLandingCards(existingRow?.landing_cards);
    const applied = await applyLandingCardImages(
      supabase,
      user.id,
      linkId,
      formData,
      payload.landing_cards,
      prevCards
    );
    if (!applied.ok) return { error: applied.message };

    patch.display_name = display_name;
    patch.handle = handle;
    patch.verified = verified;
    patch.follower_summary = follower_summary;
    patch.social_links = payload.social_links;
    patch.landing_cards = applied.cards;
  }

  const shot = formData.get("screenshot");
  if (shot instanceof File && shot.size > 0) {
    const { data: existing } = await supabase
      .from("links")
      .select("screenshot_path")
      .eq("id", linkId)
      .eq("user_id", user.id)
      .single();

    const up = await uploadHeroScreenshot(supabase, user.id, linkId, shot);
    if (!up.ok) return { error: `Screenshot upload failed: ${up.message}` };

    if (existing?.screenshot_path && existing.screenshot_path !== up.path) {
      await supabase.storage.from("screenshots").remove([existing.screenshot_path]).catch(() => undefined);
    }
    patch.screenshot_path = up.path;
  }

  const { error } = await supabase.from("links").update(patch).eq("id", linkId).eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  revalidatePath(`/${slug}`);
  return { ok: true };
}

export async function deleteLink(linkId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in required." };

  const { data: link } = await supabase
    .from("links")
    .select("screenshot_path, landing_cards")
    .eq("id", linkId)
    .eq("user_id", user.id)
    .single();

  if (link?.screenshot_path) {
    await supabase.storage.from("screenshots").remove([link.screenshot_path]);
  }

  const cards = coerceLandingCards(link?.landing_cards);
  for (const c of cards) {
    if (c.image_path) {
      await supabase.storage.from("screenshots").remove([c.image_path]).catch(() => undefined);
    }
  }

  const { error } = await supabase.from("links").delete().eq("id", linkId).eq("user_id", user.id);
  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  return { ok: true };
}
