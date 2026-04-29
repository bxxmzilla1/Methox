import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { ClickRow } from "@/lib/stats";
import { statsForLinks } from "@/lib/stats";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: links } = await supabase.from("links").select("id").eq("user_id", user.id);

  const ids = (links ?? []).map((l) => l.id as string);
  let clickRows: ClickRow[] | null = null;
  if (ids.length) {
    const { data } = await supabase.from("clicks").select("link_id, visitor_id, country").in("link_id", ids);
    clickRows = (data as ClickRow[]) ?? null;
  }

  const stats = statsForLinks(clickRows);
  const statsByLinkId = Object.fromEntries(stats);
  return NextResponse.json({ statsByLinkId }, { headers: { "Cache-Control": "no-store" } });
}
