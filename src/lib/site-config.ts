/**
 * Site-wide runtime config, driven by environment variables.
 * All values are safe to expose to the browser.
 */
export const SITE_URL =
  (import.meta.env.VITE_SITE_URL as string | undefined)?.replace(/\/$/, "") ||
  (typeof window !== "undefined" ? window.location.origin : "");

export const SITE_NAME = (import.meta.env.VITE_SITE_NAME as string | undefined) || "FAVNOL";
