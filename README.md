# Snoops Archive

A full-stack creative archive for visual work, source images, and CMYK process material. The project combines a React archive frontend, a FastAPI backend, a SQLite metadata store, and a self-hosted Piwigo media library.

This repository was extracted from a private homelab monorepo and sanitized for publication. Personal artwork, credentials, runtime databases, and infrastructure addresses are not included.

## Features

- Public archive with search, year, album, and tag filters.
- Artwork detail pages with curated metadata and source-image galleries.
- CMYK separation views for process documentation.
- Project and street-archive sections backed by local placeholder data.
- Management workspace for artwork metadata and supporting-material relationships.
- Piwigo integration for albums, tags, images, and image URLs.
- SQLite relationships for source images and CMYK separations.
- Docker Compose setup for the application stack and a separate Piwigo stack.

## Architecture

```
Browser -> frontend (React + nginx)
             |-- /api/* -> FastAPI backend -> SQLite metadata store
             |                         `-> Piwigo HTTP API -> MariaDB
             `-- static Vite build

piwigo/compose.yaml -> Piwigo + MariaDB
compose.yaml        -> frontend + backend
```

The frontend uses same-origin `/api` requests when served by the included Nginx proxy. During local Vite development, set `VITE_API_URL` to the backend address.

## Quick start

### 1. Start Piwigo

```sh
cd piwigo
cp .env.example .env
# Set DB_USER_PASSWORD.
docker compose up -d
```

Complete the Piwigo installer at `http://localhost:8080`, then create an API key in the Piwigo administration settings. Add your artwork to Piwigo and create a dedicated album for supporting materials if you want to use the source/CMYK manager.

### 2. Start the application

From the repository root:

```sh
cp .env.example .env
# Set PIWIGO_API_KEY_ID, PIWIGO_API_KEY_SECRET, and the Piwigo URLs.
docker compose up --build
```

Open:

- `http://localhost:3000` for the archive
- `http://localhost:8000/api/health` for the API health check

### 3. Local development

Backend:

```sh
cd backend
python3 -m venv .venv
. .venv/bin/activate
pip install -r requirements-dev.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8000
```

Frontend:

```sh
cd frontend
cp .env.example .env.local
pnpm install
pnpm dev
```

If the frontend runs on `http://localhost:5173` and the backend on `http://localhost:8000`, set `VITE_API_URL=http://localhost:8000` in `frontend/.env.local` and keep the backend's `CORS_ORIGINS` aligned.

## Configuration

| Variable | Purpose |
| --- | --- |
| `PIWIGO_URL` | Piwigo base URL reachable from the backend |
| `PIWIGO_PUBLIC_URL` | Browser-accessible Piwigo base URL |
| `PIWIGO_API_KEY_ID`, `PIWIGO_API_KEY_SECRET` | Piwigo API credentials |
| `CORS_ORIGINS` | Comma-separated origins allowed to call the backend |
| `BACKEND_PORT`, `FRONTEND_PORT` | Host port mappings |
| `TZ`, `PIWIGO_UID`, `PIWIGO_GID`, `PIWIGO_PORT` | Piwigo stack settings |
| `DB_USER_PASSWORD` | MariaDB password for Piwigo |

The supporting-materials album ID is currently `18` in `backend/app/main.py`. Change `SUPPORTING_ALBUM_ID` if your Piwigo album has a different ID.

## API

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | Service health |
| `GET` | `/api/piwigo/status` | Piwigo connectivity and version |
| `GET` | `/api/albums` | Piwigo albums |
| `GET` | `/api/tags` | Piwigo tags |
| `GET` | `/api/images` | Paginated artwork images |
| `GET` | `/api/images/{id}` | Artwork image details |
| `GET` | `/api/supporting-images` | Supporting-materials library |
| `GET` | `/api/images/{id}/metadata` | Curated artwork metadata |
| `PUT` | `/api/images/{id}/metadata` | Save curated metadata |
| `GET` | `/api/images/{id}/additionals` | Source and CMYK relationships |
| `POST` | `/api/images/{id}/additionals` | Assign a supporting image |
| `PUT` | `/api/images/{id}/additionals/{relationship_id}` | Update an assignment |
| `DELETE` | `/api/images/{id}/additionals/{relationship_id}` | Remove an assignment |

## Tests

```sh
cd backend
python3 -m venv .venv
. .venv/bin/activate
pip install -r requirements-dev.txt
pytest
```

Frontend checks:

```sh
cd frontend
pnpm install --frozen-lockfile
pnpm lint
pnpm build
```

## Security limitations

This project is a personal archive prototype, not a hardened multi-user service.

- The `/admin` frontend workspace has no authentication.
- The backend write endpoints for metadata and supporting materials have no authentication or authorization.
- Do not expose this stack directly to the public internet until authentication, authorization, and rate limiting are added.
- Keep the repository private or treat it as a portfolio reference.
- Piwigo API credentials are server-side only; never expose them to the frontend.
- The SQLite database and Piwigo volumes are runtime data and are ignored by Git.

## Image and content rights

The repository does not include personal artwork or source imagery. Add only assets you have the right to publish. Project and street-archive entries in `frontend/src/data/mockData.ts` are placeholders.

## Repository layout

```
backend/            FastAPI application, SQLite schema, and tests
frontend/           React/Vite frontend and production nginx config
piwigo/             Piwigo + MariaDB Compose stack
compose.yaml        Frontend + backend Compose stack
```
