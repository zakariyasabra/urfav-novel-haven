/**
 * Site-wide runtime config, driven by environment variables.
 * All values are safe to expose to the browser.
 */

/**
 * The single canonical origin of the site. Google must only ever see this
 * host — no `www.`, no `http://`. Nginx 301-redirects every other variant
 * here (see deploy/nginx-favnol.conf).
 */
const DEFAULT_SITE_URL = "https://favnol.com";

/** Strip trailing slash and any leading `www.` from a URL's host. */
function normalizeOrigin(raw: string): string {
  const trimmed = raw.trim().replace(/\/$/, "");
  if (!trimmed) return "";
  try {
    const u = new URL(trimmed);
    u.protocol = "https:";
    u.hostname = u.hostname.replace(/^www\./i, "");
    return u.origin;
  } catch {
    return trimmed.replace(/^http:\/\//i, "https://").replace(/^(https:\/\/)www\./i, "$1");
  }
}

export const SITE_URL =
  normalizeOrigin((import.meta.env.VITE_SITE_URL as string | undefined) ?? "") || DEFAULT_SITE_URL;

export const SITE_NAME = (import.meta.env.VITE_SITE_NAME as string | undefined) || "FAVNOL";

/**
 * Percent-encode each path segment exactly once. Arabic slugs may arrive
 * already encoded (from the router) or raw (from the database); decoding first
 * makes the result idempotent, so canonical URLs never double-encode.
 */
function encodePath(path: string): string {
  return path
    .split("/")
    .map((seg) => {
      if (!seg) return seg;
      let raw = seg;
      try {
        raw = decodeURIComponent(seg);
      } catch {
        /* keep the original segment when it is not valid encoding */
      }
      return encodeURIComponent(raw);
    })
    .join("/");
}

/** Absolute canonical URL for a route path (always on the canonical origin). */
export function canonicalUrl(path: string): string {
  const withSlash = path.startsWith("/") ? path : `/${path}`;
  const [pathname] = withSlash.split(/[?#]/);
  const p = encodePath(pathname);
  return p === "/" ? `${SITE_URL}/` : `${SITE_URL}${p.replace(/\/$/, "")}`;
}
