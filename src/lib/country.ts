/**
 * Maps ISO 3166-1 alpha-2 codes (e.g. "PH") to localized region names via Intl.
 */
export function countryCodeToDisplayName(code: string, locale = "en"): string {
  const raw = (code ?? "").trim();
  if (!raw || raw.toLowerCase() === "unknown") {
    return "Unknown";
  }

  const upper = raw.toUpperCase();
  if (upper.length !== 2) {
    return raw;
  }

  try {
    const names = new Intl.DisplayNames([locale], { type: "region" });
    const label = names.of(upper);
    if (label && label !== upper) {
      return label;
    }
  } catch {
    /* ignore */
  }

  return upper;
}
