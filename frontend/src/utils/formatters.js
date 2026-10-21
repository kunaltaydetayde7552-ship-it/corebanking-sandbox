/**
 * Formats a numeric or string amount into Indian Currency format (₹ XX,XXX.XX)
 * @param {number|string} amount 
 * @returns {string}
 */
export const formatCurrency = (amount) => {
  if (amount === null || amount === undefined || isNaN(Number(amount))) {
    return '₹0.00';
  }
  const num = Number(amount);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
};

/**
 * Formats date into 'DD MMM YYYY' (e.g., 15 May 2024)
 * @param {string|Date} dateString 
 * @returns {string}
 */
export const formatDate = (dateString) => {
  if (!dateString) return '-';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return String(dateString);
  const day = d.getDate().toString().padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
};

/**
 * Formats date into 'DD MMM YYYY, HH:MM' (e.g., 15 May 2024, 14:30)
 * @param {string|Date} dateString 
 * @returns {string}
 */
export const formatDateTime = (dateString) => {
  if (!dateString) return '-';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return String(dateString);
  const datePart = formatDate(dateString);
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  return `${datePart}, ${hours}:${minutes}`;
};

/**
 * Capitalizes the first letter of a string
 * @param {string} str 
 * @returns {string}
 */
export const capitalize = (str) => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

/**
 * Returns Tailwind color classes for account/customer status
 * @param {string} status 
 * @returns {string} Tailwind classes
 */
export const getStatusColor = (status) => {
  const normalized = (status || '').toLowerCase();
  switch (normalized) {
    case 'active':
    case 'completed':
    case 'verified':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'inactive':
    case 'closed':
    case 'disabled':
      return 'bg-slate-100 text-slate-600 border-slate-200';
    case 'frozen':
    case 'blocked':
    case 'suspended':
      return 'bg-rose-50 text-rose-700 border-rose-200';
    case 'pending':
    case 'in_progress':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    default:
      return 'bg-gray-100 text-gray-700 border-gray-200';
  }
};

/**
 * Returns Tailwind color classes for transaction types
 * deposit (green), withdrawal (red), transfer (blue)
 * @param {string} type 
 * @returns {string} Tailwind classes
 */
export const getTransactionTypeColor = (type) => {
  const normalized = (type || '').toLowerCase();
  switch (normalized) {
    case 'deposit':
    case 'credit':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'withdrawal':
    case 'debit':
      return 'bg-rose-50 text-rose-700 border-rose-200';
    case 'transfer':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    default:
      return 'bg-slate-50 text-slate-700 border-slate-200';
  }
};
