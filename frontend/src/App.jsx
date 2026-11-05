// App.js
import { lazy, Suspense } from 'react';
import ErrorBoundary from './components/errors/ErrorBoundary';
import RouteError from './components/errors/RouteError';
import Spinner from './components/Spinner';
import {
  createBrowserRouter,
  RouterProvider,
} from 'react-router-dom';

import AuthProvider from '@/auth/AuthContext';
import RedirectRoute from './auth/RedirectRoute';
import RoleRoute from './auth/RoleRoute';
import RequiredAuth from './auth/ReuiredRoute';
const Layout = lazy(() => import('./pages/layout/Layout'));
const Login = lazy(() => import('./pages/login/Login'));

const Dashboard = lazy(() => import('./pages/dashboard/Dashboard'));

// USER MANAGEMENT
const Users = lazy(() => import('./pages/users/Users'));
const UserDetails = lazy(() => import('./pages/users/UserDetails'));
const UserRegistration = lazy(() => import('./pages/users/UserRegistration'));

// TRADE
const BuyInstruments = lazy(() => import('./pages/trade/BuyInstruments'));
const SellInstruments = lazy(() => import('./pages/trade/SellInstruments'));

// PROJECT
const CreateProject = lazy(() => import('./pages/projects/CreateProject'));
const CloseProject = lazy(() => import('./pages/projects/CloseProject'));
// INVESTMENTS
const AddInvestments = lazy(() => import('./pages/investments/AddInvestments'));
// Financial Advisor
const FinancialAdvisor = lazy(() => import('./pages/financialAdvisor/FinancialAdvisor'));

//Disbursement
const DisburseProfit = lazy(() => import('./pages/disbursements/DisburseProfit'));

// Accounting
const Transaction = lazy(() => import('./pages/transaction/Transaction'));
const FundTransfer = lazy(() => import('./pages/transaction/FundTransfer'));
const PendingPayments = lazy(() => import('./pages/pending payments/PendingPayments'));
// Reports
const TradeDetails = lazy(() => import('./pages/reports/TradeDetails'));
const AccountReceivableDetails = lazy(() => import('./pages/reports/AccountReceivableDetails'));
const TransactionHistory = lazy(() => import('./pages/reports/TransactionHistory'));
const InvestmentHistory = lazy(() => import('./pages/reports/InvestmentHistory'));
const ProfitDetails = lazy(() => import('./pages/reports/ProfitDetails'));
const ProjectDetails = lazy(() => import('./pages/reports/ProjectDetails'));
const ProjectList = lazy(() => import('./pages/reports/ProjectList'));







const router = createBrowserRouter([
  {
    path: '/',
    errorElement: <RouteError />,
    element: (
      <RequiredAuth>
        <Layout />
      </RequiredAuth>
    ),
    children: [
      { index: true, element: <Dashboard /> },


          /* ---- User Management ---- */
    { path: 'users', element: <RoleRoute roles={['super_admin']}><Users /></RoleRoute> },
    { path: 'user-details',element: <RoleRoute roles={['user', 'admin', 'super_admin']}><UserDetails /></RoleRoute> },
    { path: 'user-registration',element: <RoleRoute roles={['super_admin']}><UserRegistration /></RoleRoute> },

      /* ---- Trade ---- */
      { path: 'buy-instruments', element: <RoleRoute roles={['admin']}><BuyInstruments /></RoleRoute> },
      { path: 'sell-instruments', element: <RoleRoute roles={['admin']}><SellInstruments /></RoleRoute> },
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
      { path: 'trade-details', element: <RoleRoute roles={['admin']}><TradeDetails /></RoleRoute> },
      { path: 'trans-history', element: <RoleRoute roles={['user']}><TransactionHistory/> </RoleRoute> },
      { path: 'investment-history', element: <RoleRoute roles={['user']}><InvestmentHistory/></RoleRoute> },
      { path: 'profit-details', element: <RoleRoute roles={['user']}><ProfitDetails/></RoleRoute> },
      { path: 'project-details', element: <RoleRoute roles={['admin']}><ProjectDetails/></RoleRoute> },
      { path: 'project-list', element: <RoleRoute roles={['admin']}><ProjectList/></RoleRoute> },
      
    ],
  },
  {
    element: <RedirectRoute />,
    errorElement: <RouteError />,
    children: [
      { path: 'login', element: <Login /> },
      // { path: 'register', element: <Registration /> },
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
    <ErrorBoundary>
      <AuthProvider>
        <Suspense fallback={<Spinner />}><RouterProvider router={router} /></Suspense>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
