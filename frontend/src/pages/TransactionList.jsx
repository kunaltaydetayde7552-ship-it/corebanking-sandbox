import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeftRight,
  Filter,
  Calendar,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Search,
} from 'lucide-react';
import { getTransactions } from '../services/api';
import PageHeader from '../components/PageHeader';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import { formatCurrency, formatDateTime } from '../utils/formatters';

export default function TransactionList() {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [accountSearch, setAccountSearch] = useState('');

  // Pagination (10 per page)
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const fetchTransactions = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (typeFilter !== 'ALL') params.type = typeFilter.toLowerCase();
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const res = await getTransactions(params);
      const list = res.data?.data || res.data || [];
      setTransactions(Array.isArray(list) ? list : []);
      setCurrentPage(1);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          'Failed to load transactions ledger.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeFilter, startDate, endDate]);

  // Client-side filtering in case backend returns unfiltered or full array
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      // Type filter
      const type = (tx.type || tx.transactionType || '').toUpperCase();
      if (typeFilter !== 'ALL' && type !== typeFilter) {
        return false;
      }

      // Date range filter
      const txTime = new Date(tx.createdAt || tx.timestamp || tx.date).getTime();
      if (startDate) {
        const start = new Date(startDate).getTime();
        if (!isNaN(start) && txTime < start) return false;
      }
      if (endDate) {
        // End of the day
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (!isNaN(end.getTime()) && txTime > end.getTime()) return false;
      }

      // Account filter
      if (accountSearch.trim()) {
        const term = accountSearch.toLowerCase();
        const accNum = String(tx.accountNumber || tx.accountId || '').toLowerCase();
        const toAcc = String(tx.toAccount || tx.toAccountId || '').toLowerCase();
        const fromAcc = String(tx.fromAccount || tx.fromAccountId || '').toLowerCase();
        const desc = (tx.description || '').toLowerCase();

        return (
          accNum.includes(term) ||
          toAcc.includes(term) ||
          fromAcc.includes(term) ||
          desc.includes(term)
        );
      }

      return true;
    });
  }, [transactions, typeFilter, startDate, endDate, accountSearch]);

  // Paginated chunk
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage) || 1;
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredTransactions.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredTransactions, currentPage, itemsPerPage]);

  const columns = [
    {
      header: 'Date & Time',
      key: 'timestamp',
      render: (tx) => (
        <span className="font-mono text-xs text-slate-600">
          {formatDateTime(tx.createdAt || tx.timestamp || tx.date)}
        </span>
      ),
    },
    {
      header: 'Account Number',
      key: 'account',
      render: (tx) => {
        const accNumber =
          tx.accountNumber ||
          tx.accountId ||
          (tx.fromAccountId ? `From: ${tx.fromAccountId}` : '-');

        return (
          <span className="font-mono font-semibold text-slate-800 text-xs">
            {accNumber}
          </span>
        );
      },
    },
    {
      header: 'Type',
      key: 'type',
      render: (tx) => <StatusBadge type={tx.type || tx.transactionType} />,
    },
    {
      header: 'Amount',
      key: 'amount',
      align: 'right',
      render: (tx) => {
        const type = (tx.type || tx.transactionType || '').toLowerCase();
        let color = 'text-blue-600';
        let prefix = '';

        if (type === 'deposit' || type === 'credit') {
          color = 'text-emerald-600';
          prefix = '+';
        } else if (type === 'withdrawal' || type === 'debit') {
          color = 'text-rose-600';
          prefix = '-';
        } else if (type === 'transfer') {
          color = 'text-blue-600';
          prefix = '⇄ ';
        }

        return (
          <span className={`font-semibold ${color}`}>
            {prefix}
            {formatCurrency(tx.amount)}
          </span>
        );
      },
    },
    {
      header: 'Balance After',
      key: 'balanceAfter',
      align: 'right',
      render: (tx) => (
        <span className="font-mono text-xs text-slate-600">
          {tx.balanceAfter !== undefined && tx.balanceAfter !== null
            ? formatCurrency(tx.balanceAfter)
            : '-'}
        </span>
      ),
    },
    {
      header: 'Description',
      key: 'description',
      render: (tx) => (
        <span className="text-slate-500 text-xs truncate max-w-xs block" title={tx.description}>
          {tx.description || '-'}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Transaction Ledger"
        subtitle="Comprehensive chronological audit trail of all core banking entries"
        action={
          <button
            onClick={fetchTransactions}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold rounded-lg shadow-sm transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh Ledger</span>
          </button>
        }
      />

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4 sm:space-y-0 sm:flex sm:items-center sm:justify-between sm:flex-wrap gap-4 shadow-sm">
        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search account or note..."
            value={accountSearch}
            onChange={(e) => {
              setAccountSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]"
          />
        </div>

        {/* Filter controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Type Dropdown */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-slate-500">Type:</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:border-[#1e3a5f]"
            >
              <option value="ALL">All Types</option>
              <option value="DEPOSIT">Deposit (Credit)</option>
              <option value="WITHDRAWAL">Withdrawal (Debit)</option>
              <option value="TRANSFER">Transfer</option>
            </select>
          </div>

          {/* Start Date */}
          <div className="flex items-center gap-1">
            <span className="text-xs font-medium text-slate-500">From:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-slate-700 focus:outline-none focus:border-[#1e3a5f]"
            />
          </div>

          {/* End Date */}
          <div className="flex items-center gap-1">
            <span className="text-xs font-medium text-slate-500">To:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-slate-700 focus:outline-none focus:border-[#1e3a5f]"
            />
          </div>

          {/* Reset Filters button */}
          {(typeFilter !== 'ALL' || startDate || endDate || accountSearch) && (
            <button
              onClick={() => {
                setTypeFilter('ALL');
                setStartDate('');
                setEndDate('');
                setAccountSearch('');
              }}
              className="text-xs text-rose-600 hover:text-rose-800 font-medium underline"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Main Table or Loading/Error States */}
      {loading ? (
        <LoadingSpinner message="Auditing transactions..." />
      ) : error ? (
        <ErrorMessage
          title="Could Not Load Transactions"
          message={error}
          onRetry={fetchTransactions}
        />
      ) : (
        <div className="space-y-4">
          <DataTable
            columns={columns}
            data={paginatedData}
            emptyMessage="No transaction logs match your filter criteria."
            onRowClick={(tx) => {
              const acc = tx.accountNumber || tx.accountId;
              if (acc) navigate(`/accounts/${acc}`);
            }}
          />

          {/* Pagination Controls */}
          {filteredTransactions.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 px-4 py-3 flex items-center justify-between shadow-sm">
              <div className="text-xs text-slate-500">
                Showing{' '}
                <strong className="text-slate-800">
                  {Math.min((currentPage - 1) * itemsPerPage + 1, filteredTransactions.length)}
                </strong>{' '}
                to{' '}
                <strong className="text-slate-800">
                  {Math.min(currentPage * itemsPerPage, filteredTransactions.length)}
                </strong>{' '}
                of <strong className="text-slate-800">{filteredTransactions.length}</strong> entries
              </div>

              <div className="flex items-center space-x-2">
                <button
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  title="Previous Page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <span className="text-xs font-semibold text-slate-700 px-2">
                  Page {currentPage} of {totalPages}
                </span>

                <button
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  title="Next Page"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
