import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/n/$code")({
  component: ShortNovelRedirect,
});

function ShortNovelRedirect() {
  const { code } = Route.useParams();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const safeCode = code.trim().toLowerCase();

      if (!/^[a-z0-9]{4,12}$/.test(safeCode)) {
        setFailed(true);
        return;
      }

      const { data, error } = await supabase
        .from("novels")
        .select("slug")
        .like("slug", `%-${safeCode}`)
        .eq("is_published", true)
        .limit(1)
        .maybeSingle();

      if (cancelled) return;

      if (error || !data?.slug) {
        setFailed(true);
        return;
      }

      window.location.replace(`/novels/${encodeURIComponent(data.slug)}`);
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, [code]);

  if (failed) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-xl font-bold">الرابط غير صالح</h1>
          <a href="/" className="mt-4 inline-block text-primary underline">
            العودة للرئيسية
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <p className="text-sm text-muted-foreground">جاري فتح الرواية…</p>
    </div>
  );
}
