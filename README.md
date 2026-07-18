# FAVNOL

Premium Arabic (RTL) novel reading platform. Dark-first UI, Supabase backend, fully portable — deploy on any hosting provider.

## ✨ Features

- Read novels & chapters without an account (auth is optional).
- Categories, latest updates, popular, search, ratings, comments.
- Optional accounts: favorites, reading history, comments, notifications, VIP.
- Admin dashboard (role-based) with ads, VIP plans, site settings.
- SEO-ready, RTL Arabic, mobile-first, responsive.

## 🧰 Tech Stack

- **Frontend:** React 19 + TypeScript + Vite + Tailwind CSS v4 + TanStack Router
- **Backend:** [Supabase](https://supabase.com) (Postgres + Auth + RLS) — bring your own project
- **UI:** shadcn/ui components (Radix primitives)

Everything is **your code**. There is **no lock-in** to any hosting provider.

---

## 🚀 Local Development

### 1. Install dependencies

```bash
# with bun (recommended)
bun install

# or with npm
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Fill `.env` with your Supabase credentials (see next section).

### 3. Run the dev server

```bash
bun dev        # or: npm run dev
```

Open http://localhost:8080

### 4. Build for production

```bash
bun run build     # or: npm run build
```

The static site is emitted to `dist/`. Upload the **contents of `dist/`** to any hosting provider.

---

## 🗄 Set Up Your Own Supabase Project

1. Create a free project at https://supabase.com/dashboard.
2. In **Project Settings → API**, copy:
   - Project URL → `VITE_SUPABASE_URL`
   - Publishable (anon) key → `VITE_SUPABASE_PUBLISHABLE_KEY`
   - Project ref → `VITE_SUPABASE_PROJECT_ID`
3. Apply the schema. Two options:
   - **Supabase CLI (recommended):**
     ```bash
     npx supabase link --project-ref YOUR_PROJECT_REF
     npx supabase db push
     ```
   - **Manual:** open each file under `supabase/migrations/` (chronological order) in the Supabase SQL Editor and run it.
4. In **Authentication → URL Configuration**, add your deployed URL (e.g. `https://your-domain.com`) to Site URL and Redirect URLs.
5. (Optional) In **Authentication → Providers → Google**, enable Google OAuth and add your OAuth client.

---

## 🌍 Deployment Guides

The build output is a **plain static SPA** — HTML, CSS, JS, images. Every provider below works.

### HostGator / cPanel / Any Apache Shared Hosting

1. `bun run build`
2. Upload the **contents** of `dist/` to your `public_html/` directory via cPanel File Manager or FTP.
3. The included `public/.htaccess` (copied into `dist/` at build time) handles SPA routing automatically.
4. Done. Visit your domain.

### VPS (DigitalOcean / Contabo / Hetzner / any Linux)

Using **Nginx** as a static file server:

```nginx
server {
  listen 80;
  server_name your-domain.com;
  root /var/www/urfav-novel/dist;
  index index.html;

  # Long-cache hashed assets
  location /assets/ {
    expires 1y;
    add_header Cache-Control "public, immutable";
  }

  # SPA fallback
  location / {
    try_files $uri $uri/ /index.html;
  }
}
```

```bash
# On your VPS:
git clone your-repo && cd urfav-novel
bun install
cp .env.example .env && nano .env  # fill in values
bun run build
sudo cp -r dist/* /var/www/urfav-novel/dist/
sudo systemctl reload nginx
```

Add HTTPS with certbot: `sudo certbot --nginx -d your-domain.com`.

### Vercel / Netlify / Cloudflare Pages

1. Push this repo to GitHub.
2. Import the project in your provider.
3. Build command: `bun run build` (or `npm run build`)
4. Output directory: `dist`
5. Add your env vars from `.env.example` in the provider dashboard.

The included `public/_redirects` handles SPA routing on Netlify/Cloudflare.

### Windows / IIS Hosting

Upload `dist/` contents to your site root. `public/web.config` handles SPA fallback.

---

## 🔑 Environment Variables

See `.env.example` for the complete list. The only required variables to run are:

| Variable | Purpose |
|---|---|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Public (anon) key |
| `VITE_SITE_URL` | Your deployed domain (for canonical URLs, sitemap, OG tags) |
| `VITE_SITE_NAME` | Site display name |

**Never** commit your `.env` file. Only `.env.example` should be in git.

---

## 🔐 Making Yourself Admin

After signing up your first account, the migration in `supabase/migrations/*_seed.sql` automatically promotes the **first** registered user to `admin`. Subsequent users are `user` by default.

To promote another user manually, run this in the Supabase SQL Editor:

```sql
insert into public.user_roles (user_id, role)
values ('<user-uuid>', 'admin');
```

---

## 📁 Project Structure

```
src/
├── routes/              # File-based routes (TanStack Router)
├── components/          # Reusable UI components
│   ├── ui/              # shadcn/ui primitives
│   └── site/            # App layout, header, footer
├── hooks/               # React hooks (use-auth, use-mobile, ...)
├── integrations/
│   └── supabase/        # Supabase client + generated types
├── lib/                 # API layer, utilities
└── styles.css           # Tailwind theme, global styles
public/                  # Static assets served as-is
supabase/migrations/     # SQL schema — apply to your Supabase project
```

---

## 🛡 License & Ownership

You own this source code entirely. No hosting provider is required. No proprietary services are used beyond Supabase (which is also self-hostable if you prefer).
# test
