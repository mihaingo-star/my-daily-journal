# My Daily Journal

Personal planner web app (Year 3 · Semester 2): week planner, today view, calendar, semester + Wrapped, calories, groceries (list + basket, budget, receipts, scan, menus), My Binder (6 notebooks, grades simulator), brain dump, focus timer, stickers, reminders, dark mode, themes, PIN/Face ID, trash and automatic saving.

## Publish
1. Upload every file and folder of this zip to the root of a GitHub repository.
2. Cloudflare Pages → Create → Connect to Git → choose the repo.
   - Framework preset: None · Build command: (empty) · Output directory: `/`
3. Open the link on your phone → Share / ⋮ → "Add to Home Screen".

## Data
Everything saves automatically on the device (localStorage + IndexedDB, with 7 daily automatic copies).
Deleted items go to the Trash for 30 days. Use Settings → Backup file to move to a new phone.

## Change a cover or the app icon
Replace the file in `assets/` (same name) or `icon-192.png` / `icon-512.png` / `apple-touch-icon.png`.
