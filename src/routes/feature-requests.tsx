import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ChevronUp, Lightbulb, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT, usePreferences } from "@/i18n/provider";
import { useAuth } from "@/hooks/use-auth";
import { showError } from "@/lib/errors";
import {
  fetchFeatureRequests,
  submitFeatureRequest,
  fetchMyVotes,
  toggleVote,
  type FRStatus,
} from "@/lib/feature-requests-api";

export const Route = createFileRoute("/feature-requests")({
  head: () => ({
    meta: [
      { title: "Feature Requests — FAVNOL" },
      { name: "description", content: "Vote on and suggest new features for FAVNOL." },
    ],
  }),
  component: FRPage,
});

const STATUSES: (FRStatus | "all")[] = [
  "all",
  "submitted",
  "planned",
  "accepted",
  "in_progress",
  "completed",
  "rejected",
];

function FRPage() {
  const t = useT();
  const { lang } = usePreferences();
  const locale = lang === "en" ? "en-US" : "ar-EG";
  const { user } = useAuth();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<FRStatus | "all">("all");
  const q = useQuery({
    queryKey: ["feature-requests", filter],
    queryFn: () => fetchFeatureRequests(filter === "all" ? undefined : filter),
  });
  const votesQ = useQuery({
    queryKey: ["fr-votes", user?.id],
    queryFn: fetchMyVotes,
    enabled: !!user,
  });
  const votes = votesQ.data ?? new Set<string>();

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [busy, setBusy] = useState(false);

  async function vote(id: string) {
    if (!user) {
      toast.error(t("fr.needAuth"));
      return;
    }
    const on = !votes.has(id);
    try {
      await toggleVote(id, on);
      qc.invalidateQueries({ queryKey: ["fr-votes", user.id] });
      qc.invalidateQueries({ queryKey: ["feature-requests", filter] });
    } catch (e) {
      showError(e);
    }
  }

  async function submit() {
    if (!title.trim() || !desc.trim()) {
      toast.error(t("fr.required"));
      return;
    }
    setBusy(true);
    try {
      await submitFeatureRequest({ title, description: desc });
      toast.success(t("fr.submitted"));
      setTitle("");
      setDesc("");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["feature-requests"] });
    } catch (e) {
      showError(e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <header className="mb-6 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 text-2xl font-black md:text-3xl">
            <Lightbulb className="h-6 w-6 text-primary" />
            {t("fr.title")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("fr.subtitle")}</p>
        </div>
        {user && (
          <Button onClick={() => setOpen((v) => !v)}>
            <Plus className="me-1 h-4 w-4" />
            {t("fr.new")}
          </Button>
        )}
      </header>

      {open && (
        <div className="mb-6 rounded-2xl border border-border/50 bg-surface/40 p-4">
          <label className="block text-xs font-semibold">
            {t("fr.reqTitle")}
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              className="mt-1 h-10 w-full rounded-md border border-input bg-background/60 px-3 text-sm"
            />
          </label>
          <label className="mt-3 block text-xs font-semibold">
            {t("fr.description")}
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              rows={5}
              maxLength={3000}
              className="mt-1 w-full rounded-md border border-input bg-background/60 p-3 text-sm"
            />
          </label>
          <div className="mt-3 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={submit} disabled={busy}>
              {busy ? t("common.saving") : t("fr.submit")}
            </Button>
          </div>
        </div>
      )}

      <div className="mb-4 -mx-4 flex gap-2 overflow-x-auto px-4 no-scrollbar">
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold ${
              filter === s
                ? "border-primary bg-primary/10 text-primary"
                : "border-border/60 text-muted-foreground"
            }`}
          >
            {s === "all" ? t("fr.filter.all") : t(`fr.status.${s}`)}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {(q.data ?? []).map((r) => {
          const voted = votes.has(r.id);
          return (
            <div
              key={r.id}
              className="grid grid-cols-[64px_minmax(0,1fr)_auto] items-start gap-3 rounded-xl border border-border/40 bg-surface/40 p-4"
            >
              <button
                onClick={() => vote(r.id)}
                className={`flex h-16 w-16 flex-col items-center justify-center rounded-lg border-2 transition-all ${
                  voted
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-border/60 hover:border-primary/60"
                }`}
              >
                <ChevronUp className="h-5 w-5" />
                <span className="text-sm font-black">{r.votes_count}</span>
              </button>
              <div className="min-w-0">
                <div className="font-bold">{r.title}</div>
                <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-sm text-muted-foreground">
                  {r.description}
                </p>
                {r.admin_note && (
                  <div className="mt-2 rounded-md bg-primary/10 p-2 text-xs text-primary">
                    <span className="font-bold">{t("fr.adminNote")}:</span> {r.admin_note}
                  </div>
                )}
                <div className="mt-2 text-[11px] text-muted-foreground">
                  {new Date(r.created_at).toLocaleDateString(locale)}
                </div>
              </div>
              <span className="shrink-0 rounded-md bg-secondary px-2 py-1 text-[11px] font-semibold">
                {t(`fr.status.${r.status}`)}
              </span>
            </div>
          );
        })}
        {!q.isLoading && (q.data?.length ?? 0) === 0 && (
          <div className="rounded-2xl border border-dashed border-border/60 bg-surface/30 p-12 text-center text-sm text-muted-foreground">
            {t("fr.empty")}
          </div>
        )}
      </div>
    </div>
  );
}
