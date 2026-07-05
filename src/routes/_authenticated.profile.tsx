import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { User as UserIcon, Shield, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "الملف الشخصي — UR Fav Novel" }, { name: "robots", content: "noindex" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user, isAdmin } = useAuth();
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [isVip, setIsVip] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle().then(({ data }) => {
      if (data) {
        setUsername(data.username);
        setDisplayName(data.display_name ?? "");
        setBio(data.bio ?? "");
        setIsVip(data.is_vip ?? false);
      }
    });
  }, [user]);

  async function save() {
    if (!user) return;
    setBusy(true);
    const { error } = await supabase.from("profiles").update({ display_name: displayName, bio }).eq("id", user.id);
    setBusy(false);
    if (error) return toast.error("تعذر الحفظ");
    toast.success("تم الحفظ");
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="mb-6 text-3xl font-black md:text-4xl">الملف الشخصي</h1>

      <div className="rounded-2xl border border-border/60 bg-surface/40 p-6">
        <div className="mb-6 flex items-center gap-4">
          <div className="grid h-16 w-16 place-items-center rounded-full bg-gradient-to-br from-primary to-primary-glow text-primary-foreground shadow-glow">
            <UserIcon className="h-8 w-8" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-lg font-bold">{displayName || username}</div>
            <div className="truncate text-sm text-muted-foreground">{user?.email}</div>
            <div className="mt-1 flex flex-wrap gap-2">
              {isAdmin && <span className="inline-flex items-center gap-1 rounded-md bg-primary/20 px-2 py-0.5 text-xs font-bold text-primary"><Shield className="h-3 w-3" />مدير</span>}
              {isVip && <span className="inline-flex items-center gap-1 rounded-md bg-gold/20 px-2 py-0.5 text-xs font-bold text-gold"><Sparkles className="h-3 w-3" />VIP</span>}
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-semibold">اسم المستخدم</label>
            <input value={username} disabled className="h-10 w-full rounded-md border border-input bg-background/40 px-3 text-sm text-muted-foreground" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold">الاسم الظاهر</label>
            <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="h-10 w-full rounded-md border border-input bg-background/60 px-3 text-sm outline-none focus:border-primary" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold">نبذة</label>
            <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} className="w-full resize-none rounded-md border border-input bg-background/60 p-3 text-sm outline-none focus:border-primary" />
          </div>
          <Button onClick={save} disabled={busy} className="bg-gradient-to-r from-primary to-primary-glow text-primary-foreground">حفظ التغييرات</Button>
        </div>
      </div>

      {!isVip && (
        <div className="mt-6 rounded-2xl border border-gold/40 bg-gold/5 p-6">
          <div className="flex items-center gap-3">
            <Sparkles className="h-6 w-6 text-gold" />
            <div>
              <div className="font-bold">اشتراك VIP</div>
              <div className="text-sm text-muted-foreground">اقرأ الفصول المدفوعة، بلا إعلانات، وميزات حصرية. (قريباً)</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
