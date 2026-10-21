const store = require('../models/store');
const { isValidEmail, isValidPhone } = require('../utils/validators');

/**
 * Custom error helper with status code
 */
const createError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

/**
 * Generate next customer ID like CUST-001, CUST-004, etc.
 */
const generateCustomerId = () => {
  let maxId = 0;
  for (const c of store.customers) {
    const match = c.id && c.id.match(/^CUST-(\d+)$/i);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxId) maxId = num;
    }
  }
  const nextNum = maxId + 1;
  return `CUST-${String(nextNum).padStart(3, '0')}`;
};

/**
 * Get all customers sorted by createdAt desc
 */
const getAllCustomers = async () => {
  return [...store.customers].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
};

/**
 * Get customer by ID
 */
const getCustomerById = async (id) => {
  const customer = store.customers.find((c) => c.id === id);
  if (!customer) {
    throw createError(`Customer with ID '${id}' not found`, 404);
  }
  return customer;
};

/**
 * Create a new customer
 */
const createCustomer = async (data) => {
  const { firstName, lastName, email, phone, address, dateOfBirth } = data || {};

  if (!firstName || !String(firstName).trim()) {
    throw createError('First name is required');
  }
  if (!lastName || !String(lastName).trim()) {
    throw createError('Last name is required');
  }
  if (!email || !isValidEmail(email)) {
    throw createError('A valid email address is required');
  }
  if (!phone || !isValidPhone(phone)) {
    throw createError('A valid 10-digit phone number is required');
  }

  const normalizedEmail = email.trim().toLowerCase();
  const emailExists = store.customers.some(
    (c) => c.email && c.email.toLowerCase() === normalizedEmail
  );
  if (emailExists) {
    throw createError(`Customer with email '${normalizedEmail}' already exists`, 409);
  }

  const newCustomer = {
    id: generateCustomerId(),
    firstName: String(firstName).trim(),
    lastName: String(lastName).trim(),
    email: normalizedEmail,
    phone: String(phone).trim(),
    address: address ? String(address).trim() : '',
    dateOfBirth: dateOfBirth ? String(dateOfBirth).trim() : '',
    createdAt: store.getTimestamp()
  };

  store.customers.push(newCustomer);
  return newCustomer;
};

/**
 * Update an existing customer
 */
const updateCustomer = async (id, data) => {
  const index = store.customers.findIndex((c) => c.id === id);
  if (index === -1) {
    throw createError(`Customer with ID '${id}' not found`, 404);
  }

  const current = store.customers[index];
  const { firstName, lastName, email, phone, address, dateOfBirth } = data || {};

  if (email !== undefined) {
    if (!isValidEmail(email)) {
      throw createError('A valid email address is required');
    }
    const normalizedEmail = email.trim().toLowerCase();
    const emailConflict = store.customers.some(
      (c) => c.id !== id && c.email && c.email.toLowerCase() === normalizedEmail
    );
    if (emailConflict) {
      throw createError(`Customer with email '${normalizedEmail}' already exists`, 409);
    }
  }

  if (phone !== undefined && !isValidPhone(phone)) {
    throw createError('A valid 10-digit phone number is required');
  }

  const updatedCustomer = {
    ...current,
    firstName: firstName !== undefined ? String(firstName).trim() : current.firstName,
    lastName: lastName !== undefined ? String(lastName).trim() : current.lastName,
    email: email !== undefined ? email.trim().toLowerCase() : current.email,
    phone: phone !== undefined ? String(phone).trim() : current.phone,
    address: address !== undefined ? String(address).trim() : current.address,
    dateOfBirth: dateOfBirth !== undefined ? String(dateOfBirth).trim() : current.dateOfBirth,
    updatedAt: store.getTimestamp()
  };

  store.customers[index] = updatedCustomer;
  return updatedCustomer;
};

/**
 * Delete a customer
 * Must check that customer has no active accounts before deleting
 */
const deleteCustomer = async (id) => {
  const index = store.customers.findIndex((c) => c.id === id);
  if (index === -1) {
    throw createError(`Customer with ID '${id}' not found`, 404);
  }

  // Check for active accounts
  const activeAccounts = store.accounts.filter(
    (a) => a.customerId === id && a.status === 'active'
  );
  if (activeAccounts.length > 0) {
    throw createError(
      `Cannot delete customer with active accounts (${activeAccounts.length} active account(s) found). Please close or freeze accounts first.`,
      400
    );
  }

  // Remove customer
  const [deletedCustomer] = store.customers.splice(index, 1);
  return deletedCustomer;
};

/**
 * Get all accounts belonging to a customer
 */
const getCustomerAccounts = async (customerId) => {
  // Verify customer exists
  const customer = store.customers.find((c) => c.id === customerId);
  if (!customer) {
    throw createError(`Customer with ID '${customerId}' not found`, 404);
  }

  return store.accounts.filter((a) => a.customerId === customerId);
};

module.exports = {
  getAllCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getCustomerAccounts
};
