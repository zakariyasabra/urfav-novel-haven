
-- Restore EXECUTE privileges required for RLS checks and self-gating admin RPCs.
-- Security posture: revoke from PUBLIC and anon; grant only to authenticated.
-- All admin_*/approve_*/reject_*/publish_due_chapters functions are SECURITY DEFINER
-- and internally verify has_role/has_any_admin_role, so non-admin callers get 'forbidden'.

-- Read-only role/VIP checks used inside RLS policies (must be callable by any signed-in user)
REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.has_any_admin_role(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_vip(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.has_any_admin_role(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_vip(uuid) TO authenticated, anon;

-- Admin RPCs (self-gated inside the function body)
REVOKE ALL ON FUNCTION public.admin_adjust_coins(uuid, integer, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_grant_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_revoke_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_grant_vip(uuid, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_revoke_vip(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_set_account_status(uuid, text, text, timestamptz) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_approve_coin_purchase(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_reject_coin_purchase(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_approve_withdrawal(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_reject_withdrawal(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.approve_author_application(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.reject_author_application(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.publish_due_chapters() FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.admin_adjust_coins(uuid, integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_grant_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_revoke_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_grant_vip(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_revoke_vip(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_account_status(uuid, text, text, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_approve_coin_purchase(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reject_coin_purchase(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_approve_withdrawal(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reject_withdrawal(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_author_application(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_author_application(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.publish_due_chapters() TO authenticated;
