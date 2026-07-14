# Production Deployment — CloudClusters Node.js

The app is a TanStack Start SSR application. It builds to a standard Node.js
server via Nitro's `node-server` preset.

## 1. Requirements

- Node.js **20.x LTS** or newer (22.x recommended)
- npm 10+ (or bun / pnpm)
- An external Supabase project (URL, publishable key, service-role key)

## 2. Environment variables

Copy `.env.example` → `.env` and fill in every value. All variables listed
in `.env.example` are required for a production build **except**
`LOVABLE_API_KEY` (only needed if you use the admin auto-translate feature).

`VITE_*` variables are inlined at build time — they must be present *before*
`npm run build`, not just at runtime.

## 3. Build & run locally (or on the server)

```bash
npm install
npm run build:node     # produces .output/  (Nitro node-server preset)
npm start              # runs: node .output/server/index.mjs
```

The server listens on `process.env.PORT` (default 3000).

## 4. CloudClusters (NodejsClusters) setup

In the CloudClusters app dashboard:

| Field                | Value                                  |
| -------------------- | -------------------------------------- |
| Node version         | 20.x or 22.x                           |
| Install command      | `npm install`                          |
| Build command        | `npm run build:node`                   |
| Start command        | `node .output/server/index.mjs`        |
| App entry / port     | `PORT` env var (CloudClusters injects) |
| Environment vars     | copy every key from `.env.example`     |

Upload the project (git or SFTP), set the env vars in the CloudClusters
"Environment Variables" panel, then click **Build & Deploy**.

### Optional: PM2

If you have shell access and prefer PM2:

```bash
npm install -g pm2
NITRO_PRESET=node-server npm run build:node
pm2 start .output/server/index.mjs --name urfav-novel -i max
pm2 save
pm2 startup
```

### Optional: Nginx reverse proxy

```nginx
server {
  listen 80;
  server_name your-domain.com;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host              $host;
    proxy_set_header X-Real-IP         $remote_addr;
    proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Upgrade           $http_upgrade;
    proxy_set_header Connection        "upgrade";
  }
}
```

## 5. Post-deploy checklist

- [ ] Visit `/` — homepage renders
- [ ] Visit `/api/sitemap.xml` — returns XML with your `SITE_URL`
- [ ] Sign in flow works (Supabase auth)
- [ ] Update `public/robots.txt` `Sitemap:` line to your production domain
- [ ] Configure DNS to point to the CloudClusters app IP
- [ ] Enable HTTPS (CloudClusters Let's Encrypt or your certificate)
- [ ] In the Supabase dashboard, add your production domain to the allowed
      redirect URLs (Authentication → URL Configuration)

## 6. Notes / known constraints

- shared-hosting cPanel (Apache/LiteSpeed only, no Node) is **not** supported —
  this project requires a Node.js runtime. Use CloudClusters NodejsClusters,
  a VPS, DigitalOcean App Platform, Render, Fly.io, or similar.
- The Supabase service-role key must never be exposed. It is only read
  server-side inside `.handler()` bodies via `process.env`.
- Edge functions (Supabase) are not used by this project — all server logic
  runs inside the Node server via TanStack `createServerFn` / server routes.
