
-- Restore column-level SELECT on profiles to keep the app functional.
-- Sensitive moderation fields stay hidden from anon; authenticated can see
-- them only via the owner/admin RLS policy (column grants are additive to RLS).
GRANT SELECT (id, username, display_name, avatar_url, bio, created_at, is_vip)
  ON public.profiles TO anon;
GRANT SELECT (id, username, display_name, avatar_url, bio, created_at, is_vip,
              vip_expires_at, updated_at, social_links, is_verified,
              account_status, suspended_until, status_reason)
  ON public.profiles TO authenticated;

-- payment_methods: hide sensitive columns from public
REVOKE SELECT ON public.payment_methods FROM anon, authenticated;
GRANT SELECT (id, code, name_ar, kind, instructions, enabled, sort_order,
              qr_image_url, currency, created_at, updated_at)
  ON public.payment_methods TO anon, authenticated;
-- Admins keep full access via existing ALL policy + service_role bypass.
GRANT ALL ON public.payment_methods TO service_role;
