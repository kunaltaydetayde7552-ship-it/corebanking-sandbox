import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Dashboard
export const getDashboardMetrics = () => api.get('/dashboard');

// Customers
export const getCustomers = () => api.get('/customers');
export const getCustomer = (id) => api.get(`/customers/${id}`);
export const createCustomer = (data) => api.post('/customers', data);
export const updateCustomer = (id, data) => api.put(`/customers/${id}`, data);
export const deleteCustomer = (id) => api.delete(`/customers/${id}`);
export const getCustomerAccounts = (id) => api.get(`/customers/${id}/accounts`);

// Accounts
export const getAccounts = () => api.get('/accounts');
export const getAccount = (id) => api.get(`/accounts/${id}`);
export const createAccount = (data) => api.post('/accounts', data);
export const updateAccountStatus = (id, status) => api.patch(`/accounts/${id}/status`, { status });
export const updateAccountOverdraft = (id, overdraftData) => api.patch(`/accounts/${id}/overdraft`, overdraftData);
export const getAccountBalance = (id) => api.get(`/accounts/${id}/balance`);

// Transactions
export const getTransactions = (params) => api.get('/transactions', { params });
export const getAccountTransactions = (accountId, params) => api.get(`/transactions/account/${accountId}`, { params });
export const getAccountStatement = (accountId, params) => api.get(`/transactions/statement/${accountId}`, { params });
export const deposit = (data) => api.post('/transactions/deposit', data);
export const withdraw = (data) => api.post('/transactions/withdraw', data);
export const transfer = (data) => api.post('/transactions/transfer', data);

// Admin
export const resetSandboxData = () => api.post('/admin/reset');

export default api;
