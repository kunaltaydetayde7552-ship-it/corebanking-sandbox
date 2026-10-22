const store = require('../models/store');
const db = require('../config/db');

/**
 * Get aggregated metrics for dashboard
 */
const getDashboardMetrics = async () => {
  if (db.isDbConnected()) {
    try {
      const [
        custCountRes,
        accCountRes,
        activeAccRes,
        balanceRes,
        txnCountRes,
        recentTxnRes,
        typesRes,
        statusRes
      ] = await Promise.all([
        db.query('SELECT COUNT(*) FROM customers'),
        db.query('SELECT COUNT(*) FROM accounts'),
        db.query("SELECT COUNT(*) FROM accounts WHERE status = 'active'"),
        db.query('SELECT COALESCE(SUM(balance), 0) AS total FROM accounts'),
        db.query('SELECT COUNT(*) FROM transactions'),
        db.query(`
          SELECT 
            t.id, 
            t.account_id AS "accountId", 
            t.account_number AS "accountNumber", 
            t.type, 
            t.direction,
            t.amount, 
            t.balance, 
            t.description, 
            t.reference_id AS "referenceId", 
            t.timestamp,
            t.prev_hash AS "prevHash", 
            t.hash,
            CONCAT(c.first_name, ' ', c.last_name) AS "customerName"
          FROM transactions t
          LEFT JOIN accounts a ON t.account_id = a.id
          LEFT JOIN customers c ON a.customer_id = c.id
          ORDER BY t.timestamp DESC
          LIMIT 5
        `),
        db.query('SELECT account_type, COUNT(*) AS count FROM accounts GROUP BY account_type'),
        db.query('SELECT status, COUNT(*) AS count FROM accounts GROUP BY status')
      ]);

      const totalCustomers = parseInt(custCountRes.rows[0].count, 10);
      const totalAccounts = parseInt(accCountRes.rows[0].count, 10);
      const activeAccounts = parseInt(activeAccRes.rows[0].count, 10);
      const totalBalance = Number(parseFloat(balanceRes.rows[0].total).toFixed(2));
      const totalTransactions = parseInt(txnCountRes.rows[0].count, 10);

      const recentTransactions = recentTxnRes.rows.map(r => ({
        ...r,
        amount: parseFloat(r.amount),
        balance: parseFloat(r.balance)
      }));

      const accountsByType = { savings: 0, current: 0 };
      for (const row of typesRes.rows) {
        const type = (row.account_type || '').toLowerCase();
        accountsByType[type] = parseInt(row.count, 10);
      }

      const accountsByStatus = { active: 0, inactive: 0, frozen: 0 };
      for (const row of statusRes.rows) {
        const st = (row.status || '').toLowerCase();
        accountsByStatus[st] = parseInt(row.count, 10);
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
    } catch (err) {
      console.error('Error fetching dashboard metrics from DB, falling back to store:', err.message);
    }
  }

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
