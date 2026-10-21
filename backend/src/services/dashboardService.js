const store = require('../models/store');

/**
 * Get aggregated metrics for dashboard
 */
const getDashboardMetrics = async () => {
  const totalCustomers = store.customers.length;
  const totalAccounts = store.accounts.length;
  const activeAccounts = store.accounts.filter((a) => a.status === 'active').length;

  const totalBalance = Number(
    store.accounts
      .reduce((sum, a) => sum + (Number(a.balance) || 0), 0)
      .toFixed(2)
  );

  const totalTransactions = store.transactions.length;

  // Last 5 transactions sorted by timestamp desc
  const recentTransactions = [...store.transactions]
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 5)
    .map((txn) => {
      const account = store.accounts.find((a) => a.id === txn.accountId);
      const customer = account
        ? store.customers.find((c) => c.id === account.customerId)
        : null;

      return {
        ...txn,
        customerName: customer ? `${customer.firstName} ${customer.lastName}` : null
      };
    });

  // Accounts grouped by type
  const accountsByType = {
    savings: 0,
    current: 0
  };
  for (const acc of store.accounts) {
    const type = (acc.accountType || '').toLowerCase();
    if (accountsByType[type] !== undefined) {
      accountsByType[type] += 1;
    } else {
      accountsByType[type] = 1;
    }
  }

  // Accounts grouped by status
  const accountsByStatus = {
    active: 0,
    inactive: 0,
    frozen: 0
  };
  for (const acc of store.accounts) {
    const status = (acc.status || '').toLowerCase();
    if (accountsByStatus[status] !== undefined) {
      accountsByStatus[status] += 1;
    } else {
      accountsByStatus[status] = 1;
    }
  }

  return {
    totalCustomers,
    totalAccounts,
    activeAccounts,
    totalBalance,
    totalTransactions,
    recentTransactions,
    accountsByType,
    accountsByStatus
  };
};

module.exports = {
  getDashboardMetrics
};
