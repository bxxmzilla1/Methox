/** Geo used to replace (country) and (city) in landing bios — same placeholders as Echo IG ipinfoService. */

export type ViewerGeo = {
  city: string;
  country: string;
};

export function expandRegionCode(iso2: string): string {
  if (!iso2 || iso2.length !== 2) return iso2;
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(iso2.toUpperCase()) || iso2;
  } catch {
    return iso2;
  }
}

export function parseIpinfoPayload(data: Record<string, unknown>): ViewerGeo {
  const city = String(data.city ?? "");
  const raw = String(data.country ?? "");
  const countryName =
    (typeof data.country_name === "string" && data.country_name) ||
    (raw.length === 2 ? expandRegionCode(raw) : raw);
  return { city, country: countryName };
}

/** Replaces (country) and (city) in bio text. Pass null to leave placeholders unchanged. */
export function applyGeoPlaceholders(text: string, geo: ViewerGeo | null): string {
  if (!geo) return text;
  return text.split("(country)").join(geo.country).split("(city)").join(geo.city);
}
