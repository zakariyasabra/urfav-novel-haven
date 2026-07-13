import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { fetchAnnouncements, type Announcement } from "@/lib/monetization-api";
import { useT } from "@/i18n/provider";

const DISMISS_KEY = "urfav_dismissed_announcements";



export function AnnouncementBanner() {
  const t = useT();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  useEffect(() => {
    try { const raw = localStorage.getItem(DISMISS_KEY); if (raw) setDismissed(new Set(JSON.parse(raw))); }
    catch { /* ignore */ }
  }, []);
  const q = useQuery({ queryKey: ["announcements", "banner"], queryFn: () => fetchAnnouncements("banner"), staleTime: 60_000 });
  const first = (q.data ?? []).find((a) => !dismissed.has(a.id));
  if (!first) return null;
  function dismiss(a: Announcement) {
    const next = new Set(dismissed); next.add(a.id);
    setDismissed(next);
    try { localStorage.setItem(DISMISS_KEY, JSON.stringify([...next])); } catch { /* ignore */ }
  }
  const body = (
    <>
      <span className="font-bold">{first.title}</span>
      {first.body && <span className="ms-2 opacity-90">— {first.body}</span>}
    </>
  );
  return (
    <div className="relative z-40 bg-gradient-to-r from-primary via-primary-glow to-primary py-2 text-center text-sm text-primary-foreground">
      {first.link_url ? (
        <a href={first.link_url} target="_blank" rel="noreferrer" className="hover:underline">{body}</a>
      ) : body}
      <button onClick={() => dismiss(first)} aria-label={t("common.close")}
        className="absolute end-2 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-full hover:bg-black/10">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function AnnouncementPopup() {
  const t = useT();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [openId, setOpenId] = useState<string | null>(null);
  useEffect(() => {
    try { const raw = localStorage.getItem(DISMISS_KEY + "_popup"); if (raw) setDismissed(new Set(JSON.parse(raw))); }
    catch { /* ignore */ }
  }, []);
  const q = useQuery({ queryKey: ["announcements", "popup"], queryFn: () => fetchAnnouncements("popup"), staleTime: 60_000 });
  useEffect(() => {
    const first = (q.data ?? []).find((a) => !dismissed.has(a.id));
    if (first) { const t = setTimeout(() => setOpenId(first.id), 1500); return () => clearTimeout(t); }
  }, [q.data, dismissed]);
  if (!openId) return null;
  const a = (q.data ?? []).find((x) => x.id === openId);
  if (!a) return null;
  function close() {
    const next = new Set(dismissed); next.add(openId!);
    setDismissed(next);
    try { localStorage.setItem(DISMISS_KEY + "_popup", JSON.stringify([...next])); } catch { /* ignore */ }
    setOpenId(null);
  }
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4" onClick={close}>
      <div className="relative w-full max-w-md rounded-2xl border border-primary/40 bg-surface p-6 shadow-elevated" onClick={(e) => e.stopPropagation()}>
        <button onClick={close} className="absolute end-3 top-3 grid h-8 w-8 place-items-center rounded-full hover:bg-secondary"><X className="h-4 w-4" /></button>
        <h3 className="mb-3 text-2xl font-black">{a.title}</h3>
        {a.body && <p className="mb-4 whitespace-pre-line text-sm text-foreground/85">{a.body}</p>}
        {a.link_url && (
          <a href={a.link_url} target="_blank" rel="noreferrer"
            className="inline-flex h-10 items-center rounded-md bg-gradient-to-r from-primary to-primary-glow px-4 text-sm font-bold text-primary-foreground">
            {t("common.readMore")}
          </a>
        )}
      </div>
    </div>
  );
}
