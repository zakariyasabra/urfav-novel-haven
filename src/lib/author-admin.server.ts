import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export async function ensureAuthorAdmin(
  _supabase: SupabaseClient<Database>,
  userId: string,
) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: superAdmin } = await supabaseAdmin
    .from("super_admins")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (superAdmin) return;

  const { data: roles, error: rolesError } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["admin", "moderator", "editor"])
    .limit(1);

  if (rolesError) throw new Error(rolesError.message);
  if (!roles || roles.length === 0) throw new Error("forbidden");
}

export async function safeInsertAuthorNotification(payload: {
  user_id: string;
  type: string;
  title: string;
  body: string;
  link: string;
}) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin.from("notifications").insert(payload);

  if (error) {
    console.error("[author-admin] notification insert failed", {
      code: error.code,
      message: error.message,
    });
  }
}
