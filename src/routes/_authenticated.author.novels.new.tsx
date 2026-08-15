import { showError } from "@/lib/errors";
import { createFileRoute, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useT } from "@/i18n/provider";
import { ImageUploader } from "@/components/image-uploader";
import { ChapterEditor } from "@/components/chapter-editor";
import { TaxonomyPicker, type TaxonomySelection } from "@/components/novel/taxonomy-picker";
import { saveNovelTaxonomy } from "@/lib/novel-taxonomy-api";


export const Route = createFileRoute("/_authenticated/author/novels/new")({
  head: () => ({ meta: [{ title: "New novel — FAVNOL" }, { name: "robots", content: "noindex" }] }),
  component: NewNovelPage,
});

function slugify(s: string) {
  return (
    s
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9\u0600-\u06FF-]/g, "")
      .slice(0, 80) || `novel-${Date.now()}`
  );
}

function chapterNewNovelId(pathname: string) {
  const match = pathname.match(/^\/author\/novels\/([^/]+)\/chapters\/new\/?$/);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

function NewNovelPage() {
  const t = useT();
  const { user, isAuthor, loading } = useAuth();
  const nav = useNavigate();
  const location = useLocation();
  const forcedChapterNovelId = chapterNewNovelId(location.pathname);
  useEffect(() => {
    if (!loading && !isAuthor) nav({ to: "/author/apply" });
  }, [loading, isAuthor]);

  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"ongoing" | "completed" | "hiatus">("ongoing");
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [taxonomy, setTaxonomy] = useState<TaxonomySelection>({ genreIds: [], tagIds: [] });
  const [busy, setBusy] = useState(false);

  if (forcedChapterNovelId) {
    return (
      <ChapterEditor
        novelId={forcedChapterNovelId}
        onSaved={(chapterId) =>
          nav({
            to: "/author/novels/$id/chapters/$chapterId",
            params: { id: forcedChapterNovelId, chapterId },
          })
        }
      />
    );
  }


  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (title.trim().length < 2 || description.trim().length < 20) {
      toast.error(t("newNv.validate"));
      return;
    }
    setBusy(true);
    try {
      const slug = slugify(title) + "-" + Math.random().toString(36).slice(2, 6);
      const { data, error } = await supabase
        .from("novels")
        .insert({
          slug,
          title: title.trim(),
          author: author.trim() || t("newNv.unknownAuthor"),
          description: description.trim(),
          status,
          cover_url: coverUrl,
          owner_id: user.id,
          is_published: false,

        })
        .select("id")
        .single();
      if (error) throw error;
      const newId = (data as { id: string }).id;
      await saveNovelTaxonomy(newId, taxonomy.genreIds, taxonomy.tagIds);
      toast.success(t("newNv.created"));
      nav({
        to: "/author/novels/$id/chapters/new",
        params: { id: (data as { id: string }).id },
      });
    } catch (err) {
      showError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-black md:text-3xl">{t("newNv.title")}</h1>
      <form
        onSubmit={submit}
        className="space-y-4 rounded-2xl border border-border/40 bg-surface/40 p-6"
      >
        <ImageUploader
          value={coverUrl}
          onChange={setCoverUrl}
          folder="novels"
          aspect="cover"
          label="غلاف الرواية"
          hint="نسبة موصى بها 2:3 — بحد أقصى 5MB."
        />
        <Field label={t("newNv.f.title")}>

          <input
            required
            maxLength={200}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="input"
          />
        </Field>
        <Field label={t("newNv.f.author")}>
          <input
            maxLength={100}
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            className="input"
          />
        </Field>
        <Field label={t("newNv.f.desc")}>
          <textarea
            required
            minLength={20}
            rows={5}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="input resize-y"
          />
        </Field>
        <Field label={t("newNv.f.status")}>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as typeof status)}
            className="input"
          >
            <option value="ongoing">{t("authNv.s.ongoing")}</option>
            <option value="completed">{t("authNv.s.completed")}</option>
            <option value="hiatus">{t("authNv.s.hiatus")}</option>
          </select>
        </Field>
        <div className="rounded-xl border border-border/40 bg-background/30 p-4">
          <TaxonomyPicker value={taxonomy} onChange={setTaxonomy} />
        </div>
        <Button type="submit" disabled={busy} className="w-full">
          {busy ? t("newNv.submitting") : t("newNv.submit")}
        </Button>
      </form>
      <style>{`.input{width:100%;padding:0.5rem 0.75rem;border-radius:0.5rem;border:1px solid hsl(var(--input));background:hsl(var(--background)/.6);font-size:0.875rem;outline:none}.input:focus{border-color:hsl(var(--primary))}`}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1.5 text-sm font-semibold">{label}</div>
      {children}
    </label>
  );
}
