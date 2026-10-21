/**
 * Validation Helper Utilities
 */

/**
 * Validates email format using regex
 * @param {string} email
 * @returns {boolean}
 */
const isValidEmail = (email) => {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
};

/**
 * Validates 10-digit phone number
 * @param {string|number} phone
 * @returns {boolean}
 */
const isValidPhone = (phone) => {
  if (!phone) return false;
  const phoneStr = String(phone).trim();
  const phoneRegex = /^\d{10}$/;
  return phoneRegex.test(phoneStr);
};

/**
 * Checks if value is a valid positive number (> 0)
 * @param {any} num
 * @returns {boolean}
 */
const isPositiveNumber = (num) => {
  if (num === null || num === undefined || num === '') return false;
  const parsed = Number(num);
  return !isNaN(parsed) && isFinite(parsed) && parsed > 0;
};

/**
 * Validates account type ('savings' | 'current')
 * @param {string} type
 * @returns {boolean}
 */
const isValidAccountType = (type) => {
  if (!type || typeof type !== 'string') return false;
  return ['savings', 'current'].includes(type.trim().toLowerCase());
};

/**
 * Validates transaction type ('deposit' | 'withdrawal' | 'transfer')
 * @param {string} type
 * @returns {boolean}
 */
const isValidTransactionType = (type) => {
  if (!type || typeof type !== 'string') return false;
  return ['deposit', 'withdrawal', 'transfer'].includes(type.trim().toLowerCase());
};

/**
 * Validates account status ('active' | 'inactive' | 'frozen')
 * @param {string} status
 * @returns {boolean}
 */
const isValidAccountStatus = (status) => {
  if (!status || typeof status !== 'string') return false;
  return ['active', 'inactive', 'frozen'].includes(status.trim().toLowerCase());
};

module.exports = {
  isValidEmail,
  isValidPhone,
  isPositiveNumber,
  isValidAccountType,
  isValidTransactionType,
  isValidAccountStatus
};
