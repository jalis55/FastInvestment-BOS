# accounting — balances and transactions

[API conventions and authentication](README.md) · Prefix: `/api/acc/`

## Endpoint index

| Method | Path relative to prefix | Access | Behavior |
| --- | --- | --- | --- |
| GET | `user/{pk}/balance/` | Owner or staff | Get balance by **user ID** |
| GET | `users/balance-details/` | Staff | List all user balances |
| POST | `user/create-transaction/` | Authenticated | Create a deposit/payment |
| GET | `user/transaction-details/` | Authenticated | List current user's completed transactions |
| GET | `user/pending-payments/` | Superuser | List pending payments |
| PUT, PATCH | `user/approve-transaction/{pk}/` | Staff | Approve/decline a pending transaction |
| POST | `user/fund-transfer/` | Staff | Transfer funds between users |

## Balance responses

Balance detail returns an object; all balances returns an array of the same objects:

```json
{
  "user": {"id": 12, "name": "Example Investor", "email": "investor@example.com", "profile_image": null},
  "balance": "10000.00"
}
```

The path ID identifies the user, not the account. A missing account returns `400`; reading another user's balance without staff access returns `403`.

## Create a transaction

`POST /api/acc/user/create-transaction/`:

```json
{
  "user": 12,
  "amount": "1500.00",
  "transaction_type": "deposit",
  "trans_mode": "bank_transfer",
  "narration": "Bank deposit reference ABC123"
}
```

`user`, `amount`, `transaction_type`, and `trans_mode` are required. `transaction_type` is `deposit` or `payment`. `trans_mode` is a string (maximum 50 characters); `internal` has special behavior. `narration` is optional and nullable (maximum 300 characters). Response `201` contains these fields plus the read-only transaction `id`; it does not include status.

| Input | Account effect | Stored status |
| --- | --- | --- |
| Deposit with a mode other than `internal` | Credits balance immediately | `completed` |
| Either type with `trans_mode=internal` | No balance adjustment in this endpoint | `completed` |
| Payment with a mode other than `internal` | No immediate balance adjustment | `pending` |

The current authenticated-only permission allows a caller to submit a user ID; it is not restricted to the caller's own ID. Use the fund-transfer endpoint for transfers that must change both balances.

## Transaction history and approvals

`GET /api/acc/user/transaction-details/` returns an array of `amount`, `transaction_type`, `narration`, `issued_date`, and `status`, filtered to the caller and `status=completed`.

Pending-payment items contain `id`, nested `user`, `amount`, nested `issued_by`, `issued_date`, and `status`. Both nested users contain `id`, `name`, `email`, and `profile_image`.

Approve/decline a transaction using its integer transaction ID:

```http
PATCH /api/acc/user/approve-transaction/34/
Content-Type: application/json

{"status": "approved"}
```

Allowed statuses are `approved` and `declined`. Both PUT and PATCH are treated as partial updates. Approval withdraws the amount; decline does not change the balance. The lookup only selects pending transactions, so an already processed ID returns `404`.

The update response has a `status` field, but the implementation updates the database directly without refreshing the serializer's instance; its immediate response can still show `pending`. Approved payments are stored as `approved`, so they do not appear in the completed-only transaction history.

## Fund transfers

`POST /api/acc/user/fund-transfer/`:

```json
{"transfer_from": 12, "transfer_to": 18, "amount": "500.00"}
```

All three fields are required; source and destination are user IDs. Response `201` contains the same fields. The operation atomically debits the source, credits the destination, and creates completed internal payment/deposit ledger entries. Insufficient funds fail validation.
