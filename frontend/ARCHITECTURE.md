# Frontend conventions

## Checks and local development

Use Node 22.15+ (or Node 24) and install dependencies with `npm ci`. From `frontend/`:

```bash
npm run dev
npm run lint
npm test
npm run build
```

Set `VITE_API_URL` to the backend origin, for example `http://localhost:8000`. It defaults to the current origin when omitted, which requires a reverse proxy for `/api/` in production. Cookie authentication also needs the backend's CORS and CSRF settings to allow the frontend origin.

## HTTP and authentication

Use the shared `src/api/axios.js` instance for every request. It sends cookies, attaches the CSRF header for unsafe methods, and applies a 15-second timeout. Concurrent 401 responses share a single refresh promise. Every waiting caller resolves or rejects, and each original request can retry only once. Invalid refresh credentials clear the session and private query cache.

Login uses the session returned by the backend without fetching it again. Authentication hydration is separate from form submission state so failed login messages remain visible. Logout only clears the local session after the backend confirms it; errors remain visible in the header.

Do not automatically retry failed network requests that create payments, trades, or other records. A timeout does not prove the server rejected a write. The HTTP client only replays a request following a 401 and successful token refresh, since authentication rejected that request before the view executed.

## Read queries

Use `useApiQuery('/api/…/')` for component-owned reads. This shares a memory-only cache keyed by URL, deduplicates concurrent reads, and aborts pending reads when their last subscriber unmounts. StrictMode's immediate remount shares the pending request. It guards against stale responses overwriting data after invalidation or session changes.

Default freshness is 30 seconds. Instrument metadata uses five minutes. Financial balance lookups use zero freshness and disable submission while refreshing; the server must still validate current funds on every write. Disabled queries use `enabled: false` or a null URL. Include all filters in the URL when using query parameters, since the URL is the cache key.

Successful business mutations invalidate cached queries and refresh active readers. This currently uses conservative, global invalidation because trade and investment actions affect several apps. Session changes clear the cache rather than persisting user data across accounts. The cache is not persisted to localStorage.

The hook is used by user/project lists, personal reports, trades, pending payments, accounting customer/balance selectors, investment customer/balance selectors, advisor customer lists, and buy-instrument metadata. Explicit multi-step searches still use the HTTP client directly, with local validation and error feedback.

## Page and component patterns

- Use `BannerTitle` for the page's single h1. It composes `PageIntro`; use `PageIntro` separately for genuinely distinct sections.
- Use `SurfaceCard` / `page-card` for content and forms, and `table-shell` for tables. Avoid copying a new card design into each page.
- Use `Field` with `htmlFor` for labels and validation. It connects the control's invalid state and error description for assistive technology.
- Use `field-input`, `field-select`, and `field-label` for controls, and `Button` for actions. Existing full-width submit actions use the shared `primary-button` style.
- Use `SearchBar` for project lookup forms; it keeps icon padding and action positioning consistent.
- Use `QueryState` for loading, recoverable error, and empty states. A failed request must not look like an empty account. Supply `onRetry={refetch}` for query failures.
- Use `getApiError` for API errors. It preserves validation field names, handles timeouts/network failures, and hides server exception details.
- Use component state for editing/filter inputs and memoized derived results for reports. Avoid maintaining a second copy of filtered server data.

## Errors and routing

Pages are loaded lazily. The layout wraps its outlet in Suspense and an error boundary keyed by pathname, so a page crash does not remove the navigation and navigation resets the boundary. An outer boundary handles app-level render failures. Router error elements handle unknown routes and routing failures.

Error boundaries catch rendering/lifecycle errors, not asynchronous event-handler failures. Requests and mutations must still handle rejected promises. Boundary recovery never resubmits a financial action.

Trade creation and trade reports are staff routes, matching backend permissions. Superusers retain frontend access to protected routes; the backend remains the authority for every permission check.

## Validation and remaining constraints

`tests/api.test.js` covers concurrent refresh success/failure, retry limits, CSRF, mutation invalidation, avoiding network write retries, cache deduplication, stale-response protection, abort/resubscribe behavior, session cache clearing, recovery after errors, and readable validation errors.

Browser verification used synthetic, read-only fixtures for the project directory, transfer account selection, and empty personal reports. Real financial transactions were not submitted.

The backend currently exposes a few inconsistent contracts documented in `backend/docs/`: approved payments do not appear in completed-only history; profit disbursement creates ledger records without directly crediting account balances; and some sensitive actions have broader permissions than their UI. Selling a trade also spans multiple HTTP writes on the frontend, so full atomicity requires a backend endpoint. These need backend changes; UI validation cannot guarantee atomic financial operations.
