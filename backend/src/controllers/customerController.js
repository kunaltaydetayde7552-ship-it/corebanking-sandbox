const customerService = require('../services/customerService');
const { successResponse } = require('../utils/response');

/**
 * Controller for Customer Management
 */

const getAll = async (req, res, next) => {
  try {
    const customers = await customerService.getAllCustomers();
    return successResponse(res, customers, 'Customers retrieved successfully');
  } catch (error) {
    next(error);
  }
};

const getById = async (req, res, next) => {
  try {
    const customer = await customerService.getCustomerById(req.params.id);
    return successResponse(res, customer, 'Customer retrieved successfully');
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const customer = await customerService.createCustomer(req.body);
    return successResponse(res, customer, 'Customer created successfully', 201);
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const customer = await customerService.updateCustomer(req.params.id, req.body);
    return successResponse(res, customer, 'Customer updated successfully');
  } catch (error) {
    next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    const customer = await customerService.deleteCustomer(req.params.id);
    return successResponse(res, customer, 'Customer deleted successfully');
  } catch (error) {
    next(error);
  }
};

const getAccounts = async (req, res, next) => {
  try {
    const accounts = await customerService.getCustomerAccounts(req.params.id);
    return successResponse(res, accounts, 'Customer accounts retrieved successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove,
  getAccounts
};
