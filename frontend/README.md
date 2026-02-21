# Fast Investment Limited Backoffice Frontend

This is the frontend application for Fast Investment Limited. It provides an intuitive interface for user management, accounting operations, and project/investment tracking. It is built with React, Vite, and styled using Tailwind CSS and shadcn/ui components.

## 🚀 Technologies Used
- **Framework:** [React v19](https://react.dev/)
- **Build Tool:** [Vite](https://vitejs.dev/)
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/)
- **UI Components:** [shadcn/ui](https://ui.shadcn.com/) (Radix UI, Lucide React)
- **Routing:** [React Router v7](https://reactrouter.com/)
- **HTTP Client:** [Axios](https://axios-http.com/)
- **Alerts/Dialogs:** [SweetAlert2](https://sweetalert2.github.io/)
- **Utility:** [date-fns](https://date-fns.org/), [jspdf](https://github.com/parallax/jsPDF), [papaparse](https://www.papaparse.com/)

## ⚙️ Setup and Installation

### 1. Prerequisites
Ensure you have [Node.js](https://nodejs.org/) (v18 or newer recommended) and npm installed.

### 2. Clone the repository
```bash
git clone https://github.com/jalis55/FAST-Investment-Back-Office-Software.git
cd FAST-Investment-Back-Office-Software/frontend
```

### 3. Environment Variables
Create a `.env` file in the root of the `frontend` directory. Adjust variables based on the backend server:
```env
VITE_API_BASE_URL=http://localhost:8000
```
*(Check your local `.env` configuration file to ensure all keys match exactly what the frontend requires.)*

### 4. Install Dependencies
```bash
npm install
```

### 5. Run the Development Server
```bash
npm run dev
```
The application will be accessible at `http://localhost:5173/` by default.

## 📦 Building for Production

To create an optimized production build, run:
```bash
npm run build
```
This will compile the CSS and JavaScript, outputting the bundled files into the `dist/` directory, which can then be served by any static file server like Nginx, Apache, or directly through Django's static file handler if configured that way.

You can preview the production build locally by running:
```bash
npm run preview
```

## 🛠 Project Structure

- `src/` - The main application code directory.
  - Contains components, pages/views, routing logic, services (Axios configs), contexts, and the main entry point `main.jsx`.
- `public/` - Static files that go straight to the root directory (e.g., `favicon.ico`).
- `package.json` - Defines project dependencies and executable scripts (`dev`, `build`, `lint`).
- `vite.config.js` - Configuration file for the Vite bundler.
- `eslint.config.js` - ESLint configuration for code linting and formatting.
