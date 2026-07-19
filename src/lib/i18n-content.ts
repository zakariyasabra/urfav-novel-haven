// Bilingual content helper. Pick the language-appropriate value with
// Arabic as the always-populated fallback. Never mix languages in output.
export type Lang = "ar" | "en";

export function pickText(
  ar: string | null | undefined,
  en: string | null | undefined,
  lang: Lang,
): string {
  if (lang === "en") return en && en.trim() ? en : (ar ?? "");
  return ar && ar.trim() ? ar : (en ?? "");
}

// Convenience for row objects with `<field>_ar` / `<field>_en` columns.
export function pickField<T extends Record<string, unknown>>(
  row: T | null | undefined,
  field: string,
  lang: Lang,
  legacyFallback?: string | null,
): string {
  if (!row) return legacyFallback ?? "";
  const ar = row[`${field}_ar`] as string | null | undefined;
  const en = row[`${field}_en`] as string | null | undefined;
  const v = pickText(ar, en, lang);
  if (v) return v;
  return legacyFallback ?? "";
}
