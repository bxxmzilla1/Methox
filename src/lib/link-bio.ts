/**
 * Reads landing-page bio from a links row. If `landing_bio` is missing (migration not applied yet),
 * falls back to `bio` so queries can use `select('*')` and avoid failing on unknown columns.
 */
export function landingBioFromRow(row: Record<string, unknown>): string {
  const legacy = String(row.bio ?? "");
  if (!Object.prototype.hasOwnProperty.call(row, "landing_bio")) {
    return legacy;
  }
  return String(row.landing_bio ?? "");
}
