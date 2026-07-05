import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BookOpen } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "تسجيل الدخول — UR Fav Novel" }, { name: "robots", content: "noindex" }] }),
  component: AuthPage,
});

function AuthPage() {
  const { user, signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (user) navigate({ to: "/" }); }, [user]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = mode === "signin"
      ? await signIn(email, password)
      : await signUp(email, password, username || email.split("@")[0]);
    setBusy(false);
    if (error) return toast.error(error);
    toast.success(mode === "signin" ? "تم تسجيل الدخول" : "تم إنشاء الحساب");
    navigate({ to: "/" });
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="mb-6 text-center">
        <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-primary to-primary-glow shadow-glow">
          <BookOpen className="h-7 w-7 text-primary-foreground" />
        </div>
        <h1 className="text-3xl font-black">{mode === "signin" ? "مرحباً بعودتك" : "أهلاً بك"}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {mode === "signin" ? "سجل دخولك للاستمتاع بمكتبتك" : "أنشئ حساباً لحفظ المفضلات والتعليقات"}
        </p>
      </div>

      <form onSubmit={submit} className="space-y-3 rounded-2xl border border-border/60 bg-surface/40 p-6">
        {mode === "signup" && (
          <div>
            <label className="mb-1 block text-xs font-semibold">اسم المستخدم</label>
            <input value={username} onChange={(e) => setUsername(e.target.value)} required minLength={3} className="h-10 w-full rounded-md border border-input bg-background/60 px-3 text-sm outline-none focus:border-primary" />
          </div>
        )}
        <div>
          <label className="mb-1 block text-xs font-semibold">البريد الإلكتروني</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-10 w-full rounded-md border border-input bg-background/60 px-3 text-sm outline-none focus:border-primary" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold">كلمة المرور</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="h-10 w-full rounded-md border border-input bg-background/60 px-3 text-sm outline-none focus:border-primary" />
        </div>
        <Button type="submit" disabled={busy} className="h-11 w-full bg-gradient-to-r from-primary to-primary-glow text-primary-foreground">
          {busy ? "..." : mode === "signin" ? "تسجيل الدخول" : "إنشاء حساب"}
        </Button>
        <div className="text-center text-sm text-muted-foreground">
          {mode === "signin" ? "ليس لديك حساب؟" : "لديك حساب بالفعل؟"}{" "}
          <button type="button" onClick={() => setMode(mode === "signin" ? "signup" : "signin")} className="font-bold text-primary hover:underline">
            {mode === "signin" ? "أنشئ واحداً" : "سجل الدخول"}
          </button>
        </div>
      </form>
    </div>
  );
}
