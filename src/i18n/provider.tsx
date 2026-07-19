import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import { DICTS, LOCALES, type Locale } from "./dict";

export type ThemeMode = "dark" | "light" | "system";

const LANG_KEY = "urfav_lang";
const THEME_KEY = "urfav_theme";

interface PreferencesCtx {
  lang: Locale;
  theme: ThemeMode;
  resolvedTheme: "dark" | "light";
  dir: "rtl" | "ltr";
  setLang: (l: Locale) => void;
  setTheme: (t: ThemeMode) => void;
  reset: () => void;
  t: (key: string, vars?: Record<string, unknown>) => string;
}

const Ctx = createContext<PreferencesCtx | null>(null);

function detectDefaultLang(): Locale {
  if (typeof navigator === "undefined") return "ar";
  const raw = (navigator.language || "ar").toLowerCase();
  if (raw.startsWith("ar")) return "ar";
  if (raw.startsWith("en")) return "en";
  return "ar";
}

function readStoredLang(): Locale | null {
  if (typeof window === "undefined") return null;
  try {
    const v = localStorage.getItem(LANG_KEY);
    return v === "ar" || v === "en" ? v : null;
  } catch {
    return null;
  }
}
function readStoredTheme(): ThemeMode | null {
  if (typeof window === "undefined") return null;
  try {
    const v = localStorage.getItem(THEME_KEY);
    return v === "dark" || v === "light" || v === "system" ? v : null;
  } catch {
    return null;
  }
}

function systemPrefersDark(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  } catch {
    return true;
  }
}

function applyDom(lang: Locale, resolved: "dark" | "light") {
  if (typeof document === "undefined") return;
  const html = document.documentElement;
  const dir = LOCALES.find((l) => l.code === lang)?.dir ?? "rtl";
  html.setAttribute("lang", lang);
  html.setAttribute("dir", dir);
  html.classList.toggle("dark", resolved === "dark");
  html.classList.toggle("light", resolved === "light");
}

export function PreferencesProvider({ children }: { children: ReactNode }) {
  // Guest-safe initial values (SSR-safe: read localStorage/system only in effect)
  const [lang, setLangState] = useState<Locale>("ar");
  const [theme, setThemeState] = useState<ThemeMode>("system");
  const [systemDark, setSystemDark] = useState(true);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from storage + system on mount
  useEffect(() => {
    const storedLang = readStoredLang() ?? detectDefaultLang();
    const storedTheme = readStoredTheme() ?? "system";
    setLangState(storedLang);
    setThemeState(storedTheme);
    setSystemDark(systemPrefersDark());
    setHydrated(true);
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  const resolvedTheme: "dark" | "light" =
    theme === "system" ? (systemDark ? "dark" : "light") : theme;

  // Apply to DOM on any change (post-hydration)
  useEffect(() => {
    if (!hydrated) return;
    applyDom(lang, resolvedTheme);
  }, [lang, resolvedTheme, hydrated]);

  // Sync FROM database when user signs in
  useEffect(() => {
    let cancelled = false;
    async function loadFromDb() {
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess.session?.user?.id;
      if (!uid) return;
      const { data } = await supabase
        .from("profiles")
        .select("pref_language,pref_theme")
        .eq("id", uid)
        .maybeSingle();
      if (cancelled || !data) return;
      const dbLang =
        data.pref_language === "ar" || data.pref_language === "en"
          ? (data.pref_language as Locale)
          : null;
      const dbTheme =
        data.pref_theme === "dark" || data.pref_theme === "light" || data.pref_theme === "system"
          ? (data.pref_theme as ThemeMode)
          : null;
      // DB is the source of truth for authed users; overwrite local
      if (dbLang) {
        setLangState(dbLang);
        try {
          localStorage.setItem(LANG_KEY, dbLang);
        } catch {
          /* ignore */
        }
      }
      if (dbTheme) {
        setThemeState(dbTheme);
        try {
          localStorage.setItem(THEME_KEY, dbTheme);
        } catch {
          /* ignore */
        }
      }
    }
    loadFromDb();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "USER_UPDATED") loadFromDb();
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const persist = useCallback(async (nextLang: Locale, nextTheme: ThemeMode) => {
    try {
      localStorage.setItem(LANG_KEY, nextLang);
      localStorage.setItem(THEME_KEY, nextTheme);
    } catch {
      /* ignore */
    }
    const { data: sess } = await supabase.auth.getSession();
    const uid = sess.session?.user?.id;
    if (uid) {
      await supabase
        .from("profiles")
        .update({ pref_language: nextLang, pref_theme: nextTheme })
        .eq("id", uid);
    }
  }, []);

  const setLang = useCallback(
    (l: Locale) => {
      setLangState(l);
      // Persist first, then reload so every cached query re-fetches with the
      // new language and no Arabic string leaks into English mode (or vice-versa).
      persist(l, theme).finally(() => {
        if (typeof window !== "undefined") window.location.reload();
      });
    },
    [theme, persist],
  );

  const setTheme = useCallback(
    (tm: ThemeMode) => {
      setThemeState(tm);
      persist(lang, tm);
    },
    [lang, persist],
  );

  const reset = useCallback(() => {
    const l = detectDefaultLang();
    setLangState(l);
    setThemeState("system");
    persist(l, "system");
  }, [persist]);

  const t = useCallback(
    (key: string, vars?: Record<string, unknown>) => {
      const dict = DICTS[lang] ?? DICTS.ar;
      const entry = dict[key] ?? DICTS.ar[key];
      if (typeof entry === "function") {
        try {
          return entry(vars ?? {});
        } catch {
          return key;
        }
      }
      return (entry as string | undefined) ?? key;
    },
    [lang],
  );

  const value = useMemo<PreferencesCtx>(
    () => ({
      lang,
      theme,
      resolvedTheme,
      dir: LOCALES.find((l) => l.code === lang)?.dir ?? "rtl",
      setLang,
      setTheme,
      reset,
      t,
    }),
    [lang, theme, resolvedTheme, setLang, setTheme, reset, t],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePreferences(): PreferencesCtx {
  const c = useContext(Ctx);
  if (!c) {
    // Fallback (should not happen in normal render tree)
    return {
      lang: "ar",
      theme: "system",
      resolvedTheme: "dark",
      dir: "rtl",
      setLang: () => {},
      setTheme: () => {},
      reset: () => {},
      t: (k: string) => {
        const v = DICTS.ar[k];
        return typeof v === "function" ? k : (v ?? k);
      },
    };
  }
  return c;
}

export function useT() {
  return usePreferences().t;
}

export { LOCALES } from "./dict";
