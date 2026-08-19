import { createFileRoute } from "@tanstack/react-router";
import { buildSitemapXml, sitemapResponse } from "@/lib/sitemap-xml";

// Canonical sitemap location: https://favnol.com/sitemap.xml
// (/api/sitemap.xml is kept as a legacy alias.)
export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => sitemapResponse(await buildSitemapXml()),
    },
  },
});
