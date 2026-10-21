const store = require('../models/store');
const { isValidAccountType, isValidAccountStatus } = require('../utils/validators');

/**
 * Custom error helper
 */
const createError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

/**
 * Helper to attach customer data to account object
 */
const attachCustomer = (account) => {
  if (!account) return null;
  const customer = store.customers.find((c) => c.id === account.customerId);
  return {
    ...account,
    customer: customer
      ? {
          id: customer.id,
          firstName: customer.firstName,
          lastName: customer.lastName,
          email: customer.email,
          phone: customer.phone
        }
      : null
  };
};

/**
 * Generate next account ID like ACC-001, ACC-005, etc.
 */
const generateAccountId = () => {
  let maxId = 0;
  for (const a of store.accounts) {
    const match = a.id && a.id.match(/^ACC-(\d+)$/i);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxId) maxId = num;
    }
  }
  const nextNum = maxId + 1;
  return `ACC-${String(nextNum).padStart(3, '0')}`;
};

/**
 * Generate next 10-digit account number starting from 1001000005
 */
const generateAccountNumber = () => {
  let maxAccNum = 1001000004;
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

/**
 * Generate next transaction ID
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
  return `TXN-${String(maxId + 1).padStart(3, '0')}`;
};

/**
 * Get all accounts with customer details attached
 */
const getAllAccounts = async () => {
  return store.accounts.map(attachCustomer);
};

/**
 * Get account by ID with customer details
 */
const getAccountById = async (id) => {
  const account = store.accounts.find((a) => a.id === id);
  if (!account) {
    throw createError(`Account with ID '${id}' not found`, 404);
  }
  return attachCustomer(account);
};

/**
 * Get account by account number with customer details
 */
const getAccountByNumber = async (accountNumber) => {
  const account = store.accounts.find((a) => a.accountNumber === String(accountNumber).trim());
  if (!account) {
    throw createError(`Account with number '${accountNumber}' not found`, 404);
  }
  return attachCustomer(account);
};

/**
 * Create a new account
 */
const createAccount = async (data) => {
  const { customerId, accountType, initialBalance = 0 } = data || {};

  if (!customerId) {
    throw createError('customerId is required');
  }

  // Validate customer existence
  const customer = store.customers.find((c) => c.id === customerId);
  if (!customer) {
    throw createError(`Customer with ID '${customerId}' not found`, 404);
  }

  // Validate account type
  if (!accountType || !isValidAccountType(accountType)) {
    throw createError("Invalid account type. Allowed types are 'savings' or 'current'");
  }

  // Validate initial balance
  const parsedInitialBalance = Number(initialBalance);
  if (isNaN(parsedInitialBalance) || parsedInitialBalance < 0) {
    throw createError('Initial balance must be a non-negative number');
  }

  const roundedBalance = Number(parsedInitialBalance.toFixed(2));
  const newId = generateAccountId();
  const newAccountNumber = generateAccountNumber();
  const timestamp = store.getTimestamp();

  const newAccount = {
    id: newId,
    customerId,
    accountNumber: newAccountNumber,
    accountType: accountType.trim().toLowerCase(),
    balance: roundedBalance,
    overdraftEnabled: Boolean(data.overdraftEnabled),
    overdraftLimit: data.overdraftEnabled ? Number(data.overdraftLimit || 0) : 0,
    status: 'active',
    createdAt: timestamp
  };

  store.accounts.push(newAccount);

  // If initial balance > 0, record initial deposit transaction
  if (roundedBalance > 0) {
    const txnId = generateTxnId();
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
      timestamp
    };
    const hash = store.calculateHash(prevHash, txnData);
    store.transactions.push({ ...txnData, prevHash, hash });
  }

  return attachCustomer(newAccount);
};

/**
 * Update account status ('active', 'inactive', 'frozen')
 */
const updateAccountStatus = async (id, status) => {
  const account = store.accounts.find((a) => a.id === id);
  if (!account) {
    throw createError(`Account with ID '${id}' not found`, 404);
  }

  if (!status || !isValidAccountStatus(status)) {
    throw createError("Invalid status. Allowed values are 'active', 'inactive', or 'frozen'");
  }

  account.status = status.trim().toLowerCase();
  account.updatedAt = store.getTimestamp();

  return attachCustomer(account);
};

/**
 * Update account overdraft settings (Admin only)
 */
const updateOverdraft = async (id, overdraftData = {}) => {
  const account = store.accounts.find((a) => a.id === id);
  if (!account) {
    throw createError(`Account with ID '${id}' not found`, 404);
  }

  const { overdraftEnabled, overdraftLimit } = overdraftData;
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
  return attachCustomer(account);
};

/**
 * Get account balance details
 */
const getAccountBalance = async (id) => {
  const account = store.accounts.find((a) => a.id === id);
  if (!account) {
    throw createError(`Account with ID '${id}' not found`, 404);
  }

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
  getAccountByNumber,
  createAccount,
  updateAccountStatus,
  updateOverdraft,
  getAccountBalance
};
