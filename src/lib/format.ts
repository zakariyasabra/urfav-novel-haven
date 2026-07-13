import { usePreferences } from "@/i18n/provider";

export function formatViews(n: number | null | undefined): string {
  const v = n ?? 0;
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + "M";
  if (v >= 1_000) return (v / 1_000).toFixed(1) + "K";
  return String(v);
}

// Kept for legacy imports — components that render inside <PreferencesProvider>
// should prefer useStatusLabel(). This default uses Arabic to preserve behavior
// for older call sites.
export function statusLabel(status: string): string {
  switch (status) {
    case "ongoing": return "مستمرة";
    case "completed": return "مكتملة";
    case "hiatus": return "متوقفة";
    default: return status;
  }
}

export function useStatusLabel() {
  const { t } = usePreferences();
  return (status: string) => {
    if (status === "ongoing") return t("novel.status.ongoing");
    if (status === "completed") return t("novel.status.completed");
    if (status === "hiatus") return t("novel.status.hiatus");
    return status;
  };
}

const AR = {
  moments: "منذ لحظات",
  m: (n: number) => `منذ ${n} دقيقة`,
  h: (n: number) => `منذ ${n} ساعة`,
  d: (n: number) => `منذ ${n} يوم`,
  mo: (n: number) => `منذ ${n} شهر`,
  y: (n: number) => `منذ ${n} سنة`,
};
const EN = {
  moments: "just now",
  m: (n: number) => `${n} min${n === 1 ? "" : "s"} ago`,
  h: (n: number) => `${n} hour${n === 1 ? "" : "s"} ago`,
  d: (n: number) => `${n} day${n === 1 ? "" : "s"} ago`,
  mo: (n: number) => `${n} month${n === 1 ? "" : "s"} ago`,
  y: (n: number) => `${n} year${n === 1 ? "" : "s"} ago`,
};

function fmt(iso: string, L: typeof AR): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const s = Math.max(1, Math.floor((now - then) / 1000));
  if (s < 60) return L.moments;
  const m = Math.floor(s / 60);
  if (m < 60) return L.m(m);
  const h = Math.floor(m / 60);
  if (h < 24) return L.h(h);
  const d = Math.floor(h / 24);
  if (d < 30) return L.d(d);
  const mo = Math.floor(d / 30);
  if (mo < 12) return L.mo(mo);
  return L.y(Math.floor(mo / 12));
}

export function timeAgoAr(iso: string): string { return fmt(iso, AR); }
export function timeAgoEn(iso: string): string { return fmt(iso, EN); }

export function useTimeAgo() {
  const { lang } = usePreferences();
  return (iso: string) => (lang === "en" ? timeAgoEn(iso) : timeAgoAr(iso));
}
