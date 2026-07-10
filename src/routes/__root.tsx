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
import { AuthProvider } from "@/hooks/use-auth";
import { SiteHeader, SiteFooter } from "@/components/site/layout";
import { MobileBottomNav } from "@/components/site/mobile-bottom-nav";
import { Toaster } from "@/components/ui/sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-hero-radial px-4">
      <div className="max-w-md text-center">
        <h1 className="text-8xl font-black text-gradient-primary">404</h1>
        <h2 className="mt-4 text-2xl font-bold">الصفحة غير موجودة</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          الصفحة التي تبحث عنها غير موجودة أو تم نقلها.
        </p>
        <a href="/" className="mt-6 inline-flex items-center justify-center rounded-md bg-gradient-to-r from-primary to-primary-glow px-6 py-2.5 text-sm font-semibold text-primary-foreground">
          العودة للرئيسية
        </a>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-hero-radial px-4">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-bold">حدث خطأ</h1>
        <p className="mt-2 text-sm text-muted-foreground">حاول مجدداً أو عد إلى الرئيسية.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => { router.invalidate(); reset(); }}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            حاول مجدداً
          </button>
          <a href="/" className="rounded-md border border-input px-4 py-2 text-sm font-medium">الرئيسية</a>
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
      { title: "UR Fav Novel — منصة قراءة الروايات المترجمة" },
      { name: "description", content: "اقرأ آلاف الروايات المترجمة مجاناً: فانتازيا، أكشن، رومانسي، تنمية ذاتية، خيال علمي وأكثر." },
      { name: "theme-color", content: "#0a0a0a" },
      { property: "og:title", content: "UR Fav Novel — منصة قراءة الروايات المترجمة" },
      { property: "og:description", content: "اقرأ آلاف الروايات المترجمة مجاناً: فانتازيا، أكشن، رومانسي، تنمية ذاتية، خيال علمي وأكثر." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "UR Fav Novel — منصة قراءة الروايات المترجمة" },
      { name: "twitter:description", content: "اقرأ آلاف الروايات المترجمة مجاناً: فانتازيا، أكشن، رومانسي، تنمية ذاتية، خيال علمي وأكثر." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/7fd6c1c8-9553-47ef-923f-9bfd3f468f3f/id-preview-4164c265--24c902ca-eac2-43e5-97ca-e00e00a9925e.lovable.app-1783282059316.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/7fd6c1c8-9553-47ef-923f-9bfd3f468f3f/id-preview-4164c265--24c902ca-eac2-43e5-97ca-e00e00a9925e.lovable.app-1783282059316.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&family=Tajawal:wght@400;500;700;900&family=Amiri:wght@400;700&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
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
      <AuthProvider>
        <div className="flex min-h-screen flex-col bg-hero-radial">
          <SiteHeader />
          <main className="flex-1">
            <Outlet />
          </main>
          <SiteFooter />
          <MobileBottomNav />
        </div>
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}
