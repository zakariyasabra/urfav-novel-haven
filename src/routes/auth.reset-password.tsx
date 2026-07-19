import { showError } from "@/lib/errors";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { KeyRound } from "lucide-react";

export const Route = createFileRoute("/auth/reset-password")({
  ssr: false,
  head: () => ({
    meta: [{ title: "إعادة تعيين كلمة المرور" }, { name: "robots", content: "noindex" }],
  }),
  component: ResetPage,
});

function ResetPage() {
  const nav = useNavigate();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Supabase auto-parses the recovery hash into a session
    const sub = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.data.subscription.unsubscribe();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) return showError(error);
    toast.success("تم تحديث كلمة المرور");
    nav({ to: "/" });
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="mb-6 text-center">
        <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-primary to-primary-glow">
          <KeyRound className="h-7 w-7 text-primary-foreground" />
        </div>
        <h1 className="text-3xl font-black">إعادة تعيين كلمة المرور</h1>
      </div>
      {!ready ? (
        <div className="rounded-2xl border border-border/60 bg-surface/40 p-6 text-center text-sm text-muted-foreground">
          افتح هذه الصفحة عبر الرابط المُرسل إلى بريدك الإلكتروني.
        </div>
      ) : (
        <form
          onSubmit={submit}
          className="space-y-3 rounded-2xl border border-border/60 bg-surface/40 p-6"
        >
          <div>
            <label className="mb-1 block text-xs font-semibold">كلمة المرور الجديدة</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background/60 px-3 text-sm outline-none focus:border-primary"
            />
          </div>
          <Button
            disabled={busy}
            type="submit"
            className="h-11 w-full bg-gradient-to-r from-primary to-primary-glow text-primary-foreground"
          >
            {busy ? "..." : "تحديث"}
          </Button>
        </form>
      )}
    </div>
  );
}
