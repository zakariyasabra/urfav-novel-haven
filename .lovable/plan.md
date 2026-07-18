
# FAVNOL Gamification — Implementation Plan

Additive-only. No changes to auth, OAuth, Supabase config, env, or existing tables. Every new table is new; every new UI is a new component mounted inside existing pages.

## Guardrails

- Reuse existing wallets/coin_transactions where sensible (Fav Coins = existing coins). No parallel currency.
- Do NOT edit: `src/integrations/supabase/*`, `src/routes/auth.index.tsx`, `_authenticated/route.tsx`, `.env`, existing admin tabs, existing reader logic.
- All new UI = new files under `src/components/gamification/*` and new admin tab file. Existing pages get one small import + mount point.
- All new RPCs `SECURITY DEFINER`, `search_path=public`, `GRANT EXECUTE TO authenticated` only (never anon). Every write goes through an RPC — no direct table inserts from the client.

## Phase A — Schema (single migration, all new tables)

New tables (all with GRANTs + RLS + `auth.uid()` scoped policies):

- `user_xp` (user_id PK, xp int, level int, total_xp int)
- `xp_rules` (code PK, xp int, coins int, daily_cap int, enabled) — seeded with: signup, daily_login, read_chapter, finish_chapter, comment, receive_like, share_novel, rate_novel, bookmark, invite, publish_novel, publish_chapter
- `xp_events` (id, user_id, code, xp, coins, ref jsonb, created_at) — append-only ledger, unique key for idempotency (`user_id, code, ref_hash, day`)
- `achievements` (code PK, title_ar, title_en, description, icon, xp, coins, badge_code, threshold_kind, threshold_value, enabled)
- `user_achievements` (user_id, achievement_code, unlocked_at)
- `badges` (code PK, title_ar/en, icon, rarity, enabled)
- `user_badges` (user_id, badge_code, awarded_at, is_equipped)
- `daily_missions` (code PK, title, target_kind, target_value, xp, coins, enabled)
- `user_daily_missions` (user_id, mission_code, day date, progress, completed, claimed)
- `weekly_challenges` (id, title, starts_at, ends_at, target_kind, target_value, xp, coins, enabled)
- `user_weekly_challenges` (user_id, challenge_id, progress, completed, claimed)
- `reward_boxes` (id, user_id, source, opened, reward jsonb, created_at)
- `reward_box_pool` (id, weight, reward jsonb, enabled) — admin-configurable drop table
- `referrals` (inviter_id, invitee_id PK, code, created_at, rewarded)
- `referral_codes` (user_id PK, code UNIQUE)
- `reading_goals_ext` (user_id, kind daily/weekly/monthly, target, current, period_start) — only if existing `reading_goals` doesn't cover it; otherwise skip
- `leaderboard_snapshots` (period, key, user_id, score, rank, computed_at) — for weekly/monthly leaderboards
- `season_events` (id, title, starts_at, ends_at, config jsonb, enabled)
- `user_season_progress` (user_id, season_id, xp, tier, claimed_tiers int[])
- `reputation` (user_id PK, score int, tier text)

Existing tables reused unchanged:
- `wallets` + `coin_transactions` — Fav Coins is these coins (already deployed and tested).
- `reading_streaks` — already exists (`bump_reading_streak` RPC exists). Reuse.
- `notifications` — already exists. Reuse for level-up / achievement toasts.
- `profiles` — no schema change; new data lives in new tables joined by user_id.

## Phase B — Core RPCs (SECURITY DEFINER)

- `gm_award(_code text, _ref jsonb)` — central entry point. Looks up `xp_rules`, enforces daily cap, checks idempotency via `xp_events`, credits XP, credits Fav Coins (into existing `wallets` via a transaction row), updates `user_xp`, recomputes level, triggers achievement check, inserts notification on level-up.
- `gm_check_achievements(_user uuid)` — evaluates thresholds against ledger + existing stats.
- `gm_claim_mission(_code text)` — completes and pays out.
- `gm_claim_challenge(_id uuid)` — same for weekly.
- `gm_open_box(_id uuid)` — random weighted pull from `reward_box_pool`.
- `gm_use_referral(_code text)` — one-shot, blocks self-referral & repeat.
- `gm_leaderboard(_period text, _key text, _limit int)` — read-only.
- `gm_admin_*` variants gated by `has_any_admin_role(auth.uid())` for CRUD on rules/achievements/badges/missions/challenges/boxes/seasons.

Level formula: `level = floor(sqrt(total_xp / 50))`. Pure SQL, no config needed.

## Phase C — Client hooks & event wiring

New: `src/lib/gamification-api.ts`, `src/hooks/use-gamification.ts`.

Non-invasive event hooks (single-line additions in existing components):
- After chapter read (existing `reading_history` upsert) → `gm_award('read_chapter', {chapter_id})`
- On comment insert success → `gm_award('comment', ...)`
- On rating insert → `gm_award('rate_novel', ...)`
- On bookmark → `gm_award('bookmark', ...)`
- On share button (existing `share-novel.tsx`) → `gm_award('share_novel', ...)`
- On login (root effect, once per day) → `gm_award('daily_login')` + `bump_reading_streak`
- On signup callback → `gm_award('signup')`
- On author publish → `gm_award('publish_novel' | 'publish_chapter')`

Each = one line inserted at the success path. No existing logic changed.

## Phase D — UI surfaces (all new components)

- `<XpToast />` — animated floating "+25 XP" on award (mounted globally in `__root.tsx` via portal — one added line).
- `<LevelBadge />` — used in header near notifications-bell (one added line in `layout.tsx`).
- `/profile` addition: XP bar, level, badges grid, achievements grid, reading calendar heatmap, stats card, activity timeline. Injected as new sections at the bottom of existing profile route.
- `/library` addition: streak flame + daily missions widget at top.
- New routes (new files only): `/achievements`, `/leaderboard`, `/missions`, `/r/$code` (referral landing that calls `gm_use_referral` then redirects to `/auth` or home).
- Reward box modal that opens post-chapter with a chance.

Styling: reuse existing tokens (orange primary, dark bg). No design system changes.

## Phase E — Admin

New file: `src/components/admin/gamification-tab.tsx` mounted as a new tab inside existing admin tabs list (one line added to admin route). Sub-panels:
- XP rules editor
- Achievements CRUD
- Badges CRUD
- Daily missions CRUD
- Weekly challenges CRUD
- Reward box pool weights
- Season events CRUD
- Referral reward config (stored in `site_settings` new key `gamification`)
- Leaderboard reset action (calls `gm_admin_reset_leaderboard`)
- Notification templates (stored in `site_settings.gamification_templates`)

Full i18n via existing `src/i18n/dict.ts` — add new keys.

## Phase F — Cron & rollover

Use existing `pg_cron` pattern:
- Daily 00:05 UTC: reset `user_daily_missions` day rollover (implicit via `day` column; job only prunes old rows).
- Weekly Monday 00:10 UTC: snapshot leaderboard, rotate weekly challenges.
- Monthly 1st 00:15 UTC: monthly leaderboard snapshot.

All SQL-only cron — no external endpoints.

## Phase G — Verification

- Build passes (`bun run build`).
- Playwright smoke: sign in as test user → read a chapter → verify XP toast fires, `xp_events` row exists, wallet coin delta correct, level bar updates.
- Admin tab loads, CRUD works, RLS blocks non-admins.
- All existing flows (auth, reader, admin, wallet, library) untouched — regression pass on 5 core routes.

## Rollout order

1. Phase A migration → approve
2. Phase B RPCs migration → approve
3. Phase C hooks + Phase D toast/level badge (safe, invisible if RPCs no-op)
4. Phase D full profile/leaderboard/missions/achievements pages
5. Phase E admin tab
6. Phase F cron
7. Phase G QA

Each phase ships behind zero flag flips — new tables/routes are additive. If any phase is rejected, prior phases keep working.

## What I need from you

Confirm one thing before I start Phase A: **treat "Fav Coins" as the existing `wallets.coins` currency** (recommended — one economy, already integrated with VIP/unlocks/gifts), or spin up a separate `fav_coins` wallet decoupled from the paid economy?

If you confirm "use existing wallets", I proceed straight to the Phase A migration.
