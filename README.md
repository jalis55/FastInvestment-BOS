# Fast Investment Backoffice

Fast Investment Backoffice manages investment projects, trades, customer accounts, advisor commissions, profit disbursement, and reporting. It has a Django REST API and a React/Vite frontend.

## Repository layout

| Path | Purpose |
| --- | --- |
| `backend/` | Django API, business rules, authentication, and market price service |
| `backend/docs/` | API reference organized by Django app |
| `frontend/` | React application, shared UI, and frontend tests |
| `docker-compose.yaml` | Local backend, frontend, and Redis services |

## Run locally

Use Python 3.12+, Node.js 22+, npm, and Redis. The commands below run the frontend at `http://localhost:5173` and the API at `http://localhost:8000`. Use `localhost` for both so browser cookies work consistently.

1. Start Redis, for example with `docker compose up -d redis`, or use an existing Redis server.
2. Create `backend/.env.local` with local settings:

   ```env
   DEBUG=True
   REDIS_URL=redis://localhost:6379/0
   ```

   For a hosted Redis service, use its TLS `rediss://` URL instead. Keep credentials in the ignored `.env.local` file or process environment; never commit them.

3. Install and start the backend from the repository root:

   ```bash
   uv sync
   cd backend
   ../.venv/bin/python manage.py migrate
   ../.venv/bin/python manage.py runserver
   ```

   If you do not use `uv`, create a Python virtual environment and install `backend/requirements.txt` instead. The current Django settings use `backend/db.sqlite3`; the PostgreSQL settings in `backend/core/settings.py` are commented out.

4. In another terminal, install and start the frontend:

   ```bash
   cd frontend
   npm ci
   VITE_API_URL=http://localhost:8000 npm run dev
   ```

`VITE_API_URL` is the backend origin used by the shared HTTP client. If omitted, API requests go to the frontend's own origin and need a reverse proxy for `/api/`. The backend's default CORS and CSRF trusted origins include `localhost:5173` and `127.0.0.1:5173`.

## Run with Docker Compose

The Compose file exposes the frontend at `http://localhost:3000`, the API at `http://localhost:8000`, and Redis at `localhost:6379`. Before starting it, create `backend/.env.local` for local HTTP and the frontend origin:

```env
DEBUG=True
CORS_ALLOWED_ORIGINS=http://localhost:3000
CSRF_TRUSTED_ORIGINS=http://localhost:3000
```

Then run:

```bash
docker compose up --build -d
docker compose exec backend python manage.py migrate
```

The Compose services mount the source directories for local development. Use environment-specific security, database, and web server settings for deployment.

## Market prices in Project Details

The Project Details report gets market reference prices through `GET /api/stock/instruments/close/price/`. On the first request of each **Asia/Dhaka calendar day**, the backend reads the full price feed used by [AmarStock's latest share price page](https://www.amarstock.com/latest-share-price). It saves the result in Redis and reuses it for subsequent requests that day. There is no background scheduler; a day with no request makes no scrape.

The API returns `prices`, `fetched_on`, and `stale`. It uses AmarStock's **Close** value, or **YCP** when Close is zero. If a refresh fails, it serves the last successful snapshot with `stale: true`; if no snapshot exists, it returns `503`. The UI labels stale data and leaves missing prices and derived valuations blank. Holding cost is calculated from buy trades in the selected project.

## API and checks

After the backend starts, open [Swagger UI](http://localhost:8000/), [ReDoc](http://localhost:8000/api/schema/redoc/), or the [OpenAPI schema](http://localhost:8000/api/schema/). The [backend API guide](backend/docs/README.md) links to endpoint references for `user_app`, `accounting`, and `stock_app`. See the [backend setup guide](backend/readme.md) and [frontend guide](frontend/README.md) for component-specific details.

Run the checks from the repository root:

```bash
cd backend && ../.venv/bin/python manage.py test stock_app.test_market_prices
cd ../frontend && npm run lint && npm test && npm run build
```
