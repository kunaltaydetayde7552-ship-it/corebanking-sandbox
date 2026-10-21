import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import CustomerList from './pages/CustomerList';
import CustomerDetail from './pages/CustomerDetail';
import CustomerForm from './pages/CustomerForm';
import AccountList from './pages/AccountList';
import AccountDetail from './pages/AccountDetail';
import AccountForm from './pages/AccountForm';
import TransactionList from './pages/TransactionList';
import TransferPage from './pages/TransferPage';
import StatementPage from './pages/StatementPage';
import AdminSettings from './pages/AdminSettings';
import AboutPage from './pages/AboutPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        {/* Dashboard */}
        <Route index element={<Dashboard />} />

        {/* Customer Routes */}
        <Route path="customers" element={<CustomerList />} />
        <Route path="customers/new" element={<CustomerForm />} />
        <Route path="customers/:id" element={<CustomerDetail />} />
        <Route path="customers/:id/edit" element={<CustomerForm />} />

        {/* Account Routes */}
        <Route path="accounts" element={<AccountList />} />
        <Route path="accounts/new" element={<AccountForm />} />
        <Route path="accounts/:id" element={<AccountDetail />} />

        {/* Statement & Ledger */}
        <Route path="statement" element={<StatementPage />} />

        {/* Transaction & Transfer Routes */}
        <Route path="transactions" element={<TransactionList />} />
        <Route path="transfer" element={<TransferPage />} />

        {/* Admin & About */}
        <Route path="admin" element={<AdminSettings />} />
        <Route path="about" element={<AboutPage />} />

        {/* Catch-all fallback redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
