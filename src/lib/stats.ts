export type ClickRow = { link_id: string; visitor_id: string; country: string };

export type LinkStats = {
  totalClicks: number;
  uniqueVisitors: number;
  topCountries: { code: string; count: number }[];
};

export function statsForLinks(rows: ClickRow[] | null): Map<string, LinkStats> {
  const byLink = new Map<
    string,
    { total: number; visitors: Set<string>; countryHits: Map<string, number> }
  >();

  for (const r of rows ?? []) {
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
    const topCountries = [...v.countryHits.entries()]
      .map(([code, count]) => ({ code, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    out.set(linkId, {
      totalClicks: v.total,
      uniqueVisitors: v.visitors.size,
      topCountries,
    });
  });
  return out;
}
