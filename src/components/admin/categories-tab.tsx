import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Trash2,
  Search as SearchIcon,
  Star,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { confirmDialog } from "@/components/ui/dialog-service";
import { showError } from "@/lib/errors";
import {
  type Category,
  type CategoryInput,
  categoryNovelCount,
  createCategory,
  deleteCategory,
  fetchCategoryCounts,
  listCategories,
  slugifyCategory,
  updateCategory,
} from "@/lib/categories-api";

type SortKey = "sort_order" | "name_ar" | "created_at" | "updated_at";

export function CategoriesTab() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [sort, setSort] = useState<SortKey>("sort_order");
  const [direction, setDirection] = useState<"asc" | "desc">("asc");
  const [editing, setEditing] = useState<Category | "new" | null>(null);

  // Debounce search input (~250ms).
  useMemo(() => {
    const h = setTimeout(() => {
      setDebounced(search);
      setPage(1);
    }, 250);
    return () => clearTimeout(h);
  }, [search]);

  const q = useQuery({
    queryKey: ["admin-categories", debounced, sort, direction, page, pageSize],
    queryFn: () =>
      listCategories({ search: debounced, sort, direction, page, pageSize }),
  });

  const countsQ = useQuery({
    queryKey: ["admin-category-counts"],
    queryFn: fetchCategoryCounts,
    staleTime: 30_000,
  });

  const items = q.data?.items ?? [];
  const total = q.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  async function onDelete(cat: Category) {
    let count = 0;
    try {
      count = await categoryNovelCount(cat.id);
    } catch (e) {
      showError(e);
      return;
    }
    if (count > 0) {
      toast.error(
        `لا يمكن حذف تصنيف مرتبط بـ ${count} رواية. أزل الارتباطات أولاً.`,
      );
      return;
    }
    const ok = await confirmDialog({
      title: "حذف التصنيف",
      body: `سيتم حذف "${cat.name_ar}" نهائياً. هل أنت متأكد؟`,
      confirmLabel: "حذف",
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteCategory(cat.id);
      toast.success("تم الحذف");
      qc.invalidateQueries({ queryKey: ["admin-categories"] });
      qc.invalidateQueries({ queryKey: ["admin-category-counts"] });
      qc.invalidateQueries({ queryKey: ["genres"] });
    } catch (e) {
      showError(e);
    }
  }

  async function toggle(cat: Category, field: "is_active" | "is_featured") {
    try {
      await updateCategory(cat.id, { [field]: !cat[field] } as Partial<CategoryInput>);
      qc.invalidateQueries({ queryKey: ["admin-categories"] });
      qc.invalidateQueries({ queryKey: ["genres"] });
    } catch (e) {
      showError(e);
    }
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <SearchIcon className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث بالاسم أو المعرف…"
            dir="rtl"
            className="h-10 w-full rounded-md border border-input bg-background/60 ps-9 pe-3 text-sm outline-none focus:border-primary"
          />
        </div>
        <select
          value={sort}
          onChange={(e) => {
            setSort(e.target.value as SortKey);
            setPage(1);
          }}
          className="h-10 rounded-md border border-input bg-background/60 px-3 text-sm outline-none focus:border-primary"
        >
          <option value="sort_order">الترتيب</option>
          <option value="name_ar">الاسم</option>
          <option value="created_at">الأحدث إنشاءً</option>
          <option value="updated_at">آخر تعديل</option>
        </select>
        <select
          value={direction}
          onChange={(e) => setDirection(e.target.value as "asc" | "desc")}
          className="h-10 rounded-md border border-input bg-background/60 px-3 text-sm outline-none focus:border-primary"
        >
          <option value="asc">تصاعدي</option>
          <option value="desc">تنازلي</option>
        </select>
        <Button
          onClick={() => setEditing("new")}
          className="bg-gradient-to-r from-primary to-primary-glow text-primary-foreground"
        >
          <Plus className="me-1 h-4 w-4" /> تصنيف جديد
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border/40 bg-surface/40">
        <div className="grid grid-cols-[minmax(0,1fr)_80px_90px_90px_120px] gap-2 border-b border-border/40 px-3 py-2 text-xs font-bold text-muted-foreground">
          <div>التصنيف</div>
          <div className="text-center">الروايات</div>
          <div className="text-center">مميّز</div>
          <div className="text-center">نشط</div>
          <div className="text-center">إجراءات</div>
        </div>
        {q.isLoading ? (
          <div className="space-y-2 p-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded bg-surface/60" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            لا توجد تصنيفات مطابقة.
          </div>
        ) : (
          items.map((c) => {
            const cnt = countsQ.data?.[c.id] ?? 0;
            return (
              <div
                key={c.id}
                className="grid grid-cols-[minmax(0,1fr)_80px_90px_90px_120px] items-center gap-2 border-b border-border/40 px-3 py-2 text-sm last:border-b-0"
              >
                <div className="min-w-0 flex items-center gap-3">
                  <span
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-lg"
                    style={{
                      background: c.color
                        ? `${c.color}22`
                        : "hsl(var(--primary) / 0.12)",
                      color: c.color ?? undefined,
                    }}
                    aria-hidden
                  >
                    {c.icon?.trim() ? c.icon : "📚"}
                  </span>
                  <div className="min-w-0">
                    <div className="truncate font-semibold">{c.name_ar}</div>
                    <div className="truncate text-[11px] text-muted-foreground">
                      {c.name_en ? `${c.name_en} · ` : ""}
                      {c.slug} · #{c.sort_order}
                    </div>
                  </div>
                </div>
                <div className="text-center text-xs font-semibold">{cnt}</div>
                <div className="text-center">
                  <button
                    onClick={() => toggle(c, "is_featured")}
                    className={`grid h-7 w-7 place-items-center rounded-full ${c.is_featured ? "bg-amber-500/20 text-amber-500" : "text-muted-foreground hover:bg-secondary/60"}`}
                    aria-label="تبديل مميّز"
                  >
                    <Star className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="text-center">
                  <button
                    onClick={() => toggle(c, "is_active")}
                    className={`grid h-7 w-7 place-items-center rounded-full ${c.is_active ? "bg-emerald-500/20 text-emerald-500" : "bg-destructive/20 text-destructive"}`}
                    aria-label="تبديل النشاط"
                  >
                    {c.is_active ? (
                      <Eye className="h-3.5 w-3.5" />
                    ) : (
                      <EyeOff className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
                <div className="flex items-center justify-center gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={() => setEditing(c)}
                    aria-label="تعديل"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-destructive"
                    onClick={() => onDelete(c)}
                    aria-label="حذف"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {total > pageSize && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <div className="text-muted-foreground">
            {total} تصنيف · صفحة {page} / {totalPages}
          </div>
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronRight className="h-4 w-4" />
              السابق
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              التالي
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {editing && (
        <CategoryEditor
          value={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ["admin-categories"] });
            qc.invalidateQueries({ queryKey: ["admin-category-counts"] });
            qc.invalidateQueries({ queryKey: ["genres"] });
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function CategoryEditor({
  value,
  onClose,
  onSaved,
}: {
  value: Category | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isNew = !value;
  const [form, setForm] = useState<CategoryInput>({
    name_ar: value?.name_ar ?? "",
    name_en: value?.name_en ?? "",
    slug: value?.slug ?? "",
    description_ar: value?.description_ar ?? "",
    description_en: value?.description_en ?? "",
    icon: value?.icon ?? "",
    color: value?.color ?? "#f97316",
    cover_url: value?.cover_url ?? "",
    sort_order: value?.sort_order ?? 0,
    is_featured: value?.is_featured ?? false,
    is_active: value?.is_active ?? true,
  });
  const [busy, setBusy] = useState(false);
  const [slugTouched, setSlugTouched] = useState(!isNew);

  function set<K extends keyof CategoryInput>(k: K, v: CategoryInput[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function save() {
    if (!form.name_ar.trim()) return toast.error("الاسم بالعربية مطلوب");
    const slug = (form.slug || slugifyCategory(form.name_ar)).trim();
    if (!slug) return toast.error("المعرف (slug) مطلوب");
    setBusy(true);
    try {
      const payload: CategoryInput = {
        ...form,
        slug,
        name_ar: form.name_ar.trim(),
        name_en: (form.name_en ?? "").trim() || null,
        description_ar: (form.description_ar ?? "").trim() || null,
        description_en: (form.description_en ?? "").trim() || null,
        icon: (form.icon ?? "").trim() || null,
        color: (form.color ?? "").trim() || null,
        cover_url: (form.cover_url ?? "").trim() || null,
        sort_order: Number(form.sort_order) || 0,
      };
      if (isNew) await createCategory(payload);
      else await updateCategory(value!.id, payload);
      toast.success(isNew ? "تم إنشاء التصنيف" : "تم حفظ التعديلات");
      onSaved();
    } catch (e) {
      showError(e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl overflow-hidden rounded-2xl border border-border/60 bg-background shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-border/60 px-5 py-3">
          <h3 className="text-lg font-black">
            {isNew ? "تصنيف جديد" : `تعديل: ${value!.name_ar}`}
          </h3>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full hover:bg-secondary/60"
            aria-label="إغلاق"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="grid max-h-[70vh] grid-cols-1 gap-3 overflow-auto p-5 md:grid-cols-2">
          <Field label="الاسم (عربي) *">
            <input
              value={form.name_ar}
              onChange={(e) => {
                set("name_ar", e.target.value);
                if (!slugTouched) set("slug", slugifyCategory(e.target.value));
              }}
              dir="rtl"
              className="input"
              required
            />
          </Field>
          <Field label="الاسم (إنجليزي)">
            <input
              value={form.name_en ?? ""}
              onChange={(e) => set("name_en", e.target.value)}
              dir="ltr"
              className="input"
            />
          </Field>
          <Field label="المعرف (slug) *">
            <input
              value={form.slug}
              onChange={(e) => {
                setSlugTouched(true);
                set("slug", slugifyCategory(e.target.value));
              }}
              dir="ltr"
              className="input font-mono"
              required
            />
          </Field>
          <Field label="ترتيب العرض">
            <input
              type="number"
              value={form.sort_order ?? 0}
              onChange={(e) => set("sort_order", Number(e.target.value))}
              className="input"
            />
          </Field>
          <Field label="الوصف (عربي)">
            <textarea
              value={form.description_ar ?? ""}
              onChange={(e) => set("description_ar", e.target.value)}
              rows={2}
              dir="rtl"
              className="input resize-y"
            />
          </Field>
          <Field label="الوصف (إنجليزي)">
            <textarea
              value={form.description_en ?? ""}
              onChange={(e) => set("description_en", e.target.value)}
              rows={2}
              dir="ltr"
              className="input resize-y"
            />
          </Field>
          <Field label="الأيقونة (Emoji أو اسم Lucide)">
            <input
              value={form.icon ?? ""}
              onChange={(e) => set("icon", e.target.value)}
              placeholder="مثال: 📚 أو BookOpen"
              className="input"
            />
          </Field>
          <Field label="اللون">
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={form.color || "#f97316"}
                onChange={(e) => set("color", e.target.value)}
                className="h-10 w-14 cursor-pointer rounded border border-input bg-background/60"
              />
              <input
                value={form.color ?? ""}
                onChange={(e) => set("color", e.target.value)}
                placeholder="#f97316"
                dir="ltr"
                className="input font-mono"
              />
            </div>
          </Field>
          <Field label="رابط صورة الغلاف">
            <input
              value={form.cover_url ?? ""}
              onChange={(e) => set("cover_url", e.target.value)}
              placeholder="https://…"
              dir="ltr"
              className="input"
            />
          </Field>
          <div className="flex items-center gap-6 md:col-span-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={!!form.is_featured}
                onChange={(e) => set("is_featured", e.target.checked)}
              />
              مميّز
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.is_active !== false}
                onChange={(e) => set("is_active", e.target.checked)}
              />
              نشط
            </label>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-border/60 px-5 py-3">
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            إلغاء
          </Button>
          <Button onClick={save} disabled={busy}>
            {busy ? "جارٍ الحفظ…" : isNew ? "إنشاء" : "حفظ"}
          </Button>
        </div>
      </div>
      <style>{`.input{width:100%;padding:0.5rem 0.75rem;border-radius:0.5rem;border:1px solid hsl(var(--input));background:hsl(var(--background)/.6);font-size:0.875rem;outline:none}.input:focus{border-color:hsl(var(--primary))}`}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1 text-xs font-semibold text-muted-foreground">
        {label}
      </div>
      {children}
    </label>
  );
}
