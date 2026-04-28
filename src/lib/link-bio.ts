/**
 * Public landing bio. If `landing_bio` is missing (migration not applied), falls back to `bio`.
 */
export function landingBioFromRow(row: Record<string, unknown>): string {
  const legacy = String(row.bio ?? "");
  if (!("landing_bio" in row)) {
    return legacy;
  }
  return String(row.landing_bio ?? "");
}

/**
 * Dashboard sidebar bio. If `dashboard_bio` is missing (migration not applied), falls back to `bio`.
 */
export function dashboardBioFromRow(row: Record<string, unknown>): string {
  if (!("dashboard_bio" in row)) {
    return String(row.bio ?? "");
  }
  return String(row.dashboard_bio ?? "");
}
