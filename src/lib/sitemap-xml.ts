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

// Only publicly useful, indexable routes. Deliberately excluded: /search
// (thin dynamic results, noindex), /missions, /wallet, /account, /auth,
// /admin, /author, /dashboard and any API endpoint.
const STATIC_PATHS = [
  "/",
  "/latest",
  "/popular",
  "/completed",
  "/ongoing",
  "/categories",
  "/vip",
  "/marketplace",
  "/leaderboard",
  "/achievements",
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

  let novels: { id: string; slug: string; updated_at: string; owner_id: string | null }[] = [];
  let chapters: {
    chapter_number: number;
    updated_at: string;
    novel: { slug: string } | null;
  }[] = [];
  let authors: { username: string; updated_at: string }[] = [];
  let categories: { slug: string }[] = [];

  // Keep the sitemap endpoint valid even if production database variables are
  // temporarily unavailable. Static routes can still be indexed instead of
  // returning a 500 to Google Search Console.
  if (supabaseUrl && publishableKey) {
    const supa = createClient<Database>(supabaseUrl, publishableKey, {
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    });
    const [novelsResult, chaptersResult, categoriesResult] = await Promise.all([
      supa
        .from("novels")
        .select("id,slug,updated_at,owner_id")
        .eq("is_published", true)
        .order("updated_at", { ascending: false })
        .limit(5000),
      // Public chapters only: published and not VIP-locked.
      supa
        .from("chapters")
        .select("chapter_number,updated_at,is_vip,status,coin_price,novel:novels(slug,is_published)")
        .eq("status", "published")
        .eq("is_vip", false)
        .order("updated_at", { ascending: false })
        .limit(20000),
      supa.from("genres").select("slug").limit(500),
    ]);
    novels = novelsResult.data ?? [];
    const rawChapters = (chaptersResult.data ?? []) as unknown as Array<{
      chapter_number: number;
      updated_at: string;
      coin_price: number | null;
      novel: { slug: string; is_published: boolean } | null;
    }>;
    chapters = rawChapters
      .filter((c) => c.novel?.is_published && !(c.coin_price && c.coin_price > 0))
      .map((c) => ({
        chapter_number: c.chapter_number,
        updated_at: c.updated_at,
        novel: c.novel ? { slug: c.novel.slug } : null,
      }));
    categories = categoriesResult.data ?? [];

    // Authors: only profiles that actually own a published novel, so every
    // /authors/<username> URL resolves to a real public page.
    const ownerIds = Array.from(
      new Set(novels.map((n) => n.owner_id).filter((v): v is string => !!v)),
    ).slice(0, 2000);
    if (ownerIds.length > 0) {
      // `account_status` is not readable anonymously, so we only select public
      // columns; owning a published novel already implies a live public page.
      const authorsResult = await supa
        .from("profiles")
        .select("username,updated_at")
        .in("id", ownerIds)
        .limit(2000);
      authors = ((authorsResult.data ?? []) as Array<{
        username: string | null;
        updated_at: string;
      }>)
        .filter((p) => !!p.username)
        .map((p) => ({ username: p.username as string, updated_at: p.updated_at }));
    }

  }

  const urls: string[] = [
    ...STATIC_PATHS.map((p) => `<url><loc>${sitemapUrl(BASE, p)}</loc></url>`),
    ...categories.map((c) => `<url><loc>${sitemapUrl(BASE, `/categories/${c.slug}`)}</loc></url>`),
    ...authors.map(
      (a) =>
        `<url><loc>${sitemapUrl(BASE, `/authors/${a.username}`)}</loc><lastmod>${escapeXml(a.updated_at)}</lastmod></url>`,
    ),
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
