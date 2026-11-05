# Fast Investment Limited Backoffice API

This is the backend API for Fast Investment Limited. It is built using Django and Django REST Framework, providing comprehensive endpoints for user management, accounting, and stock/project management.

## 🚀 Technologies Used
- **Backend:** Django, Django REST Framework (DRF)
- **Authentication:** JWT (JSON Web Tokens) via `djangorestframework-simplejwt`
- **Database:** SQLite in the current settings; PostgreSQL configuration is present but commented out.
- **API Documentation:** drf-spectacular (Swagger UI / ReDoc)
- **Caching:** Redis

## 📦 Modules & Features

1. **User Module (`user_app`)**
   - User registration, login, and profile management.
   - Role-based access control (Admin, Superadmin, Customer).

2. **Accounting Module (`accounting`)**
   - Manage user balances and transactions.
   - Handle deposits, fund transfers, and payment approvals.

3. **Stock & Investment Module (`stock_app`)**
   - Manage financial instruments and live trades.
   - Create and track investment projects and investor contributions.
   - Financial advisor commissions and profit disbursement.
   - Daily AmarStock market reference prices for Project Details, cached in Redis.

## ⚙️ Setup and Installation

### 1. Clone the repository
```bash
git clone https://github.com/jalis55/FAST-Investment-Back-Office-Software.git
cd FAST-Investment-Back-Office-Software/backend
```

### 2. Environment Variables
Create a `.env` file in the `backend` directory with your database and Redis configurations. Example:
```env
DEBUG=True
DB_ENGINE=django.db.backends.postgresql
DB_NAME=your_db_name
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_HOST=127.0.0.1
DB_PORT=5432
REDIS_HOST=localhost
REDIS_PORT=6379
```

For Upstash, put `REDIS_URL=rediss://default:YOUR_PASSWORD@YOUR_HOST:6379/0`
in `backend/.env.local` (ignored by Git). The `rediss://` scheme enables TLS
with certificate verification. Local overrides are loaded before `.env`;
environment variables supplied by the process take precedence over both files.

### 3. Create a Virtual Environment & Install Dependencies
```bash
python -m venv venv
source venv/bin/activate  # On Windows use: venv\Scripts\activate
pip install -r requirements.txt
```

### 4. Database Migrations
```bash
python manage.py migrate
```

### 5. Run the Server
```bash
python manage.py runserver
```

## 📖 API Documentation

This project uses `drf-spectacular` to auto-generate API documentation. Once the server is running, you can view the fully interactive API documentation at:

- **Swagger UI:** [http://127.0.0.1:8000/](http://127.0.0.1:8000/)
- **ReDoc:** [http://127.0.0.1:8000/api/schema/redoc/](http://127.0.0.1:8000/api/schema/redoc/)
- **OpenAPI Schema:** [http://127.0.0.1:8000/api/schema/](http://127.0.0.1:8000/api/schema/)

---

### Reference by Django app

See the [backend API guide](docs/README.md) for authentication, CSRF, data conventions, and error handling.

| App | Detailed reference |
| --- | --- |
| `user_app` | [Authentication, sessions, profiles, and user administration](docs/user_app.md) |
| `accounting` | [Balances, transactions, approvals, and fund transfers](docs/accounting.md) |
| `stock_app` | [Instruments, trades, projects, investments, advisors, and profits](docs/stock_app.md) |

Swagger UI and ReDoc group endpoints by the same three app names. The references include all routed business endpoints, request and response fields, permissions, filters, examples, and current implementation limitations.
