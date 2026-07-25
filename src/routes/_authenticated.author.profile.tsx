import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Save, User as UserIcon } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { showError } from "@/lib/errors";
import { useT } from "@/i18n/provider";
import { ImageUploader } from "@/components/image-uploader";
import { storageImageUrl } from "@/lib/storage-images";

export const Route = createFileRoute("/_authenticated/author/profile")({
  head: () => ({
    meta: [
      { title: "Author Profile — FAVNOL" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthorProfilePage,
});

type SocialLinks = {
  twitter?: string;
  instagram?: string;
  facebook?: string;
  tiktok?: string;
  youtube?: string;
  discord?: string;
};

function AuthorProfilePage() {
  const t = useT();
  const { user, isAuthor, loading } = useAuth();
  const nav = useNavigate();
  const qc = useQueryClient();

  useEffect(() => {
    if (!loading && !isAuthor) nav({ to: "/author/apply" });
  }, [loading, isAuthor, nav]);

  const profileQ = useQuery({
    queryKey: ["author-profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select(
          "username,display_name,avatar_url,cover_url,bio,author_bio,country_code,pref_language,social_links",
        )
        .eq("id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [bio, setBio] = useState("");
  const [country, setCountry] = useState("");
  const [prefLang, setPrefLang] = useState("ar");
  const [website, setWebsite] = useState("");
  const [social, setSocial] = useState<SocialLinks>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const d = profileQ.data;
    if (!d) return;
    setUsername(d.username ?? "");
    setDisplayName(d.display_name ?? "");
    setAvatarUrl(d.avatar_url ?? "");
    setCoverUrl(d.cover_url ?? "");
    setBio(d.author_bio ?? d.bio ?? "");
    setCountry(d.country_code ?? "");
    setPrefLang(d.pref_language ?? "ar");
    const s = (d.social_links ?? {}) as SocialLinks & { website?: string };
    setWebsite(s.website ?? "");
    setSocial({
      twitter: s.twitter ?? "",
      instagram: s.instagram ?? "",
      facebook: s.facebook ?? "",
      tiktok: s.tiktok ?? "",
      youtube: s.youtube ?? "",
      discord: s.discord ?? "",
    });
  }, [profileQ.data]);

  async function save() {
    if (!user) return;
    setBusy(true);
    try {
      const cleaned: Record<string, string> = {};
      for (const [k, v] of Object.entries({ ...social, website })) {
        if (v && v.trim()) cleaned[k] = v.trim();
      }
      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: displayName.trim() || null,
          avatar_url: avatarUrl.trim() || null,
          cover_url: coverUrl.trim() || null,
          author_bio: bio.trim() || null,
          bio: bio.trim() || null,
          country_code: country.trim() || null,
          pref_language: prefLang,
          social_links: cleaned,
        })
        .eq("id", user.id);
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: ["author-profile", user.id] });
      await qc.invalidateQueries({ queryKey: ["author-public"] });
      toast.success(t("profile.saved") || "Saved");
    } catch (e) {
      showError(e);
    } finally {
      setBusy(false);
    }
  }

  if (!isAuthor) return null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 md:py-8">
      <header className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black md:text-3xl">
            {t("author.profile.title") || "Author Profile"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("author.profile.subtitle") ||
              "Edit your public author page."}
          </p>
        </div>
        {username && (
          <Button asChild size="sm" variant="outline">
            <Link to="/authors/$username" params={{ username }}>
              <ExternalLink className="me-1 h-4 w-4" />
              {t("author.viewPublic") || "View public"}
            </Link>
          </Button>
        )}
      </header>

      {/* Preview: cover + avatar */}
      <div className="mb-6 overflow-hidden rounded-2xl border border-border/40 bg-surface/40">
        <div
          className="h-32 w-full bg-gradient-to-br from-primary/30 to-primary/5 bg-cover bg-center md:h-48"
          style={coverUrl ? { backgroundImage: `url(${storageImageUrl(coverUrl)})` } : undefined}
        />
        <div className="flex items-center gap-4 p-4">
          <div className="-mt-12 h-20 w-20 shrink-0 overflow-hidden rounded-full border-4 border-background bg-surface md:h-24 md:w-24">
            {avatarUrl ? (
              <img src={storageImageUrl(avatarUrl)} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="grid h-full w-full place-items-center bg-gradient-to-br from-primary to-primary-glow text-primary-foreground">
                <UserIcon className="h-8 w-8" />
              </div>
            )}
          </div>
          <div className="min-w-0">
            <div className="truncate text-lg font-bold">
              {displayName || username || "—"}
            </div>
            <div className="truncate text-sm text-muted-foreground">
              @{username}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6 rounded-2xl border border-border/40 bg-surface/40 p-6">
        <Section title={t("author.profile.images") || "Images"}>
          <div className="max-w-[200px]">
            <ImageUploader
              value={avatarUrl}
              onChange={(url) => setAvatarUrl(url ?? "")}
              folder="author-avatars"
              aspect="square"
              label={t("author.profile.avatarUrl") || "Avatar"}
              deleteOnRemove
            />
          </div>
          <ImageUploader
            value={coverUrl}
            onChange={(url) => setCoverUrl(url ?? "")}
            folder="author-covers"
            aspect="banner"
            label={t("author.profile.coverUrl") || "Cover image"}
            deleteOnRemove
          />
        </Section>

        <Section title={t("author.profile.identity") || "Identity"}>
          <Field label={t("auth.username") || "Username"}>
            <input value={username} disabled className="input opacity-60" />
          </Field>
          <Field label={t("profile.displayName") || "Display name"}>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={80}
              className="input"
            />
          </Field>
          <Field label={t("profile.bio") || "Bio"}>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={4}
              maxLength={500}
              className="input resize-y"
            />
          </Field>
        </Section>

        <Section title={t("author.profile.location") || "Location & language"}>
          <div className="grid gap-3 md:grid-cols-2">
            <Field label={t("author.profile.country") || "Country"}>
              <input
                value={country}
                onChange={(e) => setCountry(e.target.value.toUpperCase())}
                maxLength={2}
                placeholder="EG, SA, US…"
                className="input"
              />
            </Field>
            <Field label={t("author.profile.prefLang") || "Preferred language"}>
              <select
                value={prefLang}
                onChange={(e) => setPrefLang(e.target.value)}
                className="input"
              >
                <option value="ar">العربية</option>
                <option value="en">English</option>
              </select>
            </Field>
          </div>
        </Section>

        <Section title={t("author.profile.links") || "Website & socials"}>
          <Field label={t("author.profile.website") || "Website"}>
            <input
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://…"
              className="input"
            />
          </Field>
          <div className="grid gap-3 md:grid-cols-2">
            {(
              [
                ["twitter", "Twitter / X"],
                ["instagram", "Instagram"],
                ["facebook", "Facebook"],
                ["tiktok", "TikTok"],
                ["youtube", "YouTube"],
                ["discord", "Discord"],
              ] as const
            ).map(([k, label]) => (
              <Field key={k} label={label}>
                <input
                  value={social[k] ?? ""}
                  onChange={(e) =>
                    setSocial((s) => ({ ...s, [k]: e.target.value }))
                  }
                  placeholder="https://…"
                  className="input"
                />
              </Field>
            ))}
          </div>
        </Section>

        <div className="flex justify-end">
          <Button
            onClick={save}
            disabled={busy}
            className="bg-gradient-to-r from-primary to-primary-glow text-primary-foreground"
          >
            <Save className="me-1 h-4 w-4" />
            {busy
              ? t("common.saving") || "Saving…"
              : t("common.saveChanges") || "Save changes"}
          </Button>
        </div>
      </div>

      <style>{`.input{width:100%;padding:0.5rem 0.75rem;border-radius:0.5rem;border:1px solid hsl(var(--input));background:hsl(var(--background)/.6);font-size:0.875rem;outline:none}.input:focus{border-color:hsl(var(--primary))}`}</style>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h2 className="text-sm font-black uppercase tracking-wider text-muted-foreground">
        {title}
      </h2>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1.5 text-xs font-semibold">{label}</div>
      {children}
    </label>
  );
}
