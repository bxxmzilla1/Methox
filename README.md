# Flinky.Bio

Custom-path bio pages (e.g. `https://YOUR_APP.vercel.app/example`) with visit tracking, unique visitors, country per click (on Vercel), optional screenshot, and optional destination URL.

**Intended workflow:** push to **GitHub** → connect the repo in **Vercel** → set env vars → deploy.

Stack: **Next.js** (App Router), **Supabase** (database + auth + storage).

---

## 1. Push to GitHub

From **this folder** (the repo root):

```bash
git branch -M main
git add .
git commit -m "Initial commit: Flinky.Bio"
```

Create a new empty repository on GitHub, then:

```bash
git remote add origin https://github.com/YOUR_USER/YOUR_REPO.git
git push -u origin main
```

---

## 2. Deploy on Vercel

1. In [Vercel](https://vercel.com), **Add New… → Project** and import the GitHub repo.
2. Vercel will detect **Next.js**. Use the default install/build (this app uses `npm run build`, which runs `next build --webpack` for the PWA).
3. Under **Environment Variables**, add for **Production** (and Preview if you use it):

   | Name | Value |
   |------|--------|
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase **Project URL** |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase **anon public** key |
   | `NEXT_PUBLIC_APP_URL` | Your live site URL, e.g. `https://YOUR_APP.vercel.app` |

   These must be set **before** the app can log in or hit the dashboard at **runtime**. (The Vercel build can succeed without them, but pages that use Supabase will error when opened until the variables exist.)

4. Deploy. After the first deploy, set `NEXT_PUBLIC_APP_URL` to the exact production URL if it differs from what you guessed, then redeploy so email auth redirects stay correct.

Country detection uses Vercel’s `x-vercel-ip-country` header on production requests.

---

## 3. Supabase (required before the app works)

1. Open **SQL Editor** in Supabase and run `supabase/migrations/20260427000000_init.sql`.
2. If you created the database **before** the `username` column existed, also run `supabase/migrations/20260427120000_add_username.sql`.
3. For **redirect mode** and the **customizable public landing page**, run `supabase/migrations/20260427140000_landing_page.sql`.
4. **Authentication → URL configuration → Redirect URLs** must include:

   - `https://YOUR_APP.vercel.app/auth/callback`  
   - (optional for local dev) `http://localhost:3000/auth/callback`

5. For quick testing, you can disable **Confirm email** under **Authentication → Providers → Email**.

---

## Local development

```bash
cp .env.example .env.local
# Set NEXT_PUBLIC_SUPABASE_* and NEXT_PUBLIC_APP_URL=http://localhost:3000

npm install
npm run dev
```

---

## PWA

Production builds register a service worker (`@ducanh2912/next-pwa`). Generated files under `public/` (`sw.js`, `workbox-*.js`, etc.) are **gitignored** and recreated on each Vercel build. Icons: `public/icons/`.

---

## Troubleshooting

### “Could not find the `username` column of `links`”

Your Supabase database was created before that field existed. In the Supabase **SQL Editor**, run:

```sql
alter table public.links
  add column if not exists username text not null default '';
```

Then try **Create link** again (no app redeploy required).

### `manifest.webmanifest` returns **401** in the browser

- **Vercel:** If **Deployment Protection** (password / SSO) is on, unauthenticated fetches (including the PWA manifest) can get 401. Turn protection off for this project, or use a setup that allows public access to the site.
- After pulling the latest code, the middleware matcher also skips `manifest.webmanifest` and `sw.js` so session refresh does not run on those URLs.

---

## CI

GitHub Actions runs **lint** and **build** on pushes and PRs to `main` / `master` (see `.github/workflows/ci.yml`).

---

## License

MIT
