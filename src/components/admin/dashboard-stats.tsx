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

      const o = data as unknown as Overview;

      const { data: sa } = await supabase.from("super_admins").select("user_id");
      const saIds = (sa ?? []).map((r: { user_id: string }) => r.user_id);

      if (saIds.length === 0) return o;

      const { data: saRoles } = await supabase
        .from("user_roles")
        .select("user_id,role")
        .in("user_id", saIds);

      const counts = {
        admin: 0,
        moderator: 0,
        editor: 0,
        author: 0,
      } as Record<string, number>;

      for (const r of (saRoles ?? []) as Array<{ role: string }>) {
        if (r.role in counts) counts[r.role] += 1;
      }

      return {
        ...o,
        admins: Math.max(0, (o.admins ?? 0) - counts.admin),
        moderators: Math.max(0, (o.moderators ?? 0) - counts.moderator),
        editors: Math.max(0, (o.editors ?? 0) - counts.editor),
        authors: Math.max(0, (o.authors ?? 0) - counts.author),
      } as Overview;
    },
    staleTime: 60_000,
  });

  const ts = useQuery({
    queryKey: ["admin-timeseries", range],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_timeseries", {
        _days: range,
      });

      if (error) throw error;

      return (data ?? []) as unknown as SeriesRow[];
    },
    staleTime: 60_000,
  });

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
  const v = viewsOvr.data;

  const viewsChart = (viewsTs.data ?? []).map((r) => ({
    day: new Date(r.day).toLocaleDateString(locale, {
      month: "short",
      day: "numeric",
    }),
    views: r.views,
    novelViews: r.novel_views,
    chapterViews: r.chapter_views,
    visitors: r.visitors,
  }));

  const chartData = (ts.data ?? []).map((r) => ({
    day: new Date(r.day).toLocaleDateString(locale, {
      month: "short",
      day: "numeric",
    }),
    users: r.new_users,
    novels: r.new_novels,
    chapters: r.new_chapters,
    revenue: r.revenue_coins,
  }));

  return (
    <div className="space-y-6">
      {/* أهم الأرقام */}
      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi
          icon={<Eye />}
          label="إجمالي المشاهدات"
          value={v ? v.views_total : o?.views_total}
          sub={v ? `آخر 7 أيام: ${formatViews(v.views_7d)}` : undefined}
          featured
        />

        <Kpi
          icon={<Users />}
          label="إجمالي الزوار الفريدين"
          value={v?.visitors_total}
          sub={v ? `آخر 30 يوم: ${formatViews(v.visitors_30d)}` : undefined}
          featured
        />

        <Kpi
          icon={<Clock />}
          label="مشاهدات اليوم"
          value={v?.views_today}
        />

        <Kpi
          icon={<Users />}
          label={t("dash.kpi.users")}
          value={o?.users_total}
          sub={t("dash.kpi.users.sub", {
            n: o?.users_new_7d ?? 0,
          })}
        />
      </section>

      {/* محتوى المنصة */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi
          icon={<BookOpen />}
          label={t("dash.kpi.novels")}
          value={o?.novels_total}
          sub={t("dash.kpi.novels.sub", {
            n: o?.novels_published ?? 0,
          })}
        />

        <Kpi
          icon={<Layers />}
          label={t("dash.kpi.chapters")}
          value={o?.chapters_total}
          sub={t("dash.kpi.chapters.sub", {
            n: o?.chapters_published ?? 0,
          })}
        />

        <Kpi
          icon={<MessageSquare />}
          label={t("dash.kpi.comments")}
          value={o?.comments_total}
        />

        <Kpi
          icon={<Crown />}
          label={t("dash.kpi.vip")}
          value={o?.vip_active}
          accent="gold"
        />
      </section>

      {/* الفريق */}
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

      {/* الطلبات */}
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

      {/* الفترة */}
      <div className="flex flex-wrap items-center gap-2">
        {([7, 30, 90, 365] as Range[]).map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`rounded-xl border px-4 py-2 text-xs font-bold transition ${
              range === r
                ? "border-primary bg-primary/15 text-primary"
                : "border-border/50 bg-surface/50 text-muted-foreground hover:border-primary/40 hover:text-foreground"
            }`}
          >
            {t(`dash.range.${r}`)}
          </button>
        ))}
      </div>

      {/* الرسم الرئيسي */}
      <ChartCard
        title="المشاهدات والزوار"
        icon={<Eye className="h-4 w-4 text-primary" />}
        large
      >
        {viewsTs.isError ? (
          <p className="py-16 text-center text-sm text-muted-foreground">
            {t("dash.views.error")}
          </p>
        ) : (
          <>
            <div className="mb-5 grid grid-cols-3 gap-3">
              <MiniStat
                icon={<Eye className="h-4 w-4 text-primary" />}
                label={t("dash.views.novels")}
                value={v?.novel_views}
              />

              <MiniStat
                icon={<Layers className="h-4 w-4 text-primary" />}
                label={t("dash.views.chapters")}
                value={v?.chapter_views}
              />

              <MiniStat
                icon={<Clock className="h-4 w-4 text-primary" />}
                label={t("dash.views.today")}
                value={v?.views_today}
              />
            </div>

            <ResponsiveContainer width="100%" height={330}>
              <AreaChart
                data={viewsChart}
                margin={{
                  top: 10,
                  right: 8,
                  left: 0,
                  bottom: 0,
                }}
              >
                <defs>
                  <linearGradient
                    id="novelViewsGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor="hsl(var(--primary))"
                      stopOpacity={0.45}
                    />
                    <stop
                      offset="95%"
                      stopColor="hsl(var(--primary))"
                      stopOpacity={0.02}
                    />
                  </linearGradient>

                  <linearGradient
                    id="chapterViewsGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor="hsl(var(--accent))"
                      stopOpacity={0.28}
                    />
                    <stop
                      offset="95%"
                      stopColor="hsl(var(--accent))"
                      stopOpacity={0.02}
                    />
                  </linearGradient>
                </defs>

                <CartesianGrid
                  strokeDasharray="4 6"
                  stroke="hsl(var(--foreground) / 0.08)"
                  vertical={false}
                />

                <XAxis
                  dataKey="day"
                  tick={{
                    fontSize: 11,
                    fill: "hsl(var(--foreground) / 0.6)",
                  }}
                  axisLine={{
                    stroke: "hsl(var(--foreground) / 0.12)",
                  }}
                  tickLine={false}
                  minTickGap={24}
                />

                <YAxis
                  tick={{
                    fontSize: 11,
                    fill: "hsl(var(--foreground) / 0.6)",
                  }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                  width={45}
                />

                <Tooltip contentStyle={tooltipStyle} />

                <Area
                  type="monotone"
                  dataKey="novelViews"
                  name={t("dash.views.novels")}
                  stroke="hsl(var(--primary))"
                  fill="url(#novelViewsGradient)"
                  strokeWidth={3}
                  activeDot={{ r: 5 }}
                />

                <Area
                  type="monotone"
                  dataKey="chapterViews"
                  name={t("dash.views.chapters")}
                  stroke="hsl(var(--accent))"
                  fill="url(#chapterViewsGradient)"
                  strokeWidth={2.5}
                  activeDot={{ r: 4 }}
                />

                <Area
                  type="monotone"
                  dataKey="visitors"
                  name={t("dash.views.visitors")}
                  stroke="hsl(var(--foreground) / 0.72)"
                  fill="transparent"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  activeDot={{ r: 4 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </>
        )}
      </ChartCard>

      {/* الرسوم الثانوية */}
      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ChartCard
          title={t("dash.section.growth")}
          icon={<TrendingUp className="h-4 w-4 text-primary" />}
        >
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient
                  id="usersGradient"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="5%"
                    stopColor="hsl(var(--primary))"
                    stopOpacity={0.4}
                  />
                  <stop
                    offset="95%"
                    stopColor="hsl(var(--primary))"
                    stopOpacity={0.02}
                  />
                </linearGradient>
              </defs>

              <CartesianGrid
                strokeDasharray="4 6"
                stroke="hsl(var(--foreground) / 0.08)"
                vertical={false}
              />

              <XAxis
                dataKey="day"
                tick={{
                  fontSize: 11,
                  fill: "hsl(var(--foreground) / 0.6)",
                }}
                axisLine={false}
                tickLine={false}
                minTickGap={22}
              />

              <YAxis
                tick={{
                  fontSize: 11,
                  fill: "hsl(var(--foreground) / 0.6)",
                }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />

              <Tooltip contentStyle={tooltipStyle} />

              <Area
                type="monotone"
                dataKey="users"
                name={t("dash.chart.newUsers")}
                stroke="hsl(var(--primary))"
                fill="url(#usersGradient)"
                strokeWidth={3}
                activeDot={{ r: 5 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title={`${t("dash.chart.newNovels")} / ${t(
            "dash.chart.newChapters",
          )}`}
          icon={<BookOpen className="h-4 w-4 text-primary" />}
        >
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={chartData}>
              <CartesianGrid
                strokeDasharray="4 6"
                stroke="hsl(var(--foreground) / 0.08)"
                vertical={false}
              />

              <XAxis
                dataKey="day"
                tick={{
                  fontSize: 11,
                  fill: "hsl(var(--foreground) / 0.6)",
                }}
                axisLine={false}
                tickLine={false}
                minTickGap={22}
              />

              <YAxis
                tick={{
                  fontSize: 11,
                  fill: "hsl(var(--foreground) / 0.6)",
                }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />

              <Tooltip contentStyle={tooltipStyle} />

              <Area
                type="monotone"
                dataKey="novels"
                name={t("dash.chart.newNovels")}
                stroke="hsl(var(--primary))"
                fill="hsl(var(--primary) / 0.16)"
                strokeWidth={2.5}
              />

              <Area
                type="monotone"
                dataKey="chapters"
                name={t("dash.chart.newChapters")}
                stroke="hsl(var(--accent))"
                fill="hsl(var(--accent) / 0.14)"
                strokeWidth={2.5}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      </section>

      {/* أحدث النشاط */}
      <ChartCard
        title={t("dash.section.activity")}
        icon={<Clock className="h-4 w-4 text-primary" />}
      >
        <ul className="max-h-[320px] space-y-2 overflow-auto pe-1 text-sm">
          {(activity.data ?? []).map((a) => (
            <li
              key={a.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-border/40 bg-background/20 px-4 py-3"
            >
              <span className="min-w-0 truncate">
                <span className="font-semibold">{a.action}</span>

                {a.target_type && (
                  <span className="text-muted-foreground">
                    {" "}
                    — {a.target_type}
                  </span>
                )}
              </span>

              <span className="shrink-0 text-xs text-muted-foreground">
                {new Date(a.created_at).toLocaleString(locale)}
              </span>
            </li>
          ))}

          {(activity.data ?? []).length === 0 && (
            <li className="rounded-xl border border-dashed border-border/50 p-6 text-center text-xs text-muted-foreground">
              {t("dash.activity.empty")}
            </li>
          )}
        </ul>
      </ChartCard>

      {/* العملات فقط إذا كانت مستخدمة */}
      {(o?.revenue_coins ?? 0) > 0 || (o?.coins_in_circulation ?? 0) > 0 ? (
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Kpi
            icon={<Coins />}
            label={t("dash.kpi.revenue")}
            value={o?.revenue_coins}
            accent="gold"
          />

          <Kpi
            icon={<Wallet />}
            label={t("dash.kpi.circulation")}
            value={o?.coins_in_circulation}
          />
        </section>
      ) : null}
    </div>
  );
}

const tooltipStyle = {
  background: "hsl(var(--background))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "0.75rem",
  fontSize: "12px",
  color: "hsl(var(--foreground))",
  boxShadow: "0 12px 40px rgba(0,0,0,.35)",
} as const;

function Kpi({
  icon,
  label,
  value,
  sub,
  accent,
  featured,
}: {
  icon: React.ReactNode;
  label: string;
  value?: number;
  sub?: string;
  accent?: "gold";
  featured?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 transition sm:p-5 ${
        featured
          ? "border-primary/30 bg-primary/[0.06]"
          : "border-border/40 bg-surface/50"
      }`}
    >
      <div
        className={`mb-3 grid h-10 w-10 place-items-center rounded-xl ${
          accent === "gold" || featured
            ? "bg-primary/15 text-primary"
            : "bg-primary/10 text-primary"
        }`}
      >
        {icon}
      </div>

      <div className="text-2xl font-black tracking-tight sm:text-3xl">
        {value == null ? "—" : formatViews(value)}
      </div>

      <div className="mt-1 text-xs font-medium text-foreground/80 sm:text-sm">
        {label}
      </div>

      {sub && (
        <div className="mt-1.5 text-[11px] text-muted-foreground">
          {sub}
        </div>
      )}
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
    <div className="flex items-center justify-between rounded-xl border border-border/40 bg-background/20 px-4 py-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>

      <div className="text-lg font-black text-foreground">
        {value == null ? "—" : formatViews(value)}
      </div>
    </div>
  );
}

function Pending({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value?: number;
}) {
  const has = (value ?? 0) > 0;

  return (
    <div
      className={`flex items-center justify-between rounded-xl border p-4 ${
        has
          ? "border-primary/40 bg-primary/[0.06]"
          : "border-border/40 bg-surface/40"
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`grid h-9 w-9 place-items-center rounded-lg ${
            has
              ? "bg-primary/15 text-primary"
              : "bg-background/50 text-muted-foreground"
          }`}
        >
          {icon}
        </div>

        <div className="text-sm font-medium">{label}</div>
      </div>

      <div
        className={`text-2xl font-black ${
          has ? "text-primary" : "text-foreground"
        }`}
      >
        {value ?? 0}
      </div>
    </div>
  );
}

function ChartCard({
  title,
  icon,
  children,
  large,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  large?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border border-border/40 bg-surface/50 ${
        large ? "p-5 sm:p-6" : "p-4 sm:p-5"
      }`}
    >
      <div className="mb-4 flex items-center gap-2 text-sm font-black text-foreground">
        {icon}
        {title}
      </div>

      {children}
    </div>
  );
}
