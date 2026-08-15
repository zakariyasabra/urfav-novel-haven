// Shared categories + tags picker used by the admin and author novel forms.
// - Categories: search + multi-select from the existing DB categories (never creates new ones)
// - Tags: only tags belonging to the selected categories, search + multi-select
// - Removing a category asks for confirmation before dropping its tags
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, Search, Tag as TagIcon, X } from "lucide-react";
import { confirmDialog } from "@/components/ui/dialog-service";
import { usePreferences } from "@/i18n/provider";
import {
  fetchTaxCategories,
  fetchTaxTags,
  type TaxCategory,
  type TaxTag,
} from "@/lib/novel-taxonomy-api";

export interface TaxonomySelection {
  genreIds: string[];
  tagIds: string[];
}

function norm(s: string) {
  return s
    .toLowerCase()
    .replace(/[\u064B-\u0652\u0640]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .trim();
}

export function TaxonomyPicker({
  value,
  onChange,
  disabled,
}: {
  value: TaxonomySelection;
  onChange: (next: TaxonomySelection) => void;
  disabled?: boolean;
}) {
  const { lang } = usePreferences();
  const pick = (x: { name_ar: string; name_en: string | null }) =>
    lang === "en" ? x.name_en || x.name_ar : x.name_ar || x.name_en || "";

  const catsQ = useQuery({
    queryKey: ["tax-categories"],
    queryFn: fetchTaxCategories,
    staleTime: 300_000,
  });
  const tagsQ = useQuery({ queryKey: ["tax-tags"], queryFn: fetchTaxTags, staleTime: 300_000 });

  const [catSearch, setCatSearch] = useState("");
  const [tagSearch, setTagSearch] = useState("");

  const categories = catsQ.data ?? [];
  const tags = tagsQ.data ?? [];
  const selectedGenres = value.genreIds;
  const selectedTags = value.tagIds;

  const catById = useMemo(() => {
    const m = new Map<string, TaxCategory>();
    for (const c of categories) m.set(c.id, c);
    return m;
  }, [categories]);

  const filteredCats = useMemo(() => {
    const q = norm(catSearch);
    const list = q
      ? categories.filter((c) => norm(`${c.name_ar} ${c.name_en ?? ""} ${c.slug}`).includes(q))
      : categories;
    return list.slice(0, 40);
  }, [categories, catSearch]);

  // Only tags that belong to at least one selected category
  const availableTags = useMemo(() => {
    if (!selectedGenres.length) return [] as TaxTag[];
    const set = new Set(selectedGenres);
    return tags.filter((t) => t.genre_ids.some((g) => set.has(g)));
  }, [tags, selectedGenres]);

  const filteredTags = useMemo(() => {
    const q = norm(tagSearch);
    const list = q
      ? availableTags.filter((t) => norm(`${t.name_ar} ${t.name_en ?? ""} ${t.slug}`).includes(q))
      : availableTags;
    return list.slice(0, 60);
  }, [availableTags, tagSearch]);

  const selectedTagObjects = useMemo(
    () => tags.filter((t) => selectedTags.includes(t.id)),
    [tags, selectedTags],
  );

  async function toggleCategory(id: string) {
    if (disabled) return;
    if (!selectedGenres.includes(id)) {
      onChange({ ...value, genreIds: [...selectedGenres, id] });
      return;
    }
    // Removing: find tags that would become orphaned
    const remaining = selectedGenres.filter((g) => g !== id);
    const remainingSet = new Set(remaining);
    const orphaned = selectedTagObjects.filter((t) => !t.genre_ids.some((g) => remainingSet.has(g)));
    if (orphaned.length) {
      const names = orphaned.map((t) => `#${pick(t)}`).join("، ");
      const ok = await confirmDialog({
        title: "إزالة التصنيف",
        body: `سيتم أيضاً إزالة الوسوم التابعة لهذا التصنيف من الرواية: ${names}`,
        confirmLabel: "إزالة",
        danger: true,
      });
      if (!ok) return;
    }
    onChange({
      genreIds: remaining,
      tagIds: selectedTags.filter((tid) => !orphaned.some((t) => t.id === tid)),
    });
  }

  function toggleTag(id: string) {
    if (disabled) return;
    if (selectedTags.includes(id)) {
      onChange({ ...value, tagIds: selectedTags.filter((t) => t !== id) });
    } else {
      // Guard: never allow a tag outside the selected categories
      const tag = tags.find((t) => t.id === id);
      const set = new Set(selectedGenres);
      if (!tag || !tag.genre_ids.some((g) => set.has(g))) return;
      onChange({ ...value, tagIds: [...selectedTags, id] });
    }
  }

  return (
    <div dir="rtl" className="space-y-5">
      {/* ---------- Categories ---------- */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="text-xs font-bold">التصنيفات</label>
          <span className="text-[11px] text-muted-foreground">
            {selectedGenres.length} مختار
          </span>
        </div>

        {selectedGenres.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {selectedGenres.map((id) => {
              const c = catById.get(id);
              return (
                <span
                  key={id}
                  className="inline-flex items-center gap-1 rounded-full border border-primary/50 bg-primary/15 px-2.5 py-1 text-xs font-semibold text-primary"
                >
                  {c ? pick(c) : id}
                  <button
                    type="button"
                    aria-label="إزالة التصنيف"
                    onClick={() => void toggleCategory(id)}
                    className="opacity-70 transition hover:opacity-100"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              );
            })}
          </div>
        )}

        <div className="relative mb-2">
          <Search className="pointer-events-none absolute end-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={catSearch}
            onChange={(e) => setCatSearch(e.target.value)}
            placeholder="ابحث عن تصنيف…"
            className="h-9 w-full rounded-md border border-input bg-background/60 pe-8 ps-3 text-sm outline-none focus:border-primary"
          />
        </div>

        <div className="max-h-44 overflow-auto rounded-lg border border-border/60 bg-background/40 p-2">
          {catsQ.isLoading ? (
            <div className="p-2 text-xs text-muted-foreground">جارِ التحميل…</div>
          ) : filteredCats.length === 0 ? (
            <div className="p-2 text-xs text-muted-foreground">لا توجد تصنيفات مطابقة.</div>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {filteredCats.map((c) => {
                const on = selectedGenres.includes(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => void toggleCategory(c.id)}
                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold transition ${
                      on
                        ? "border-primary bg-primary/20 text-primary"
                        : "border-border/60 text-foreground/80 hover:border-primary/60 hover:text-primary"
                    }`}
                  >
                    {on && <Check className="h-3 w-3" />}
                    {pick(c)}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ---------- Tags ---------- */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="flex items-center gap-1 text-xs font-bold">
            <TagIcon className="h-3.5 w-3.5" /> الوسوم
          </label>
          <span className="text-[11px] text-muted-foreground">{selectedTags.length} مختار</span>
        </div>

        {selectedTagObjects.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {selectedTagObjects.map((t) => (
              <span
                key={t.id}
                className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-surface/60 px-2.5 py-1 text-xs font-semibold text-foreground/80"
              >
                #{pick(t)}
                <button
                  type="button"
                  aria-label="إزالة الوسم"
                  onClick={() => toggleTag(t.id)}
                  className="opacity-70 transition hover:text-primary hover:opacity-100"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        {selectedGenres.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border/60 p-3 text-xs text-muted-foreground">
            اختر تصنيفاً أولاً لتظهر الوسوم التابعة له.
          </div>
        ) : (
          <>
            <div className="relative mb-2">
              <Search className="pointer-events-none absolute end-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                value={tagSearch}
                onChange={(e) => setTagSearch(e.target.value)}
                placeholder="ابحث عن وسم…"
                className="h-9 w-full rounded-md border border-input bg-background/60 pe-8 ps-3 text-sm outline-none focus:border-primary"
              />
            </div>
            <div className="max-h-44 overflow-auto rounded-lg border border-border/60 bg-background/40 p-2">
              {tagsQ.isLoading ? (
                <div className="p-2 text-xs text-muted-foreground">جارِ التحميل…</div>
              ) : filteredTags.length === 0 ? (
                <div className="p-2 text-xs text-muted-foreground">
                  لا توجد وسوم مطابقة لهذه التصنيفات.
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {filteredTags.map((t) => {
                    const on = selectedTags.includes(t.id);
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => toggleTag(t.id)}
                        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold transition ${
                          on
                            ? "border-primary bg-primary/20 text-primary"
                            : "border-border/60 text-foreground/80 hover:border-primary/60 hover:text-primary"
                        }`}
                      >
                        {on && <Check className="h-3 w-3" />}#{pick(t)}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
