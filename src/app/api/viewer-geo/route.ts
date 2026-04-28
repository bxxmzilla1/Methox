import { NextResponse } from "next/server";
import { parseIpinfoPayload } from "@/lib/ipinfo";

export const dynamic = "force-dynamic";

function clientIp(request: Request): string | null {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  const vercel = request.headers.get("x-vercel-forwarded-for");
  if (vercel) {
    const first = vercel.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp?.trim()) return realIp.trim();
  return null;
}

/**
 * Returns { city, country } for the requesting visitor (from edge IP headers).
 * Set IPINFO_TOKEN (ipinfo.io) — same idea as Echo IG VITE_IPINFO_TOKEN.
 */
export async function GET(request: Request) {
  const token = process.env.IPINFO_TOKEN?.trim();
  if (!token) {
    return NextResponse.json({ city: "", country: "" });
  }

  const ip = clientIp(request);
  if (!ip) {
    return NextResponse.json({ city: "", country: "" });
  }

  try {
    const url = `https://ipinfo.io/${encodeURIComponent(ip)}/json?token=${encodeURIComponent(token)}`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      return NextResponse.json({ city: "", country: "" });
    }
    const data = (await res.json()) as Record<string, unknown>;
    const geo = parseIpinfoPayload(data);
    return NextResponse.json(geo);
  } catch {
    return NextResponse.json({ city: "", country: "" });
  }
}
