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

export type PresetRow = {
  id: string;
  user_id: string;
  name: string;
  display_name: string;
  handle: string;
  landing_bio: string;
  landing_cards: LandingCard[];
  landing_hero_focus: ImageFocus;
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
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
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

  const cardsResult = parseLandingCardsJson(String(formData.get("landing_cards_json") ?? "[]"));
  if (!cardsResult.ok) return { error: `Cards: ${cardsResult.error}` };

  const focusResult = parseLandingHeroFocusJson(String(formData.get("landing_hero_focus_json") ?? "{}"));
  if (!focusResult.ok) return { error: `Hero focus: ${focusResult.error}` };

  // Strip image paths from cards — images are link-specific storage paths
  const landing_cards = cardsResult.data.map((c) => ({
    ...c,
    image_path: null,
    image_url: null,
  }));

  const { data, error } = await supabase
    .from("landing_presets")
    .insert({
      user_id: user.id,
      name,
      display_name,
      handle,
      landing_bio,
      landing_cards,
      landing_hero_focus: focusResult.data,
    })
    .select("*")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  return { data: coercePresetRow(data as Record<string, unknown>) };
}

export async function deletePreset(presetId: string): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in required." };

  const { error } = await supabase
    .from("landing_presets")
    .delete()
    .eq("id", presetId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  return { ok: true };
}
