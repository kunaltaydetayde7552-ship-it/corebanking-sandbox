import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Users,
  CreditCard,
  CheckCircle,
  IndianRupee,
  UserPlus,
  PlusCircle,
  ArrowLeftRight,
  TrendingUp,
  PieChart,
  ArrowUpRight,
  ArrowDownLeft,
} from 'lucide-react';
import { getDashboardMetrics, getCustomers, getAccounts, getTransactions } from '../services/api';
import MetricCard from '../components/MetricCard';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import PageHeader from '../components/PageHeader';
import { formatCurrency, formatDateTime, capitalize } from '../utils/formatters';

export default function Dashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [metrics, setMetrics] = useState({
    totalCustomers: 0,
    totalAccounts: 0,
    activeAccounts: 0,
    totalBalance: 0,
    recentTransactions: [],
    accountDistribution: {
      savings: 0,
      current: 0,
    },
  });

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);

    try {
      // First attempt primary dashboard API
      const response = await getDashboardMetrics();
      const raw = response.data?.data || response.data || {};

      let totalCust = raw.totalCustomers ?? raw.customersCount;
      let totalAcc = raw.totalAccounts ?? raw.accountsCount;
      let activeAcc = raw.activeAccounts ?? raw.activeCount;
      let totBalance = raw.totalBalance;
      let recentTx = raw.recentTransactions;
      let distribution = raw.accountDistribution || {
        savings: raw.savingsCount || raw.savingsAccounts || 0,
        current: raw.currentCount || raw.currentAccounts || 0,
      };

      // If any core metric is missing, compute from individual endpoints
      if (
        totalCust === undefined ||
        totalAcc === undefined ||
        totBalance === undefined ||
        !recentTx
      ) {
        try {
          const [customersRes, accountsRes, txRes] = await Promise.allSettled([
            getCustomers(),
            getAccounts(),
            getTransactions({ limit: 5 }),
          ]);

          const custList =
            customersRes.status === 'fulfilled'
              ? customersRes.value.data?.data || customersRes.value.data || []
              : [];
          const accList =
            accountsRes.status === 'fulfilled'
              ? accountsRes.value.data?.data || accountsRes.value.data || []
              : [];
          const txList =
            txRes.status === 'fulfilled'
              ? txRes.value.data?.data || txRes.value.data || []
              : [];

          if (totalCust === undefined) totalCust = custList.length;
          if (totalAcc === undefined) totalAcc = accList.length;
          if (activeAcc === undefined) {
            activeAcc = accList.filter((a) => (a.status || '').toLowerCase() === 'active').length;
          }
          if (totBalance === undefined) {
            totBalance = accList.reduce((sum, a) => sum + (Number(a.balance) || 0), 0);
          }
          if (!recentTx) {
            recentTx = Array.isArray(txList) ? txList.slice(0, 5) : [];
          }
          if (!raw.accountDistribution) {
            const savingsCount = accList.filter(
              (a) => (a.accountType || a.type || '').toLowerCase() === 'savings'
            ).length;
            const currentCount = accList.filter(
              (a) => (a.accountType || a.type || '').toLowerCase() === 'current'
            ).length;
            distribution = { savings: savingsCount, current: currentCount };
          }
        } catch {
          // Keep existing values
        }
      }

      setMetrics({
        totalCustomers: totalCust ?? 0,
        totalAccounts: totalAcc ?? 0,
        activeAccounts: activeAcc ?? 0,
        totalBalance: totBalance ?? 0,
        recentTransactions: recentTx || [],
        accountDistribution: distribution,
      });
    } catch (err) {
      // Fallback: try querying individual collections if /dashboard fails
      try {
        const [customersRes, accountsRes, txRes] = await Promise.all([
          getCustomers(),
          getAccounts(),
          getTransactions({ limit: 5 }),
        ]);

        const custList = customersRes.data?.data || customersRes.data || [];
        const accList = accountsRes.data?.data || accountsRes.data || [];
        const txList = txRes.data?.data || txRes.data || [];

        const totalCustomers = Array.isArray(custList) ? custList.length : 0;
        const totalAccounts = Array.isArray(accList) ? accList.length : 0;
        const activeAccounts = Array.isArray(accList)
          ? accList.filter((a) => (a.status || '').toLowerCase() === 'active').length
          : 0;
        const totalBalance = Array.isArray(accList)
          ? accList.reduce((sum, a) => sum + (Number(a.balance) || 0), 0)
          : 0;

        const savings = Array.isArray(accList)
          ? accList.filter((a) => (a.accountType || a.type || '').toLowerCase() === 'savings').length
          : 0;
        const current = Array.isArray(accList)
          ? accList.filter((a) => (a.accountType || a.type || '').toLowerCase() === 'current').length
          : 0;

        setMetrics({
          totalCustomers,
          totalAccounts,
          activeAccounts,
          totalBalance,
          recentTransactions: Array.isArray(txList) ? txList.slice(0, 5) : [],
          accountDistribution: { savings, current },
        });
      } catch (innerErr) {
        setError(
          err.response?.data?.message ||
            err.message ||
            'Unable to connect to CoreBanking backend server.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) {
    return <LoadingSpinner message="Loading dashboard overview..." />;
  }

  if (error) {
    return (
      <ErrorMessage
        title="Failed to Load Dashboard"
        message={error}
        onRetry={fetchDashboardData}
      />
    );
  }

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
      header: 'Account',
      key: 'accountId',
      render: (tx) => (
        <span className="font-medium text-slate-800">
          {tx.accountNumber || tx.accountId || '-'}
        </span>
      ),
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
    <div className="space-y-8 animate-fadeIn">
      {/* Page Header with Quick Action Buttons */}
      <PageHeader
        title="Banking Overview"
        subtitle="Real-time financial metrics, active portfolios and ledger state"
      >
        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            to="/customers/new"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold rounded-lg shadow-sm transition-colors"
          >
            <UserPlus className="w-4 h-4 text-slate-600" />
            <span>New Customer</span>
          </Link>
          <Link
            to="/accounts/new"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#1e3a5f] hover:bg-[#2c5282] text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
          >
            <PlusCircle className="w-4 h-4 text-teal-400" />
            <span>New Account</span>
          </Link>
          <Link
            to="/transfer"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
          >
            <ArrowLeftRight className="w-4 h-4" />
            <span>Fund Transfer</span>
          </Link>
        </div>
      </PageHeader>

      {/* 4 Metric Cards in a row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <MetricCard
          title="Total Customers"
          value={metrics.totalCustomers}
          icon={Users}
          bgColor="bg-blue-50"
          textColor="text-blue-600"
          accentColor="#2563eb"
          subtext="Verified account holders"
        />
        <MetricCard
          title="Total Accounts"
          value={metrics.totalAccounts}
          icon={CreditCard}
          bgColor="bg-teal-50"
          textColor="text-teal-600"
          accentColor="#0d9488"
          subtext="Savings & Current combined"
        />
        <MetricCard
          title="Active Accounts"
          value={metrics.activeAccounts}
          icon={CheckCircle}
          bgColor="bg-emerald-50"
          textColor="text-emerald-600"
          accentColor="#059669"
          subtext="Ready for transactions"
        />
        <MetricCard
          title="Total Deposits / Balance"
          value={formatCurrency(metrics.totalBalance)}
          icon={IndianRupee}
          bgColor="bg-indigo-50"
          textColor="text-indigo-600"
          accentColor="#4f46e5"
          subtext="Cumulative book balance"
        />
      </div>

      {/* Account Distribution Section */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <PieChart className="w-5 h-5 text-[#1e3a5f]" />
            <h2 className="text-base font-bold text-slate-800">Account Distribution</h2>
          </div>
          <Link
            to="/accounts"
            className="text-xs font-semibold text-teal-600 hover:text-teal-700 hover:underline"
          >
            View All Accounts &rarr;
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          {/* Savings Accounts Card */}
          <div className="p-4 rounded-xl border border-emerald-100 bg-emerald-50/50 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">
                Savings Accounts
              </span>
              <p className="text-2xl font-bold text-slate-900">
                {metrics.accountDistribution.savings || 0}
              </p>
              <p className="text-xs text-slate-500">Retail & individual interest-bearing</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold">
              <ArrowDownLeft className="w-6 h-6" />
            </div>
          </div>

          {/* Current Accounts Card */}
          <div className="p-4 rounded-xl border border-blue-100 bg-blue-50/50 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-blue-800 uppercase tracking-wider">
                Current Accounts
              </span>
              <p className="text-2xl font-bold text-slate-900">
                {metrics.accountDistribution.current || 0}
              </p>
              <p className="text-xs text-slate-500">Business & high-frequency checking</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700 font-bold">
              <ArrowUpRight className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Recent Transactions Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-5 h-5 text-[#1e3a5f]" />
            <h2 className="text-base font-bold text-slate-800">Recent Transactions</h2>
          </div>
          <Link
            to="/transactions"
            className="text-xs font-semibold text-teal-600 hover:text-teal-700 hover:underline"
          >
            All Transactions &rarr;
          </Link>
        </div>

        <DataTable
          columns={transactionColumns}
          data={metrics.recentTransactions}
          emptyMessage="No recent transactions recorded in the ledger."
          onRowClick={(tx) => {
            const accId = tx.accountId || tx.accountNumber;
            if (accId) navigate(`/accounts/${accId}`);
          }}
        />
      </div>
    </div>
  );
}
