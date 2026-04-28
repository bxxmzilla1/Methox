export const APP_NAME = "Flinky.Bio";

/** Paths that cannot be used as custom link slugs */
export const RESERVED_SLUGS = new Set([
  "api",
  "dashboard",
  "login",
  "signup",
  "auth",
  "_next",
  "favicon.ico",
  "robots.txt",
  "sitemap.xml",
  "manifest.webmanifest",
  "sw.js",
  "workbox",
  "icons",
]);

export const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isValidSlug(raw: string): boolean {
  const s = raw.trim().toLowerCase();
  if (s.length < 2 || s.length > 64) return false;
  if (RESERVED_SLUGS.has(s)) return false;
  return SLUG_REGEX.test(s);
}
