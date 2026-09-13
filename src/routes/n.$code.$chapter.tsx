import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/n/$code/$chapter")({
  component: ShortChapterRedirect,
});

function ShortChapterRedirect() {
  const { code, chapter } = Route.useParams();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const safeCode = code.trim().toLowerCase();
      const chapterNumber = Number(chapter);

      if (
        !/^[a-z0-9]{4,12}$/.test(safeCode) ||
        !Number.isInteger(chapterNumber) ||
        chapterNumber < 1
      ) {
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

      window.location.replace(
        `/novels/${encodeURIComponent(data.slug)}/${chapterNumber}`,
      );
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, [code, chapter]);

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
      <p className="text-sm text-muted-foreground">جاري فتح الفصل…</p>
    </div>
  );
}
