// Auto-fires the public English translation pipeline for a novel or chapter.
// - Only runs when the reader is viewing in English AND the target row is
//   missing `_en` fields (best-effort check via passed-in row).
// - Fires once per (entity_type, entity_id) per browser session to avoid
//   hammering the endpoint. The server function itself is idempotent and
//   skips work when translation status is 'done' or 'running'.
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { usePreferences } from "@/i18n/provider";
import { useAuth } from "@/hooks/use-auth";
import { ensureEnglishTranslation } from "@/lib/auto-translate.functions";

const FIRED = new Set<string>();

export function useAutoTranslate(opts: {
  entityType: "novel" | "chapter";
  entityId: string | undefined | null;
  needsTranslation: boolean; // true when _en field(s) are missing/empty for current view
  invalidateKeys?: unknown[][];
}) {
  const { lang } = usePreferences();
  const { user } = useAuth();
  const qc = useQueryClient();
  const fn = useServerFn(ensureEnglishTranslation);

  useEffect(() => {
    if (lang !== "en") return;
    if (!user) return; // endpoint requires auth to prevent AI cost abuse
    if (!opts.entityId) return;
    if (!opts.needsTranslation) return;
    const key = `${opts.entityType}:${opts.entityId}`;
    if (FIRED.has(key)) return;
    FIRED.add(key);
    (async () => {
      try {
        const res = await fn({ data: { entity_type: opts.entityType, entity_id: opts.entityId! } });
        // Refresh queries so the freshly translated content appears.
        if (res && "translated" in res && Array.isArray(res.translated) && res.translated.length > 0) {
          for (const k of opts.invalidateKeys ?? []) {
            qc.invalidateQueries({ queryKey: k });
          }
        }
      } catch {
        // Silent: reader still gets Arabic fallback.
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang, opts.entityId, opts.needsTranslation]);
}
