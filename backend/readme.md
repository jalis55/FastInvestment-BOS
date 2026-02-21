# Fast Investment Limited Backoffice API

This is the backend API for Fast Investment Limited. It is built using Django and Django REST Framework, providing comprehensive endpoints for user management, accounting, and stock/project management.

## 🚀 Technologies Used
- **Backend:** Django, Django REST Framework (DRF)
- **Authentication:** JWT (JSON Web Tokens) via `djangorestframework-simplejwt`
- **Database:** PostgreSQL (configured via `.env`)
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

### 3. Create a Virtual Environment & Install Dependencies
```bash
python -m venv venv
source venv/bin/activate  # On Windows use: venv\Scripts\activate
pip install -r requirements.txt
```

### 4. Database Migrations
```bash
python manage.py makemigrations
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

### Core Endpoint Overview

#### Authentication & Users (`/api/`)
- `POST /api/user-register/` - Register a new user
- `POST /api/token/` - Obtain JWT tokens (Login)
- `POST /api/token/refresh/` - Refresh JWT token
- `GET/PUT /api/user-profile/` - Retrieve or update user profile
- `GET /api/admin/users/` - List all users (Admin only)
- `GET /api/admin/customers/` - List all customers (Admin only)

#### Accounting (`/api/acc/`)
- `GET /api/acc/user/<id>/balance/` - Check user balance
- `POST /api/acc/user/create-transaction/` - Create a new transaction
- `GET /api/acc/user/pending-payments/` - View pending payments
- `POST /api/acc/user/fund-transfer/` - Transfer funds between accounts

#### Stock & Projects (`/api/stock/`)
- `GET /api/stock/instruments/` - View all financial instruments
- `POST /api/stock/create/trade/` - Record a new stock trade
- `POST /api/stock/create/project/` - Create a new investment project
- `POST /api/stock/add/investment/` - Add investor to a project
- `POST /api/stock/profit/disburse/` - Disburse project profits

## 🛡️ Error Handling
- **400 Bad Request:** Validation errors or missing fields payload.
- **401 Unauthorized:** Authentication/JWT token is missing or invalid.
- **403 Forbidden:** User lacks the necessary permissions (e.g., trying to access admin routes).
- **404 Not Found:** Resource does not exist.
