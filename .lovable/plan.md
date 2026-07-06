## Scope reality check

The existing app already ships the core reading platform (RTL Arabic UI, dark theme, home/novels/chapters/library/admin, Supabase schema with 11 tables, auth with first-user-admin, sample content). This request layers on ~9 major systems on top. I'll build it in prioritized phases and be explicit about what "production-ready" means on this stack.

**Stack correction (unchanged):** TanStack Start + React + TS + Tailwind + Lovable Cloud (Supabase). Not Next.js. Same capabilities: SSR, server functions, file-based routing, ISR-equivalent via loader caching.

## What I will build now (Phase 1 — foundation upgrades)

1. **Expanded DB schema** (single migration): `ad_slots`, `ad_placements`, `vip_plans`, `vip_subscriptions`, `payment_transactions` (schema only), `audit_logs`, `reports` (DMCA/abuse), `site_settings` (key/value: maintenance mode, SMTP, social links, metadata), `reading_stats` (streaks, achievements), `search_history`, `comment_likes`, `comment_reports`. Adds `parent_id` to comments for nesting, `is_pinned`. Adds role enum `moderator`, `editor`. RLS + GRANTs on every table.
2. **Auth upgrades:** Google OAuth via `configure_social_auth` + `lovable.auth.signInWithOAuth`. Email verification + password recovery pages (`/auth/reset-password`, `/auth/callback`). Apple documented as BYOC (needs user's Apple Developer creds — cannot be enabled without them).
3. **Admin CMS expansion:** tabs for Novels, Chapters, Genres, Users (role management), Comments (moderate/pin/delete), Ads (7 slots: header/home-top/home-mid/list/chapter-top/chapter-bottom/sidebar/footer with script textareas + on/off), VIP Plans CRUD, Site Settings (maintenance, social, SMTP, metadata), Reports queue, Audit log viewer, Stats dashboard (revenue, CTR/RPM placeholders, top novels/chapters, user growth via SQL aggregations). Role-gated (SuperAdmin > Moderator > Editor).
4. **Reading UX polish:** floating nav bar, full-screen toggle, keyboard shortcuts (←/→/f), sepia/light/dark themes, line-height + font controls persisted, reading progress bar, estimated time, auto-resume banner, "random chapter" button, recently-viewed list, reading streak counter.
5. **Search upgrades:** Postgres `pg_trgm` for typo tolerance, auto-suggest dropdown, search history (logged-in users), popular keywords aggregation.
6. **Comments:** nested replies (1 level), like button, report button, admin pin/delete, simple spam heuristic (link count + repeat text).
7. **VIP surface:** `/vip` pricing page reading from `vip_plans`, subscribe button stubbed to a `checkout_intent` row + toast ("Payment gateway not connected"), ad-free + early-access enforcement in reader (checks active subscription), VIP badge on profile.
8. **Ad slots:** `<AdSlot name="header" />` component reads `ad_placements`, renders raw HTML if enabled, respects VIP ad-free.
9. **SEO/perf:** dynamic per-route `head()` with JSON-LD (Book/Article schema for novels/chapters), `public/robots.txt`, dynamic `sitemap.xml` server route enumerating novels + chapters, canonical URLs, breadcrumbs component.
10. **PWA:** `vite-plugin-pwa` with guarded registration wrapper per skill (dev/preview disabled, `?sw=off` kill switch), manifest, icons, offline shell for previously-visited chapters (NetworkFirst nav).
11. **Legal pages:** `/about`, `/contact` (form → `reports` table with type=contact), `/privacy`, `/terms`, `/dmca` (form → `reports` table with type=dmca).
12. **I18n scaffolding:** `useLocale()` hook, `messages/ar.json` + `messages/en.json`, dir/lang toggled at root; only ar strings translated now, en placeholders where copy is heavy — architecture ready.
13. **Audit logs:** trigger on admin-sensitive tables inserting to `audit_logs` (actor, action, target, diff).
14. **CSV import/export:** admin buttons that parse/generate CSV client-side for novels & chapters (using `papaparse`).

## What is architecturally prepared but NOT wired to a live provider (documented in-app)

- **Stripe/PayPal:** `vip_subscriptions` + `payment_transactions` + `/api/public/webhooks/payment` route with signature-verification skeleton + admin "Connect Stripe" placeholder. Needs `STRIPE_SECRET_KEY` via `add_secret` when the user is ready.
- **SMTP custom templates:** `site_settings.smtp_*` fields + template editor UI. Actual sending uses Lovable's built-in auth emails; custom transactional email needs `scaffold_transactional_email` after a domain is added.
- **Apple Sign-In:** UI button present but disabled with tooltip until user provides Apple Developer credentials (Team ID, Key ID, Services ID, .p8) via the Cloud dashboard.
- **2FA (TOTP):** Supabase Auth MFA endpoints exist; I add the enroll/verify UI under `/profile/security`. Works out of the box.
- **AI recommendations / smart search:** `/api/public/recommend` server route stub that calls Lovable AI Gateway (`LOVABLE_API_KEY` already set) returning related novels via embeddings — enabled, live.
- **Real-time analytics:** Lovable's built-in analytics is already on. In-app admin dashboard shows DB-derived metrics (views, users, top novels/chapters, subscribers). CTR/RPM show 0 until an ad network is connected.
- **Rate limiting:** No standard primitive on this backend (per platform rules). Not implemented; documented in admin settings.
- **Redis/CDN:** Static assets already CDN-served by hosting. No Redis layer added (would require external provider).

## Technical notes

- Migrations run first, then code. Every new public table gets GRANTs.
- New role enum values need enum-alter migration before code references them.
- `has_role` extended to accept any of the three admin-ish roles via `has_any_role`.
- Server functions: public reads use publishable-key server client; VIP/admin writes use `requireSupabaseAuth` + role check.
- Sitemap is a server route at `/sitemap.xml` querying novels/chapters.
- PWA per skill: no SW in dev/preview/iframe, kill switch, NetworkFirst navigation.

## Out of scope for this pass (would be Phase 2 if you want)

- Actual charge processing (needs live Stripe keys + your business entity).
- Sending custom-branded transactional emails (needs your email domain via setup dialog).
- Native mobile app (REST is ready; the app itself is a separate build).
- Full English translation of every string (architecture ready, copy is Arabic-first as requested).

## Delivery

Given the scope (~40–50 files, 1 large migration, several server routes, PWA setup, admin CMS expansion), this will take multiple turns to type-check clean. I will ship it end-to-end without stopping for confirmation on internal choices, and surface only real blockers (missing credentials).

**Confirm and I'll start with the migration.**