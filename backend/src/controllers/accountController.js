const accountService = require('../services/accountService');
const { successResponse } = require('../utils/response');

/**
 * Controller for Account Management
 */

const getAll = async (req, res, next) => {
  try {
    let accounts = await accountService.getAllAccounts();
    if (req.user && req.user.role === 'CUSTOMER') {
      const userCustomerId = req.user.customerId || req.user.id;
      accounts = accounts.filter((a) => a.customerId === userCustomerId);
    }
    return successResponse(res, accounts, 'Accounts retrieved successfully');
  } catch (error) {
    next(error);
  }
};

const getById = async (req, res, next) => {
  try {
    const account = await accountService.getAccountById(req.params.id);
    return successResponse(res, account, 'Account retrieved successfully');
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    if (req.user && req.user.role === 'CUSTOMER') {
      const userCustomerId = req.user.customerId || req.user.id;
      if (req.body.customerId && req.body.customerId !== userCustomerId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: You cannot create accounts for other customers'
        });
      }
      req.body.customerId = userCustomerId;
    }
    const newAccount = await accountService.createAccount(req.body);
    return successResponse(res, newAccount, 'Account created successfully', 201);
  } catch (error) {
    next(error);
  }
};

const updateStatus = async (req, res, next) => {
  try {
    if (req.user && req.user.role === 'CUSTOMER') {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Customer cannot modify account status'
      });
    }
    const { status } = req.body;
    const updatedAccount = await accountService.updateAccountStatus(req.params.id, status);
    return successResponse(res, updatedAccount, 'Account status updated successfully');
  } catch (error) {
    next(error);
  }
};

const updateOverdraft = async (req, res, next) => {
  try {
    if (req.user && req.user.role === 'CUSTOMER') {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Customer cannot modify overdraft settings'
      });
    }
    const updatedAccount = await accountService.updateOverdraft(req.params.id, req.body);
    return successResponse(res, updatedAccount, 'Account overdraft settings updated successfully');
  } catch (error) {
    next(error);
  }
};

const getBalance = async (req, res, next) => {
  try {
    const balanceInfo = await accountService.getAccountBalance(req.params.id);
    return successResponse(res, balanceInfo, 'Account balance retrieved successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAll,
  getById,
  create,
  updateStatus,
  updateOverdraft,
  getBalance
};
