# Nutrition Tracker

AI-powered minimal nutrition & fitness tracker. Installable as a mobile web
app (PWA) — add it to your home screen from Safari or Chrome and it opens
full-screen like a native app.

## What's here

- `src/` — the React app (Vite)
- `api/` — two serverless functions that call the Anthropic API server-side,
  so your API key is never exposed in the browser:
  - `POST /api/parse-food` — turns a food description into structured nutrition data
  - `POST /api/coach` — powers the AI Coach chat
- Data (profile, food log, weight log) is stored in the browser's
  `localStorage`, so it's per-device. There's no account system or shared
  database yet — see "Next steps" below.

## Run it locally

```bash
npm install
npm run dev
```

The AI features need a backend to actually respond — `vercel dev` (see
below) runs both the frontend and the `/api` functions together locally.
Plain `npm run dev` will run the app but AI calls will fail until deployed
(or until you run `vercel dev` instead).

## Deploy — GitHub + Vercel (recommended, free tier works)

Vercel hosts the static frontend **and** runs the `/api` functions, which
plain GitHub Pages can't do (GitHub Pages is static-only).

1. **Push this project to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   gh repo create nutrition-tracker --public --source=. --push
   # or create a repo on github.com and:
   # git remote add origin https://github.com/<you>/nutrition-tracker.git
   # git push -u origin main
   ```

2. **Get an Anthropic API key**
   Create one at [console.anthropic.com](https://console.anthropic.com/settings/keys).
   This is a separate key from your claude.ai login, and API usage is billed
   separately (pay-as-you-go) — check current pricing on the console before
   deploying if that matters to you.

3. **Import the repo into Vercel**
   - Go to [vercel.com/new](https://vercel.com/new), sign in with GitHub, and
     import this repo. Vercel auto-detects the Vite + `/api` setup.
   - In the project's **Settings → Environment Variables**, add:
     `ANTHROPIC_API_KEY` = your key from step 2.
   - Deploy. You'll get a URL like `nutrition-tracker.vercel.app`.

4. **Install it on your phone**
   - **iPhone (Safari)**: open the URL → Share → *Add to Home Screen*.
   - **Android (Chrome)**: open the URL → ⋮ menu → *Add to Home screen* / *Install app*.

   It'll open full-screen, no browser chrome, with its own icon.

Every future `git push` to `main` auto-redeploys.

## Next steps (not included yet)

The original spec also called for a few things a static PWA + serverless
functions can't fully cover on its own:

- **Accounts / multi-device sync** — right now data lives in one browser's
  `localStorage`. Real accounts need auth (e.g. Clerk, Supabase Auth) and a
  real database (e.g. Supabase, Postgres) instead of `localStorage`.
- **Verified nutrition database** — food values are AI-estimated only; the
  spec wanted a real nutrition API (e.g. USDA FoodData Central, Nutritionix)
  checked before falling back to AI estimates.
- **Voice input, barcode/label scanning, weekly AI summary** — UI hooks
  exist for some of these but they're not wired up.

Ask Claude to build any of these into this same project next.
