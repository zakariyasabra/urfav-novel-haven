import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  User as UserIcon,
  Shield,
  Sparkles,
  Languages,
  Moon,
  Sun,
  Monitor,
  RotateCcw,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useT, usePreferences, LOCALES, type ThemeMode as _TM } from "@/i18n/provider";
import { confirmDialog } from "@/components/ui/dialog-service";
import { GamificationProfile } from "@/components/gamification/profile-panel";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "Profile — FAVNOL" }, { name: "robots", content: "noindex" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const t = useT();
  const { lang, theme, setLang, setTheme, reset } = usePreferences();
  const { user, isAdmin } = useAuth();
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [isVip, setIsVip] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("username,display_name,bio,is_vip")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setUsername(data.username);
          setDisplayName(data.display_name ?? "");
          setBio(data.bio ?? "");
          setIsVip(data.is_vip ?? false);
        }
      });
  }, [user]);

  async function save() {
    if (!user) return;
    setBusy(true);
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: displayName, bio })
      .eq("id", user.id);
    setBusy(false);
    if (error) return toast.error(t("profile.saveFailed"));
    toast.success(t("profile.saved"));
  }

  async function doReset() {
    const ok = await confirmDialog({
      title: t("prefs.reset"),
      body: t("prefs.resetConfirm"),
      confirmLabel: t("common.confirm"),
    });
    if (!ok) return;
    reset();
    toast.success(t("prefs.resetDone"));
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="mb-6 text-3xl font-black md:text-4xl">{t("profile.title")}</h1>

      <div className="mb-6">
        <GamificationProfile />
      </div>

      <div className="rounded-2xl border border-border/60 bg-surface/40 p-6">
        <div className="mb-6 flex items-center gap-4">
          <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary to-primary-glow text-primary-foreground shadow-glow">
            <UserIcon className="h-8 w-8" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-lg font-bold">{displayName || username}</div>
            <div className="truncate text-sm text-muted-foreground">{user?.email}</div>
            <div className="mt-1 flex flex-wrap gap-2">
              {isAdmin && (
                <span className="inline-flex items-center gap-1 rounded-md bg-primary/20 px-2 py-0.5 text-xs font-bold text-primary">
                  <Shield className="h-3 w-3" />
                  {t("profile.admin")}
                </span>
              )}
              {isVip && (
                <span className="inline-flex items-center gap-1 rounded-md bg-gold/20 px-2 py-0.5 text-xs font-bold text-gold">
                  <Sparkles className="h-3 w-3" />
                  VIP
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-semibold">{t("auth.username")}</label>
            <input
              value={username}
              disabled
              className="h-10 w-full rounded-md border border-input bg-background/40 px-3 text-sm text-muted-foreground"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold">{t("profile.displayName")}</label>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background/60 px-3 text-sm outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold">{t("profile.bio")}</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              className="w-full resize-none rounded-md border border-input bg-background/60 p-3 text-sm outline-none focus:border-primary"
            />
          </div>
          <Button
            onClick={save}
            disabled={busy}
            className="bg-gradient-to-r from-primary to-primary-glow text-primary-foreground"
          >
            {t("common.saveChanges")}
          </Button>
        </div>
      </div>

      {/* Appearance & Language */}
      <section className="mt-6 rounded-2xl border border-border/60 bg-surface/40 p-6">
        <h2 className="mb-4 flex items-center gap-2 text-xl font-black">
          <Languages className="h-5 w-5 text-primary" />
          {t("prefs.section")}
        </h2>

        <div className="space-y-5">
          <div>
            <label className="mb-2 block text-xs font-semibold text-muted-foreground">
              {t("prefs.language")}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {LOCALES.map((l) => (
                <button
                  key={l.code}
                  type="button"
                  onClick={() => setLang(l.code)}
                  aria-pressed={lang === l.code}
                  className={`flex items-center justify-center gap-2 rounded-lg border p-3 text-sm font-bold transition-all ${lang === l.code ? "border-primary bg-primary/10 text-primary" : "border-border/60 hover:border-primary/40"}`}
                >
                  <span className="text-lg">{l.flag}</span>
                  {l.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold text-muted-foreground">
              {t("prefs.theme")}
            </label>
            <div className="grid grid-cols-3 gap-2">
              <ThemeChoice
                value="dark"
                current={theme}
                onClick={() => setTheme("dark")}
                icon={<Moon className="h-4 w-4" />}
                label={t("prefs.theme.dark")}
              />
              <ThemeChoice
                value="light"
                current={theme}
                onClick={() => setTheme("light")}
                icon={<Sun className="h-4 w-4" />}
                label={t("prefs.theme.light")}
              />
              <ThemeChoice
                value="system"
                current={theme}
                onClick={() => setTheme("system")}
                icon={<Monitor className="h-4 w-4" />}
                label={t("prefs.theme.system")}
              />
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-border/40 pt-4">
            <p className="text-xs text-muted-foreground">
              {user ? t("prefs.syncedNote") : t("prefs.guestNote")}
            </p>
            <Button variant="outline" size="sm" onClick={doReset}>
              <RotateCcw className="me-1 h-4 w-4" />
              {t("prefs.reset")}
            </Button>
          </div>
        </div>
      </section>

      {!isVip && (
        <div className="mt-6 rounded-2xl border border-gold/40 bg-gold/5 p-6">
          <div className="flex items-center gap-3">
            <Sparkles className="h-6 w-6 shrink-0 text-gold" />
            <div className="min-w-0">
              <div className="font-bold">{t("profile.vipCta.title")}</div>
              <div className="text-sm text-muted-foreground">{t("profile.vipCta.body")}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ThemeChoice({
  value,
  current,
  onClick,
  icon,
  label,
}: {
  value: string;
  current: string;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  const active = current === value;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex items-center justify-center gap-2 rounded-lg border p-3 text-sm font-bold transition-all ${active ? "border-primary bg-primary/10 text-primary" : "border-border/60 hover:border-primary/40"}`}
    >
      {icon}
      {label}
    </button>
  );
}
