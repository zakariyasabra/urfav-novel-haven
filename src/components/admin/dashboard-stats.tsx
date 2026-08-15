import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatViews } from "@/lib/format";
import { fetchAdminViewsOverview, fetchAdminViewsTimeseries } from "@/lib/views-api";
import { useT, usePreferences } from "@/i18n/provider";
import {
  BookOpen,
  Layers,
  Users,
  MessageSquare,
  Crown,
  Eye,
  Coins,
  Wallet,
  UserCog,
  ShieldCheck,
  PenSquare,
  Clock,
  CreditCard,
  TrendingUp,
} from "lucide-react";
import { useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from "recharts";

interface Overview {
  users_total: number;
  users_new_7d: number;
  users_new_30d: number;
  vip_active: number;
  authors: number;
  editors: number;
  moderators: number;
  admins: number;
  novels_total: number;
  novels_published: number;
  chapters_total: number;
  chapters_published: number;
  views_total: number;
  comments_total: number;
  revenue_coins: number;
  coins_in_circulation: number;
  pending_payments: number;
  pending_withdrawals: number;
}

interface SeriesRow {
  day: string;
  new_users: number;
  new_novels: number;
  new_chapters: number;
  revenue_coins: number;
}

type Range = 7 | 30 | 90 | 365;

export function DashboardStats() {
  const t = useT();
  const { lang } = usePreferences();
  const locale = lang === "en" ? "en-US" : "ar-EG";
  const [range, setRange] = useState<Range>(30);

  const ovr = useQuery({
    queryKey: ["admin-overview"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_dashboard_overview");
      if (error) throw error;
      return data as unknown as Overview;
    },
    staleTime: 60_000,
  });

  const ts = useQuery({
    queryKey: ["admin-timeseries", range],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_timeseries", { _days: range });
      if (error) throw error;
      return (data ?? []) as unknown as SeriesRow[];
    },
    staleTime: 60_000,
  });

  // Real views analytics (public.view_events)
  const viewsOvr = useQuery({
    queryKey: ["admin-views-overview"],
    queryFn: fetchAdminViewsOverview,
    staleTime: 60_000,
    retry: false,
  });
  const viewsTs = useQuery({
    queryKey: ["admin-views-timeseries", range],
    queryFn: () => fetchAdminViewsTimeseries(range),
    staleTime: 60_000,
    retry: false,
  });
  const v = viewsOvr.data;

  const activity = useQuery({
    queryKey: ["admin-activity"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("id, action, target_type, created_at, actor_id")
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 30_000,
  });

  const o = ovr.data;
  const viewsChart = (viewsTs.data ?? []).map((r) => ({
    day: new Date(r.day).toLocaleDateString(locale, { month: "short", day: "numeric" }),
    views: r.views,
    novelViews: r.novel_views,
    chapterViews: r.chapter_views,
    visitors: r.visitors,
  }));
  const chartData = (ts.data ?? []).map((r) => ({
    day: new Date(r.day).toLocaleDateString(locale, { month: "short", day: "numeric" }),
    users: r.new_users,
    novels: r.new_novels,
    chapters: r.new_chapters,
    revenue: r.revenue_coins,
  }));

  return (
    <div className="space-y-6">
      {/* KPI grid */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <Kpi
          icon={<Users />}
          label={t("dash.kpi.users")}
          value={o?.users_total}
          sub={t("dash.kpi.users.sub", { n: o?.users_new_7d ?? 0 })}
        />
        <Kpi icon={<Crown />} label={t("dash.kpi.vip")} value={o?.vip_active} accent="gold" />
        <Kpi
          icon={<BookOpen />}
          label={t("dash.kpi.novels")}
          value={o?.novels_total}
          sub={t("dash.kpi.novels.sub", { n: o?.novels_published ?? 0 })}
        />
        <Kpi
          icon={<Layers />}
          label={t("dash.kpi.chapters")}
          value={o?.chapters_total}
          sub={t("dash.kpi.chapters.sub", { n: o?.chapters_published ?? 0 })}
        />
        <Kpi
          icon={<Eye />}
          label={t("dash.kpi.views")}
          value={v ? v.views_total : o?.views_total}
          sub={v ? t("dash.kpi.views.sub", { n: v.views_7d }) : undefined}
        />
        <Kpi
          icon={<Users />}
          label={t("dash.kpi.visitors")}
          value={v?.visitors_total}
          sub={v ? t("dash.kpi.visitors.sub", { n: v.visitors_30d }) : undefined}
        />
        <Kpi icon={<MessageSquare />} label={t("dash.kpi.comments")} value={o?.comments_total} />
        <Kpi
          icon={<Coins />}
          label={t("dash.kpi.revenue")}
          value={o?.revenue_coins}
          accent="gold"
        />
        <Kpi icon={<Wallet />} label={t("dash.kpi.circulation")} value={o?.coins_in_circulation} />
      </section>

      {/* Team roles */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MiniStat
          icon={<PenSquare className="h-4 w-4" />}
          label={t("dash.kpi.authors")}
          value={o?.authors}
        />
        <MiniStat
          icon={<UserCog className="h-4 w-4" />}
          label={t("dash.kpi.editors")}
          value={o?.editors}
        />
        <MiniStat
          icon={<ShieldCheck className="h-4 w-4" />}
          label={t("dash.kpi.moderators")}
          value={o?.moderators}
        />
        <MiniStat
          icon={<ShieldCheck className="h-4 w-4 text-primary" />}
          label={t("dash.kpi.admins")}
          value={o?.admins}
        />
      </section>

      {/* Pending queues */}
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Pending
          icon={<CreditCard />}
          label={t("dash.kpi.pendingPay")}
          value={o?.pending_payments}
        />
        <Pending
          icon={<Wallet />}
          label={t("dash.kpi.pendingWith")}
          value={o?.pending_withdrawals}
        />
      </section>

      {/* Range selector */}
      <div className="flex flex-wrap items-center gap-2">
        {([7, 30, 90, 365] as Range[]).map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${range === r ? "border-primary bg-primary/15 text-primary" : "border-border/40 bg-surface/40 hover:border-primary/40"}`}
          >
            {t(`dash.range.${r}`)}
          </button>
        ))}
      </div>

      {/* Charts */}
      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ChartCard title={t("dash.section.growth")} icon={<TrendingUp className="h-4 w-4" />}>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="gUsers" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.5} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.3)" />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                allowDecimals={false}
              />
              <Tooltip contentStyle={tooltipStyle} />
              <Area
                type="monotone"
                dataKey="users"
                name={t("dash.chart.newUsers")}
                stroke="hsl(var(--primary))"
                fill="url(#gUsers)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title={t("dash.section.views")} icon={<Eye className="h-4 w-4" />}>
          {viewsTs.isError ? (
            <p className="p-4 text-center text-xs text-muted-foreground">{t("dash.views.error")}</p>
          ) : (
            <>
              <div className="mb-3 grid grid-cols-3 gap-2 text-center">
                <MiniStat
                  icon={<Eye className="h-4 w-4" />}
                  label={t("dash.views.novels")}
                  value={v?.novel_views}
                />
                <MiniStat
                  icon={<Layers className="h-4 w-4" />}
                  label={t("dash.views.chapters")}
                  value={v?.chapter_views}
                />
                <MiniStat
                  icon={<Clock className="h-4 w-4" />}
                  label={t("dash.views.today")}
                  value={v?.views_today}
                />
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={viewsChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.3)" />
                  <XAxis
                    dataKey="day"
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    allowDecimals={false}
                  />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Area
                    type="monotone"
                    dataKey="novelViews"
                    name={t("dash.views.novels")}
                    stroke="hsl(var(--primary))"
                    fill="hsl(var(--primary) / 0.15)"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="chapterViews"
                    name={t("dash.views.chapters")}
                    stroke="hsl(var(--accent))"
                    fill="hsl(var(--accent) / 0.15)"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="visitors"
                    name={t("dash.views.visitors")}
                    stroke="hsl(var(--muted-foreground))"
                    fill="transparent"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </>
          )}
        </ChartCard>

        <ChartCard title={t("dash.section.revenue")} icon={<Coins className="h-4 w-4" />}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.3)" />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                allowDecimals={false}
              />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar
                dataKey="revenue"
                name={t("dash.chart.coins")}
                fill="hsl(var(--primary))"
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title={t("dash.chart.newNovels") + " / " + t("dash.chart.newChapters")}
          icon={<BookOpen className="h-4 w-4" />}
        >
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.3)" />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                allowDecimals={false}
              />
              <Tooltip contentStyle={tooltipStyle} />
              <Area
                type="monotone"
                dataKey="novels"
                name={t("dash.chart.newNovels")}
                stroke="hsl(var(--primary))"
                fill="hsl(var(--primary) / 0.15)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="chapters"
                name={t("dash.chart.newChapters")}
                stroke="hsl(var(--accent))"
                fill="hsl(var(--accent) / 0.15)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title={t("dash.section.activity")} icon={<Clock className="h-4 w-4" />}>
          <ul className="max-h-[220px] space-y-2 overflow-auto pe-1 text-sm">
            {(activity.data ?? []).map((a) => (
              <li
                key={a.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-border/30 bg-surface/30 px-3 py-2"
              >
                <span className="truncate">
                  <span className="font-semibold">{a.action}</span>{" "}
                  {a.target_type && (
                    <span className="text-muted-foreground">— {a.target_type}</span>
                  )}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {new Date(a.created_at).toLocaleString(locale)}
                </span>
              </li>
            ))}
            {(activity.data ?? []).length === 0 && (
              <li className="rounded-lg border border-dashed border-border/40 p-4 text-center text-xs text-muted-foreground">
                {t("dash.activity.empty")}
              </li>
            )}
          </ul>
        </ChartCard>
      </section>
    </div>
  );
}

const tooltipStyle = {
  background: "hsl(var(--surface))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "0.5rem",
  fontSize: "12px",
} as const;

function Kpi({
  icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value?: number;
  sub?: string;
  accent?: "gold";
}) {
  return (
    <div className="rounded-2xl border border-border/40 bg-surface/40 p-4 sm:p-5">
      <div
        className={`mb-2 grid h-10 w-10 place-items-center rounded-lg ${accent === "gold" ? "bg-primary/15 text-primary" : "bg-primary/10 text-primary"}`}
      >
        {icon}
      </div>
      <div className="text-2xl font-black sm:text-3xl">
        {value == null ? "—" : formatViews(value)}
      </div>
      <div className="text-xs text-muted-foreground sm:text-sm">{label}</div>
      {sub && <div className="mt-1 text-[11px] text-muted-foreground/80">{sub}</div>}
    </div>
  );
}

function MiniStat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value?: number;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-border/40 bg-surface/30 px-4 py-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <div className="text-lg font-bold">{value ?? 0}</div>
    </div>
  );
}

function Pending({ icon, label, value }: { icon: React.ReactNode; label: string; value?: number }) {
  const has = (value ?? 0) > 0;
  return (
    <div
      className={`flex items-center justify-between rounded-xl border p-4 ${has ? "border-primary/40 bg-primary/5" : "border-border/40 bg-surface/30"}`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`grid h-9 w-9 place-items-center rounded-lg ${has ? "bg-primary/15 text-primary" : "bg-surface/60 text-muted-foreground"}`}
        >
          {icon}
        </div>
        <div className="text-sm">{label}</div>
      </div>
      <div className={`text-2xl font-black ${has ? "text-primary" : ""}`}>{value ?? 0}</div>
    </div>
  );
}

function ChartCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border/40 bg-surface/40 p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-bold">
        {icon}
        {title}
      </div>
      {children}
    </div>
  );
}
