export const PLATFORM_OPTIONS = [
  { id: "instagram", label: "Instagram" },
  { id: "tiktok", label: "TikTok" },
  { id: "twitter", label: "X (Twitter)" },
  { id: "snapchat", label: "Snapchat" },
  { id: "threads", label: "Threads" },
  { id: "onlyfans", label: "OnlyFans / lock" },
  { id: "youtube", label: "YouTube" },
  { id: "website", label: "Website" },
  { id: "other", label: "Other" },
] as const;

export type PlatformId = (typeof PLATFORM_OPTIONS)[number]["id"];

export function platformLabel(id: string): string {
  const p = PLATFORM_OPTIONS.find((o) => o.id === id);
  return p?.label ?? id;
}

/** Tailwind gradient classes for card backgrounds when no image */
export function cardGradientClass(platform: string): string {
  switch (platform) {
    case "instagram":
      return "bg-gradient-to-br from-fuchsia-600 via-purple-600 to-orange-400";
    case "tiktok":
      return "bg-gradient-to-br from-cyan-400 via-slate-900 to-rose-500";
    case "twitter":
      return "bg-gradient-to-br from-slate-800 to-slate-950";
    case "snapchat":
      return "bg-gradient-to-br from-yellow-300 via-yellow-400 to-amber-500";
    case "threads":
      return "bg-gradient-to-br from-zinc-800 to-zinc-950";
    case "onlyfans":
      return "bg-gradient-to-br from-sky-500 to-blue-700";
    case "youtube":
      return "bg-gradient-to-br from-red-600 to-red-900";
    default:
      return "bg-gradient-to-br from-zinc-700 to-zinc-900";
  }
}
