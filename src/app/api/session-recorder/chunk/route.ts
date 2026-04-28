import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function isUuid(v: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | null
    | { sessionId?: unknown; seq?: unknown; events?: unknown; lastUrl?: unknown };

  const sessionId = typeof body?.sessionId === "string" ? body.sessionId.trim() : "";
  const seq = typeof body?.seq === "number" ? body.seq : Number(body?.seq);
  const events = Array.isArray(body?.events) ? body?.events : null;
  if (!isUuid(sessionId) || !Number.isFinite(seq) || seq < 0 || !events) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  // Cap chunk size to reduce abuse / payloads.
  const sliced = events.slice(0, 500);

  const supabase = await createClient();
  const { error: insErr } = await supabase.from("session_replay_chunks").insert({
    session_id: sessionId,
    seq: Math.floor(seq),
    events: sliced,
  });

  if (insErr) {
    // If retry causes unique violation, treat as ok.
    if (insErr.code !== "23505") {
      return NextResponse.json({ error: insErr.message }, { status: 500 });
    }
  }

  await supabase
    .from("session_replays")
    .update({
      updated_at: new Date().toISOString(),
      first_url: typeof body?.lastUrl === "string" ? body.lastUrl.slice(0, 1024) : undefined,
    })
    .eq("id", sessionId);

  return NextResponse.json({ ok: true });
}

