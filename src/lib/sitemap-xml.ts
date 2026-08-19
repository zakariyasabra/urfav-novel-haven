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
    .map((seg) => (seg ? encodeURIComponent(decodeURIComponent(seg)) : seg))
    .join("/");
}

export async function buildSitemapXml(): Promise<string> {
  const BASE = sitemapBaseUrl();
  const supa = createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );

  const { data: novels } = await supa
    .from("novels")
    .select("slug,updated_at")
    .order("updated_at", { ascending: false })
    .limit(5000);
  const { data: chapters } = await supa
    .from("chapters")
    .select("chapter_number,updated_at,novel:novels(slug)")
    .order("updated_at", { ascending: false })
    .limit(20000);

  const urls: string[] = [
    ...STATIC_PATHS.map((p) => `<url><loc>${BASE}${p}</loc></url>`),
    ...(novels ?? []).map(
      (n) =>
        `<url><loc>${BASE}${encodePath(`/novels/${n.slug}`)}</loc><lastmod>${n.updated_at}</lastmod></url>`,
    ),
    ...(
      (chapters ?? []) as unknown as {
        chapter_number: number;
        updated_at: string;
        novel: { slug: string } | null;
      }[]
    )
      .filter((c) => c.novel)
      .map(
        (c) =>
          `<url><loc>${BASE}${encodePath(`/novels/${c.novel!.slug}/${c.chapter_number}`)}</loc><lastmod>${c.updated_at}</lastmod></url>`,
      ),
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
