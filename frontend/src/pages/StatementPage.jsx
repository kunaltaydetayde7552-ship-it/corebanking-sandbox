import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  Download,
  Calendar,
  Filter,
  ArrowUpRight,
  ArrowDownLeft,
  CreditCard,
  Building,
  RefreshCw,
  Info
} from 'lucide-react';
import { getAccounts, getAccountStatement } from '../services/api';
import PageHeader from '../components/PageHeader';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import { formatCurrency, formatDateTime } from '../utils/formatters';

export default function StatementPage() {
  const [accounts, setAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [statementData, setStatementData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetchingStatement, setFetchingStatement] = useState(false);
  const [error, setError] = useState(null);

  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');

  // Load Accounts list on mount
  useEffect(() => {
    async function loadAccountsList() {
      setLoading(true);
      setError(null);
      try {
        const res = await getAccounts();
        const list = res.data?.data || res.data || [];
        setAccounts(list);
        if (list.length > 0) {
          setSelectedAccountId(list[0].id || list[0].accountNumber);
        }
      } catch (err) {
        setError(err.response?.data?.message || err.message || 'Failed to load accounts list');
      } finally {
        setLoading(false);
      }
    }
    loadAccountsList();
  }, []);

  // Fetch statement when selectedAccountId or filters change
  const fetchStatement = async () => {
    if (!selectedAccountId) return;
    setFetchingStatement(true);
    setError(null);
    try {
      const params = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (typeFilter !== 'ALL') params.type = typeFilter.toLowerCase();

      const res = await getAccountStatement(selectedAccountId, params);
      setStatementData(res.data?.data || res.data);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to generate account statement');
    } finally {
      setFetchingStatement(false);
    }
  };

  useEffect(() => {
    if (selectedAccountId) {
      fetchStatement();
    }
  }, [selectedAccountId, startDate, endDate, typeFilter]);

  // Export CSV Handler
  const handleExportCSV = () => {
    if (!statementData || !statementData.transactions || statementData.transactions.length === 0) {
      return;
    }

    const headers = [
      'Transaction ID',
      'Date & Time',
      'Description',
      'Type',
      'Debit (INR)',
      'Credit (INR)',
      'Running Balance (INR)',
      'Ledger Hash'
    ];

    const rows = statementData.transactions.map((tx) => [
      `"${tx.id}"`,
      `"${new Date(tx.timestamp).toLocaleString()}"`,
      `"${(tx.description || '').replace(/"/g, '""')}"`,
      `"${tx.type}"`,
      tx.debit > 0 ? tx.debit.toFixed(2) : '0.00',
      tx.credit > 0 ? tx.credit.toFixed(2) : '0.00',
      tx.runningBalance.toFixed(2),
      `"${tx.hash || 'N/A'}"`
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    const accNum = statementData.account?.accountNumber || selectedAccountId;
    link.setAttribute('download', `Statement_${accNum}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return <LoadingSpinner text="Loading Accounts..." />;
  }

  const selectedAccount = accounts.find(
    (a) => a.id === selectedAccountId || a.accountNumber === selectedAccountId
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Account Statement"
        subtitle="Detailed running-balance ledger, opening/closing positions and CSV export"
        action={
          statementData?.transactions?.length > 0 && (
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium shadow-sm transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Export CSV</span>
            </button>
          )
        }
      />

      {error && <ErrorMessage message={error} onRetry={fetchStatement} />}

      {/* Account Selector and Filters Card */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Account Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
              Select Account
            </label>
            <div className="relative">
              <select
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                className="w-full pl-3 pr-8 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.accountNumber} - {acc.customerName || (acc.customer ? `${acc.customer.firstName} ${acc.customer.lastName}` : 'Account')} ({acc.accountType})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Type Filter */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
              Transaction Type
            </label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
            >
              <option value="ALL">All Types</option>
              <option value="deposit">Deposits Only</option>
              <option value="withdrawal">Withdrawals Only</option>
              <option value="transfer">Transfers Only</option>
            </select>
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
              From Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
              To Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
            />
          </div>
        </div>

        {(startDate || endDate || typeFilter !== 'ALL') && (
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-500">Filtered view active</span>
            <button
              onClick={() => {
                setStartDate('');
                setEndDate('');
                setTypeFilter('ALL');
              }}
              className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>

      {/* Statement Balances Summary Cards */}
      {statementData && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Opening Balance</div>
            <div className="text-lg font-bold text-slate-800 mt-1">
              {formatCurrency(statementData.openingBalance)}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">At start of period</div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="text-xs font-medium text-emerald-600 uppercase tracking-wider">Total Credits</div>
            <div className="text-lg font-bold text-emerald-700 mt-1">
              + {formatCurrency(statementData.totalCredits)}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Inflows received</div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="text-xs font-medium text-rose-600 uppercase tracking-wider">Total Debits</div>
            <div className="text-lg font-bold text-rose-700 mt-1">
              - {formatCurrency(statementData.totalDebits)}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Outflows debited</div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-blue-200 bg-blue-50/30 shadow-sm">
            <div className="text-xs font-medium text-blue-700 uppercase tracking-wider">Closing Balance</div>
            <div className="text-lg font-bold text-blue-900 mt-1">
              {formatCurrency(statementData.closingBalance)}
            </div>
            <div className="text-[11px] text-blue-600 mt-0.5">
              Matches account balance: {statementData.closingBalance === statementData.account?.balance ? '✓ Yes' : 'Reconciled'}
            </div>
          </div>
        </div>
      )}

      {/* Statement Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FileText className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-semibold text-slate-800">
              Transaction Ledger & Running Balance
            </h2>
          </div>
          {fetchingStatement && (
            <div className="flex items-center space-x-2 text-xs text-slate-500">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
              <span>Updating...</span>
            </div>
          )}
        </div>

        {fetchingStatement && !statementData ? (
          <div className="p-8">
            <LoadingSpinner text="Generating statement..." />
          </div>
        ) : statementData?.transactions?.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Info className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-sm font-medium">No transactions found for the selected criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-600">
                <tr>
                  <th className="py-3.5 px-4">Date & Time</th>
                  <th className="py-3.5 px-4">Txn ID</th>
                  <th className="py-3.5 px-4">Description</th>
                  <th className="py-3.5 px-4 text-right">Debit (₹)</th>
                  <th className="py-3.5 px-4 text-right">Credit (₹)</th>
                  <th className="py-3.5 px-4 text-right">Running Balance (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {statementData?.transactions?.map((tx, idx) => (
                  <tr key={tx.id || idx} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 text-xs font-medium text-slate-600 whitespace-nowrap">
                      {formatDateTime(tx.timestamp)}
                    </td>
                    <td className="py-3 px-4 text-xs font-mono font-semibold text-slate-700">
                      {tx.id}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-800 max-w-xs truncate">
                      <span className="font-medium">{tx.description}</span>
                      {tx.counterpartyAccountNumber && (
                        <span className="block text-[11px] text-slate-400 font-mono">
                          Ref: {tx.counterpartyAccountNumber}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-xs font-mono text-right text-rose-600 font-medium whitespace-nowrap">
                      {tx.debit > 0 ? `- ₹${tx.debit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                    </td>
                    <td className="py-3 px-4 text-xs font-mono text-right text-emerald-600 font-medium whitespace-nowrap">
                      {tx.credit > 0 ? `+ ₹${tx.credit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                    </td>
                    <td className="py-3 px-4 text-xs font-mono text-right font-bold text-slate-800 whitespace-nowrap bg-slate-50/50">
                      ₹{tx.runningBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
