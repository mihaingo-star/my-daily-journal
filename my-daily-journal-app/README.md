# My Daily Journal

Personal planner web app: week planner, today view, calendar, semester + Wrapped, calories, groceries (list + basket, budget, receipts, scan, menus), My Binder (notebooks, grade simulator), brain dump, focus timer, stickers, reminders, dark mode, themes, PIN / Face ID, trash, automatic saving and automatic sync. Works on phone, iPad and computer.

## Files
- `index.html`, `styles.css`, `js/`, `assets/`, icons, `manifest.webmanifest`, `sw.js` → the app
- `functions/api/` → Cloudflare Pages Functions (sync + reminders registration), deployed automatically
- `worker/cron-worker.js` → paste into a separate Cloudflare Worker (sends reminders every 5 minutes)

## Cloudflare setup (Worker, once)
The whole app runs as one Cloudflare Worker (`src/index.js`): the app files, sync (`/api/sync`), reminders (`/api/push`) and a cron every 5 minutes that sends the reminders.
1. Storage & Databases → Workers KV → Create → `mdj-data` → copy its ID.
2. In `wrangler.jsonc`: put your Worker's name in `name` and the KV ID in `id`.
3. Push to GitHub: Cloudflare rebuilds and deploys (deploy command `npx wrangler deploy`).
4. Check `https://<your-site>/api/push` shows `{"key":…}` and `/api/run` shows `{"sent":…}`.

## Account
Open the app → sign in with your username (upper or lower case) and password. The first sign-in creates the account with the data of that device; other devices then get the same journal and stay in sync on their own.

## Data
Everything saves automatically on each device (and 7 daily automatic copies). With sync on, it is also stored encrypted on your Cloudflare account; only someone with your personal code can read it. Deleted items go to the Trash for 30 days. Attached files (PDFs) stay on the device where they were added.
