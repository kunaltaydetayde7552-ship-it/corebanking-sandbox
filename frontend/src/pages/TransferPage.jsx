import React, { useState, useEffect, useMemo } from 'react';
import {
  Send,
  ArrowLeftRight,
  CreditCard,
  IndianRupee,
  AlertCircle,
  CheckCircle2,
  Clock,
  RefreshCw,
} from 'lucide-react';
import { getAccounts, transfer, getTransactions } from '../services/api';
import PageHeader from '../components/PageHeader';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import { useToast } from '../components/Toast';
import { formatCurrency, formatDateTime } from '../utils/formatters';

export default function TransferPage() {
  const { showToast } = useToast();

  const [accounts, setAccounts] = useState([]);
  const [recentTransfers, setRecentTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [fromAccount, setFromAccount] = useState('');
  const [toAccount, setToAccount] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');

  // Status message state
  const [statusMessage, setStatusMessage] = useState(null); // { type: 'success' | 'error', text: '' }

  const loadData = async () => {
    setLoading(true);
    try {
      const [accRes, txRes] = await Promise.allSettled([
        getAccounts(),
        getTransactions({ type: 'transfer' }),
      ]);

      if (accRes.status === 'fulfilled') {
        const raw = accRes.value.data?.data || accRes.value.data || [];
        setAccounts(Array.isArray(raw) ? raw : []);
      }

      if (txRes.status === 'fulfilled') {
        const rawTx = txRes.value.data?.data || txRes.value.data || [];
        const list = Array.isArray(rawTx) ? rawTx : [];
        const transfers = list.filter(
          (t) => (t.type || t.transactionType || '').toLowerCase() === 'transfer'
        );
        setRecentTransfers(transfers.slice(0, 5));
      }
    } catch {
      // Handled
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Selected "From" Account Object
  const selectedFromAccountObj = useMemo(() => {
    return accounts.find(
      (a) =>
        String(a.accountNumber || a.id || a._id) === String(fromAccount)
    );
  }, [accounts, fromAccount]);

  // Selected "To" Account Object
  const selectedToAccountObj = useMemo(() => {
    return accounts.find(
      (a) =>
        String(a.accountNumber || a.id || a._id) === String(toAccount)
    );
  }, [accounts, toAccount]);

  // Available "To" Accounts (excludes "From" account)
  const availableToAccounts = useMemo(() => {
    return accounts.filter(
      (a) =>
        String(a.accountNumber || a.id || a._id) !== String(fromAccount)
    );
  }, [accounts, fromAccount]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatusMessage(null);

    if (!fromAccount) {
      setStatusMessage({ type: 'error', text: 'Please select a source (From) account' });
      return;
    }

    if (!toAccount) {
      setStatusMessage({ type: 'error', text: 'Please select a destination (To) account' });
      return;
    }

    if (fromAccount === toAccount) {
      setStatusMessage({
        type: 'error',
        text: 'Source and destination accounts must be different',
      });
      return;
    }

    const transferAmount = parseFloat(amount);
    if (isNaN(transferAmount) || transferAmount <= 0) {
      setStatusMessage({ type: 'error', text: 'Please enter a valid amount greater than 0' });
      return;
    }

    if (selectedFromAccountObj) {
      const fromBal = Number(selectedFromAccountObj.balance) || 0;
      const odLimit = selectedFromAccountObj.overdraftEnabled ? (Number(selectedFromAccountObj.overdraftLimit) || 0) : 0;
      const totalAvailable = fromBal + odLimit;

      if (transferAmount > totalAvailable) {
        if (selectedFromAccountObj.overdraftEnabled) {
          setStatusMessage({
            type: 'error',
            text: `Transfer blocked. ${selectedFromAccountObj.accountNumber} has ₹${fromBal.toFixed(2)} balance and ₹${odLimit.toFixed(2)} overdraft (Total available: ₹${totalAvailable.toFixed(2)}).`,
          });
        } else {
          setStatusMessage({
            type: 'error',
            text: `Transfer blocked. ${selectedFromAccountObj.accountNumber} has ₹${fromBal.toFixed(2)} available and no overdraft.`,
          });
        }
        return;
      }

      if ((selectedFromAccountObj.status || '').toLowerCase() !== 'active') {
        setStatusMessage({
          type: 'error',
          text: `Source account is ${selectedFromAccountObj.status}. Only active accounts can initiate transfers.`,
        });
        return;
      }
    }

    if (selectedToAccountObj && (selectedToAccountObj.status || '').toLowerCase() === 'frozen') {
      setStatusMessage({
        type: 'error',
        text: 'Destination account is frozen and cannot receive incoming transfers.',
      });
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        fromAccountId:
          selectedFromAccountObj?.id ||
          selectedFromAccountObj?._id ||
          fromAccount,
        fromAccountNumber:
          selectedFromAccountObj?.accountNumber ||
          fromAccount,
        fromAccount:
          selectedFromAccountObj?.accountNumber ||
          fromAccount,
        toAccountId:
          selectedToAccountObj?.id ||
          selectedToAccountObj?._id ||
          toAccount,
        toAccountNumber:
          selectedToAccountObj?.accountNumber ||
          toAccount,
        toAccount:
          selectedToAccountObj?.accountNumber ||
          toAccount,
        amount: transferAmount,
        description: description.trim() || 'Internal Account Transfer',
      };

      await transfer(payload);

      const successText = `Successfully transferred ${formatCurrency(
        transferAmount
      )} from ${fromAccount} to ${toAccount}`;

      setStatusMessage({ type: 'success', text: successText });
      showToast(successText, 'success');

      // Reset form
      setAmount('');
      setDescription('');

      // Refresh account balances and recent transfers
      await loadData();
    } catch (err) {
      const errText =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        'Fund transfer failed. Verify funds and account statuses.';
      setStatusMessage({ type: 'error', text: errText });
      showToast(errText, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const transferColumns = [
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
      header: 'From / To Accounts',
      key: 'accounts',
      render: (tx) => (
        <div className="flex items-center space-x-1.5 text-xs font-mono">
          <span className="text-slate-800 font-semibold">
            {tx.fromAccountNumber || tx.fromAccountId || tx.accountNumber || '-'}
          </span>
          <ArrowLeftRight className="w-3.5 h-3.5 text-blue-500" />
          <span className="text-slate-800 font-semibold">
            {tx.toAccountNumber || tx.toAccountId || '-'}
          </span>
        </div>
      ),
    },
    {
      header: 'Amount',
      key: 'amount',
      align: 'right',
      render: (tx) => (
        <span className="font-bold text-blue-600">
          {formatCurrency(tx.amount)}
        </span>
      ),
    },
    {
      header: 'Status',
      key: 'status',
      render: (tx) => (
        <StatusBadge status={tx.status || 'Completed'} size="sm" />
      ),
    },
    {
      header: 'Description',
      key: 'description',
      render: (tx) => (
        <span className="text-slate-500 text-xs truncate max-w-xs block">
          {tx.description || '-'}
        </span>
      ),
    },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <PageHeader
        title="Inter-Account Fund Transfer"
        subtitle="Real-time bilateral settlement between sandbox ledger accounts"
      />

      {/* Main Transfer Form Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ArrowLeftRight className="w-5 h-5 text-[#1e3a5f]" />
            <h2 className="font-bold text-slate-800">Transfer Authorization</h2>
          </div>
          <span className="text-xs bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full font-medium">
            Instant Settlement
          </span>
        </div>

        {loading ? (
          <LoadingSpinner message="Loading account portfolios..." />
        ) : (
          <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
            {/* Inline Alert Feedback */}
            {statusMessage && (
              <div
                className={`p-4 rounded-xl flex items-start space-x-3 text-sm border animate-fadeIn ${
                  statusMessage.type === 'success'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}
              >
                {statusMessage.type === 'success' ? (
                  <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-600 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-600 mt-0.5" />
                )}
                <div>
                  <p className="font-semibold">
                    {statusMessage.type === 'success' ? 'Transfer Successful' : 'Transfer Failed'}
                  </p>
                  <p className="text-xs mt-0.5">{statusMessage.text}</p>
                </div>
              </div>
            )}

            {/* Account Selection Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* From Account */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Source Account (From) <span className="text-rose-500">*</span>
                </label>
                <select
                  value={fromAccount}
                  onChange={(e) => {
                    setFromAccount(e.target.value);
                    if (toAccount === e.target.value) {
                      setToAccount('');
                    }
                  }}
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]"
                >
                  <option value="">-- Select Debiting Account --</option>
                  {accounts.map((acc) => {
                    const accNum = acc.accountNumber || acc.id || acc._id;
                    return (
                      <option key={accNum} value={accNum}>
                        {accNum} ({acc.accountType || acc.type || 'Savings'}) - Bal:{' '}
                        {formatCurrency(acc.balance)}
                      </option>
                    );
                  })}
                </select>

                {selectedFromAccountObj && (
                  <div className="mt-2 pt-2 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
                    <span>Available to transfer:</span>
                    <strong className="text-emerald-700 font-mono text-sm">
                      {formatCurrency(selectedFromAccountObj.balance)}
                    </strong>
                  </div>
                )}
              </div>

              {/* To Account */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Destination Account (To) <span className="text-rose-500">*</span>
                </label>
                <select
                  value={toAccount}
                  disabled={!fromAccount}
                  onChange={(e) => setToAccount(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f] disabled:bg-slate-100 disabled:cursor-not-allowed"
                >
                  <option value="">-- Select Beneficiary Account --</option>
                  {availableToAccounts.map((acc) => {
                    const accNum = acc.accountNumber || acc.id || acc._id;
                    return (
                      <option key={accNum} value={accNum}>
                        {accNum} ({acc.accountType || acc.type || 'Savings'}) - Bal:{' '}
                        {formatCurrency(acc.balance)}
                      </option>
                    );
                  })}
                </select>

                {selectedToAccountObj && (
                  <div className="mt-2 pt-2 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
                    <span>Beneficiary status:</span>
                    <StatusBadge status={selectedToAccountObj.status || 'Active'} size="sm" />
                  </div>
                )}
              </div>
            </div>

            {/* Amount and Description */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Transfer Amount (₹) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                    ₹
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="1000.00"
                    className="w-full pl-9 pr-4 py-2.5 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Reference Note / Description
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Monthly vendor payment or bill settlement"
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]"
                />
              </div>
            </div>

            {/* Submit Action */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="submit"
                disabled={submitting || !fromAccount || !toAccount || !amount}
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#1e3a5f] hover:bg-[#2c5282] text-white text-sm font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4 text-teal-400" />
                <span>{submitting ? 'Authorizing Transfer...' : 'Execute Transfer'}</span>
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Recent Transfers Audit Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Clock className="w-5 h-5 text-[#1e3a5f]" />
            <h3 className="font-bold text-slate-800">Recent Transfers</h3>
          </div>
          <button
            onClick={loadData}
            className="text-xs font-medium text-slate-500 hover:text-slate-800 flex items-center gap-1"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>

        <DataTable
          columns={transferColumns}
          data={recentTransfers}
          emptyMessage="No recent fund transfers recorded."
        />
      </div>
    </div>
  );
}
