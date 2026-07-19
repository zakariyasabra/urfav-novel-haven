import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Sparkles, RefreshCw, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { generateAiAsset } from "@/lib/ai-assistant.functions";
import { adminDeleteAsset } from "@/lib/ai-assistant-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface NovelRow {
  id: string;
  slug: string;
  title_ar: string | null;
  title_en: string | null;
}

const KINDS: Array<{ key: string; label: string }> = [
  { key: "summary_spoilerfree", label: "ملخص خالٍ من الحرق" },
  { key: "summary_progress", label: "ملخص تدريجي" },
  { key: "characters", label: "الشخصيات" },
  { key: "timeline", label: "الخط الزمني" },
  { key: "world", label: "العالم" },
  { key: "glossary", label: "المسرد" },
  { key: "reading_order", label: "ترتيب القراءة" },
];

export function AiTab() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<NovelRow | null>(null);
  const novels = useQuery({
    queryKey: ["ai-tab-novels", search],
    queryFn: async () => {
      let q = supabase
        .from("novels")
        .select("id, slug, title_ar, title_en")
        .order("updated_at", { ascending: false })
        .limit(20);
      if (search.trim()) q = q.ilike("title_ar", `%${search.trim()}%`);
      const { data } = await q;
      return (data ?? []) as NovelRow[];
    },
  });

  return (
    <div className="grid gap-4 md:grid-cols-[280px_1fr]">
      <div className="space-y-2">
        <Input
          placeholder="ابحث برواية…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <ul className="max-h-[70vh] space-y-1 overflow-y-auto rounded-lg border border-border/60 bg-surface/40 p-2">
          {(novels.data ?? []).map((n) => (
            <li key={n.id}>
              <button
                onClick={() => setSelected(n)}
                className={`w-full truncate rounded-md px-2 py-1.5 text-start text-sm ${selected?.id === n.id ? "bg-primary/10 text-primary" : "hover:bg-secondary/60"}`}
              >
                {n.title_ar ?? n.title_en ?? n.slug}
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div>
        {selected ? (
          <NovelAiPanel novel={selected} />
        ) : (
          <div className="rounded-lg border border-dashed border-border/60 p-10 text-center text-sm text-muted-foreground">
            اختر رواية لإدارة أدلة المساعد الذكي.
          </div>
        )}
      </div>
    </div>
  );
}

function NovelAiPanel({ novel }: { novel: NovelRow }) {
  const qc = useQueryClient();
  const generateFn = useServerFn(generateAiAsset);
  const [busy, setBusy] = useState<string | null>(null);

  const assets = useQuery({
    queryKey: ["ai-admin-assets", novel.id],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase.from("ai_assets") as any)
        .select("kind, scope_key, lang, updated_at, tokens_in, tokens_out")
        .eq("novel_id", novel.id);
      return (data ?? []) as Array<{ kind: string; scope_key: string; lang: string; updated_at: string; tokens_in: number | null; tokens_out: number | null }>;
    },
  });

  async function generate(kind: string) {
    setBusy(kind);
    try {
      await generateFn({ data: { novel_id: novel.id, kind: kind as never, lang: "ar" } });
      toast.success("تم توليد الدليل");
      qc.invalidateQueries({ queryKey: ["ai-admin-assets", novel.id] });
    } catch (err) {
      const m = err instanceof Error ? err.message : String(err);
      toast.error(`فشل التوليد: ${m}`);
    } finally {
      setBusy(null);
    }
  }

  async function clearOne(kind: string) {
    if (!confirm("حذف هذا الدليل؟")) return;
    await adminDeleteAsset(novel.id, kind);
    qc.invalidateQueries({ queryKey: ["ai-admin-assets", novel.id] });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold">{novel.title_ar ?? novel.title_en ?? novel.slug}</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={async () => {
            if (!confirm("حذف كل أدلة الرواية؟")) return;
            await adminDeleteAsset(novel.id);
            qc.invalidateQueries({ queryKey: ["ai-admin-assets", novel.id] });
          }}
        >
          <Trash2 className="me-1 h-4 w-4" /> مسح الكل
        </Button>
      </div>
      <ul className="space-y-2">
        {KINDS.map((k) => {
          const asset = assets.data?.find((a) => a.kind === k.key);
          const isBusy = busy === k.key;
          return (
            <li
              key={k.key}
              className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-surface/40 p-3"
            >
              <div className="min-w-0">
                <div className="font-semibold">{k.label}</div>
                <div className="text-xs text-muted-foreground">
                  {asset
                    ? `آخر تحديث: ${new Date(asset.updated_at).toLocaleString("ar")} · ${asset.tokens_in ?? 0}/${asset.tokens_out ?? 0} tokens`
                    : "لم يُنشأ بعد"}
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => generate(k.key)} disabled={isBusy}>
                  {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : asset ? <RefreshCw className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
                  <span className="ms-1">{asset ? "إعادة توليد" : "توليد"}</span>
                </Button>
                {asset && (
                  <Button size="sm" variant="ghost" onClick={() => clearOne(k.key)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
