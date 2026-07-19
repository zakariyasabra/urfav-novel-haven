-- Revoke anonymous EXECUTE on SECURITY DEFINER functions that should not be publicly callable
-- Trigger functions (never called via API)
REVOKE EXECUTE ON FUNCTION public._collections_bump_count() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public._collections_bump_followers() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public._collections_set_slug() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.tg_chapters_snapshot_version() FROM anon, public;

-- Authenticated-only helpers (require a signed-in user context)
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure::text AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'bp_active_season','gm_leaderboard','mk_daily_shop','collection_bump_view',
        'is_feature_enabled','rec_because_you_read','rec_for_you',
        'rec_from_followed_authors','rec_readers_like_you'
      )
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon, public', r.sig);
  END LOOP;
END $$;