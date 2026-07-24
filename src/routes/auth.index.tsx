import { showError } from "@/lib/errors";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BookOpen, Eye, EyeOff } from "lucide-react";
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
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) navigate({ to: "/" });
  }, [user]);

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
    const { error } =
      mode === "signin"
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
    <div className="mx-auto flex min-h-[calc(100vh-8rem)] w-full max-w-md flex-col justify-center px-4 py-12">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
          <BookOpen className="h-7 w-7 text-primary" />
        </div>
        <h1 className="text-2xl font-bold">
          {mode === "signin"
            ? t("auth.title.signin")
            : mode === "signup"
              ? t("auth.title.signup")
              : t("auth.title.forgot")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {mode === "signin"
            ? t("auth.subtitle.signin")
            : mode === "signup"
              ? t("auth.subtitle.signup")
              : t("auth.subtitle.forgot")}
        </p>
      </div>

      {mode !== "forgot" && (
        <div className="mb-6 space-y-3">
          <Button type="button" variant="outline" className="w-full" onClick={googleSignIn}>
            {t("auth.google")}
          </Button>
          <div className="relative text-center text-xs text-muted-foreground">
            <span className="bg-background px-2">{t("auth.or")}</span>
          </div>
        </div>
      )}

      <form onSubmit={submit} className="space-y-4">
        {mode === "signup" && (
          <div>
            <label className="mb-1 block text-xs font-medium">{t("auth.username")}</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              minLength={3}
              className="h-10 w-full rounded-md border border-input bg-background/60 px-3 text-sm outline-none focus:border-primary"
            />
          </div>
        )}
        <div>
          <label className="mb-1 block text-xs font-medium">{t("auth.email")}</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="h-10 w-full rounded-md border border-input bg-background/60 px-3 text-sm outline-none focus:border-primary"
          />
        </div>
        {mode !== "forgot" && (
          <div>
            <label className="mb-1 block text-xs font-medium">{t("auth.password")}</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="h-10 w-full rounded-md border border-input bg-background/60 px-3 pe-10 text-sm outline-none focus:border-primary"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute end-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-primary"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
        )}
        <Button type="submit" className="w-full" disabled={busy}>
          {busy
            ? "..."
            : mode === "signin"
              ? t("auth.signin")
              : mode === "signup"
                ? t("auth.signup")
                : t("auth.sendLink")}
        </Button>
        {mode === "signin" && (
          <button
            type="button"
            onClick={() => setMode("forgot")}
            className="w-full text-center text-xs text-muted-foreground hover:text-primary"
          >
            {t("auth.forgot")}
          </button>
        )}
        <div className="text-center text-xs text-muted-foreground">
          {mode === "forgot" ? (
            <button
              type="button"
              onClick={() => setMode("signin")}
              className="font-bold text-primary hover:underline"
            >
              {t("auth.back")}
            </button>
          ) : (
            <>
              {mode === "signin" ? t("auth.noAccount") : t("auth.haveAccount")}{" "}
              <button
                type="button"
                onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
                className="font-bold text-primary hover:underline"
              >
                {mode === "signin" ? t("auth.createOne") : t("auth.doSignIn")}
              </button>
            </>
          )}
        </div>
      </form>
    </div>
  );
}
