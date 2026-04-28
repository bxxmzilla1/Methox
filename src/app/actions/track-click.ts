"use server";

import { createClient } from "@/lib/supabase/server";
import { cookies, headers } from "next/headers";
import { randomUUID } from "crypto";

const VISITOR_COOKIE = "flinky_bio_vid";

export async function recordClick(linkId: string) {
  const cookieStore = await cookies();
  let visitorId = cookieStore.get(VISITOR_COOKIE)?.value;
  if (!visitorId) {
    visitorId = randomUUID();
    cookieStore.set(VISITOR_COOKIE, visitorId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 400,
    });
  }

  const h = await headers();
  const raw =
    h.get("x-vercel-ip-country") ||
    h.get("cf-ipcountry") ||
    h.get("cloudfront-viewer-country") ||
    "";
  const country =
    raw.length >= 2 ? raw.slice(0, 2).toUpperCase() : "unknown";

  const supabase = await createClient();
  await supabase.from("clicks").insert({
    link_id: linkId,
    visitor_id: visitorId,
    country,
  });
}
