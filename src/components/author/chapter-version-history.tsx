import { useQuery, useQueryClient } from "@tanstack/react-query";
import { History } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { confirmDialog } from "@/components/ui/dialog-service";
import { showError } from "@/lib/errors";
import { useT } from "@/i18n/provider";
import { useTimeAgo } from "@/lib/format";
import {
  fetchChapterVersions,
  restoreChapterVersion,
} from "@/lib/creator-studio-api";

function Empty() {
  const t = useT();
  return (
    <div className="grid place-items-center py-8 text-sm text-muted-foreground">
      {t("studio.noData") ?? "لا توجد بيانات"}
    </div>
  );
}

export function ChapterVersionHistory({ chapterId }: { chapterId: string }) {
  const t = useT();
  const timeAgo = useTimeAgo();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["chapter-versions", chapterId],
    queryFn: () => fetchChapterVersions(chapterId),
    staleTime: 30_000,
  });
  if (isLoading) return <Empty />;
  if (!data?.length) return <Empty />;
  async function restore(id: string) {
    if (
      !(await confirmDialog({
        title: t("studio.confirmRestore"),
        confirmLabel: t("studio.restore"),
      }))
    )
      return;
    try {
      await restoreChapterVersion(id);
      toast.success(t("studio.restored"));
      qc.invalidateQueries({ queryKey: ["chapter-versions", chapterId] });
      qc.invalidateQueries({ queryKey: ["chapter-edit", chapterId] });
    } catch (e) {
      showError(e);
    }
  }
  return (
    <ul className="divide-y divide-border/40">
      {data.map((v) => (
        <li
          key={v.id}
          className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 py-2 text-sm"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-surface">
            <History className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <div className="truncate font-bold">
              {t("studio.version")} #{v.version_no}
              {v.editor_name ? ` · ${v.editor_name}` : ""}
            </div>
            <div className="text-xs text-muted-foreground">
              {timeAgo(v.created_at)} · {v.content_len_ar + v.content_len_en} {t("studio.chars")}
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={() => restore(v.id)}>
            {t("studio.restore")}
          </Button>
        </li>
      ))}
    </ul>
  );
}
