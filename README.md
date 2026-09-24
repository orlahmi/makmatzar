# Makmatzar (מקמצ״ר)

Operational management **frontend prototype / demo** for a fictional military base administration system, covering:

- שיטור (Policing) — reports, tasks
- בילוש (Investigations) — deserter/AWOL retrieval
- כליאה (Incarceration) — prisoner files, canteen, activities, event reports, counting reports
- משל"ט (Coordination) and גחל"ת (screening) modules

Production: **https://makmatzar.vercel.app/**

## About this project

This is a **frontend-only demo/prototype**. There is no real backend, no database, and no integration with any real military or government system. All data (people, reports, coordinations, etc.) is fictional seed data generated for demonstration purposes and stored in the browser's `localStorage`. Do not treat any data, credentials, or workflow shown here as representing a real operational system.

## Tech stack

- Vanilla JavaScript (no framework, no build step, no bundler)
- Plain HTML/CSS
- Hash-based client-side routing
- Browser `localStorage` as the only data store
- Deployed as a static site on Vercel

## Running locally

No build step or package installation is required — this is static HTML/CSS/JS.

Serve the project root with any static file server, for example:

```bash
python -m http.server 7420
```

Then open:

```
http://localhost:7420
```

(A ready-made dev server config for this is already defined in `.claude/launch.json`.)

## Deployment

The production site is deployed on Vercel from this project root (`vercel.json` configures a static deployment with no build command). Deploys are pushed with:

```bash
npx vercel --prod
```

## Project structure

```
index.html          Entry point — loads all CSS/JS in a fixed order
css/                 Stylesheets
js/
  data/              Static reference/demo data (ranks, units, offenses, seed data, demo users)
  services/          Small domain services (ranking, external-person lookups, etc.)
  components/        Reusable UI components (modal, toast, tables, tabs, sidebar, topbar)
  pages/             One file per route/screen
  app.js, router.js, storage.js, state.js, auth.js, permissions.js, validation.js, audit.js, utils.js
```

## Demo login

The app ships with fictional demo users and hardcoded demo passwords (see `js/data/demo-users.js`) purely so the prototype can be explored without a real authentication backend. These are not real credentials and grant no access to any real system.
