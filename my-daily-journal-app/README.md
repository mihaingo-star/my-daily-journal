# My Daily Journal

Personal planner web app: week planner, today view, calendar, semester + Wrapped, calories, groceries (list + basket, budget, receipts, receipt scan, menus), My Binder (notebooks, grade simulator, files), brain dump, focus timer, stickers, reminders, themes, dark mode, text size, PIN / Face ID, trash, undo/redo, automatic saving and automatic sync. Works on phone, iPad and computer.

## How it runs
One Cloudflare Worker (`src/index.js`) serves everything:
- the app files (`index.html`, `styles.css`, `js/`, `assets/`, icons, `manifest.webmanifest`, `sw.js`)
- `/api/sync` encrypted journal, `/api/account` password / recovery code / devices, `/api/file` attached files, `/api/push` reminders
- a cron every minute that sends the reminders (`worker/cron-worker.js`)

Settings are in `wrangler.jsonc` (Worker name, KV namespace `MDJ`, cron). On Cloudflare the build's root directory is `my-daily-journal-app` and the deploy command is `npx wrangler deploy`.

## Account
- Sign in with a username (upper or lower case) and a password. The first sign-in creates the account with the data of that device.
- The journal is encrypted on the device with a random key; the password and the recovery code only unlock that key. Nobody can read the data without them.
- 10 wrong tries → 15-minute pause. After 15 wrong tries the password hint (Settings) is shown.
- Settings → Account & sync: change password (every other device is signed out), password hint, recovery code, connected devices, sign out one device or all others.
- Forgot password: on the sign-in screen, "Forgot password?" + recovery code.

## Notes
- KV free plan: 1,000 writes and 100,000 reads per day, 1 GB storage.
- Attached files: up to 15 MB each, encrypted, on all devices. Deleted from the account when removed from the trash.
- Receipt scan engine (`assets/ocr/`, Tesseract.js, Apache 2.0) is part of the app; it works offline after the first use.
