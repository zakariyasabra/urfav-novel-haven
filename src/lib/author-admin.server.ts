import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export async function ensureAuthorAdmin(
  supabase: SupabaseClient<Database>,
  userId: string,
) {
  const { data: isSuperAdmin, error: superAdminError } = await supabase.rpc("is_super_admin", {
    _user_id: userId,
  });

  if (superAdminError) throw new Error(superAdminError.message);
  if (isSuperAdmin) return;

  const { data: roles, error: rolesError } = await supabase
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
