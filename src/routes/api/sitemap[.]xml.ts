import { createFileRoute } from "@tanstack/react-router";
import { buildSitemapXml, sitemapResponse } from "@/lib/sitemap-xml";

// Legacy alias — the canonical sitemap is served from /sitemap.xml.
export const Route = createFileRoute("/api/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => sitemapResponse(await buildSitemapXml()),
    },
  },
});
