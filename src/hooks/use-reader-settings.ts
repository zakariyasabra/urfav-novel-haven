import { useEffect, useState, useCallback } from "react";

export type ReaderTheme = "dark" | "light" | "sepia" | "amoled" | "soft";
export type ReaderFont = "sans" | "reading" | "display";

export interface ReaderSettings {
  theme: ReaderTheme;
  font: ReaderFont;
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
  hideUI: boolean;
  autoScroll: boolean;
  autoScrollSpeed: number;
}

const DEFAULTS: ReaderSettings = {
  theme: "dark",
  font: "reading",
  fontSize: 19,
  lineHeight: 1.9,
  letterSpacing: 0,
  hideUI: false,
  autoScroll: false,
  autoScrollSpeed: 30,
};

const KEY = "urfav-reader-settings-v2";

function load(): ReaderSettings {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<ReaderSettings>) };
  } catch {
    return DEFAULTS;
  }
}

export function useReaderSettings() {
  const [settings, setSettings] = useState<ReaderSettings>(DEFAULTS);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setSettings(load());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(settings));
    } catch {
      /* ignore */
    }
  }, [settings, hydrated]);

  const update = useCallback(
    <K extends keyof ReaderSettings>(k: K, v: ReaderSettings[K]) =>
      setSettings((s) => ({ ...s, [k]: v })),
    [],
  );

  const reset = useCallback(() => setSettings(DEFAULTS), []);

  return { settings, update, reset, hydrated };
}

export function readerThemeClass(t: ReaderTheme): string {
  switch (t) {
    case "light":
      return "reader-theme-light";
    case "sepia":
      return "reader-theme-sepia";
    case "amoled":
      return "reader-theme-amoled";
    case "soft":
      return "reader-theme-soft";
    default:
      return "reader-theme-dark";
  }
}

export function readerFontFamily(f: ReaderFont): string {
  switch (f) {
    case "sans":
      return "var(--font-sans)";
    case "display":
      return "var(--font-display)";
    default:
      return "var(--font-reading)";
  }
}
