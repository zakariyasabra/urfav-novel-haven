import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { ensureAuthorAdmin, safeInsertAuthorNotification } from "./author-admin.server";

const ActionInput = z.object({
  id: z.string().uuid(),
  note: z.string().max(2000).optional(),
});

export const approveAuthorApplicationFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => ActionInput.parse(d))
  .handler(async ({ data, context }) => {
    await ensureAuthorAdmin(context.supabase, context.userId);

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

    await safeInsertAuthorNotification({
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
    await ensureAuthorAdmin(context.supabase, context.userId);

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

    await safeInsertAuthorNotification({
      user_id: row.user_id,
      type: "author_rejected",
      title: "تم رفض طلبك",
      body: data.note ?? "يمكنك تقديم طلب جديد لاحقاً.",
      link: "/author/apply",
    });

    return { ok: true };
  });
