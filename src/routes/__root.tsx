import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { installChunkReload, recoverFromChunkError } from "@/lib/chunk-reload";

installChunkReload();
import { AuthProvider } from "@/hooks/use-auth";
import { PreferencesProvider, useT } from "@/i18n/provider";
import { SiteHeader, SiteFooter } from "@/components/site/layout";
import { MobileBottomNav } from "@/components/site/mobile-bottom-nav";
import { AnnouncementBanner } from "@/components/site/announcement-banner";
import { fetchAnnouncements } from "@/lib/monetization-api";

import { DeferredExtras } from "@/components/site/deferred-extras";
import { Toaster } from "@/components/ui/sonner";
import { DialogHost } from "@/components/ui/dialog-service";

function NotFoundComponent() {
  const t = useT();
  return (
    <div className="flex min-h-screen items-center justify-center bg-hero-radial px-4">
      <div className="max-w-md text-center">
        <h1 className="text-8xl font-black text-gradient-primary">404</h1>
        <h2 className="mt-4 text-2xl font-bold">{t("common.notFound")}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{t("common.notFoundBody")}</p>
        <a
          href="/"
          className="mt-6 inline-flex items-center justify-center rounded-md bg-gradient-to-r from-primary to-primary-glow px-6 py-2.5 text-sm font-semibold text-primary-foreground"
        >
          {t("common.goHome")}
        </a>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  const t = useT();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
    recoverFromChunkError(error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-hero-radial px-4">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-bold">{t("common.error")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("common.tryAgain")}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            {t("common.retry")}
          </button>
          <a href="/" className="rounded-md border border-input px-4 py-2 text-sm font-medium">
            {t("common.goHome")}
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "FAVNOL — منصة قراءة الروايات " },
      {
        name: "description",
        content: "اقرأ آلاف الروايات  : فانتازيا، أكشن، رومانسي، تنمية ذاتية، خيال علمي وأكثر.",
      },
      { name: "theme-color", content: "#0a0a0a" },
      { property: "og:title", content: "FAVNOL — منصة قراءة الروايات " },
      {
        property: "og:description",
        content: "اقرأ آلاف الروايات  : فانتازيا، أكشن، رومانسي، تنمية ذاتية، خيال علمي وأكثر.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "FAVNOL — منصة قراءة الروايات " },
      {
        name: "twitter:description",
        content: "اقرأ آلاف الروايات  : فانتازيا، أكشن، رومانسي، تنمية ذاتية، خيال علمي وأكثر.",
      },
      {
        property: "og:image",
        content:
          "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/7fd6c1c8-9553-47ef-923f-9bfd3f468f3f/id-preview-4164c265--24c902ca-eac2-43e5-97ca-e00e00a9925e.lovable.app-1783282059316.png",
      },
      {
        name: "twitter:image",
        content:
          "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/7fd6c1c8-9553-47ef-923f-9bfd3f468f3f/id-preview-4164c265--24c902ca-eac2-43e5-97ca-e00e00a9925e.lovable.app-1783282059316.png",
      },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "icon", href: "/favicon.png", type: "image/png" },
      { rel: "apple-touch-icon", href: "/icons/icon-192.png" },

      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      // Warm the API origin so the first data request skips DNS/TLS.
      { rel: "preconnect", href: "https://nnmzyfihxqqvgprvocqy.supabase.co", crossOrigin: "anonymous" },
      // Non-render-blocking web fonts: `media="print"` keeps the request off the
      // critical path; the inline script below promotes it to `all` once the
      // page has painted. Amiri (reader-only) is loaded by the chapter route.
      {
        rel: "stylesheet",
        id: "favnol-fonts",
        media: "print",
        href: "https://fonts.googleapis.com/css2?family=Cairo:wght@700;900&family=Tajawal:wght@400;700&display=swap",
      },
    ],
    scripts: [
      {
        children:
          "(function(){function f(){var l=document.getElementById('favnol-fonts');if(l)l.media='all';}if(document.readyState==='complete')f();else addEventListener('load',f,{once:true});})();",
      },
    ],
  }),
  // Resolve the announcement banner on the server so it is part of the first
  // paint instead of dropping in later and pushing the whole page down (CLS).
  // Capped so a slow backend can never delay the HTML response (FCP).
  loader: async ({ context: { queryClient } }) => {
    await Promise.race([
      queryClient
        .prefetchQuery({
          queryKey: ["announcements", "banner"],
          queryFn: () => fetchAnnouncements("banner"),
          staleTime: 60_000,
        })
        .catch(() => undefined),
      new Promise((r) => setTimeout(r, 700)),
    ]);
  },
  shellComponent: RootShell,

  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  // Initial SSR shell defaults to Arabic RTL dark. PreferencesProvider updates
  // <html> lang, dir, and theme class on the client after hydration.
  return (
    <html lang="ar" dir="rtl" className="dark">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <PreferencesProvider>
        <AuthProvider>
          <div className="flex min-h-screen flex-col bg-hero-radial">
            <AnnouncementBanner />
            <SiteHeader />
            <main className="flex-1">
              <Outlet />
            </main>
            <SiteFooter />
            <MobileBottomNav />
            <DeferredExtras />
          </div>
          <Toaster />
          <DialogHost />
        </AuthProvider>
      </PreferencesProvider>
    </QueryClientProvider>
  );
}
