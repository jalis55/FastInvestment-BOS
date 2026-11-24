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

   If you do not use `uv`, create a Python virtual environment and install `backend/requirements.txt` instead. `DEBUG=True` always uses local SQLite at `backend/db.sqlite3`, even when hosted database credentials are present. Run `migrate` to initialize its schema; hosted data is not copied automatically. With `DEBUG=False`, set `DATABASE_URL` for a supported Django database, or use the existing `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, and optional `DB_PORT` variables for Supabase/PostgreSQL (SSL required).

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

## Vercel deployment

The root `vercel.json` deploys the Vite frontend and Django API as two services
within one Vercel project. Set the Vercel Root Directory to the repository root.
Route `/api/`, `/admin/`, and `/static/` to Django; other paths go to the frontend.
The frontend build uses `VITE_API_URL=/`, keeping cookies and CSRF on one origin.

Configure Production and Preview environment variables using
`backend/.env.example` as a name reference. Use actual Supabase pooler credentials
and a TLS Redis URL; the placeholders are not valid credentials. With Supabase
transaction pooling, the backend disables server-side cursors and persistent
connections. Verify the provider's current connection panel for host, user, and port.

Before promoting a deployment, check database connectivity and migration status,
run outstanding migrations against the intended hosted database, then verify
login and a protected API request. Local SQLite data is not uploaded or copied
into Supabase. Existing hosted records are preserved.

Set a random `CRON_SECRET` in Vercel’s Production environment before deploying
the market-price cron. It refreshes the StockChartBD Close snapshot for
Project Details at 13:00 UTC (19:00 Asia/Dhaka). Project Details can seed an
empty cache on its first lookup. Live Share Update fetches quotes directly
from StockChartBD on each project search.

Django uses secure cookies by default when debug is disabled. Vercel's generated
hosts are included in the allowed host list, and Django recognizes forwarded
HTTPS. New profile photos are stored in the database and served by Django under
`/api/profile-photos/`. Apply the profile photo migration before deploying.
Existing local media paths still work in development. If an older photo was lost
from the Vercel runtime filesystem, upload it again after deployment.
## Dividends

Open **Dividend** in the sidebar and search for a project to record either a cash amount in BDT or the actual number of bonus shares received (not a percentage). Staff access is required.

Cash dividends become undistributed profits. Use **Disbursement** with the dividend's received date to allocate them using the project's existing advisor and investor rules. They are excluded from capital available for trading or closure so they cannot be returned twice.

Share dividends add quantity without cost or commission. For example, 100 shares costing BDT 1,000 plus 10 bonus shares become 110 shares costing BDT 1,000, averaging BDT 9.09090909 each. Holdings use moving average cost, including partial sales and later purchases. A bonus receipt changes holdings when recorded; its received date is for reference and does not rewrite earlier sales. Existing buy commissions remain part of cost.

`GET /api/stock/dividends/?project_id=...` lists receipts. `POST /api/stock/dividends/` accepts `project`, `instrument`, `dividend_type` (`cash` or `share`), `amount`, `qty`, and `received_date`. Cash requires positive `amount` and zero `qty`; shares require positive whole `qty` and zero `amount`, and both dividend types require an available holding in the selected project. Closed projects and future receipt dates are rejected. Receipts are append-only through this API.

Apply backend migrations before running the updated app:

```bash
cd backend
../.venv/bin/python manage.py migrate
```
