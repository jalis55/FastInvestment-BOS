# user_app — authentication and users

[API conventions and authentication](README.md) · Prefix: `/api/`

## Endpoint index

| Method | Path | Access | Behavior |
| --- | --- | --- | --- |
| POST | `/api/token/` | Public | Log in; set JWT cookies and return session details |
| POST | `/api/token/refresh/` | Public; refresh cookie required | Rotate refresh token and issue access cookie |
| POST | `/api/logout/` | Public | Clear authentication cookies |
| GET | `/api/session/` | Public | Return authenticated session or anonymous state |
| POST | `/api/user-register/` | Public | Register a user (`201`) |
| GET, PUT, PATCH | `/api/user-profile/` | Authenticated | Read/update the current user's profile |
| GET, PUT, PATCH | `/api/user-status/` | Authenticated | Read role; update methods currently fail |
| GET | `/api/admin/users/` | Superuser | List non-superusers |
| GET, PUT, PATCH, DELETE | `/api/admin/users/{pk}/` | Superuser | Read/update/delete a non-superuser |
| GET | `/api/admin/customers/` | Staff | List non-staff, non-superuser customers |

## Login, session, refresh, and logout

Login body:

```json
{"email": "investor@example.com", "password": "your-password"}
```

Successful login (`200`):

```json
{
  "message": "Login successful",
  "authenticated": true,
  "user": {
    "id": 12,
    "email": "investor@example.com",
    "name": "Example Investor",
    "phone": null,
    "profile_image": null,
    "sex": null,
    "bio": null,
    "dob": null,
    "is_admin": false,
    "is_super_admin": false,
    "role": "user"
  }
}
```

`GET /api/session/` returns the same `authenticated` and `user` fields without `message`. Missing or invalid authentication returns `200` with `{"authenticated": false, "user": null}`. Roles are `superadmin`, `admin`, or `user`, determined in that order from superuser/staff flags.

Refresh requires no JSON body and returns `{"message": "Token refreshed"}` with new cookies. The old refresh token is blacklisted on rotation. Missing refresh data returns `401`; other invalid-token cases can use SimpleJWT's error body.

Logout returns `{"message": "Logout successful"}` and expires both cookies. It attempts token blacklisting only if it receives the refresh cookie. Because the default refresh cookie path excludes `/api/logout/`, browser logout normally clears cookies without blacklisting that refresh token.

## Registration and profile fields

| Field | Input | Notes |
| --- | --- | --- |
| `id` | Read-only | Integer user ID |
| `email` | Required on creation/full update | Unique email address |
| `name` | Required on creation/full update | Display name |
| `password` | Optional, write-only | Minimum eight characters when supplied; stored hashed |
| `phone` | Optional, nullable | Up to 20 characters |
| `profile_image` | Optional, nullable | Image upload via multipart form |
| `sex` | Optional, nullable | `M`, `F`, or `O` |
| `bio` | Optional, nullable | Free text |
| `dob` | Optional, nullable | `YYYY-MM-DD` |

Registration returns these profile fields, excluding the password. The current serializer permits registration without a password; supply one for accounts intended to log in.

```json
{"email": "investor@example.com", "name": "Example Investor", "password": "example-password-123"}
```

Update selected profile fields with `PATCH /api/user-profile/`, for example `{"phone": "+8801700000000"}`. Password updates are hashed and never included in the response.

## Administration and role status

User/customer list items and admin detail responses contain `id`, `name`, `email`, `phone`, `profile_image`, `sex`, `is_staff`, and `is_active`. On admin updates, `email` and `id` are read-only; other listed fields are writable. Superuser accounts are excluded from these admin querysets. Customer results are cached for 15 minutes.

To grant staff access, a superuser can send `PATCH /api/admin/users/12/` with `{"is_staff": true}`. Successful deletion returns `204`.

`GET /api/user-status/` returns `{"status": "user"}` (or `admin`/`superadmin`). Although PUT and PATCH are exposed by its generic view, its serializer does not implement updating; clients should use GET only. Role changes belong to the superuser admin detail endpoint.
