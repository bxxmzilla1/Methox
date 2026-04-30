import type { SupabaseClient } from "@supabase/supabase-js";

/** Copy screenshots bucket object by download → upload (reliable under storage RLS). */
export async function storageCopyScreenshotsObject(
  supabase: SupabaseClient,
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

export function isUserPresetHeroPath(userId: string, path: string | null | undefined): path is string {
  if (!path || path.includes("..")) return false;
  const p = path.trim();
  return p.startsWith(`${userId}/presets/`) && /\/hero\./.test(p);
}

export function isUserPresetCardPath(userId: string, path: string | null | undefined): path is string {
  if (!path || path.includes("..")) return false;
  const p = path.trim();
  return p.startsWith(`${userId}/presets/`) && p.includes("/cards/");
}
