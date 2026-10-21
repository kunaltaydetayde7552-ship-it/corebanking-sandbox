const store = require('../models/store');
const { isPositiveNumber, isValidTransactionType } = require('../utils/validators');

/**
 * Custom error helper
 */
const createError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

/**
 * Helper to find account by ID or Account Number
 */
const findAccount = (idOrNumber) => {
  if (!idOrNumber) return null;
  const target = String(idOrNumber).trim();
  return store.accounts.find((a) => a.id === target || a.accountNumber === target);
};

/**
 * Generate next transaction ID like TXN-001, TXN-009, etc.
 */
const generateTxnId = () => {
  let maxId = 0;
  for (const t of store.transactions) {
    const match = t.id && t.id.match(/^TXN-(\d+)$/i);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxId) maxId = num;
    }
  }
  const nextNum = maxId + 1;
  return `TXN-${String(nextNum).padStart(3, '0')}`;
};

/**
 * Get transactions by account with optional filters & pagination
 */
const getTransactionsByAccountId = async (accountId, filters = {}) => {
  const account = findAccount(accountId);
  if (!account) {
    throw createError(`Account '${accountId}' not found`, 404);
  }

  let txns = store.transactions.filter((t) => t.accountId === account.id);

  const { type, startDate, endDate, page = 1, limit = 10 } = filters;

  if (type) {
    const lowerType = String(type).trim().toLowerCase();
    txns = txns.filter((t) => t.type.toLowerCase() === lowerType);
  }

  if (startDate) {
    const start = new Date(startDate);
    if (!isNaN(start.getTime())) {
      txns = txns.filter((t) => new Date(t.timestamp) >= start);
    }
  }

  if (endDate) {
    const end = new Date(endDate);
    if (!isNaN(end.getTime())) {
      // Set to end of day if only date is provided
      if (endDate.length <= 10) {
        end.setHours(23, 5, 59, 999);
      }
      txns = txns.filter((t) => new Date(t.timestamp) <= end);
    }
  }

  // Sort descending by timestamp
  txns.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  const total = txns.length;
  const currentPage = Math.max(1, parseInt(page, 10) || 1);
  const itemsPerPage = Math.max(1, parseInt(limit, 10) || 10);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const pagedTransactions = txns.slice(startIndex, startIndex + itemsPerPage);

  return {
    account: {
      id: account.id,
      accountNumber: account.accountNumber,
      accountType: account.accountType,
      balance: account.balance,
      status: account.status
    },
    transactions: pagedTransactions,
    total,
    page: currentPage,
    limit: itemsPerPage
  };
};

/**
 * Get all transactions with optional filters & pagination
 */
const getAllTransactions = async (filters = {}) => {
  let txns = [...store.transactions];

  const { accountId, type, startDate, endDate, page = 1, limit = 10 } = filters;

  if (accountId) {
    const account = findAccount(accountId);
    if (account) {
      txns = txns.filter((t) => t.accountId === account.id);
    } else {
      txns = [];
    }
  }

  if (type) {
    const lowerType = String(type).trim().toLowerCase();
    txns = txns.filter((t) => t.type.toLowerCase() === lowerType);
  }

  if (startDate) {
    const start = new Date(startDate);
    if (!isNaN(start.getTime())) {
      txns = txns.filter((t) => new Date(t.timestamp) >= start);
    }
  }

  if (endDate) {
    const end = new Date(endDate);
    if (!isNaN(end.getTime())) {
      if (endDate.length <= 10) {
        end.setHours(23, 5, 59, 999);
      }
      txns = txns.filter((t) => new Date(t.timestamp) <= end);
    }
  }

  // Sort descending by timestamp
  txns.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  const total = txns.length;
  const currentPage = Math.max(1, parseInt(page, 10) || 1);
  const itemsPerPage = Math.max(1, parseInt(limit, 10) || 10);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const pagedTransactions = txns.slice(startIndex, startIndex + itemsPerPage);

  return {
    transactions: pagedTransactions,
    total,
    page: currentPage,
    limit: itemsPerPage
  };
};

/**
 * Perform a deposit transaction
 */
const deposit = async (accountId, amount, description) => {
  if (!accountId) {
    throw createError('accountId is required');
  }

  if (!isPositiveNumber(amount)) {
    throw createError('Deposit amount must be a positive number greater than 0');
  }

  const account = findAccount(accountId);
  if (!account) {
    throw createError(`Account '${accountId}' not found`, 404);
  }

  if (account.status !== 'active') {
    throw createError(
      `Cannot perform deposit on an account with status '${account.status}'. Account must be 'active'.`,
      400
    );
  }

  const numAmount = Number(Number(amount).toFixed(2));
  account.balance = Number((account.balance + numAmount).toFixed(2));
  const timestamp = store.getTimestamp();
  account.updatedAt = timestamp;

  const txnId = generateTxnId();
  const prevHash = store.transactions.length > 0 ? store.transactions[store.transactions.length - 1].hash : 'GENESIS';

  const transaction = {
    id: txnId,
    accountId: account.id,
    accountNumber: account.accountNumber,
    type: 'deposit',
    direction: 'credit',
    amount: numAmount,
    balance: account.balance,
    description: description ? String(description).trim() : 'Account deposit',
    referenceId: null,
    timestamp
  };

  transaction.hash = store.calculateHash(prevHash, transaction);
  transaction.prevHash = prevHash;

  store.transactions.push(transaction);

  return {
    transaction,
    account: {
      id: account.id,
      accountNumber: account.accountNumber,
      balance: account.balance,
      overdraftEnabled: account.overdraftEnabled || false,
      overdraftLimit: account.overdraftLimit || 0,
      status: account.status
    }
  };
};

/**
 * Perform a withdrawal transaction
 */
const withdraw = async (accountId, amount, description) => {
  if (!accountId) {
    throw createError('accountId is required');
  }

  if (!isPositiveNumber(amount)) {
    throw createError('Withdrawal amount must be a positive number greater than 0');
  }

  const account = findAccount(accountId);
  if (!account) {
    throw createError(`Account '${accountId}' not found`, 404);
  }

  if (account.status !== 'active') {
    throw createError(
      `Cannot perform withdrawal on an account with status '${account.status}'. Account must be 'active'.`,
      400
    );
  }

  const numAmount = Number(Number(amount).toFixed(2));
  const availableLimit = account.overdraftEnabled ? (account.overdraftLimit || 0) : 0;
  const maxAvailable = Number((account.balance + availableLimit).toFixed(2));

  if (numAmount > maxAvailable) {
    if (account.overdraftEnabled) {
      throw createError(
        `Withdrawal blocked. ${account.accountNumber} has ₹${account.balance.toFixed(2)} balance and ₹${availableLimit.toFixed(2)} overdraft (Total available: ₹${maxAvailable.toFixed(2)}). Requested: ₹${numAmount.toFixed(2)}`,
        400
      );
    } else {
      throw createError(
        `Withdrawal blocked. ${account.accountNumber} has ₹${account.balance.toFixed(2)} available and no overdraft.`,
        400
      );
    }
  }

  account.balance = Number((account.balance - numAmount).toFixed(2));
  const timestamp = store.getTimestamp();
  account.updatedAt = timestamp;

  const txnId = generateTxnId();
  const prevHash = store.transactions.length > 0 ? store.transactions[store.transactions.length - 1].hash : 'GENESIS';

  const transaction = {
    id: txnId,
    accountId: account.id,
    accountNumber: account.accountNumber,
    type: 'withdrawal',
    direction: 'debit',
    amount: numAmount,
    balance: account.balance,
    description: description ? String(description).trim() : 'Account withdrawal',
    referenceId: null,
    timestamp
  };

  transaction.hash = store.calculateHash(prevHash, transaction);
  transaction.prevHash = prevHash;

  store.transactions.push(transaction);

  return {
    transaction,
    account: {
      id: account.id,
      accountNumber: account.accountNumber,
      balance: account.balance,
      overdraftEnabled: account.overdraftEnabled || false,
      overdraftLimit: account.overdraftLimit || 0,
      status: account.status
    }
  };
};

/**
 * Perform a funds transfer between two accounts
 */
const transfer = async (fromAccountId, toAccountId, amount, description) => {
  if (!fromAccountId || !toAccountId) {
    throw createError('Both fromAccountId and toAccountId are required');
  }

  if (!isPositiveNumber(amount)) {
    throw createError('Enter an amount greater than ₹0.00.');
  }

  const fromAccount = findAccount(fromAccountId);
  if (!fromAccount) {
    throw createError(`Source account '${fromAccountId}' not found`, 404);
  }

  const toAccount = findAccount(toAccountId);
  if (!toAccount) {
    throw createError(`Destination account '${toAccountId}' not found`, 404);
  }

  if (fromAccount.id === toAccount.id) {
    throw createError('Choose two different accounts to transfer between.', 400);
  }

  if (fromAccount.status !== 'active') {
    throw createError(
      `Source account '${fromAccount.accountNumber}' is not active (status: '${fromAccount.status}')`,
      400
    );
  }

  if (toAccount.status !== 'active') {
    throw createError(
      `Destination account '${toAccount.accountNumber}' is not active (status: '${toAccount.status}')`,
      400
    );
  }

  const numAmount = Number(Number(amount).toFixed(2));
  const availableLimit = fromAccount.overdraftEnabled ? (fromAccount.overdraftLimit || 0) : 0;
  const maxAvailable = Number((fromAccount.balance + availableLimit).toFixed(2));

  if (numAmount > maxAvailable) {
    if (fromAccount.overdraftEnabled) {
      throw createError(
        `Transfer blocked. ${fromAccount.accountNumber} has ₹${fromAccount.balance.toFixed(2)} balance with ₹${availableLimit.toFixed(2)} overdraft (Total available: ₹${maxAvailable.toFixed(2)}).`,
        400
      );
    } else {
      throw createError(
        `Transfer blocked. ${fromAccount.accountNumber} has ₹${fromAccount.balance.toFixed(2)} available and no overdraft.`,
        400
      );
    }
  }

  // Update balances atomically
  fromAccount.balance = Number((fromAccount.balance - numAmount).toFixed(2));
  toAccount.balance = Number((toAccount.balance + numAmount).toFixed(2));

  const timestamp = store.getTimestamp();
  fromAccount.updatedAt = timestamp;
  toAccount.updatedAt = timestamp;

  // Create debit and credit records
  const debitTxnId = generateTxnId();
  const creditTxnId = `TXN-${String(parseInt(debitTxnId.replace('TXN-', ''), 10) + 1).padStart(3, '0')}`;

  const prevHash1 = store.transactions.length > 0 ? store.transactions[store.transactions.length - 1].hash : 'GENESIS';

  const debitTxn = {
    id: debitTxnId,
    accountId: fromAccount.id,
    accountNumber: fromAccount.accountNumber,
    type: 'transfer',
    direction: 'debit',
    amount: numAmount,
    balance: fromAccount.balance,
    description: description
      ? String(description).trim()
      : `Transfer to ${toAccount.accountNumber}`,
    referenceId: toAccount.id,
    counterpartyAccountNumber: toAccount.accountNumber,
    relatedTransactionId: creditTxnId,
    timestamp
  };
  debitTxn.hash = store.calculateHash(prevHash1, debitTxn);
  debitTxn.prevHash = prevHash1;

  const creditTxn = {
    id: creditTxnId,
    accountId: toAccount.id,
    accountNumber: toAccount.accountNumber,
    type: 'transfer',
    direction: 'credit',
    amount: numAmount,
    balance: toAccount.balance,
    description: description
      ? String(description).trim()
      : `Transfer from ${fromAccount.accountNumber}`,
    referenceId: fromAccount.id,
    counterpartyAccountNumber: fromAccount.accountNumber,
    relatedTransactionId: debitTxnId,
    timestamp
  };
  creditTxn.hash = store.calculateHash(debitTxn.hash, creditTxn);
  creditTxn.prevHash = debitTxn.hash;

  store.transactions.push(debitTxn);
  store.transactions.push(creditTxn);

  return {
    transferDebit: debitTxn,
    transferCredit: creditTxn,
    fromAccount: {
      id: fromAccount.id,
      accountNumber: fromAccount.accountNumber,
      balance: fromAccount.balance,
      overdraftEnabled: fromAccount.overdraftEnabled || false,
      overdraftLimit: fromAccount.overdraftLimit || 0,
      status: fromAccount.status
    },
    toAccount: {
      id: toAccount.id,
      accountNumber: toAccount.accountNumber,
      balance: toAccount.balance,
      overdraftEnabled: toAccount.overdraftEnabled || false,
      overdraftLimit: toAccount.overdraftLimit || 0,
      status: toAccount.status
    }
  };
};

/**
 * Generate full account statement with opening balance, running balances, debits, credits, and closing balance
 */
const getAccountStatement = async (accountId, filters = {}) => {
  const account = findAccount(accountId);
  if (!account) {
    throw createError(`Account '${accountId}' not found`, 404);
  }

  // All chronological transactions for this account
  const allAccountTxns = store.transactions
    .filter((t) => t.accountId === account.id)
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  const { startDate, endDate, type } = filters;
  const start = startDate ? new Date(startDate).getTime() : null;
  const end = endDate ? new Date(endDate).setHours(23, 59, 59, 999) : null;

  // Compute opening balance before startDate
  let openingBalance = 0;
  if (start) {
    for (const t of allAccountTxns) {
      const tTime = new Date(t.timestamp).getTime();
      if (tTime < start) {
        if (t.direction === 'credit') {
          openingBalance = Number((openingBalance + t.amount).toFixed(2));
        } else if (t.direction === 'debit') {
          openingBalance = Number((openingBalance - t.amount).toFixed(2));
        }
      }
    }
  }

  // Filter transactions within range
  let statementTxns = allAccountTxns.filter((t) => {
    const tTime = new Date(t.timestamp).getTime();
    if (start && tTime < start) return false;
    if (end && tTime > end) return false;
    if (type && type !== 'ALL') {
      if (t.type.toLowerCase() !== type.toLowerCase()) return false;
    }
    return true;
  });

  // Calculate running balance for each row
  let running = openingBalance;
  let totalDebits = 0;
  let totalCredits = 0;

  const rows = statementTxns.map((t) => {
    const debit = t.direction === 'debit' ? t.amount : 0;
    const credit = t.direction === 'credit' ? t.amount : 0;
    totalDebits = Number((totalDebits + debit).toFixed(2));
    totalCredits = Number((totalCredits + credit).toFixed(2));
    running = Number((running + credit - debit).toFixed(2));

    return {
      id: t.id,
      timestamp: t.timestamp,
      description: t.description,
      type: t.type,
      direction: t.direction,
      debit,
      credit,
      runningBalance: running,
      referenceId: t.referenceId,
      counterpartyAccountNumber: t.counterpartyAccountNumber || null,
      hash: t.hash || null
    };
  });

  const closingBalance = running;

  return {
    account: {
      id: account.id,
      accountNumber: account.accountNumber,
      accountType: account.accountType,
      balance: account.balance,
      overdraftEnabled: account.overdraftEnabled || false,
      overdraftLimit: account.overdraftLimit || 0,
      status: account.status
    },
    period: {
      startDate: startDate || null,
      endDate: endDate || null
    },
    openingBalance,
    totalDebits,
    totalCredits,
    closingBalance,
    transactions: rows
  };
};

module.exports = {
  getTransactionsByAccountId,
  getAllTransactions,
  getAccountStatement,
  deposit,
  withdraw,
  transfer
};
