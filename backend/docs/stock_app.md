# stock_app — stocks, projects, and investments

[API conventions and authentication](README.md) · Prefix: `/api/stock/`

Paths below are relative to that prefix. Project IDs are eight-digit strings, instrument/user IDs are integers, and trade IDs are UUIDs. All endpoints require staff access unless the Access column says otherwise.

## Endpoint index

| Method | Path | Access | Result |
| --- | --- | --- | --- |
| GET | `instruments/` | Staff | Instrument IDs and names |
| GET | `instruments/close/price/` | Public | Daily AmarStock market reference prices |
| POST | `create/trade/` | Staff | Record a buy/sell trade |
| DELETE | `delete/trade/{trade_id}/` | Staff | Delete a trade (`204`) |
| GET | `trade/details/` | Staff | Trade records and calculated costs |
| GET | `sellable/instruments/{project_id}/` | Staff | Holdings with positive remaining quantity |
| POST | `create/project/` | Staff | Create a project |
| GET | `project/status/{pk}/` | Staff | Project active status |
| GET | `project/balance/details/{pk}/` | Public | Aggregated project balances |
| GET | `project/list/` | Public | All projects |
| PATCH | `close/project/{pk}/` | Authenticated | Close project and return investor funds |
| POST | `add/investment/` | Staff | Invest funds from an investor's account |
| GET | `investor/contrib/percent/{project_id}/` | Staff | Investor contributions and percentages |
| GET | `investor/investment-details/` | Authenticated | Current user's investments |
| GET, POST | `add/financial/advisor/` | Staff | List/create advisor assignments |
| GET | `fin/advisor/commission/{project_id}/` | Staff | Advisor assignments and percentages |
| POST | `add/profit/` | Staff | Record profit for a trade |
| GET | `project/total/profit/` | Staff | Individual accrued profit records |
| GET | `investor/profit-details/` | Authenticated | Current user's profit allocations |
| POST | `create/acc/recvable/` | Staff | Record a receivable gain/loss |
| GET | `acc/recvable/details/` | Staff | Receivables with nested trade details |
| POST | `profit/disburse/` | Public permission; see below | Disburse eligible profit |

The spellings `recvable`, `recivable` in code, and `gain_lose` reflect the existing API. Use the paths and field names documented here exactly.

## Instruments and trades

`GET instruments/` returns `[{"id": 1, "name": "EXAMPLE"}]`.

`GET instruments/close/price/` returns `{"prices": {"EXAMPLE": "125.00"}, "fetched_on": "2026-11-05", "stale": false}`. The backend reads the feed used by [AmarStock's latest share price page](https://www.amarstock.com/latest-share-price) on the first request of each Asia/Dhaka calendar day and caches one result per day in Redis. It uses **Close**, falling back to **YCP** when Close is zero; symbols without a positive value are omitted. If the fetch fails, the last successful snapshot is returned with `stale: true`. If no snapshot is available, the endpoint returns `503` with a `detail` message. There is no background scheduler.

Create a trade:

```http
POST /api/stock/create/trade/
Content-Type: application/json

{"project": "12345678", "instrument": 1, "qty": 100, "unit_price": "125.00", "trns_type": "buy"}
```

All input fields shown are required. `trns_type` is `buy` or `sell`. Response `201` contains those fields plus `id` (UUID). The server sets the trade date and authorizer and calculates commission and actual unit price.

`GET trade/details/` returns an array with `project`, `id`, `trade_date`, nested `instrument` (`id`, `name`), `qty`, `unit_price`, `trns_type`, `total_commission`, and `actual_unit_price`.

| Query | Behavior |
| --- | --- |
| `project_id` | Filter by project |
| `from_dt`, `to_dt` | Inclusive trade date range; applied **only when both dates and project_id are supplied** |

Example: `/api/stock/trade/details/?project_id=12345678&from_dt=2026-11-01&to_dt=2026-11-05`.

`GET sellable/instruments/{project_id}/` returns an array of `instrument`, `available_quantity`, and `average_buy_unit_price`. Only positive holdings appear. The average buy unit price is weighted from buy trades in the requested project.

## Projects

Create a project (`201` response repeats these fields):

```json
{
  "project_title": "November Portfolio",
  "project_description": "Investment project for November",
  "project_responsible_mail": "manager@example.com"
}
```

All three fields are required. The server assigns the creator and generates the project ID. The create response does not include that ID; retrieve it through `GET project/list/`.

Project list items contain `project_id`, `project_title`, `project_responsible_mail`, `project_active_status`, `project_opening_dt`, nested `created_by`, `project_closing_dt`, and nested `closed_by` (nullable). Nested users contain `id`, `email`, and `name`. Projects sort active first, then newest opening date.

`GET project/status/{pk}/` returns `{"project_id": "12345678", "project_active_status": true}`.

Project balance response:

```json
{
  "project_id": "12345678",
  "total_investment": "100000.00",
  "total_buy_amount": "40000.00",
  "available_balance": "60000.00",
  "total_sell_amount": "0.00",
  "accrued_profit": "0.00"
}
```

Available balance is `max(total_investment - total_buy_amount + total_sell_amount - accrued_profit, 0)`. Buy/sell amounts use actual unit prices, including calculated costs.

Close a project:

```http
PATCH /api/stock/close/project/12345678/
Content-Type: application/json

{
  "total_investment": "100000.00",
  "closing_balance": "110000.00",
  "total_buy": "40000.00",
  "total_sell": "50000.00",
  "total_sell_profit": "10000.00"
}
```

Supply `total_investment` and `closing_balance` even for PATCH: the implementation reads both directly despite the serializer marking them optional. The other shown totals are optional. The serializer also exposes `project_id`; clients should leave it unchanged and identify the project through the path.

The operation closes the project, records closing information and gain/loss from receivables, creates completed investor-return deposits, and updates investor account balances. Success returns `{"status": "closed", "data": {...}}`, where `data` contains `project_id`, `total_investment`, `total_buy`, `total_sell`, `total_sell_profit`, and `closing_balance`. Already closed projects return `400`, missing projects `404`, and processing failures `500`. This endpoint currently requires authentication rather than staff permission.

## Investments

`POST add/investment/` requires `project`, `investor`, and a positive `amount`:

```json
{"project": "12345678", "investor": 12, "amount": "10000.00"}
```

Response `201` repeats the three fields. The server atomically withdraws the amount from the investor account and creates a completed payment and investment. An existing account with sufficient balance is needed.

`GET investor/contrib/percent/{project_id}/` returns an array:

```json
[
  {
    "investor": {"id": 12, "email": "investor@example.com", "name": "Example Investor"},
    "contribute_amount": "10000.00",
    "contribution_percentage": "10.00"
  }
]
```

`GET investor/investment-details/` returns the current user's investments with `project`, `amount`, and `created_at`.

## Financial advisors

`POST add/financial/advisor/` requires `project`, `advisor` (user ID), and `com_percentage`; response `201` repeats the fields:

```json
{"project": "12345678", "advisor": 18, "com_percentage": "5.00"}
```

`GET add/financial/advisor/` lists all assignments with advisor IDs. `GET fin/advisor/commission/{project_id}/` lists that project's assignments with nested advisor details (`id`, `email`, `name`). Despite its URL, the latter returns configured percentages, not commission payment records.

## Profit and receivables

`POST add/profit/` requires `project`, `trade` (UUID), and `amount`; response `201` repeats the fields:

```json
{"project": "12345678", "trade": "d7fd0fb4-662f-4fe7-adbf-dc9d357b33b9", "amount": "1000.00"}
```

`GET project/total/profit/` returns an array of those same fields, **not an aggregate total**. Optional filters: `project_id`, `from_dt` and `to_dt` together (inclusive trade dates), and `is_disbursed=true` or `false`. Disbursement status is a filter but is not included in the response serializer.

`GET investor/profit-details/` returns only the caller's allocations: `investor`, `project`, `trade`, `contribute_amount`, `percentage`, and `profit_amount`.

`POST create/acc/recvable/` requires `project`, `trade`, and `gain_lose` (decimal); response `201` repeats them. The current user is recorded as authorizer.

`GET acc/recvable/details/?project_id=12345678` returns `project`, `trade`, and `gain_lose`. Here `trade` is nested with `instrument` (`id`, `name`), `qty`, `unit_price`, `total_commission`, `actual_unit_price`, `trade_date`, and nested `authorized_by` (`id`, `email`, `name`). Optional `from_dt` and `to_dt` must be supplied together to filter inclusive trade dates. Omitting `project_id` yields no matching project records.

## Profit disbursement

```http
POST /api/stock/profit/disburse/
Content-Type: application/json

{"project_id": "12345678", "from_dt": "2026-11-01", "to_dt": "2026-11-05"}
```

All three fields are required. The project must exist and `from_dt` must not be after `to_dt`. The inclusive date range is matched against trade dates, selecting only undistributed profits.

The operation calculates advisor commissions, allocates the remainder to investors by contribution percentage, creates commission/profit/transaction records, and marks the selected profits as disbursed. Advisor commissions are applied sequentially to the remaining amount. The current implementation creates deposit ledger records without directly crediting `Account.balance`.

Success: `200` with `{"message": "Profit disbursement completed successfully"}`. No eligible profits: `404` with `{"message": "No profits found for disbursement"}`. Invalid input: `400` with serializer errors. Processing failures: `500` with an `error` message.

The view currently declares `AllowAny`, but creating ledger entries uses `request.user` as issuer. Use authenticated requests; anonymous execution is not a reliable supported workflow. This documentation preserves the existing permission behavior.
