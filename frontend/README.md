# Snoops Archive Frontend

React, TypeScript, and Vite frontend for the Snoops Archive. It provides the public archive, artwork detail views, project and street-archive pages, and an unauthenticated management workspace.

This repository is a sanitized copy of a private project. Personal artwork, credentials, runtime databases, and infrastructure addresses are not included.

## Development

```sh
cp .env.example .env.local
pnpm install
pnpm dev
```

By default the app calls `/api` on the same origin. For local development against a backend on port `8000`, set:

```sh
VITE_API_URL=http://localhost:8000
```

## Build

```sh
pnpm lint
pnpm build
```

The production build is served by the Nginx configuration in `nginx.conf`, which proxies `/api/` to the backend service and falls back to `index.html` for client-side routes.

## Notes

- The management pages under `/admin` are not authenticated. Keep the repository private or add authentication before exposing it.
- The public archive expects a running Piwigo instance and the companion backend API.
- The `src/data/mockData.ts` file contains placeholder project and street-archive content.
