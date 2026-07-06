import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const BASE = "https://urfav-novel-haven.lovable.app";

export const Route = createFileRoute("/api/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const supa = createClient<Database>(
          process.env.SUPABASE_URL!,
          process.env.SUPABASE_PUBLISHABLE_KEY!,
          { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
        );
        const { data: novels } = await supa.from("novels").select("slug,updated_at").order("updated_at", { ascending: false }).limit(5000);
        const { data: chapters } = await supa
          .from("chapters")
          .select("chapter_number,updated_at,novel:novels(slug)")
          .order("updated_at", { ascending: false })
          .limit(20000);

        const staticUrls = ["/", "/latest", "/popular", "/categories", "/completed", "/ongoing", "/vip", "/about", "/contact", "/privacy", "/terms", "/dmca"];
        const urls: string[] = [
          ...staticUrls.map((p) => `<url><loc>${BASE}${p}</loc></url>`),
          ...(novels ?? []).map((n) => `<url><loc>${BASE}/novels/${n.slug}</loc><lastmod>${n.updated_at}</lastmod></url>`),
          ...((chapters ?? []) as unknown as { chapter_number: number; updated_at: string; novel: { slug: string } | null }[])
            .filter((c) => c.novel)
            .map((c) => `<url><loc>${BASE}/novels/${c.novel!.slug}/${c.chapter_number}</loc><lastmod>${c.updated_at}</lastmod></url>`),
        ];
        const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>`;
        return new Response(xml, { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
      },
    },
  },
});
