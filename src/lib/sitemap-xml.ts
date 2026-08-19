import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

/**
 * Canonical base URL for every <loc> in the sitemap: always https, never `www.`.
 * Google must see a single host (see deploy/nginx-favnol.conf).
 */
export function sitemapBaseUrl(): string {
  const raw = (
    process.env.VITE_SITE_URL ||
    process.env.SITE_URL ||
    "https://favnol.com"
  ).trim();
  try {
    const u = new URL(raw);
    u.protocol = "https:";
    u.hostname = u.hostname.replace(/^www\./i, "");
    return u.origin;
  } catch {
    return "https://favnol.com";
  }
}

const STATIC_PATHS = [
  "/",
  "/latest",
  "/popular",
  "/completed",
  "/ongoing",
  "/categories",
  "/search",
  "/vip",
  "/marketplace",
  "/leaderboard",
  "/achievements",
  "/missions",
  "/clubs",
  "/feature-requests",
  "/about",
  "/contact",
  "/faq",
  "/privacy",
  "/terms",
  "/dmca",
];

/** Encode each path segment so Arabic slugs stay valid inside XML/URLs. */
function encodePath(path: string): string {
  return path
    .split("/")
    .map((seg) => {
      if (!seg) return seg;
      try {
        return encodeURIComponent(decodeURIComponent(seg));
      } catch {
        return encodeURIComponent(seg);
      }
    })
    .join("/");
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function sitemapUrl(base: string, path: string): string {
  return escapeXml(`${base}${encodePath(path)}`);
}

export async function buildSitemapXml(): Promise<string> {
  const BASE = sitemapBaseUrl();
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const publishableKey =
    process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  let novels: { slug: string; updated_at: string }[] = [];
  let chapters: {
    chapter_number: number;
    updated_at: string;
    novel: { slug: string } | null;
  }[] = [];

  // Keep the sitemap endpoint valid even if production database variables are
  // temporarily unavailable. Static routes can still be indexed instead of
  // returning a 500 to Google Search Console.
  if (supabaseUrl && publishableKey) {
    const supa = createClient<Database>(supabaseUrl, publishableKey, {
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    });
    const [novelsResult, chaptersResult] = await Promise.all([
      supa
        .from("novels")
        .select("slug,updated_at")
        .order("updated_at", { ascending: false })
        .limit(5000),
      supa
        .from("chapters")
        .select("chapter_number,updated_at,novel:novels(slug)")
        .order("updated_at", { ascending: false })
        .limit(20000),
    ]);
    novels = novelsResult.data ?? [];
    chapters = (chaptersResult.data ?? []) as unknown as typeof chapters;
  }

  const urls: string[] = [
    ...STATIC_PATHS.map((p) => `<url><loc>${sitemapUrl(BASE, p)}</loc></url>`),
    ...novels.map(
      (n) =>
        `<url><loc>${sitemapUrl(BASE, `/novels/${n.slug}`)}</loc><lastmod>${escapeXml(n.updated_at)}</lastmod></url>`,
    ),
    ...chapters
      .filter((c) => c.novel)
      .map((c) => {
        const novel = c.novel;
        if (!novel) return "";
        return `<url><loc>${sitemapUrl(BASE, `/novels/${novel.slug}/${c.chapter_number}`)}</loc><lastmod>${escapeXml(c.updated_at)}</lastmod></url>`;
      })
      .filter(Boolean),
  ];

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>`;
}

export function sitemapResponse(xml: string): Response {
  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
