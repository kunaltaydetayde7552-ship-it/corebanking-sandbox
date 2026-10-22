const db = require('../config/db');
const store = require('../models/store');
const { isValidAccountType, isValidAccountStatus } = require('../utils/validators');

const createError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const mapAccountRow = (row, customer = null) => ({
  id: row.id,
  customerId: row.customer_id,
  accountNumber: row.account_number,
  accountType: row.account_type,
  balance: parseFloat(row.balance),
  overdraftEnabled: Boolean(row.overdraft_enabled),
  overdraftLimit: parseFloat(row.overdraft_limit || 0),
  status: row.status,
  createdAt: row.created_at ? row.created_at.toISOString() : '',
  updatedAt: row.updated_at ? row.updated_at.toISOString() : '',
  customer: customer || (row.customer_first_name ? {
    id: row.customer_id,
    firstName: row.customer_first_name,
    lastName: row.customer_last_name,
    email: row.customer_email,
    phone: row.customer_phone
  } : null)
});

const generateAccountId = async () => {
  if (db.isDbConnected()) {
    const res = await db.query("SELECT id FROM accounts WHERE id ~ '^ACC-[0-9]+$'");
    let maxId = 0;
    for (const r of res.rows) {
      const match = r.id.match(/^ACC-(\d+)$/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxId) maxId = num;
      }
    }
    return `ACC-${String(maxId + 1).padStart(3, '0')}`;
  }

  let maxId = 0;
  for (const a of store.accounts) {
    const match = a.id && a.id.match(/^ACC-(\d+)$/i);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxId) maxId = num;
    }
  }
  return `ACC-${String(maxId + 1).padStart(3, '0')}`;
};

const generateAccountNumber = async () => {
  let maxAccNum = 1001000005;
  if (db.isDbConnected()) {
    const res = await db.query('SELECT account_number FROM accounts');
    for (const r of res.rows) {
      const parsed = parseInt(r.account_number, 10);
      if (!isNaN(parsed) && parsed > maxAccNum) {
        maxAccNum = parsed;
      }
    }
    return String(maxAccNum + 1);
  }

  for (const a of store.accounts) {
    if (a.accountNumber) {
      const parsed = parseInt(a.accountNumber, 10);
      if (!isNaN(parsed) && parsed > maxAccNum) {
        maxAccNum = parsed;
      }
    }
  }
  return String(maxAccNum + 1);
};

const getAllAccounts = async () => {
  if (db.isDbConnected()) {
    const res = await db.query(`
      SELECT a.*, c.first_name AS customer_first_name, c.last_name AS customer_last_name,
             c.email AS customer_email, c.phone AS customer_phone
      FROM accounts a
      LEFT JOIN customers c ON a.customer_id = c.id
      ORDER BY a.created_at DESC
    `);
    return res.rows.map(r => mapAccountRow(r));
  }
  return store.accounts.map((a) => {
    const customer = store.customers.find((c) => c.id === a.customerId);
    return { ...a, customer: customer || null };
  });
};

const getAccountById = async (id) => {
  if (db.isDbConnected()) {
    const res = await db.query(`
      SELECT a.*, c.first_name AS customer_first_name, c.last_name AS customer_last_name,
             c.email AS customer_email, c.phone AS customer_phone
      FROM accounts a
      LEFT JOIN customers c ON a.customer_id = c.id
      WHERE a.id = $1 OR a.account_number = $1
    `, [id]);
    if (res.rows.length === 0) {
      throw createError(`Account with ID '${id}' not found`, 404);
    }
    return mapAccountRow(res.rows[0]);
  }

  const account = store.accounts.find((a) => a.id === id || a.accountNumber === id);
  if (!account) {
    throw createError(`Account with ID '${id}' not found`, 404);
  }
  const customer = store.customers.find((c) => c.id === account.customerId);
  return { ...account, customer: customer || null };
};

const createAccount = async (data) => {
  const { customerId, accountType } = data || {};
  const initialBalance = data.initialDeposit !== undefined ? data.initialDeposit : (data.initialBalance || 0);

  if (!customerId) {
    throw createError('customerId is required');
  }

  if (!accountType || !isValidAccountType(accountType)) {
    throw createError("Invalid account type. Allowed types are 'savings' or 'current'");
  }

  const parsedInitialBalance = Number(initialBalance);
  if (isNaN(parsedInitialBalance) || parsedInitialBalance < 0) {
    throw createError('Initial balance must be a non-negative number');
  }

  const roundedBalance = Number(parsedInitialBalance.toFixed(2));
  const newId = await generateAccountId();
  const newAccountNumber = await generateAccountNumber();
  const overdraftEnabled = Boolean(data.overdraftEnabled);
  const overdraftLimit = overdraftEnabled ? Number(data.overdraftLimit || 0) : 0;

  if (db.isDbConnected()) {
    const custRes = await db.query('SELECT * FROM customers WHERE id = $1', [customerId]);
    if (custRes.rows.length === 0) {
      throw createError(`Customer with ID '${customerId}' not found`, 404);
    }

    const insRes = await db.query(`
      INSERT INTO accounts (id, customer_id, account_number, account_type, balance, overdraft_enabled, overdraft_limit, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'active')
      RETURNING *
    `, [newId, customerId, newAccountNumber, accountType.trim().toLowerCase(), roundedBalance, overdraftEnabled, overdraftLimit]);

    if (roundedBalance > 0) {
      const txnRes = await db.query("SELECT id, hash FROM transactions ORDER BY timestamp DESC LIMIT 1");
      let maxTxn = 0;
      if (txnRes.rows.length > 0) {
        const match = txnRes.rows[0].id.match(/^TXN-(\d+)$/i);
        if (match) maxTxn = parseInt(match[1], 10);
      }
      const txnId = `TXN-${String(maxTxn + 1).padStart(3, '0')}`;
      const prevHash = txnRes.rows.length > 0 ? txnRes.rows[0].hash : 'GENESIS';

      const txnData = {
        id: txnId,
        accountId: newId,
        amount: roundedBalance,
        type: 'deposit',
        direction: 'credit',
        timestamp: new Date().toISOString()
      };
      const hash = store.calculateHash(prevHash, txnData);

      await db.query(`
        INSERT INTO transactions (id, account_id, account_number, type, direction, amount, balance, description, reference_id, prev_hash, hash)
        VALUES ($1, $2, $3, 'deposit', 'credit', $4, $5, 'Initial account opening deposit', NULL, $6, $7)
      `, [txnId, newId, newAccountNumber, roundedBalance, roundedBalance, prevHash, hash]);
    }

    return mapAccountRow(insRes.rows[0], custRes.rows[0]);
  }

  // In-Memory Fallback
  const customer = store.customers.find((c) => c.id === customerId);
  if (!customer) {
    throw createError(`Customer with ID '${customerId}' not found`, 404);
  }

  const newAccount = {
    id: newId,
    customerId,
    accountNumber: newAccountNumber,
    accountType: accountType.trim().toLowerCase(),
    balance: roundedBalance,
    overdraftEnabled,
    overdraftLimit,
    status: 'active',
    createdAt: store.getTimestamp()
  };

  store.accounts.push(newAccount);

  if (roundedBalance > 0) {
    const txnId = `TXN-${String(store.transactions.length + 1).padStart(3, '0')}`;
    const prevHash = store.transactions.length > 0 ? store.transactions[store.transactions.length - 1].hash : 'GENESIS';
    const txnData = {
      id: txnId,
      accountId: newAccount.id,
      accountNumber: newAccount.accountNumber,
      type: 'deposit',
      direction: 'credit',
      amount: roundedBalance,
      balance: roundedBalance,
      description: 'Initial account opening deposit',
      referenceId: null,
      timestamp: store.getTimestamp()
    };
    const hash = store.calculateHash(prevHash, txnData);
    store.transactions.push({ ...txnData, prevHash, hash });
  }

  return { ...newAccount, customer };
};

const updateAccountStatus = async (id, status) => {
  if (!status || !isValidAccountStatus(status)) {
    throw createError("Invalid status. Allowed values are 'active', 'inactive', or 'frozen'");
  }
  const cleanStatus = status.trim().toLowerCase();

  if (db.isDbConnected()) {
    const res = await db.query(`
      UPDATE accounts
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 OR account_number = $2
      RETURNING *
    `, [cleanStatus, id]);
    if (res.rows.length === 0) {
      throw createError(`Account with ID '${id}' not found`, 404);
    }
    return getAccountById(id);
  }

  const account = store.accounts.find((a) => a.id === id || a.accountNumber === id);
  if (!account) {
    throw createError(`Account with ID '${id}' not found`, 404);
  }
  account.status = cleanStatus;
  account.updatedAt = store.getTimestamp();
  return getAccountById(id);
};

const updateOverdraft = async (id, overdraftData = {}) => {
  const { overdraftEnabled, overdraftLimit } = overdraftData;

  if (db.isDbConnected()) {
    const acc = await getAccountById(id);
    const newEnabled = overdraftEnabled !== undefined ? Boolean(overdraftEnabled) : acc.overdraftEnabled;
    let newLimit = acc.overdraftLimit;
    if (overdraftLimit !== undefined) {
      const limitNum = Number(overdraftLimit);
      if (isNaN(limitNum) || limitNum < 0) {
        throw createError('Overdraft limit must be a positive number or 0');
      }
      newLimit = Number(limitNum.toFixed(2));
    }

    await db.query(`
      UPDATE accounts
      SET overdraft_enabled = $1, overdraft_limit = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3 OR account_number = $3
    `, [newEnabled, newLimit, id]);

    return getAccountById(id);
  }

  const account = store.accounts.find((a) => a.id === id || a.accountNumber === id);
  if (!account) {
    throw createError(`Account with ID '${id}' not found`, 404);
  }

  if (overdraftEnabled !== undefined) {
    account.overdraftEnabled = Boolean(overdraftEnabled);
  }
  if (overdraftLimit !== undefined) {
    const limitNum = Number(overdraftLimit);
    if (isNaN(limitNum) || limitNum < 0) {
      throw createError('Overdraft limit must be a positive number or 0');
    }
    account.overdraftLimit = Number(limitNum.toFixed(2));
  }
  account.updatedAt = store.getTimestamp();
  return getAccountById(id);
};

const getAccountBalance = async (id) => {
  const account = await getAccountById(id);
  const availableBalance = account.overdraftEnabled
    ? Number((account.balance + (account.overdraftLimit || 0)).toFixed(2))
    : account.balance;

  return {
    accountId: account.id,
    accountNumber: account.accountNumber,
    accountType: account.accountType,
    balance: account.balance,
    overdraftEnabled: account.overdraftEnabled || false,
    overdraftLimit: account.overdraftLimit || 0,
    availableBalance,
    currency: 'INR',
    status: account.status,
    updatedAt: account.updatedAt || account.createdAt
  };
};

module.exports = {
  getAllAccounts,
  getAccountById,
  createAccount,
  updateAccountStatus,
  updateOverdraft,
  getAccountBalance
};
