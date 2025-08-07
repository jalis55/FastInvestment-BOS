// App.js
import React from 'react';
import {
  createBrowserRouter,
  RouterProvider,
} from 'react-router-dom';

import AuthProvider from './auth/AuthContext';
import RedirectRoute from './auth/RedirectRoute';
import RoleRoute from './auth/RoleRoute';
import RequiredAuth from './auth/ReuiredRoute';
import Layout from './pages/layout/Layout';
import Login from './pages/login/Login';
import Registration from './pages/register/Register';

import Dashboard from './pages/dashboard/Dashboard';

// USER MANAGEMENT
import Users from './pages/users/Users';
import UserDetails from './pages/users/UserDetails';
import UserRegistration from './pages/users/UserRegistration';

// TRADE
import BuyInstruments from './pages/trade/BuyInstruments';
import SellInstruments from './pages/trade/SellInstruments';

// PROJECT
import CreateProject from './pages/projects/CreateProject';
import CloseProject from './pages/projects/CloseProject';
// INVESTMENTS
import AddInvestments from './pages/investments/AddInvestments';
// Financial Advisor
import FinancialAdvisor from './pages/financialAdvisor/FinancialAdvisor';

//Disbursement
import DisburseProfit from './pages/disbursements/DisburseProfit';

// Accounting
import Transaction from './pages/transaction/Transaction';
import FundTransfer from './pages/transaction/FundTransfer';
import PendingPayments from './pages/pending payments/PendingPayments';
// Reports
import TradeDetails from './pages/reports/TradeDetails';
import AccountReceivableDetails from './pages/reports/AccountReceivableDetails';
import TransactionHistory from './pages/reports/TransactionHistory';
import InvestmentHistory from './pages/reports/InvestmentHistory';
import ProfitDetails from './pages/reports/ProfitDetails';







const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <RequiredAuth>
        <Layout />
      </RequiredAuth>
    ),
    children: [
      { index: true, element: <Dashboard /> },


          /* ---- User Management ---- */
    { path: 'users', element: <RoleRoute roles={['super_user']}><Users /></RoleRoute> },
    { path: 'user-details',element: <RoleRoute roles={['user']}><UserDetails /></RoleRoute> },
    { path: 'user-registration',element: <RoleRoute roles={['user']}><UserRegistration /></RoleRoute> },

      /* ---- Trade ---- */
      { path: 'buy-instruments', element: <RoleRoute roles={['user', 'admin']}><BuyInstruments /></RoleRoute> },
      { path: 'sell-instruments', element: <RoleRoute roles={['user', 'admin']}><SellInstruments /></RoleRoute> },
      /* ---- Project ---- */
      { path: 'create-project', element: <RoleRoute roles={['admin']}><CreateProject /></RoleRoute> },
      { path: 'add-advisor', element: <RoleRoute roles={['admin']}><FinancialAdvisor /></RoleRoute> },
      { path: 'add-investments', element: <RoleRoute roles={['admin']}><AddInvestments /></RoleRoute> },
      { path: 'close-project', element: <RoleRoute roles={['admin']}><CloseProject /></RoleRoute> },
      { path: 'disburse-profit', element: <RoleRoute roles={['admin']}><DisburseProfit /></RoleRoute> },


      /* Accounting */
      { path: 'transaction', element: <RoleRoute roles={['admin']}><Transaction /></RoleRoute> },
      { path: 'fund-transfer', element: <RoleRoute roles={['admin']}><FundTransfer /></RoleRoute> },
      { path: 'pending-payments', element: <RoleRoute roles={['super_admin']}><PendingPayments /></RoleRoute> },


      /* ---- Reports ---- */
      { path: 'acc-rec-details', element: <RoleRoute roles={['admin']}><AccountReceivableDetails /></RoleRoute> },
      { path: 'trade-details', element: <RoleRoute roles={['user', 'admin']}><TradeDetails /></RoleRoute> },
      { path: 'trans-history', element: <RoleRoute roles={['user']}><TransactionHistory/> </RoleRoute> },
      { path: 'investment-history', element: <RoleRoute roles={['user']}><InvestmentHistory/></RoleRoute> },
      { path: 'profit-details', element: <RoleRoute roles={['user']}><ProfitDetails/></RoleRoute> },
    ],
  },
  {
    element: <RedirectRoute />,
    children: [
      { path: 'login', element: <Login /> },
      { path: 'register', element: <Registration /> },
      // ... other public routes
    ],
  },
  // {
  //   path: '/unauthorized',
  //   element:<Unauthorized/>
  // }
]);

function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}

export default App;