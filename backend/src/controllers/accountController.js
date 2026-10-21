const accountService = require('../services/accountService');
const { successResponse } = require('../utils/response');

/**
 * Controller for Account Management
 */

const getAll = async (req, res, next) => {
  try {
    const accounts = await accountService.getAllAccounts();
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
    const newAccount = await accountService.createAccount(req.body);
    return successResponse(res, newAccount, 'Account created successfully', 201);
  } catch (error) {
    next(error);
  }
};

const updateStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const updatedAccount = await accountService.updateAccountStatus(req.params.id, status);
    return successResponse(res, updatedAccount, 'Account status updated successfully');
  } catch (error) {
    next(error);
  }
};

const updateOverdraft = async (req, res, next) => {
  try {
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
