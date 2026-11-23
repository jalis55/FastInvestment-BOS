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
const AdminUserDetails = lazy(() => import('./pages/users/AdminUserDetails'));
const UserDetails = lazy(() => import('./pages/users/UserDetails'));
const UserRegistration = lazy(() => import('./pages/users/UserRegistration'));

// TRADE
const BuyInstruments = lazy(() => import('./pages/trade/BuyInstruments'));
const SellInstruments = lazy(() => import('./pages/trade/SellInstruments'));

// PROJECT
const CreateProject = lazy(() => import('./pages/projects/CreateProject'));
const CloseProject = lazy(() => import('./pages/projects/CloseProject'));
const ProjectList = lazy(() => import('./pages/projects/ProjectList'));
// INVESTMENTS
const AddInvestments = lazy(() => import('./pages/investments/AddInvestments'));
// Financial Advisor
const FinancialAdvisor = lazy(() => import('./pages/financialAdvisor/FinancialAdvisor'));

const Dividends = lazy(() => import('./pages/dividends/Dividends'));

//Disbursement
const DisburseProfit = lazy(() => import('./pages/disbursements/DisburseProfit'));

// Accounting
const Transaction = lazy(() => import('./pages/transaction/Transaction'));
const FundTransfer = lazy(() => import('./pages/transaction/FundTransfer'));
const PendingPayments = lazy(() => import('./pages/pending payments/PendingPayments'));
// Reports
const AllocationDetails = lazy(() => import('./pages/reports/AllocationDetails'));
const DisbursementDetails = lazy(() => import('./pages/reports/DisbursementDetails'));
const ProjectInvestmentSummary = lazy(() => import('./pages/reports/ProjectInvestmentSummary'));
const TradeDetails = lazy(() => import('./pages/reports/TradeDetails'));
const AccountReceivableDetails = lazy(() => import('./pages/reports/AccountReceivableDetails'));
const TransactionHistory = lazy(() => import('./pages/reports/TransactionHistory'));
const InvestmentHistory = lazy(() => import('./pages/reports/InvestmentHistory'));
const ProfitDetails = lazy(() => import('./pages/reports/ProfitDetails'));
const ProjectDetails = lazy(() => import('./pages/reports/ProjectDetails'));







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
      { index: true, handle: { pageTitle: 'Dashboard' }, element: <Dashboard /> },


          /* ---- User Management ---- */
    { path: 'users', handle: { pageTitle: 'Users' }, element: <RoleRoute roles={['super_admin']}><Users /></RoleRoute> },
    { path: 'users/:userId', handle: { pageTitle: 'User details' }, element: <RoleRoute roles={['super_admin']}><AdminUserDetails /></RoleRoute> },
    { path: 'user-details', handle: { pageTitle: 'My profile' },element: <RoleRoute roles={['user', 'admin', 'super_admin']}><UserDetails /></RoleRoute> },
    { path: 'user-registration', handle: { pageTitle: 'Register a user' },element: <RoleRoute roles={['super_admin']}><UserRegistration /></RoleRoute> },

      /* ---- Trade ---- */
      { path: 'buy-instruments', handle: { pageTitle: 'Buy Instrument' }, element: <RoleRoute menuPath="/buy-instruments" roles={['admin']}><BuyInstruments /></RoleRoute> },
      { path: 'sell-instruments', handle: { pageTitle: 'Sell Instrument' }, element: <RoleRoute menuPath="/sell-instruments" roles={['admin']}><SellInstruments /></RoleRoute> },
      /* ---- Project ---- */
      { path: 'project-list', handle: { pageTitle: 'Project List' }, element: <RoleRoute menuPath="/project-list" roles={['admin']}><ProjectList/></RoleRoute> },
      { path: 'create-project', handle: { pageTitle: 'Create Project' }, element: <RoleRoute menuPath="/create-project" roles={['admin']}><CreateProject /></RoleRoute> },
      { path: 'add-advisor', handle: { pageTitle: 'Add Financial Advisor' }, element: <RoleRoute menuPath="/add-advisor" roles={['admin']}><FinancialAdvisor /></RoleRoute> },
      { path: 'add-investments', handle: { pageTitle: 'Add Investment' }, element: <RoleRoute menuPath="/add-investments" roles={['admin']}><AddInvestments /></RoleRoute> },
      { path: 'close-project', handle: { pageTitle: 'Close a project' }, element: <RoleRoute menuPath="/close-project" roles={['admin']}><CloseProject /></RoleRoute> },
      { path: 'dividends', handle: { pageTitle: 'Dividend' }, element: <RoleRoute menuPath="/dividends" roles={['admin']}><Dividends /></RoleRoute> },
      { path: 'disburse-profit', handle: { pageTitle: 'Disbursement' }, element: <RoleRoute menuPath="/disburse-profit" roles={['admin']}><DisburseProfit /></RoleRoute> },


      /* Accounting */
      { path: 'transaction', handle: { pageTitle: 'Transaction' }, element: <RoleRoute menuPath="/transaction" roles={['admin']}><Transaction /></RoleRoute> },
      { path: 'fund-transfer', handle: { pageTitle: 'Fund Transfer' }, element: <RoleRoute menuPath="/fund-transfer" roles={['admin']}><FundTransfer /></RoleRoute> },
      { path: 'pending-payments', handle: { pageTitle: 'Pending Payments' }, element: <RoleRoute roles={['super_admin']}><PendingPayments /></RoleRoute> },


      /* ---- Reports ---- */
      { path: 'allocation-details', handle: { pageTitle: 'Allocation Details' }, element: <RoleRoute menuPath="/allocation-details" roles={['user', 'admin']}><AllocationDetails /></RoleRoute> },
      { path: 'disbursement-details', handle: { pageTitle: 'Disbursement Details' }, element: <RoleRoute menuPath="/disbursement-details" roles={['admin']}><DisbursementDetails /></RoleRoute> },
      { path: 'project-investment-summary', handle: { pageTitle: 'Project Investment Summary' }, element: <RoleRoute menuPath="/project-investment-summary" roles={['admin']}><ProjectInvestmentSummary /></RoleRoute> },
      { path: 'acc-rec-details', handle: { pageTitle: 'Account Receivable Details' }, element: <RoleRoute menuPath="/acc-rec-details" roles={['admin']}><AccountReceivableDetails /></RoleRoute> },
      { path: 'trade-details', handle: { pageTitle: 'Trade Details' }, element: <RoleRoute menuPath="/trade-details" roles={['admin']}><TradeDetails /></RoleRoute> },
      { path: 'trans-history', handle: { pageTitle: 'Transaction History' }, element: <RoleRoute menuPath="/trans-history" roles={['user']}><TransactionHistory/> </RoleRoute> },
      { path: 'investment-history', handle: { pageTitle: 'Investment History' }, element: <RoleRoute menuPath="/investment-history" roles={['user', 'admin']}><InvestmentHistory/></RoleRoute> },
      { path: 'profit-details', handle: { pageTitle: 'Profit Details' }, element: <RoleRoute menuPath="/profit-details" roles={['user', 'admin']}><ProfitDetails/></RoleRoute> },
      { path: 'project-details', handle: { pageTitle: 'Project Details' }, element: <RoleRoute menuPath="/project-details" roles={['user', 'admin']}><ProjectDetails/></RoleRoute> },
      { path: 'live-share-update', handle: { pageTitle: 'Live Share Update' }, element: <RoleRoute menuPath="/live-share-update" roles={['user', 'admin']}><ProjectDetails key="live-share-update" liveQuotes /></RoleRoute> },
      
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
