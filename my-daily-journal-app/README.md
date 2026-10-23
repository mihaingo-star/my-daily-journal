# My Daily Journal

Personal planner web app: week planner, today view, calendar, semester + Wrapped, calories, groceries (list + basket, budget, receipts, scan, menus), My Binder (notebooks, grade simulator), brain dump, focus timer, stickers, reminders, dark mode, themes, PIN / Face ID, trash, automatic saving and automatic sync. Works on phone, iPad and computer.

## Files
- `index.html`, `styles.css`, `js/`, `assets/`, icons, `manifest.webmanifest`, `sw.js` → the app
- `functions/api/` → Cloudflare Pages Functions (sync + reminders registration), deployed automatically
- `worker/cron-worker.js` → paste into a separate Cloudflare Worker (sends reminders every 5 minutes)

## Cloudflare setup (once)
1. KV: Workers & Pages → KV (Storage & Databases) → Create namespace `mdj-data`.
2. Pages project → Settings → Bindings → Add → KV namespace → Variable name `MDJ` → namespace `mdj-data` → Save → redeploy.
3. Worker: Workers & Pages → Create → Worker → name `mdj-reminders` → Deploy → Edit code → paste `worker/cron-worker.js` → Deploy.
4. Worker → Settings → Bindings → Add → KV namespace → `MDJ` → `mdj-data`.
5. Worker → Settings → Triggers → Cron Triggers → Add → `*/5 * * * *`.

## Data
Everything saves automatically on each device (and 7 daily automatic copies). With sync on, it is also stored encrypted on your Cloudflare account; only someone with your personal code can read it. Deleted items go to the Trash for 30 days. Attached files (PDFs) stay on the device where they were added.
