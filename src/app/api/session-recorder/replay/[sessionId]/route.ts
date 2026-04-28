import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, ctx: { params: Promise<{ sessionId: string }> }) {
  const { sessionId: raw } = await ctx.params;
  const sessionId = decodeURIComponent(raw).trim();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const { data: session } = await supabase
    .from("session_replays")
    .select("id, link_id")
    .eq("id", sessionId)
    .single();

  if (!session) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const { data: link } = await supabase
    .from("links")
    .select("id, user_id")
    .eq("id", session.link_id)
    .single();

  if (!link || link.user_id !== user.id) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const { data: chunks, error } = await supabase
    .from("session_replay_chunks")
    .select("seq, events")
    .eq("session_id", sessionId)
    .order("seq", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const events: unknown[] = [];
  for (const c of chunks ?? []) {
    if (Array.isArray(c.events)) events.push(...c.events);
  }

  return NextResponse.json({ sessionId, events });
}

