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
import { Trapezoid } from "recharts";
import TradeDetails from "./layouts/trade/TradeDetails";
import CloseProject from "./layouts/Projects/CloseProject";
import FundTransfer from "./layouts/transaction/FundTransfer";
import NotFound from "./layouts/NotFound";

const router = createBrowserRouter([
    {
        path: "/",
        element: <ProtectedRoute />, // Protect all "/" and its children
        children: [
            {
                path: "/",
                element: <Layout />,
                children: [
                    { index: true, element: <Dashboard /> },
                    {
                        path: "buy-instruments",
                        element: <BuyInstruments />
                    },
                    {
                        path: "sell-instruments",
                        element: <SellInstruments />
                    },
                    {
                        path: "users",
                        element: <Users />
                    },
                    {
                        path: "transaction",
                        element: <Transaction />
                    },
                    {
                        path: "fund-transfer",
                        element: <FundTransfer />
                    },
                    {
                        path: "pending-payments",
                        element: <PendingPayments />
                    },
                    {
                        path: "add-advisor",
                        element: <FinancialAdvisor />
                    },
                    {
                        path: "add-investments",
                        element: <AddInvestments />
                    },
                    {
                        path: "disburse-profit",
                        element: <DisburseProfit />
                    },
                    {
                        path: "create-project",
                        element: <CreateProject />
                    },
                    {
                        path: "close-project",
                        element: <CloseProject />
                    },

                    {
                        path: "acc-rec-details",
                        element: <AccountReceivableDetails />
                    },
                    {
                        path: "trade-details",
                        element: <TradeDetails />
                    },
                ],
            },
        ],
    },
    {
        element: <RedirectRoute />, // Redirect if already logged in
        children: [
            { path: "login", element: <Login /> },
            // { path: "register", element: <Registration /> },
        ],
    },
    {
        path: "logout",
        element: <Logout />
    },
    {
        path: '*',
        element: <NotFound/>,
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
