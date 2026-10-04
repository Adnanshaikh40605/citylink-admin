# City Link Admin Panel

Simple web Admin Panel for City Link content management.

## Run locally

```bash
cd admin
npm install
npm run dev
```

By default `VITE_API_BASE_URL` points at the production API. For a local backend:

1. Start the API on port 4000.
2. Clear `VITE_API_BASE_URL` (or set it empty) so Vite proxies `/api` → `http://127.0.0.1:4000`.

Sign in with an **ADMIN** account (`admin@citylink.app`).

## Modules

- Dashboard
- Tournaments
- Matches (status + YouTube ID)
- Photos (match-linked)
- News
- Users (search / disable)
- Admin Settings
