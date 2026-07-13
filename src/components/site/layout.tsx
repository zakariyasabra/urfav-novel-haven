import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { Search, User as UserIcon, Library, LogOut, Shield, BookOpen, Crown, PenLine, Wallet, Languages, Moon, Sun, Monitor } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { NotificationsBell } from "@/components/notifications-bell";
import { useT, usePreferences, LOCALES } from "@/i18n/provider";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel,
  DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSub,
  DropdownMenuSubTrigger, DropdownMenuSubContent, DropdownMenuPortal,
} from "@/components/ui/dropdown-menu";

export function SiteHeader() {
  const { user, isAdmin, isAuthor, signOut } = useAuth();
  const t = useT();
  const { lang, theme, setLang, setTheme } = usePreferences();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const isReader = /^\/novels\/[^/]+\/\d+/.test(pathname);
  if (isReader) return null;

  const nav: { to: string; label: string; accent?: boolean }[] = [
    { to: "/", label: t("nav.home") },
    { to: "/latest", label: t("nav.latest") },
    { to: "/popular", label: t("nav.popular") },
    { to: "/categories", label: t("nav.categories") },
    { to: "/completed", label: t("nav.completed") },
    { to: "/vip", label: t("nav.vip"), accent: true },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/85 backdrop-blur-xl pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4">
        <Link to="/" className="flex shrink-0 items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-primary to-primary-glow shadow-glow">
            <BookOpen className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="hidden sm:block">
            <div className="text-lg font-black tracking-tight">
              UR <span className="text-gradient-primary">Fav</span> Novel
            </div>
          </div>
        </Link>

        <nav className="hidden flex-1 items-center justify-center gap-1 lg:flex">
          {nav.map((n) => {
            const active = pathname === n.to;
            return (
              <Link key={n.to} to={n.to as "/"}
                className={`inline-flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  n.accent
                    ? "bg-gradient-to-r from-primary/20 to-primary-glow/20 text-primary-glow hover:from-primary/30 hover:to-primary-glow/30"
                    : active
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}>
                {n.accent && <Crown className="h-3.5 w-3.5" />}
                {n.label}
              </Link>
            );
          })}
        </nav>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            const query = q.trim();
            if (query) navigate({ to: "/search", search: { q: query } });
          }}
          className="ms-auto hidden items-center md:flex">
          <div className="relative">
            <Search className={`pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground ${lang === "ar" ? "end-2.5" : "start-2.5"}`} />
            <input value={q} onChange={(e) => setQ(e.target.value)}
              placeholder={t("common.searchPlaceholder")}
              className={`h-9 w-56 rounded-md border border-input bg-secondary/50 text-sm outline-none placeholder:text-muted-foreground focus:border-primary ${lang === "ar" ? "ps-3 pe-9" : "pe-3 ps-9"}`} />
          </div>
        </form>

        <Link to="/search" aria-label={t("nav.search")} className="grid h-9 w-9 place-items-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground md:hidden">
          <Search className="h-5 w-5" />
        </Link>

        {/* Language & theme quick switcher */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full" aria-label={t("prefs.section")}>
              <Languages className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>{t("prefs.language")}</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={lang} onValueChange={(v) => setLang(v as "ar" | "en")}>
              {LOCALES.map((l) => (
                <DropdownMenuRadioItem key={l.code} value={l.code}>
                  <span className="me-2">{l.flag}</span>{l.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>{t("prefs.theme")}</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={theme} onValueChange={(v) => setTheme(v as "dark" | "light" | "system")}>
              <DropdownMenuRadioItem value="dark"><Moon className="me-2 h-4 w-4" />{t("prefs.theme.dark")}</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="light"><Sun className="me-2 h-4 w-4" />{t("prefs.theme.light")}</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="system"><Monitor className="me-2 h-4 w-4" />{t("prefs.theme.system")}</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        <NotificationsBell />

        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full" aria-label={t("nav.myAccount")}>
                <UserIcon className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="truncate">{user.email}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild><Link to="/profile"><UserIcon className="me-2 h-4 w-4" />{t("nav.profile")}</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link to="/library"><Library className="me-2 h-4 w-4" />{t("nav.myLibrary")}</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link to="/wallet"><Wallet className="me-2 h-4 w-4" />{t("nav.wallet")}</Link></DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to={isAuthor ? "/author" : "/author/apply"}><PenLine className="me-2 h-4 w-4" />{isAuthor ? t("nav.author") : t("nav.becomeAuthor")}</Link>
              </DropdownMenuItem>
              {isAdmin && (
                <DropdownMenuItem asChild><Link to="/admin"><Shield className="me-2 h-4 w-4" />{t("nav.admin")}</Link></DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => signOut()}>
                <LogOut className="me-2 h-4 w-4" />{t("nav.signOut")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button asChild size="sm" className="bg-gradient-to-r from-primary to-primary-glow text-primary-foreground hover:opacity-90">
            <Link to="/auth">{t("nav.signIn")}</Link>
          </Button>
        )}
      </div>
    </header>
  );
}

export function SiteFooter() {
  const t = useT();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isReader = /^\/novels\/[^/]+\/\d+/.test(pathname);
  if (isReader) return null;
  return (
    <footer className="mt-24 border-t border-border/60 bg-surface/40 pb-[calc(env(safe-area-inset-bottom)+68px)] lg:pb-6">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 md:grid-cols-4">
        <div>
          <div className="mb-3 flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-primary to-primary-glow">
              <BookOpen className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="text-lg font-black">UR <span className="text-gradient-primary">Fav</span> Novel</div>
          </div>
          <p className="text-sm text-muted-foreground">{t("brand.footerBlurb")}</p>
        </div>
        <div>
          <h4 className="mb-3 text-sm font-bold">{t("footer.browse")}</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/latest" className="hover:text-primary">{t("nav.latest")}</Link></li>
            <li><Link to="/popular" className="hover:text-primary">{t("nav.popular")}</Link></li>
            <li><Link to="/completed" className="hover:text-primary">{t("nav.completed")}</Link></li>
            <li><Link to="/ongoing" className="hover:text-primary">{t("nav.ongoing")}</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="mb-3 text-sm font-bold">{t("footer.user")}</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/auth" className="hover:text-primary">{t("nav.signInLong")}</Link></li>
            <li><Link to="/library" className="hover:text-primary">{t("nav.myLibrary")}</Link></li>
            <li><Link to="/wallet" className="hover:text-primary">{t("nav.wallet")}</Link></li>
            <li><Link to="/profile" className="hover:text-primary">{t("nav.profile")}</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="mb-3 text-sm font-bold">{t("footer.legal")}</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/about" className="hover:text-primary">{t("footer.about")}</Link></li>
            <li><Link to="/contact" className="hover:text-primary">{t("footer.contact")}</Link></li>
            <li><Link to="/privacy" className="hover:text-primary">{t("footer.privacy")}</Link></li>
            <li><Link to="/terms" className="hover:text-primary">{t("footer.terms")}</Link></li>
            <li><Link to="/dmca" className="hover:text-primary">{t("footer.dmca")}</Link></li>
            <li><Link to="/vip" className="hover:text-primary">{t("nav.vip")}</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border/60 py-4 text-center text-xs text-muted-foreground">
        {t("footer.rights", { year: new Date().getFullYear() })}
      </div>
    </footer>
  );
}
