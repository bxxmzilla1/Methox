"use server";

import { createClient } from "@/lib/supabase/server";
import { isValidSlug } from "@/lib/constants";
import { revalidatePath } from "next/cache";

export type LinkRow = {
  id: string;
  user_id: string;
  slug: string;
  username: string;
  bio: string;
  screenshot_path: string | null;
  destination_url: string | null;
  created_at: string;
  updated_at: string;
};

export async function createLink(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in required." };

  const slug = String(formData.get("slug") ?? "").trim().toLowerCase();
  const username = String(formData.get("username") ?? "").trim();
  const bio = String(formData.get("bio") ?? "");
  const destinationRaw = String(formData.get("destination_url") ?? "").trim();
  const destination_url = destinationRaw.length ? destinationRaw : null;

  if (!isValidSlug(slug)) {
    return { error: "Slug must be 2–64 chars: lowercase letters, numbers, single hyphens." };
  }

  const { data, error } = await supabase
    .from("links")
    .insert({
      user_id: user.id,
      slug,
      username,
      bio,
      destination_url,
    })
    .select("id, slug")
    .single();

  if (error) {
    if (error.code === "23505") return { error: "That path is already taken." };
    return { error: error.message };
  }

  revalidatePath("/dashboard");
  return { data };
}

export async function updateLink(
  linkId: string,
  slug: string,
  formData: FormData,
  screenshotPath: string | null | undefined
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in required." };

  const username = String(formData.get("username") ?? "").trim();
  const bio = String(formData.get("bio") ?? "");
  const destinationRaw = String(formData.get("destination_url") ?? "").trim();
  const destination_url = destinationRaw.length ? destinationRaw : null;

  const patch: Record<string, unknown> = {
    username,
    bio,
    destination_url,
    updated_at: new Date().toISOString(),
  };

  if (screenshotPath !== undefined) {
    patch.screenshot_path = screenshotPath;
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
    .select("screenshot_path")
    .eq("id", linkId)
    .eq("user_id", user.id)
    .single();

  if (link?.screenshot_path) {
    await supabase.storage.from("screenshots").remove([link.screenshot_path]);
  }

  const { error } = await supabase.from("links").delete().eq("id", linkId).eq("user_id", user.id);
  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  return { ok: true };
}
