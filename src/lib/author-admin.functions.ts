import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { ensureAuthorAdmin, safeInsertAuthorNotification } from "@/lib/author-admin.server";

export const approveAuthorApplicationFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        id: z.string().uuid(),
        note: z.string().trim().max(2000).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await ensureAuthorAdmin(context.supabase, context.userId);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: application, error: updateError } = await supabaseAdmin
      .from("author_applications")
      .update({
        status: "approved",
        admin_note: data.note || null,
        reviewed_by: context.userId,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", data.id)
      .select("user_id")
      .maybeSingle();

    if (updateError) throw new Error(updateError.message);
    if (!application) throw new Error("not found");

    const { error: roleError } = await supabaseAdmin.from("user_roles").insert({
      user_id: application.user_id,
      role: "author",
    });

    if (roleError && roleError.code !== "23505") throw new Error(roleError.message);

    await safeInsertAuthorNotification({
      user_id: application.user_id,
      type: "author_approved",
      title: "تمت الموافقة على طلبك ككاتب",
      body: "يمكنك الآن نشر رواياتك من لوحة الكاتب.",
      link: "/author",
    });

    return { ok: true };
  });

export const rejectAuthorApplicationFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        id: z.string().uuid(),
        note: z.string().trim().max(2000).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await ensureAuthorAdmin(context.supabase, context.userId);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: application, error: updateError } = await supabaseAdmin
      .from("author_applications")
      .update({
        status: "rejected",
        admin_note: data.note || null,
        reviewed_by: context.userId,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", data.id)
      .select("user_id")
      .maybeSingle();

    if (updateError) throw new Error(updateError.message);
    if (!application) throw new Error("not found");

    await safeInsertAuthorNotification({
      user_id: application.user_id,
      type: "author_rejected",
      title: "تم رفض طلبك",
      body: data.note || "يمكنك تقديم طلب جديد لاحقاً.",
      link: "/author/apply",
    });

    return { ok: true };
  });
