// src/App.jsx
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { ThemeProvider } from "./contexts/theme-context";
import AuthProvider from "./contexts/AuthContext";
import ProtectedRoute from "./ProtectedRoute";
import RedirectRoute from "./RedirectRoute";

import Layout from "./routes/layout";
import Dashboard from "./routes/dashboard/Dashboard";
import Login from "./routes/auth/Login";
import Registration from "./routes/auth/Registration";
import Logout from "./routes/auth/Logout";
import SellInstruments from "./layouts/trade/SellInstruments";
import BuyInstruments from "./layouts/trade/BuyInstruments";
import Users from "./layouts/users/Users";
import Transaction from "./layouts/transaction/Transaction";
import PendingPayments from "./layouts/pending payments/PendingPayments";
import AddInvestments from "./layouts/investments/AddInvestments";
import DisburseProfit from "./layouts/disbursements/DisburseProfit";
import CreateProject from "./layouts/Projects/CreateProject";
import FinancialAdvisor from "./layouts/financialAdvisor/FinancialAdvisor";
import AccountReceivableDetails from "./layouts/AccountReceivableDetails/AccountReceivableDetails";
import TradeDetails from "./layouts/trade/TradeDetails";
import CloseProject from "./layouts/Projects/CloseProject";
import FundTransfer from "./layouts/transaction/FundTransfer";
import NotFound from "./layouts/NotFound";
import Forbidden from "./layouts/Forbidden";
import TransactionHistory from "./layouts/transaction/TransactionHistory";

const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <Layout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Dashboard /> },
      {
        path: "buy-instruments",
        element: (
          <ProtectedRoute roles={["user", "admin"]}>
            <BuyInstruments />
          </ProtectedRoute>
        )
      },
      {
        path: "sell-instruments",
        element: (
          <ProtectedRoute roles={["user", "admin"]}>
            <SellInstruments />
          </ProtectedRoute>
        )
      },
      {
        path: "users",
        element: (
          <ProtectedRoute roles={["admin"]}>
            <Users />
          </ProtectedRoute>
        )
      },
      {
        path: "transaction",
        element: (
          <ProtectedRoute roles={["admin"]}>
            <Transaction />
          </ProtectedRoute>
        )
      },
      {
        path: "fund-transfer",
        element: (
          <ProtectedRoute roles={["admin"]}>
            <FundTransfer />
          </ProtectedRoute>
        )
      },
      {
        path: "pending-payments",
        element: (
          <ProtectedRoute roles={["super_admin"]}>
            <PendingPayments />
          </ProtectedRoute>
        )
      },
      {
        path: "add-advisor",
        element: (
          <ProtectedRoute roles={["admin"]}>
            <FinancialAdvisor />
          </ProtectedRoute>
        )
      },
      {
        path: "add-investments",
        element: (
          <ProtectedRoute roles={["admin"]}>
            <AddInvestments />
          </ProtectedRoute>
        )
      },
      {
        path: "disburse-profit",
        element: (
          <ProtectedRoute roles={["admin"]}>
            <DisburseProfit />
          </ProtectedRoute>
        )
      },
      {
        path: "create-project",
        element: (
          <ProtectedRoute roles={["admin"]}>
            <CreateProject />
          </ProtectedRoute>
        )
      },
      {
        path: "close-project",
        element: (
          <ProtectedRoute roles={["admin"]}>
            <CloseProject />
          </ProtectedRoute>
        )
      },
      {
        path: "acc-rec-details",
        element: (
          <ProtectedRoute roles={["admin"]}>
            <AccountReceivableDetails />
          </ProtectedRoute>
        )
      },
      {
        path: "trade-details",
        element: (
          <ProtectedRoute roles={["user", "admin"]}>
            <TradeDetails />
          </ProtectedRoute>
        )
      },
      {
        path: "trans-history",
        element: (
          <ProtectedRoute roles={["user"]}>
            <TransactionHistory/>
          </ProtectedRoute>
        )
      },
    ],
  },
  {
    element: <RedirectRoute />,
    children: [
      { path: "login", element: <Login /> },
      { path: "register", element: <Registration /> },
    ],
  },
  {
    path: "logout",
    element: <Logout />
  },
  {
    path: "forbidden",
    element: <Forbidden/>
  },
  {
    path: '*',
    element: <NotFound />,
  }
]);

function App() {
  return (
    <AuthProvider>
      <ThemeProvider storageKey="theme">
        <RouterProvider router={router} />
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;