const transactionService = require('../services/transactionService');
const accountService = require('../services/accountService');
const { successResponse, paginatedResponse } = require('../utils/response');

/**
 * Controller for Transaction Operations
 */

const getAll = async (req, res, next) => {
  try {
    let result = await transactionService.getAllTransactions(req.query);
    if (req.user && req.user.role === 'CUSTOMER') {
      const userCustomerId = req.user.customerId || req.user.id;
      const userAccounts = await accountService.getAccountsByCustomerId(userCustomerId);
      const userAccountIds = new Set(userAccounts.map((a) => a.id));
      const filtered = result.transactions.filter((t) => userAccountIds.has(t.accountId));
      result = {
        ...result,
        transactions: filtered,
        total: filtered.length
      };
    }
    return paginatedResponse(
      res,
      result.transactions,
      result.page,
      result.limit,
      result.total,
      'Transactions retrieved successfully'
    );
  } catch (error) {
    next(error);
  }
};

const getByAccount = async (req, res, next) => {
  try {
    const { accountId } = req.params;
    const result = await transactionService.getTransactionsByAccountId(accountId, req.query);

    const totalPages = Math.ceil(result.total / result.limit) || (result.total === 0 ? 0 : 1);
    return res.status(200).json({
      success: true,
      message: 'Account transactions retrieved successfully',
      data: result.transactions,
      account: result.account,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages,
        hasNextPage: result.page < totalPages,
        hasPrevPage: result.page > 1
      }
    });
  } catch (error) {
    next(error);
  }
};

const deposit = async (req, res, next) => {
  try {
    const { accountId, amount, description } = req.body;
    const result = await transactionService.deposit(accountId, amount, description);
    return successResponse(res, result, 'Deposit successful', 201);
  } catch (error) {
    next(error);
  }
};

const withdraw = async (req, res, next) => {
  try {
    const { accountId, amount, description } = req.body;
    const result = await transactionService.withdraw(accountId, amount, description);
    return successResponse(res, result, 'Withdrawal successful', 201);
  } catch (error) {
    next(error);
  }
};

const transfer = async (req, res, next) => {
  try {
    const { fromAccountId, toAccountId, amount, description } = req.body;
    const result = await transactionService.transfer(
      fromAccountId,
      toAccountId,
      amount,
      description
    );
    return successResponse(res, result, 'Funds transferred successfully', 201);
  } catch (error) {
    next(error);
  }
};

const getStatement = async (req, res, next) => {
  try {
    const { accountId } = req.params;
    const result = await transactionService.getAccountStatement(accountId, req.query);
    return successResponse(res, result, 'Account statement generated successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAll,
  getByAccount,
  getStatement,
  deposit,
  withdraw,
  transfer
};
