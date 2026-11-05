# Backend API reference

Local base URL: `http://127.0.0.1:8000`. Keep the trailing slash on endpoint URLs.

| Django app | Reference | URL prefix |
| --- | --- | --- |
| `user_app` | [Authentication and users](user_app.md) | `/api/` |
| `accounting` | [Balances and transactions](accounting.md) | `/api/acc/` |
| `stock_app` | [Stocks, projects, and investments](stock_app.md) | `/api/stock/` |

Swagger UI at `/` and ReDoc at `/api/schema/redoc/` group endpoints by these same app names. Download the OpenAPI schema from `/api/schema/`. Existing endpoint URLs are unchanged.

## Authentication

1. `GET /api/session/` to read the current session and receive a CSRF cookie.
2. `POST /api/token/` with `email` and `password`. Login returns session details and sets HttpOnly JWT cookies, rather than returning token strings in JSON.
3. Send cookies on subsequent requests (`credentials: 'include'` in browser fetch).
4. For unsafe cookie-authenticated methods (`POST`, `PUT`, `PATCH`, `DELETE`), send the CSRF cookie value as `X-CSRFToken`.
5. `POST /api/token/refresh/` with the refresh cookie to rotate the tokens; no JSON body is needed.
6. `POST /api/logout/` to clear the browser's authentication cookies.

Default cookie names are `access_token` and `refresh_token`; deployments can override them. The access cookie lasts 30 minutes and the refresh cookie one day. The refresh cookie is scoped to `/api/token/refresh/`. Cookies are secure by default when `DEBUG=False`; use HTTPS in that configuration.

Clients that already hold a JWT can send `Authorization: Bearer <access-token>`. This path does not require CSRF validation. The login endpoint itself does not expose JWT strings. Swagger's Authorize dialog accepts an existing bearer JWT; for cookie authentication, log in using the same browser and configure its CSRF header for unsafe requests. JavaScript cannot manually set an HttpOnly authentication cookie.

```js
const base = 'http://127.0.0.1:8000';
await fetch(`${base}/api/session/`, { credentials: 'include' });
await fetch(`${base}/api/token/`, {
  method: 'POST',
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'investor@example.com', password: 'your-password' }),
});
const session = await fetch(`${base}/api/session/`, {
  credentials: 'include',
}).then(response => response.json());
```

Cross-origin browser clients must match the configured CORS origins and CSRF trusted origins. The frontend must be able to read the CSRF cookie to send the header; HttpOnly JWT cookies remain unreadable to JavaScript.

## Access and data conventions

- **Public:** no permission requirement. An invalid supplied credential can still fail authentication.
- **Authenticated:** a valid user session or bearer JWT.
- **Staff:** `is_staff=true`.
- **Superuser:** `is_superuser=true`. Staff status alone does not grant this access.
- User and instrument IDs are integers. Project IDs are eight-digit strings. Trade IDs are UUID strings.
- Send monetary values as decimal strings, for example `"1250.00"`; decimal fields are serialized as strings. Dates use `YYYY-MM-DD`; timestamps include timezone information.
- Send JSON by default. Profile images require `multipart/form-data`.
- List endpoints currently return plain arrays: no pagination envelope is configured.
- Creation generally returns `201`, reads and updates `200`, and deletion `204` with no body.
- `PATCH` updates selected fields; `PUT` applies the serializer's full-update requirements unless the view overrides this.

## Errors

Validation usually returns field names mapped to arrays of messages:

```json
{"amount": ["Amount must be a positive value."]}
```

Non-field serializer errors use the `error` key. Authentication and permission failures commonly use `{"detail": "..."}`. Custom stock actions sometimes use `{"error": "..."}` or `{"message": "..."}`. There is no single error envelope across all endpoints.

| Status | Meaning |
| --- | --- |
| `400` | Invalid fields, invalid business action, or certain missing-account cases |
| `401` | Missing/invalid authentication or invalid refresh credentials |
| `403` | Insufficient permissions or failed CSRF validation |
| `404` | Resource not found, or no eligible profits for disbursement |
| `405` | HTTP method is unsupported |
| `500` | Unhandled application error or a custom action failure |

App references call out implementation limitations that affect clients. They describe the current code, including exposed methods and permissions; they do not change business behavior.

## Validate the reference schema

From the repository root, with dependencies installed:

```bash
PYTHONDONTWRITEBYTECODE=1 .venv/bin/python backend/manage.py check
PYTHONDONTWRITEBYTECODE=1 .venv/bin/python backend/manage.py spectacular --file /tmp/openapi.yaml --validate --fail-on-warn
```
