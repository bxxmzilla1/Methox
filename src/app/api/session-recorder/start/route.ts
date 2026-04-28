import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { cookies, headers } from "next/headers";
import { randomUUID } from "crypto";

const VISITOR_COOKIE = "flinky_bio_vid";

function isUuid(v: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as null | { linkId?: unknown; firstUrl?: unknown };
  const linkId = typeof body?.linkId === "string" ? body.linkId.trim() : "";
  if (!isUuid(linkId)) {
    return NextResponse.json({ error: "Invalid linkId" }, { status: 400 });
  }

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
  const ua = h.get("user-agent") ?? "";
  const first_url = typeof body?.firstUrl === "string" ? body.firstUrl.slice(0, 1024) : "";

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("session_replays")
    .insert({
      link_id: linkId,
      visitor_id: visitorId,
      first_url,
      user_agent: ua.slice(0, 512),
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "Could not start session." }, { status: 500 });
  }

  return NextResponse.json({ sessionId: data.id as string });
}

