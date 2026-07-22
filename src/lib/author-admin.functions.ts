import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ActionInput = z.object({
  id: z.string().uuid(),
  note: z.string().max(2000).optional(),
});

async function ensureAdmin(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["admin", "moderator", "editor"])
    .limit(1);
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) throw new Error("forbidden");
}

export const approveAuthorApplicationFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => ActionInput.parse(d))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("author_applications")
      .update({
        status: "approved",
        admin_note: data.note ?? null,
        reviewed_by: context.userId,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", data.id)
      .select("user_id")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("not found");

    const { error: roleErr } = await supabaseAdmin
      .from("user_roles")
      .upsert(
        { user_id: row.user_id, role: "author" },
        { onConflict: "user_id,role", ignoreDuplicates: true },
      );
    if (roleErr) throw new Error(roleErr.message);

    await supabaseAdmin.from("notifications").insert({
      user_id: row.user_id,
      type: "author_approved",
      title: "تمت الموافقة على طلبك ككاتب",
      body: "يمكنك الآن نشر رواياتك من لوحة الكاتب.",
      link: "/author",
    });
    return { ok: true };
  });

export const rejectAuthorApplicationFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => ActionInput.parse(d))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("author_applications")
      .update({
        status: "rejected",
        admin_note: data.note ?? null,
        reviewed_by: context.userId,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", data.id)
      .select("user_id")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("not found");

    await supabaseAdmin.from("notifications").insert({
      user_id: row.user_id,
      type: "author_rejected",
      title: "تم رفض طلبك",
      body: data.note ?? "يمكنك تقديم طلب جديد لاحقاً.",
      link: "/author/apply",
    });
    return { ok: true };
  });
