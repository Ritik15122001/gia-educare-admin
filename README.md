# GIA Educare — CRM

React + Vite admin for the GIA Educare website. Talks to `../backend`.

```bash
npm install
npm run dev     # → http://localhost:5174
```

Set `VITE_API_BASE_URL` in `.env` (defaults to `http://localhost:5001/api/v1`).

## Stack

- **React Router** — route-level code splitting, role-gated routes
- **TanStack Query** — server state, cache invalidation, optimistic list updates
- **Zustand** — auth session + UI (toasts, confirm dialogs, sidebar)
- **react-hook-form + zod** — one validated form engine for every screen
- **Tailwind v4** alongside a small hand-written design system that reuses the
  website's navy/gold tokens

## The config-driven core

`src/config/resources.js` describes each content collection once — its columns,
form fields, validation schema and defaults:

```js
destinations: {
  label: 'Destinations',
  columns: [{ key: 'name', type: 'title', sub: 'tag' }, …],
  fields:  [{ name: 'facts', type: F.PAIRS, full: true }, …],
  schema:  z.object({ … }),
  sortable: true,
  publishable: true,
}
```

`ResourceListPage` + `ResourceFormModal` + `FieldRenderer` read that config, so
all thirteen collections share one list screen and one form screen. Adding a
content type is one config entry — no new pages.

Field types available: `text`, `textarea`, `number`, `select`, `switch`,
`tags`, `pairs`, `icon`, `emoji`, `gradient`, `image`.

## Screens

- **Dashboard** — lead counts, 30-day trend (hand-rolled SVG, no chart library), pipeline, recent activity
- **Enquiries** — filter/search, inline status changes, detail view with call/email/WhatsApp actions, internal notes, CSV export
- **Content** — the thirteen collections: search, filter, drag-to-reorder, publish toggle, create/edit/delete
- **Section copy** — every heading and intro paragraph on the site, grouped by page
- **Media** — image library with upload and copy-URL
- **Settings** — brand, logo, contact details, offices, socials, SEO
- **Team accounts** — invite users, set roles, deactivate (super admin only)
- **Profile** — own details and password

## Auth model

The access token lives in memory only; the refresh token is an httpOnly cookie.
On boot the app calls `/auth/refresh` once to restore the session, and
`api/client.js` transparently refreshes-and-replays any request that 401s —
with a single shared in-flight refresh so concurrent failures don't stampede.
