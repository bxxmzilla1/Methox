import type { SupabaseClient } from "@supabase/supabase-js";

const EXT_MAP: Record<string, { ext: string; type: string }> = {
  jpg: { ext: "jpg", type: "image/jpeg" },
  jpeg: { ext: "jpg", type: "image/jpeg" },
  png: { ext: "png", type: "image/png" },
  webp: { ext: "webp", type: "image/webp" },
  gif: { ext: "gif", type: "image/gif" },
};

function imageExtAndType(filename: string, declaredType: string): { ext: string; contentType: string } {
  const raw = filename.split(".").pop()?.toLowerCase() ?? "";
  const fromName = raw in EXT_MAP ? EXT_MAP[raw] : null;
  const ext = fromName?.ext ?? "jpg";
  const fallbackType = fromName?.type ?? "image/jpeg";
  const contentType =
    declaredType && /^image\/[a-z0-9.+-]+$/i.test(declaredType) ? declaredType : fallbackType;
  return { ext, contentType };
}

/** Server-side hero upload: stable MIME type + same auth context as RLS policies. */
export async function uploadHeroScreenshot(
  supabase: SupabaseClient,
  userId: string,
  linkId: string,
  file: File
): Promise<{ ok: true; path: string } | { ok: false; message: string }> {
  if (file.size === 0) return { ok: false, message: "Choose a non-empty image file." };
  if (file.size > 15 * 1024 * 1024) {
    return { ok: false, message: "Image must be 15MB or smaller." };
  }

  const { ext, contentType } = imageExtAndType(file.name, file.type);
  const path = `${userId}/${linkId}.${ext}`;
  const body = new Uint8Array(await file.arrayBuffer());

  const { error } = await supabase.storage.from("screenshots").upload(path, body, {
    upsert: true,
    contentType,
  });

  if (error) {
    return {
      ok: false,
      message: [error.message, (error as { statusCode?: string }).statusCode].filter(Boolean).join(" — "),
    };
  }
  return { ok: true, path };
}

/** Dashboard preview image only — not the landing hero (userId/linkId/dashboard.ext). */
export async function uploadDashboardScreenshot(
  supabase: SupabaseClient,
  userId: string,
  linkId: string,
  file: File
): Promise<{ ok: true; path: string } | { ok: false; message: string }> {
  if (file.size === 0) return { ok: false, message: "Choose a non-empty image file." };
  if (file.size > 15 * 1024 * 1024) {
    return { ok: false, message: "Image must be 15MB or smaller." };
  }

  const { ext, contentType } = imageExtAndType(file.name, file.type);
  const path = `${userId}/${linkId}/dashboard.${ext}`;
  const body = new Uint8Array(await file.arrayBuffer());

  const { error } = await supabase.storage.from("screenshots").upload(path, body, {
    upsert: true,
    contentType,
  });

  if (error) {
    return {
      ok: false,
      message: [error.message, (error as { statusCode?: string }).statusCode].filter(Boolean).join(" — "),
    };
  }
  return { ok: true, path };
}

/** Link card background in screenshots bucket: userId/linkId/cards/{index}.ext */
export async function uploadLinkCardImage(
  supabase: SupabaseClient,
  userId: string,
  linkId: string,
  cardIndex: number,
  file: File
): Promise<{ ok: true; path: string } | { ok: false; message: string }> {
  if (file.size === 0) return { ok: false, message: "Choose a non-empty image file." };
  if (file.size > 15 * 1024 * 1024) {
    return { ok: false, message: "Card image must be 15MB or smaller." };
  }

  const { ext, contentType } = imageExtAndType(file.name, file.type);
  const path = `${userId}/${linkId}/cards/${cardIndex}.${ext}`;
  const body = new Uint8Array(await file.arrayBuffer());

  const { error } = await supabase.storage.from("screenshots").upload(path, body, {
    upsert: true,
    contentType,
  });

  if (error) {
    return {
      ok: false,
      message: [error.message, (error as { statusCode?: string }).statusCode].filter(Boolean).join(" — "),
    };
  }
  return { ok: true, path };
}
