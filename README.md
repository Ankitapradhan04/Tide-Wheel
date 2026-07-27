# 🌊 Tidewatch — Chart your day like the tide

A 24-hour routine planner with an ocean theme: a circular "Tide Wheel" clock, a weekly
chart, a calendar, and reminders — all stored locally in your browser, no server or
account required.

## Features

- **Tide Wheel** — a 24-hour radial clock. Click any hour to name what happens there and
  pick a category color. A live needle shows the current time.
- **Weekly Chart** — the same routine data as a 7-day × 24-hour table, so you can edit
  either view and see it everywhere.
- **Calendar** — a month view for one-off notes and events. Days with a reminder get a
  small coral "buoy" dot.
- **Reminders** — add, filter, complete, and delete reminders. Turn on in-tab alerts and
  Tidewatch will pop a browser notification when one comes due (while the tab is open).
- **Local database** — everything is saved to IndexedDB, a real browser database, so your
  schedule survives reloads and restarts. Nothing leaves your device.
- **Backup & restore** — download everything as a `.json` file from the ↓ menu, or restore
  it on another browser/device with the same menu.
- **Deep water / shallow water** — a theme toggle between a dark, immersive palette and a
  lighter daytime one.
- **Print view** — prints your Weekly Chart as a clean table.
- **Copy a day's rhythm** — duplicate one day's routine onto another in one click.
- Fully responsive, keyboard accessible, and respects reduced-motion preferences.

## Tech

Plain HTML, CSS and JavaScript — no build step, no frameworks, no paid services.
Fonts load free from Google Fonts. Data lives in IndexedDB in your own browser.

## Run it locally

Just open `index.html` in a browser, or serve the folder locally:

```bash
python3 -m http.server 8080
# then visit http://localhost:8080
```

## Publish it free with GitHub Pages

**Option A — GitHub's website (no command line needed)**

1. Go to [github.com](https://github.com) and sign in (or create a free account).
2. Click the **+** in the top right → **New repository**. Name it e.g. `tidewatch`,
   set it to **Public**, and click **Create repository**.
3. On the new repo's page, click **uploading an existing file**.
4. Drag in every file and folder from this project (`index.html`, the `css` folder, the
   `js` folder, this `README.md`) and click **Commit changes**.
5. Go to the repo's **Settings** tab → **Pages** (left sidebar).
6. Under **Build and deployment → Source**, choose **Deploy from a branch**. Under
   **Branch**, choose `main` and folder `/ (root)`, then **Save**.
7. Wait about a minute, then refresh — GitHub shows your live URL, something like
   `https://yourusername.github.io/tidewatch/`.

**Option B — Git command line**

```bash
cd tidewatch
git init
git add .
git commit -m "Tidewatch: ocean-themed routine planner"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/tidewatch.git
git push -u origin main
```

Then repeat steps 5–7 above to turn on Pages.

## Notes for later (mobile app version)

This site is built with plain HTML/CSS/JS on purpose, which makes it straightforward to
wrap later — for example with Capacitor or a WebView-based shell — when you're ready to
turn it into a mobile app. The routine, reminders and calendar data model (in `js/db.js`
and `js/app.js`) can be reused as-is.
