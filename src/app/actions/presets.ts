"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import {
  coerceLandingCards,
  parseLandingCardsJson,
  parseLandingHeroFocusJson,
  type ImageFocus,
  type LandingCard,
} from "@/lib/landing-data";
import { uploadPresetCardImage, uploadPresetHero } from "@/lib/storage-upload";

export type PresetRow = {
  id: string;
  user_id: string;
  name: string;
  display_name: string;
  handle: string;
  landing_bio: string;
  landing_cards: LandingCard[];
  landing_hero_focus: ImageFocus;
  hero_image_path: string | null;
  created_at: string;
  updated_at: string;
};

function coercePresetRow(row: Record<string, unknown>): PresetRow {
  const focusParsed = parseLandingHeroFocusJson(
    typeof row.landing_hero_focus === "object" && row.landing_hero_focus !== null
      ? JSON.stringify(row.landing_hero_focus)
      : "{}"
  );
  return {
    id: String(row.id ?? ""),
    user_id: String(row.user_id ?? ""),
    name: String(row.name ?? ""),
    display_name: String(row.display_name ?? ""),
    handle: String(row.handle ?? ""),
    landing_bio: String(row.landing_bio ?? ""),
    landing_cards: coerceLandingCards(row.landing_cards),
    landing_hero_focus: focusParsed.ok ? focusParsed.data : { x: 50, y: 50 },
    hero_image_path: row.hero_image_path != null && String(row.hero_image_path).trim()
      ? String(row.hero_image_path).trim().slice(0, 512)
      : null,
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
  };
}

/** Path prefixes under screenshots bucket tied to one link folder. */
function isPathOwnedByLink(userId: string, linkId: string, path: string | null): path is string {
  if (!path || typeof path !== "string" || path.includes("..")) return false;
  const p = path.trim();
  const base = `${userId}/${linkId}`;
  return p.startsWith(`${base}/`) || p.startsWith(`${base}.`);
}

function presetBase(userId: string, presetId: string): string {
  return `${userId}/presets/${presetId}`;
}

/** Copy screenshot object by download → upload (works across MIME types without server-side copy ACL). */
async function storageCopyScreenshotsObject(
  supabase: Awaited<ReturnType<typeof createClient>>,
  fromPath: string,
  toPath: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { error: dlErr, data } = await supabase.storage.from("screenshots").download(fromPath);
  if (dlErr || !data) return { ok: false, message: dlErr?.message ?? "Could not read source image." };
  const ab = await data.arrayBuffer();
  const contentType =
    data.type && /^image\/[a-z0-9.+~-]+$/i.test(data.type) ? data.type : "image/jpeg";

  const { error: upErr } = await supabase.storage.from("screenshots").upload(toPath, ab, {
    upsert: true,
    contentType,
  });
  if (upErr) return { ok: false, message: upErr.message };
  return { ok: true };
}

function stripCardImages(c: LandingCard): LandingCard {
  return {
    ...c,
    image_path: null,
    image_url: null,
  };
}

export async function listPresets(): Promise<{ data: PresetRow[] } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in required." };

  const { data, error } = await supabase
    .from("landing_presets")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return { error: error.message };
  return { data: (data ?? []).map((r) => coercePresetRow(r as Record<string, unknown>)) };
}

export async function savePreset(formData: FormData): Promise<{ data: PresetRow } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in required." };

  const name = String(formData.get("preset_name") ?? "").trim().slice(0, 120);
  if (!name) return { error: "Preset name is required." };

  const display_name = String(formData.get("display_name") ?? "").trim().slice(0, 120);
  const handle = String(formData.get("handle") ?? "").trim().slice(0, 120);
  const landing_bio = String(formData.get("landing_bio") ?? "").trim();
  const sourceLinkId = String(formData.get("preset_source_link_id") ?? "").trim();

  const cardsResult = parseLandingCardsJson(String(formData.get("landing_cards_json") ?? "[]"));
  if (!cardsResult.ok) return { error: `Cards: ${cardsResult.error}` };

  const focusResult = parseLandingHeroFocusJson(String(formData.get("landing_hero_focus_json") ?? "{}"));
  if (!focusResult.ok) return { error: `Hero focus: ${focusResult.error}` };

  const cardsForInsert = cardsResult.data.map(stripCardImages);

  const { data: inserted, error: insErr } = await supabase
    .from("landing_presets")
    .insert({
      user_id: user.id,
      name,
      display_name,
      handle,
      landing_bio,
      landing_cards: cardsForInsert,
      landing_hero_focus: focusResult.data,
      hero_image_path: null,
    })
    .select("*")
    .single();

  if (insErr) return { error: insErr.message };

  const presetId = inserted!.id as string;
  let hero_image_path: string | null = null;
  const stagedUploads: string[] = [];

  try {
    const heroFile = formData.get("preset_hero_image");
    if (heroFile instanceof File && heroFile.size > 0) {
      const up = await uploadPresetHero(supabase, user.id, presetId, heroFile);
      if (!up.ok) throw new Error(up.message);
      hero_image_path = up.path;
      stagedUploads.push(up.path);
    } else if (sourceLinkId) {
      const { data: ln } = await supabase
        .from("links")
        .select("hero_image_path, screenshot_path")
        .eq("id", sourceLinkId)
        .eq("user_id", user.id)
        .single();

      const src =
        ln?.hero_image_path && typeof ln.hero_image_path === "string"
          ? ln.hero_image_path
          : ln?.screenshot_path && typeof ln.screenshot_path === "string"
            ? ln.screenshot_path
            : null;

      if (src && isPathOwnedByLink(user.id, sourceLinkId, src)) {
        const extMatch = /\.([^.]+)$/.exec(src);
        const ext = extMatch ? extMatch[1]!.toLowerCase() : "jpg";
        const dst = `${presetBase(user.id, presetId)}/hero.${ext}`;
        const cp = await storageCopyScreenshotsObject(supabase, src, dst);
        if (!cp.ok) throw new Error(cp.message);
        hero_image_path = dst;
        stagedUploads.push(dst);
      }
    }

    const nextCards: LandingCard[] = [];

    for (let i = 0; i < cardsResult.data.length; i++) {
      const c = cardsResult.data[i];
      let nextCard: LandingCard = {
        ...c,
        image_path: null,
        image_url: null,
      };

      const upFile = formData.get(`preset_card_image_${i}`);
      if (upFile instanceof File && upFile.size > 0) {
        const uploaded = await uploadPresetCardImage(supabase, user.id, presetId, i, upFile);
        if (!uploaded.ok) throw new Error(uploaded.message);
        nextCard = { ...nextCard, image_path: uploaded.path };
        stagedUploads.push(uploaded.path);
      } else if (sourceLinkId && c.image_path && isPathOwnedByLink(user.id, sourceLinkId, c.image_path)) {
        const extMatch = /\.([^.]+)$/.exec(c.image_path);
        const ext = extMatch ? extMatch[1]!.toLowerCase() : "jpg";
        const dst = `${presetBase(user.id, presetId)}/cards/${i}.${ext}`;
        const cp = await storageCopyScreenshotsObject(supabase, c.image_path, dst);
        if (!cp.ok) throw new Error(cp.message);
        nextCard = { ...nextCard, image_path: dst };
        stagedUploads.push(dst);
      }

      nextCards.push(nextCard);
    }

    const { data: updated, error: upErr } = await supabase
      .from("landing_presets")
      .update({
        landing_cards: nextCards,
        hero_image_path,
        updated_at: new Date().toISOString(),
      })
      .eq("id", presetId)
      .eq("user_id", user.id)
      .select("*")
      .single();

    if (upErr || !updated) throw new Error(upErr?.message ?? "Failed to update preset.");

    revalidatePath("/dashboard");
    return { data: coercePresetRow(updated as Record<string, unknown>) };
  } catch (e) {
    await supabase.from("landing_presets").delete().eq("id", presetId).eq("user_id", user.id);
    if (stagedUploads.length) {
      await supabase.storage.from("screenshots").remove(stagedUploads).catch(() => undefined);
    }
    const msg = e instanceof Error ? e.message : String(e);
    return { error: msg || "Could not save preset." };
  }
}

export async function deletePreset(presetId: string): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in required." };

  const { data: row } = await supabase
    .from("landing_presets")
    .select("hero_image_path, landing_cards")
    .eq("id", presetId)
    .eq("user_id", user.id)
    .maybeSingle();

  const pathsToRemove: string[] = [];
  if (row?.hero_image_path && typeof row.hero_image_path === "string") {
    pathsToRemove.push(row.hero_image_path);
  }
  if (row) {
    const cards = coerceLandingCards(row.landing_cards);
    for (const c of cards) {
      if (c.image_path?.startsWith(`${user.id}/presets/`)) {
        pathsToRemove.push(c.image_path);
      }
    }
  }

  const { error } = await supabase.from("landing_presets").delete().eq("id", presetId).eq("user_id", user.id);

  if (error) return { error: error.message };

  if (pathsToRemove.length) {
    await supabase.storage.from("screenshots").remove(pathsToRemove).catch(() => undefined);
  }

  revalidatePath("/dashboard");
  return { ok: true };
}
