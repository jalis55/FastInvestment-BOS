# Fast Investment Limited Backoffice Software

This repository contains the complete source code for **Fast Investment Limited**'s Backoffice Software. The project is split into a Django-based backend API and a React/Vite-based frontend application.

## 🗂 Project Structure

- **`backend/`**: Contains the Django & Django REST Framework application. Handles authentication, databases, business logic, endpoints, and caching (with Redis).
- **`frontend/`**: Contains the React + Vite application. Provides an interactive UI built with Tailwind CSS, shadcn/ui, and React Router.
- **`docker-compose.yaml`**: Root configuration file to spin up the entire software stack (backend, frontend, and a redis cache).

## 🚀 Quick Start with Docker

The easiest way to get the entire project up and running locally is to use Docker Compose. Ensure you have Docker desktop and Docker Compose installed.

### 1. Build and Run the Stack
From the root of the repository, execute:
```bash
docker-compose up --build
```
This command will build the backend, the frontend, and start a Redis instance container automatically.

### 2. Access the Application
- **Frontend App**: Accessible at [http://localhost:3000](http://localhost:3000)
- **Backend API Server**: Accessible at [http://localhost:8000](http://localhost:8000)

> *Note for Windows users: if you have issues with paths in docker-compose, ensure your Docker Desktop is configured to use WSL2 and files are securely mounted.*

## 💻 Manual Setup

If you prefer to run the components manually without Docker (or are developing specific modules), you can set them up individually.

### Background Services
You must ideally have a Redis server running locally on port `6379`.

### Backend Initialization
1. Navigate to the `backend/` directory: `cd backend`
2. Create and configure your `.env` file (see backend documentation).
3. Install Python dependencies: `pip install -r requirements.txt`
4. Run migrations: `python manage.py migrate`
5. Start backend server: `python manage.py runserver`

For more details, please refer to the [Backend README](backend/README.md).

### Frontend Initialization
1. Navigate to the `frontend/` directory: `cd frontend`
2. Create and configure your `.env` file (e.g. `VITE_API_BASE_URL=http://localhost:8000`).
3. Install Node.js dependencies: `npm install`
4. Start dev server: `npm run dev`

For more details, please refer to the [Frontend README](frontend/README.md).

## 📄 Documentation Links

- **API Documentation**: The backend auto-generates Swagger and ReDoc schemas. Once running, view it at [http://localhost:8000](http://localhost:8000).
- **Frontend Details**: Visit [`frontend/README.md`](frontend/README.md).
- **Backend Details**: Visit [`backend/README.md`](backend/README.md).
