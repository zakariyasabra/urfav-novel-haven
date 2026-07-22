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
    .in("role", ["super_admin", "admin"])
    .limit(1);

  if (error) {
    throw new Error(error.message);
  }

  if (!data || data.length === 0) {
    throw new Error("غير مصرح لك بتنفيذ هذا الإجراء");
  }

  return supabaseAdmin;
}

export const approveAuthorApplicationFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => ActionInput.parse(input))
  .handler(async ({ data, context }) => {
    const supabaseAdmin = await ensureAdmin(context.userId);

    const { data: row, error } = await supabaseAdmin
      .from("author_applications")
      .update({
        status: "approved",
        reviewed_by: context.userId,
        reviewed_at: new Date().toISOString(),
        admin_note: data.note ?? null,
      })
      .eq("id", data.id)
      .select("user_id")
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!row?.user_id) {
      throw new Error("طلب الكاتب غير موجود");
    }

    const { error: roleErr } = await supabaseAdmin.from("user_roles").upsert(
      {
        user_id: row.user_id,
        role: "author",
      },
      {
        onConflict: "user_id,role",
        ignoreDuplicates: true,
      },
    );

    if (roleErr) {
      throw new Error(roleErr.message);
    }

    await supabaseAdmin
      .from("profiles")
      .update({
        is_author: true,
      })
      .eq("id", row.user_id);

    await supabaseAdmin.from("notifications").insert({
      user_id: row.user_id,
      type: "author_approved",
      title: "تم قبول طلبك",
      body: "مبروك! تم قبولك ككاتب ويمكنك الآن نشر الروايات.",
      link: "/author",
    });

    return { ok: true };
  });

export const rejectAuthorApplicationFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => ActionInput.parse(input))
  .handler(async ({ data, context }) => {
    const supabaseAdmin = await ensureAdmin(context.userId);

    const { data: row, error } = await supabaseAdmin
      .from("author_applications")
      .update({
        status: "rejected",
        reviewed_by: context.userId,
        reviewed_at: new Date().toISOString(),
        admin_note: data.note ?? null,
      })
      .eq("id", data.id)
      .select("user_id")
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!row?.user_id) {
      throw new Error("طلب الكاتب غير موجود");
    }

    await supabaseAdmin.from("notifications").insert({
      user_id: row.user_id,
      type: "author_rejected",
      title: "تم رفض طلبك",
      body: data.note ?? "يمكنك تقديم طلب جديد لاحقاً.",
      link: "/author/apply",
    });

    return { ok: true };
  });
