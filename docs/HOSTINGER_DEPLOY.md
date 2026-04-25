# Deploying Creeda Web on Hostinger Premium (Node.js)

Hostinger Premium **does** support Next.js, but only when the app is registered as a Node.js application in hPanel. If you only upload files to `public_html`, Apache/LiteSpeed serves them as static assets and you get:

- CSS rejected with `Refused to apply style ... MIME type 'text/plain'`
- `503` on every POST (signup, login, server actions, RSC)

This guide gets the app running as an actual Node process behind Hostinger's reverse proxy.

## Prerequisites

- Hostinger Premium / Business plan (Node.js apps enabled)
- Domain pointed at the plan (you have `creeda.in` and `www.creeda.in`)
- Supabase project URL + anon key + service role key
- The `check_rate_limit` SQL repair applied (see [migrations/20260425_v37_rate_limit_rpc_repair.sql](../migrations/20260425_v37_rate_limit_rpc_repair.sql))

## One-time setup in hPanel

### 1. Create the Node.js application

1. Open hPanel → **Hosting** → click **Manage** on `creeda.in`
2. Sidebar → **Advanced** → **Node.js**
3. Click **Create Application**
4. Fill in:
   - **Node.js version:** `20.x` (Next.js 16 requires Node ≥ 20.9, ≤ 24)
   - **Application mode:** `Production`
   - **Application root:** `creeda-web` (do NOT use `public_html` — that's for static files)
   - **Application URL:** select `creeda.in` (and `www.creeda.in` if listed separately)
   - **Application startup file:** `node_modules/next/dist/bin/next` with arguments `start` — or leave blank and use the npm script below
5. Click **Create**

### 2. Pull the code from GitHub

In the same Node.js panel, find the **Git** section:

- **Repository URL:** `https://github.com/creedaperformance/Creeda-2.0-Web.git`
- **Branch:** `main`
- Click **Pull / Clone**

The code lands in `~/creeda-web/`.

### 3. Set environment variables

Still in the Node.js application panel, find **Environment variables** and add:

```
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
NEXT_PUBLIC_SITE_URL=https://www.creeda.in
DATABASE_URL=postgres://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres
NODE_ENV=production
```

Use only the Supabase project origin for `NEXT_PUBLIC_SUPABASE_URL`. Do not paste a REST endpoint such as `/rest/v1`; the app normalizes this defensively, but the clean value should look exactly like `https://abc123.supabase.co`.

Optional (only if you've configured these features):

```
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=...
RESEARCH_INTERNAL_API_TOKEN=...
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-...
```

### 4. Install dependencies + build

In the Node.js panel there's an **NPM Install** button — click it. This runs `npm install` against the repo root.

Then you need to run the production build. Two paths:

- **If hPanel exposes "Run NPM Script":** select `build` and click run
- **Otherwise, open the Hostinger Terminal** (hPanel → Advanced → Terminal) and:

  ```bash
  cd ~/creeda-web
  npm install
  npm run build
  ```

The build takes 1–3 minutes. You'll see `✓ Compiled successfully` on success.

### 5. Configure the startup script

Hostinger needs to know how to start the Next.js process. In the Node.js panel:

- **Application startup file:** `node_modules/next/dist/bin/next`
- **Arguments:** `start -p $PORT`

OR set a **Custom Startup Command:** `npm run start`

Either works. The key thing is `next start` will respect `$PORT` automatically (Hostinger assigns one and reverse-proxies to it).

### 6. Stop Apache from intercepting routes

This is the critical step that fixes the static-file serving problem.

In the **File Manager** (hPanel → Files → File Manager):

1. Navigate to `public_html`
2. **Delete everything currently inside `public_html`** if it contains old build output (look for `.next`, `index.html`, leftover deploy artifacts)
3. Create a `.htaccess` file in `public_html` with this content:

```apache
RewriteEngine On
RewriteRule ^(.*)$ http://127.0.0.1:%{ENV:PORT}/$1 [P,L]
```

This routes every request through the Node app instead of letting Apache serve files directly. (Hostinger's Node.js feature usually configures this for you, but having an explicit `.htaccess` removes ambiguity.)

### 7. Start the app

Back in the Node.js panel: **Start Application** (or Restart if it was already started). Status should change to **Running** with a green dot.

### 8. Verify

```bash
curl -sI https://www.creeda.in/_next/static/css/<some-css-hash>.css | grep -i 'content-type\|server'
```

You should see `content-type: text/css` (not `text/plain`).

Then in a real browser, run through:
1. Open `https://www.creeda.in` → home page loads with styling
2. Click signup → fill in athlete signup form → click **Complete signup**
3. Should land on `/athlete/onboarding`, not 503

## Updating the deployment

Whenever you push new commits to `Creeda-2.0-Web/main`:

1. hPanel → Node.js → **Git → Pull**
2. **NPM Install** (only if `package.json` changed)
3. **NPM Run Script → build** (or terminal `npm run build`)
4. **Restart Application**

Total: ~3 minutes. You can script this via `git push` + a webhook later if it becomes a daily thing.

## Troubleshooting

### Still getting 503 on POST after start

- Check the Node app is actually running: hPanel → Node.js → status should be **Running**
- Check the Hostinger app logs (Node.js panel has a "Logs" tab) for crash output. The most common cause is a missing env var — Next.js will refuse to start if `NEXT_PUBLIC_SUPABASE_URL` is unset because the Supabase client throws at module load.

### CSS still served as `text/plain`

- Confirm `.htaccess` in `public_html` has the rewrite rule above
- Make sure you deleted any old static `.next/` folder from `public_html` — if it's there, Apache will serve it directly before the rewrite kicks in
- Try a hard refresh in the browser (Cmd+Shift+R) to bypass cached old responses

### Homepage looks unstyled or too wide on mobile

- Purge Hostinger CDN/cache after deploying, then restart the Node.js application. A stale cached `/` HTML response can reference old `_next/static` chunk filenames that no longer exist.
- Confirm with `curl -I https://www.creeda.in/`: the homepage should not show an old `age` value with `x-hcdn-cache-status: HIT`.
- If mobile Chrome still shows the old page after the purge, clear the site data for `creeda.in` or open the page in an incognito tab to bypass stale browser cache.

### "Module not found" or build errors during npm run build

- Confirm Node version in hPanel is `20.x` (not 18). Next.js 16 needs Node 20+.
- Run `rm -rf node_modules .next && npm install && npm run build` from the terminal to start clean.

### Domain shows the Hostinger default landing page instead of the app

- hPanel → **Domains** → confirm `creeda.in` is mapped to the Node.js application's URL, not to `public_html` directly
- DNS: confirm `creeda.in` resolves to your Hostinger IP (`145.79.58.238`)

### Signup says "Rate limiting is temporarily unavailable"

- First confirm Hostinger is running the latest GitHub commit, then restart the Node.js application. Current code does not return this message; stale `.next` output or an old Node process can keep serving the old server action.
- Apply [migrations/20260425_v37_rate_limit_rpc_repair.sql](../migrations/20260425_v37_rate_limit_rpc_repair.sql) in the Supabase SQL Editor. It recreates `check_rate_limit`, restores `GRANT EXECUTE` for `anon` and `authenticated`, and reloads the PostgREST schema cache.
- The code falls back to an in-memory rate limiter if the DB function is unavailable, but applying the SQL keeps rate limiting consistent across Hostinger workers.

## Why this is reliable

- Hostinger's Node.js apps run a real `node` process bound to a port; Apache reverse-proxies into it
- All Next.js features work: SSR, server actions, RSC, streaming, image optimization
- Auto-restart on crash (hPanel handles this)
- SSL is automatic for the assigned domain

If anything fails after following the above, capture the exact error from the Node.js panel's **Logs** tab and the response of the `curl -sI` check above — those two pieces of info pinpoint any remaining issue.
