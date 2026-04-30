export type ClickRow = {
  link_id: string;
  visitor_id: string;
  country: string;
  /** Null or missing: page visit. Non-null: tap on landing_cards[index]. */
  card_index?: number | null;
};

export type LinkStats = {
  totalClicks: number;
  uniqueVisitors: number;
  /** All country codes with visit counts, highest first (for charts). */
  countries: { code: string; count: number }[];
};

function isPageVisitRow(r: ClickRow): boolean {
  return r.card_index == null;
}

/** Aggregates page-visit rows only (card_index is null). Card taps use `cardClicksByLinkId`. */
export function statsForLinks(rows: ClickRow[] | null): Map<string, LinkStats> {
  const byLink = new Map<
    string,
    { total: number; visitors: Set<string>; countryHits: Map<string, number> }
  >();

  for (const r of rows ?? []) {
    if (!isPageVisitRow(r)) continue;
    let e = byLink.get(r.link_id);
    if (!e) {
      e = { total: 0, visitors: new Set(), countryHits: new Map() };
      byLink.set(r.link_id, e);
    }
    e.total += 1;
    e.visitors.add(r.visitor_id);
    const c = r.country || "unknown";
    e.countryHits.set(c, (e.countryHits.get(c) ?? 0) + 1);
  }

  const out = new Map<string, LinkStats>();
  byLink.forEach((v, linkId) => {
    const countries = [...v.countryHits.entries()]
      .map(([code, count]) => ({ code, count }))
      .sort((a, b) => b.count - a.count);
    out.set(linkId, {
      totalClicks: v.total,
      uniqueVisitors: v.visitors.size,
      countries,
    });
  });
  return out;
}

/** Per-link, per-card-index tap counts (string keys for JSON). */
export function cardClicksByLinkId(rows: ClickRow[] | null): Record<string, Record<string, number>> {
  const out: Record<string, Record<string, number>> = {};
  for (const r of rows ?? []) {
    if (r.card_index == null) continue;
    const idx = Number(r.card_index);
    if (!Number.isInteger(idx) || idx < 0) continue;
    const linkId = r.link_id;
    if (!out[linkId]) out[linkId] = {};
    const key = String(idx);
    out[linkId]![key] = (out[linkId]![key] ?? 0) + 1;
  }
  return out;
}
