import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PlusCircle, Search, CreditCard, Filter, ExternalLink } from 'lucide-react';
import { getAccounts, getCustomers } from '../services/api';
import useFetch from '../hooks/useFetch';
import PageHeader from '../components/PageHeader';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import { formatCurrency, capitalize } from '../utils/formatters';

export default function AccountList() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const { data: rawAccounts, loading, error, refetch } = useFetch(getAccounts);
  const { data: rawCustomers } = useFetch(getCustomers);

  // Map of customer ID -> name for reliable display
  const customerMap = useMemo(() => {
    const map = {};
    const custList = Array.isArray(rawCustomers)
      ? rawCustomers
      : rawCustomers?.data || rawCustomers?.customers || [];
    custList.forEach((c) => {
      const id = c.id || c._id;
      const name = c.name || `${c.firstName || ''} ${c.lastName || ''}`.trim() || 'Customer';
      if (id) map[id] = name;
    });
    return map;
  }, [rawCustomers]);

  const accountsList = useMemo(() => {
    if (!rawAccounts) return [];
    if (Array.isArray(rawAccounts)) return rawAccounts;
    if (Array.isArray(rawAccounts.data)) return rawAccounts.data;
    if (Array.isArray(rawAccounts.accounts)) return rawAccounts.accounts;
    return [];
  }, [rawAccounts]);

  const filteredAccounts = useMemo(() => {
    return accountsList.filter((acc) => {
      // Type filter
      const accType = (acc.accountType || acc.type || '').toUpperCase();
      if (typeFilter !== 'ALL' && accType !== typeFilter) {
        return false;
      }

      // Status filter
      const accStatus = (acc.status || '').toUpperCase();
      if (statusFilter !== 'ALL' && accStatus !== statusFilter) {
        return false;
      }

      // Search term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const accNumber = String(acc.accountNumber || acc.id || acc._id || '').toLowerCase();
        const custName = (
          acc.customerName ||
          acc.customer?.name ||
          (acc.customer?.firstName
            ? `${acc.customer.firstName} ${acc.customer.lastName || ''}`
            : '') ||
          customerMap[acc.customerId] ||
          ''
        ).toLowerCase();

        return accNumber.includes(term) || custName.includes(term);
      }

      return true;
    });
  }, [accountsList, typeFilter, statusFilter, searchTerm, customerMap]);

  const columns = [
    {
      header: 'Account Number',
      key: 'accountNumber',
      render: (acc) => (
        <span className="font-mono font-semibold text-slate-800 tracking-wide">
          {acc.accountNumber || acc.id || acc._id}
        </span>
      ),
    },
    {
      header: 'Customer Name',
      key: 'customerName',
      render: (acc) => {
        const name =
          acc.customerName ||
          acc.customer?.name ||
          (acc.customer?.firstName
            ? `${acc.customer.firstName} ${acc.customer.lastName || ''}`
            : '') ||
          customerMap[acc.customerId] ||
          (acc.customerId ? `Cust #${acc.customerId}` : 'Unassigned');

        return (
          <span className="font-medium text-slate-800">
            {name}
          </span>
        );
      },
    },
    {
      header: 'Account Type',
      key: 'type',
      render: (acc) => {
        const type = acc.accountType || acc.type || 'Savings';
        const isSavings = type.toLowerCase() === 'savings';
        return (
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
              isSavings
                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                : 'bg-purple-50 text-purple-700 border border-purple-200'
            }`}
          >
            {capitalize(type)}
          </span>
        );
      },
    },
    {
      header: 'Available Balance',
      key: 'balance',
      align: 'right',
      render: (acc) => (
        <span className="font-bold text-slate-900">
          {formatCurrency(acc.balance)}
        </span>
      ),
    },
    {
      header: 'Status',
      key: 'status',
      render: (acc) => <StatusBadge status={acc.status || 'Active'} />,
    },
    {
      header: 'Action',
      key: 'action',
      align: 'right',
      render: (acc) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/accounts/${acc.accountNumber || acc.id || acc._id}`);
          }}
          className="text-teal-600 hover:text-teal-800 inline-flex items-center gap-1 text-xs font-semibold"
        >
          <span>Manage</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bank Accounts"
        subtitle="Manage deposit, savings, and checking portfolios across customers"
        action={
          <Link
            to="/accounts/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#1e3a5f] hover:bg-[#2c5282] text-white text-sm font-semibold rounded-lg shadow-sm transition-colors"
          >
            <PlusCircle className="w-4 h-4 text-teal-400" />
            <span>Open Account</span>
          </Link>
        }
      />

      {/* Filters and Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
        <div className="relative w-full md:max-w-xs">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search account # or customer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f] transition-all"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Type Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-slate-500">Type:</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:border-[#1e3a5f]"
            >
              <option value="ALL">All Types</option>
              <option value="SAVINGS">Savings</option>
              <option value="CURRENT">Current</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-slate-500">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:border-[#1e3a5f]"
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="FROZEN">Frozen</option>
            </select>
          </div>

          <div className="hidden sm:flex items-center gap-1 text-xs text-slate-400 pl-2 border-l border-slate-200">
            <span>Results: {filteredAccounts.length}</span>
          </div>
        </div>
      </div>

      {/* Main Table or Loading/Error States */}
      {loading ? (
        <LoadingSpinner message="Loading account ledger entries..." />
      ) : error ? (
        <ErrorMessage
          title="Could Not Load Accounts"
          message={error}
          onRetry={refetch}
        />
      ) : (
        <DataTable
          columns={columns}
          data={filteredAccounts}
          emptyMessage={
            searchTerm || typeFilter !== 'ALL' || statusFilter !== 'ALL'
              ? 'No accounts matching current filter criteria.'
              : 'No bank accounts found. Click Open Account to create one.'
          }
          onRowClick={(acc) => navigate(`/accounts/${acc.accountNumber || acc.id || acc._id}`)}
        />
      )}
    </div>
  );
}
