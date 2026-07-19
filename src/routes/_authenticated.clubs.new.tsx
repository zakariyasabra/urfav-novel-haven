import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { createClub } from "@/lib/clubs-api";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toArabicError } from "@/lib/errors";

export const Route = createFileRoute("/_authenticated/clubs/new")({
  component: NewClub,
});

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\u0600-\u06FF]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

function NewClub() {
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [isPrivate, setPrivate] = useState(false);
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (name.trim().length < 3) {
      toast.error("اسم النادي قصير");
      return;
    }
    setSaving(true);
    try {
      const slug = `${slugify(name)}-${Math.random().toString(36).slice(2, 6)}`;
      await createClub({
        slug,
        name_ar: name.trim(),
        description_ar: desc.trim() || undefined,
        is_private: isPrivate,
      });
      toast.success("تم إنشاء النادي");
      nav({ to: "/clubs/$slug", params: { slug } });
    } catch (err) {
      toast.error(toArabicError(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="container mx-auto max-w-xl px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle>إنشاء نادي قراءة</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">اسم النادي</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} required />
            </div>
            <div>
              <Label htmlFor="desc">الوصف</Label>
              <Textarea id="desc" value={desc} onChange={(e) => setDesc(e.target.value)} maxLength={500} rows={4} />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label htmlFor="priv">نادي خاص</Label>
                <p className="text-muted-foreground text-xs">يقتصر على الأعضاء المدعوين فقط</p>
              </div>
              <Switch id="priv" checked={isPrivate} onCheckedChange={setPrivate} />
            </div>
            <Button type="submit" disabled={saving} className="w-full">
              {saving ? "جارٍ الإنشاء…" : "إنشاء"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
