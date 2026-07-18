import { showError } from "@/lib/errors";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BookOpen } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useT } from "@/i18n/provider";

export const Route = createFileRoute("/auth/")({
  ssr: false,
  head: () => ({ meta: [{ title: "Sign in — FAVNOL" }, { name: "robots", content: "noindex" }] }),
  component: AuthPage,
});

function AuthPage() {
  const t = useT();
  const { user, signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (user) navigate({ to: "/" }); }, [user]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    if (mode === "forgot") {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });
      setBusy(false);
      if (error) return showError(error);
      toast.success(t("auth.resetSent"));
      return;
    }
    const { error } = mode === "signin"
      ? await signIn(email, password)
      : await signUp(email, password, username || email.split("@")[0]);
    setBusy(false);
    if (error) return toast.error(error);
    toast.success(mode === "signin" ? t("auth.signedIn") : t("auth.accountCreated"));
    if (mode === "signin") navigate({ to: "/" });
  }

  async function googleSignIn() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/` },
    });
    if (error) toast.error(t("auth.googleError"));
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="mb-6 text-center">
        <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-primary to-primary-glow shadow-glow">
          <BookOpen className="h-7 w-7 text-primary-foreground" />
        </div>
        <h1 className="text-3xl font-black">
          {mode === "signin" ? t("auth.title.signin") : mode === "signup" ? t("auth.title.signup") : t("auth.title.forgot")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {mode === "signin" ? t("auth.subtitle.signin") : mode === "signup" ? t("auth.subtitle.signup") : t("auth.subtitle.forgot")}
        </p>
      </div>

      {mode !== "forgot" && (
        <div className="mb-4">
          <button onClick={googleSignIn} className="flex h-11 w-full items-center justify-center gap-2 rounded-md border border-border/60 bg-background/60 text-sm font-semibold transition-colors hover:bg-secondary">
            <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
            {t("auth.google")}
          </button>
          <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border/60" />{t("auth.or")}<div className="h-px flex-1 bg-border/60" />
          </div>
        </div>
      )}

      <form onSubmit={submit} className="space-y-3 rounded-2xl border border-border/60 bg-surface/40 p-6">
        {mode === "signup" && (
          <div>
            <label className="mb-1 block text-xs font-semibold">{t("auth.username")}</label>
            <input value={username} onChange={(e) => setUsername(e.target.value)} required minLength={3} className="h-10 w-full rounded-md border border-input bg-background/60 px-3 text-sm outline-none focus:border-primary" />
          </div>
        )}
        <div>
          <label className="mb-1 block text-xs font-semibold">{t("auth.email")}</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-10 w-full rounded-md border border-input bg-background/60 px-3 text-sm outline-none focus:border-primary" />
        </div>
        {mode !== "forgot" && (
          <div>
            <label className="mb-1 block text-xs font-semibold">{t("auth.password")}</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="h-10 w-full rounded-md border border-input bg-background/60 px-3 text-sm outline-none focus:border-primary" />
          </div>
        )}
        <Button type="submit" disabled={busy} className="h-11 w-full bg-gradient-to-r from-primary to-primary-glow text-primary-foreground">
          {busy ? "..." : mode === "signin" ? t("auth.signin") : mode === "signup" ? t("auth.signup") : t("auth.sendLink")}
        </Button>
        {mode === "signin" && (
          <button type="button" onClick={() => setMode("forgot")} className="w-full text-center text-xs text-muted-foreground hover:text-primary">
            {t("auth.forgot")}
          </button>
        )}
        <div className="text-center text-sm text-muted-foreground">
          {mode === "forgot" ? (
            <button type="button" onClick={() => setMode("signin")} className="font-bold text-primary hover:underline">{t("auth.back")}</button>
          ) : (
            <>
              {mode === "signin" ? t("auth.noAccount") : t("auth.haveAccount")}{" "}
              <button type="button" onClick={() => setMode(mode === "signin" ? "signup" : "signin")} className="font-bold text-primary hover:underline">
                {mode === "signin" ? t("auth.createOne") : t("auth.doSignIn")}
              </button>
            </>
          )}
        </div>
      </form>
    </div>
  );
}
