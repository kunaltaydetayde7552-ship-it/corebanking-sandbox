import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  CreditCard,
  ArrowDownCircle,
  ArrowUpCircle,
  ShieldAlert,
  Clock,
  User,
  IndianRupee,
  Calendar,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import {
  getAccount,
  getAccountTransactions,
  deposit,
  withdraw,
  updateAccountStatus,
  getCustomer,
} from '../services/api';
import PageHeader from '../components/PageHeader';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import { useToast } from '../components/Toast';
import { formatCurrency, formatDateTime, formatDate, capitalize } from '../utils/formatters';

export default function AccountDetail() {
  const { id } = useParams();
  const { showToast } = useToast();

  const [account, setAccount] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal States
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [isStatusOpen, setIsStatusOpen] = useState(false);

  // Form States
  const [actionAmount, setActionAmount] = useState('');
  const [actionDescription, setActionDescription] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('active');
  const [actionLoading, setActionLoading] = useState(false);
  const [formError, setFormError] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const accRes = await getAccount(id);
      const accData = accRes.data?.data || accRes.data;
      setAccount(accData);
      setSelectedStatus((accData?.status || 'active').toLowerCase());

      // Try fetching customer info if available
      const custId = accData?.customerId || accData?.customer?._id || accData?.customer?.id;
      if (custId && typeof custId === 'string') {
        try {
          const custRes = await getCustomer(custId);
          setCustomer(custRes.data?.data || custRes.data);
        } catch {
          // Ignore customer fetch error
        }
      } else if (accData?.customer) {
        setCustomer(accData.customer);
      }

      // Fetch transaction history
      try {
        const txRes = await getAccountTransactions(accData?.accountNumber || id);
        const txData = txRes.data?.data || txRes.data || [];
        setTransactions(Array.isArray(txData) ? txData : []);
      } catch {
        setTransactions([]);
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          'Failed to load account details from core ledger.'
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id, loadData]);

  // Handle Deposit
  const handleDepositSubmit = async (e) => {
    e.preventDefault();
    const amountNum = parseFloat(actionAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setFormError('Please enter a valid amount greater than 0');
      return;
    }

    setActionLoading(true);
    setFormError('');
    try {
      const payload = {
        accountId: account.id || account._id || id,
        accountNumber: account.accountNumber || id,
        amount: amountNum,
        description: actionDescription.trim() || 'Cash Deposit',
      };
      await deposit(payload);
      showToast(`Successfully deposited ${formatCurrency(amountNum)}`, 'success');
      setIsDepositOpen(false);
      setActionAmount('');
      setActionDescription('');
      await loadData();
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        'Deposit failed. Check account status.';
      setFormError(msg);
      showToast(msg, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Withdraw
  const handleWithdrawSubmit = async (e) => {
    e.preventDefault();
    const amountNum = parseFloat(actionAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setFormError('Please enter a valid amount greater than 0');
      return;
    }

    const currentBal = Number(account.balance) || 0;
    const odLimit = account.overdraftEnabled ? (Number(account.overdraftLimit) || 0) : 0;
    const totalAvail = currentBal + odLimit;

    if (amountNum > totalAvail) {
      if (account.overdraftEnabled) {
        setFormError(`Insufficient funds! Available: ${formatCurrency(totalAvail)} (Balance: ${formatCurrency(currentBal)}, Overdraft: ${formatCurrency(odLimit)})`);
      } else {
        setFormError(`Insufficient funds! ${account.accountNumber} has ${formatCurrency(currentBal)} available and no overdraft.`);
      }
      return;
    }

    setActionLoading(true);
    setFormError('');
    try {
      const payload = {
        accountId: account.id || account._id || id,
        accountNumber: account.accountNumber || id,
        amount: amountNum,
        description: actionDescription.trim() || 'Cash Withdrawal',
      };
      await withdraw(payload);
      showToast(`Successfully withdrew ${formatCurrency(amountNum)}`, 'success');
      setIsWithdrawOpen(false);
      setActionAmount('');
      setActionDescription('');
      await loadData();
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        'Withdrawal failed. Check balance or account status.';
      setFormError(msg);
      showToast(msg, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Status Update
  const handleStatusSubmit = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setFormError('');
    try {
      await updateAccountStatus(account.id || account._id || id, selectedStatus);
      showToast(`Account status updated to ${capitalize(selectedStatus)}`, 'success');
      setIsStatusOpen(false);
      await loadData();
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        'Failed to change account status';
      setFormError(msg);
      showToast(msg, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Retrieving account ledger & transactions..." />;
  }

  if (error || !account) {
    return (
      <ErrorMessage
        title="Account Not Found"
        message={error || 'Unable to retrieve information for this account ID.'}
        onRetry={loadData}
      />
    );
  }

  const customerName =
    customer?.name ||
    `${customer?.firstName || ''} ${customer?.lastName || ''}`.trim() ||
    account.customerName ||
    (account.customerId ? `Customer #${account.customerId}` : 'Account Holder');

  const customerId = customer?.id || customer?._id || account.customerId;

  const transactionColumns = [
    {
      header: 'Date & Time',
      key: 'timestamp',
      render: (tx) => (
        <span className="text-slate-600 text-xs font-mono">
          {formatDateTime(tx.createdAt || tx.timestamp || tx.date)}
        </span>
      ),
    },
    {
      header: 'Transaction Type',
      key: 'type',
      render: (tx) => <StatusBadge type={tx.type || tx.transactionType} />,
    },
    {
      header: 'Amount',
      key: 'amount',
      align: 'right',
      render: (tx) => {
        const type = (tx.type || tx.transactionType || '').toLowerCase();
        const isDebit = type === 'withdrawal' || type === 'debit';
        return (
          <span
            className={`font-semibold ${
              isDebit ? 'text-rose-600' : 'text-emerald-600'
            }`}
          >
            {isDebit ? '-' : '+'}
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
        <span className="font-mono text-xs text-slate-700">
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
        <span className="text-slate-500 text-xs truncate max-w-xs block">
          {tx.description || '-'}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Account: ${account.accountNumber || id}`}
        subtitle={`Ledger entry for ${capitalize(account.accountType || account.type || 'Savings')} Account`}
        showBackButton={true}
        backTo="/accounts"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                setFormError('');
                setActionAmount('');
                setActionDescription('');
                setIsDepositOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
            >
              <ArrowDownCircle className="w-4 h-4" />
              <span>Deposit</span>
            </button>
            <button
              onClick={() => {
                setFormError('');
                setActionAmount('');
                setActionDescription('');
                setIsWithdrawOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
            >
              <ArrowUpCircle className="w-4 h-4" />
              <span>Withdraw</span>
            </button>
            <button
              onClick={() => {
                setFormError('');
                setSelectedStatus((account.status || 'active').toLowerCase());
                setIsStatusOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold rounded-lg shadow-sm transition-colors"
            >
              <ShieldAlert className="w-4 h-4 text-slate-500" />
              <span>Change Status</span>
            </button>
          </div>
        }
      />

      {/* Prominent Account Details and Balance Hero Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Balance Card */}
        <div className="lg:col-span-1 bg-gradient-to-br from-[#1e3a5f] to-[#2c5282] rounded-2xl p-6 text-white shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-widest text-slate-300 font-semibold">
                Available Book Balance
              </span>
              <StatusBadge status={account.status || 'Active'} />
            </div>
            <div className="mt-4">
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                {formatCurrency(account.balance)}
              </h2>
              <p className="text-xs text-teal-300 mt-1 font-mono">
                Currency: INR (₹)
              </p>
            </div>
          </div>

          <div className="pt-6 border-t border-white/10 mt-6 flex items-center justify-between text-xs text-slate-300">
            <div>
              <p className="opacity-75">Account Type</p>
              <p className="font-semibold text-white mt-0.5">
                {capitalize(account.accountType || account.type || 'Savings')}
              </p>
            </div>
            <div className="text-right">
              <p className="opacity-75">Account Number</p>
              <p className="font-mono font-semibold text-white mt-0.5">
                {account.accountNumber || id}
              </p>
            </div>
          </div>
        </div>

        {/* Account Metadata Card */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 pb-3 border-b border-slate-100 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-[#1e3a5f]" />
              Account & Holder Metadata
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-4">
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Primary Customer
                </span>
                <div className="flex items-center space-x-2 mt-1">
                  <User className="w-4 h-4 text-slate-400" />
                  {customerId ? (
                    <Link
                      to={`/customers/${customerId}`}
                      className="text-sm font-bold text-[#1e3a5f] hover:underline"
                    >
                      {customerName}
                    </Link>
                  ) : (
                    <span className="text-sm font-semibold text-slate-800">
                      {customerName}
                    </span>
                  )}
                </div>
              </div>

              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Created Date
                </span>
                <div className="flex items-center space-x-2 mt-1">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <span className="text-sm font-medium text-slate-800">
                    {formatDate(account.createdAt || account.createdDate)}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Interest Rate / Plan
                </span>
                <p className="text-sm font-medium text-slate-800 mt-1">
                  {(account.accountType || account.type || '').toLowerCase() === 'savings'
                    ? '3.50% p.a. (Standard)'
                    : '0.00% (Current Account)'}
                </p>
              </div>

              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Daily Transfer Limit
                </span>
                <p className="text-sm font-medium text-slate-800 mt-1 font-mono">
                  {formatCurrency(1000000)}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Branch: Mumbai Main (FinTech Central)</span>
            <span>IFSC / Routing: CBIN009153</span>
          </div>
        </div>
      </div>

      {/* Transaction History Table */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Clock className="w-5 h-5 text-[#1e3a5f]" />
            <h3 className="font-bold text-slate-800">
              Account Transaction History ({transactions.length})
            </h3>
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
          columns={transactionColumns}
          data={transactions}
          emptyMessage="No transactions recorded for this account yet."
        />
      </div>

      {/* Deposit Modal */}
      <Modal
        isOpen={isDepositOpen}
        onClose={() => !actionLoading && setIsDepositOpen(false)}
        title="Deposit Funds"
        subtitle={`Credit funds to Account ${account.accountNumber || id}`}
      >
        <form onSubmit={handleDepositSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs">
              {formError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Deposit Amount (₹) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                ₹
              </span>
              <input
                type="number"
                step="0.01"
                min="1"
                required
                value={actionAmount}
                onChange={(e) => setActionAmount(e.target.value)}
                placeholder="5000.00"
                className="w-full pl-8 pr-4 py-2.5 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Description / Remarks
            </label>
            <input
              type="text"
              value={actionDescription}
              onChange={(e) => setActionDescription(e.target.value)}
              placeholder="e.g. Cash deposit via branch counter"
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              disabled={actionLoading}
              onClick={() => setIsDepositOpen(false)}
              className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm disabled:opacity-60"
            >
              {actionLoading ? 'Processing...' : 'Confirm Deposit'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Withdraw Modal */}
      <Modal
        isOpen={isWithdrawOpen}
        onClose={() => !actionLoading && setIsWithdrawOpen(false)}
        title="Withdraw Funds"
        subtitle={`Debit funds from Account ${account.accountNumber || id} (Available: ${formatCurrency(
          account.balance
        )})`}
      >
        <form onSubmit={handleWithdrawSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs">
              {formError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Withdrawal Amount (₹) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                ₹
              </span>
              <input
                type="number"
                step="0.01"
                min="1"
                required
                value={actionAmount}
                onChange={(e) => setActionAmount(e.target.value)}
                placeholder="2000.00"
                className="w-full pl-8 pr-4 py-2.5 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Description / Remarks
            </label>
            <input
              type="text"
              value={actionDescription}
              onChange={(e) => setActionDescription(e.target.value)}
              placeholder="e.g. ATM withdrawal or teller payout"
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              disabled={actionLoading}
              onClick={() => setIsWithdrawOpen(false)}
              className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-sm disabled:opacity-60"
            >
              {actionLoading ? 'Processing...' : 'Confirm Withdrawal'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Change Status Modal */}
      <Modal
        isOpen={isStatusOpen}
        onClose={() => !actionLoading && setIsStatusOpen(false)}
        title="Update Account Status"
        subtitle={`Modify operational state of Account ${account.accountNumber || id}`}
      >
        <form onSubmit={handleStatusSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs">
              {formError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              Select Status
            </label>
            <div className="space-y-2">
              {[
                {
                  value: 'active',
                  label: 'Active',
                  desc: 'Standard status, allows all deposits, withdrawals, and transfers.',
                },
                {
                  value: 'inactive',
                  label: 'Inactive',
                  desc: 'Temporarily disabled, disallows outgoing debit transactions.',
                },
                {
                  value: 'frozen',
                  label: 'Frozen',
                  desc: 'Regulatory hold or compliance freeze, blocks all movements.',
                },
              ].map((opt) => (
                <label
                  key={opt.value}
                  className={`flex items-start p-3 rounded-lg border cursor-pointer transition-all ${
                    selectedStatus === opt.value
                      ? 'border-[#1e3a5f] bg-blue-50/40'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="status"
                    value={opt.value}
                    checked={selectedStatus === opt.value}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="mt-0.5 text-[#1e3a5f] focus:ring-[#1e3a5f]"
                  />
                  <div className="ml-3">
                    <span className="text-xs font-bold text-slate-800">
                      {opt.label}
                    </span>
                    <p className="text-[11px] text-slate-500 mt-0.5">{opt.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              disabled={actionLoading}
              onClick={() => setIsStatusOpen(false)}
              className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="px-4 py-2 bg-[#1e3a5f] hover:bg-[#2c5282] text-white rounded-lg text-xs font-semibold shadow-sm disabled:opacity-60"
            >
              {actionLoading ? 'Updating...' : 'Save Status'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
