# API Documentation - CoreBanking Sandbox

> **Production Live Base URL:** `https://corebanking-sandbox.onrender.com/api`  
> **Local Development Base URL:** `http://localhost:5000/api`  
> **Content-Type:** `application/json`  
> **Authentication:** None (Sandbox Environment)

---

## Standard Response Format

All responses from the CoreBanking Sandbox API follow a consistent JSON envelope:

### Standard Success Response Structure
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation completed successfully"
}
```

### Standard Error Response Structure
```json
{
  "success": false,
  "message": "Descriptive error message explaining failure reason"
}
```

---

## Endpoint Index

| Group | Method | Endpoint | Description |
| :--- | :--- | :--- | :--- |
| **Dashboard** | `GET` | `/api/dashboard` | Fetch bank aggregated metrics and recent activity |
| **Customers** | `GET` | `/api/customers` | Retrieve all registered customers |
| | `GET` | `/api/customers/:id` | Retrieve single customer by ID |
| | `POST` | `/api/customers` | Register a new customer |
| | `PUT` | `/api/customers/:id` | Update customer personal & contact information |
| | `DELETE` | `/api/customers/:id` | Remove customer (only if zero active accounts) |
| | `GET` | `/api/customers/:id/accounts` | Fetch all accounts owned by customer |
| **Accounts** | `GET` | `/api/accounts` | Retrieve list of all bank accounts |
| | `GET` | `/api/accounts/:id` | Retrieve single account by ID |
| | `POST` | `/api/accounts` | Open a new bank account |
| | `PATCH` | `/api/accounts/:id/status` | Update account status (`active`, `inactive`, `frozen`) |
| | `GET` | `/api/accounts/:id/balance` | Query real-time account balance |
| **Transactions** | `GET` | `/api/transactions` | Query all transactions with filters & pagination |
| | `GET` | `/api/transactions/account/:accountId` | Retrieve transaction statement for an account |
| | `POST` | `/api/transactions/deposit` | Deposit funds into an account |
| | `POST` | `/api/transactions/withdraw` | Withdraw funds from an account |
| | `POST` | `/api/transactions/transfer` | Transfer funds between two accounts |

---

## 1. Dashboard Endpoints

### 1.1 Get Dashboard Metrics
- **HTTP Method:** `GET`
- **Path:** `/api/dashboard`
- **Description:** Returns aggregate bank-wide metrics including total customers, total accounts, total available liquidity across accounts, total transaction volume, and the 5 most recent transactions.

#### Example Request
```bash
curl -X GET http://localhost:5000/api/dashboard
```

#### Success Response (HTTP 200 OK)
```json
{
  "success": true,
  "data": {
    "totalCustomers": 3,
    "totalAccounts": 4,
    "totalBalance": 270000,
    "totalTransactions": 6,
    "accountDistribution": {
      "savings": 3,
      "current": 1
    },
    "accountStatusDistribution": {
      "active": 3,
      "inactive": 0,
      "frozen": 1
    },
    "recentTransactions": [
      {
        "id": "TXN-3006",
        "type": "TRANSFER",
        "accountId": "ACC-2001",
        "toAccountId": "ACC-2003",
        "amount": 5000,
        "balanceAfter": 50000,
        "description": "Family support transfer",
        "status": "COMPLETED",
        "timestamp": "2026-10-10T14:30:00.000Z"
      }
    ]
  },
  "message": "Dashboard metrics retrieved successfully"
}
```

#### Error Response (HTTP 500 Internal Server Error)
```json
{
  "success": false,
  "message": "Failed to calculate dashboard metrics"
}
```

#### Notes
- Balances are rounded to 2 decimal places.
- `recentTransactions` is capped at the 5 most recent records.

---

## 2. Customer Endpoints

### 2.1 List All Customers
- **HTTP Method:** `GET`
- **Path:** `/api/customers`
- **Description:** Retrieves all customer records in the bank directory.

#### Example Request
```bash
curl -X GET http://localhost:5000/api/customers
```

#### Success Response (HTTP 200 OK)
```json
{
  "success": true,
  "data": [
    {
      "id": "CUST-1001",
      "firstName": "Rajesh",
      "lastName": "Sharma",
      "email": "rajesh.sharma@example.com",
      "phone": "+91 98765 43210",
      "address": "Flat 402, Greenfield Heights, Mumbai",
      "dateOfBirth": "1988-06-15",
      "createdAt": "2026-09-01T10:00:00.000Z"
    },
    {
      "id": "CUST-1002",
      "firstName": "Priya",
      "lastName": "Patel",
      "email": "priya.patel@example.com",
      "phone": "+91 98765 12345",
      "address": "15 Lotus Colony, Ahmedabad",
      "dateOfBirth": "1993-11-20",
      "createdAt": "2026-09-05T11:30:00.000Z"
    }
  ],
  "message": "Customers retrieved successfully"
}
```

---

### 2.2 Get Customer By ID
- **HTTP Method:** `GET`
- **Path:** `/api/customers/:id`
- **Description:** Retrieves a specific customer profile by their unique identifier (`CUST-XXXX`).

#### Parameters
- **Path Parameter:** `id` (string, required) - Unique Customer ID (e.g., `CUST-1001`).

#### Example Request
```bash
curl -X GET http://localhost:5000/api/customers/CUST-1001
```

#### Success Response (HTTP 200 OK)
```json
{
  "success": true,
  "data": {
    "id": "CUST-1001",
    "firstName": "Rajesh",
    "lastName": "Sharma",
    "email": "rajesh.sharma@example.com",
    "phone": "+91 98765 43210",
    "address": "Flat 402, Greenfield Heights, Mumbai",
    "dateOfBirth": "1988-06-15",
    "createdAt": "2026-09-01T10:00:00.000Z"
  },
  "message": "Customer retrieved successfully"
}
```

#### Error Response (HTTP 404 Not Found)
```json
{
  "success": false,
  "message": "Customer with ID CUST-9999 not found"
}
```

---

### 2.3 Create Customer
- **HTTP Method:** `POST`
- **Path:** `/api/customers`
- **Description:** Onboards a new retail banking customer. Enforces email uniqueness and validates all mandatory profile parameters.

#### Request Body
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `firstName` | string | **Yes** | Customer's first name (1-50 chars) |
| `lastName` | string | **Yes** | Customer's last name (1-50 chars) |
| `email` | string | **Yes** | Unique valid email address |
| `phone` | string | **Yes** | Contact telephone number |
| `address` | string | **Yes** | Physical mailing address |
| `dateOfBirth` | string | **Yes** | Date of birth in `YYYY-MM-DD` format |

#### Example Request
```bash
curl -X POST http://localhost:5000/api/customers \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Ananya",
    "lastName": "Roy",
    "email": "ananya.roy@example.com",
    "phone": "+91 98220 11223",
    "address": "12 Brigade Road, Bengaluru",
    "dateOfBirth": "1995-04-12"
  }'
```

#### Success Response (HTTP 201 Created)
```json
{
  "success": true,
  "data": {
    "id": "CUST-1004",
    "firstName": "Ananya",
    "lastName": "Roy",
    "email": "ananya.roy@example.com",
    "phone": "+91 98220 11223",
    "address": "12 Brigade Road, Bengaluru",
    "dateOfBirth": "1995-04-12",
    "createdAt": "2026-10-13T17:05:00.000Z"
  },
  "message": "Customer created successfully"
}
```

#### Error Response - Duplicate Email (HTTP 400 Bad Request)
```json
{
  "success": false,
  "message": "A customer with email 'ananya.roy@example.com' already exists"
}
```

#### Error Response - Missing Fields (HTTP 400 Bad Request)
```json
{
  "success": false,
  "message": "Missing required field: dateOfBirth"
}
```

---

### 2.4 Update Customer
- **HTTP Method:** `PUT`
- **Path:** `/api/customers/:id`
- **Description:** Modifies existing customer attributes. Customer ID and creation timestamp remain immutable.

#### Request Body (All fields optional)
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `firstName` | string | No | Updated first name |
| `lastName` | string | No | Updated last name |
| `email` | string | No | Updated email (must not collide with another customer) |
| `phone` | string | No | Updated telephone number |
| `address` | string | No | Updated residential address |
| `dateOfBirth` | string | No | Updated DOB (`YYYY-MM-DD`) |

#### Example Request
```bash
curl -X PUT http://localhost:5000/api/customers/CUST-1001 \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+91 98765 99999",
    "address": "Penthouse 10, Sky Towers, Mumbai"
  }'
```

#### Success Response (HTTP 200 OK)
```json
{
  "success": true,
  "data": {
    "id": "CUST-1001",
    "firstName": "Rajesh",
    "lastName": "Sharma",
    "email": "rajesh.sharma@example.com",
    "phone": "+91 98765 99999",
    "address": "Penthouse 10, Sky Towers, Mumbai",
    "dateOfBirth": "1988-06-15",
    "createdAt": "2026-09-01T10:00:00.000Z",
    "updatedAt": "2026-10-13T17:10:00.000Z"
  },
  "message": "Customer updated successfully"
}
```

#### Error Response (HTTP 404 Not Found)
```json
{
  "success": false,
  "message": "Customer with ID CUST-9999 not found"
}
```

---

### 2.5 Delete Customer
- **HTTP Method:** `DELETE`
- **Path:** `/api/customers/:id`
- **Description:** Deletes a customer profile. **Strict Guard:** Rejects deletion if the customer has any associated accounts with status `active` or non-zero balances.

#### Example Request
```bash
curl -X DELETE http://localhost:5000/api/customers/CUST-1001
```

#### Error Response - Active Accounts Exist (HTTP 400 Bad Request)
```json
{
  "success": false,
  "message": "Cannot delete customer CUST-1001: Customer has active accounts (ACC-2001, ACC-2002)"
}
```

#### Success Response (HTTP 200 OK - Customer has no active accounts)
```json
{
  "success": true,
  "data": {
    "id": "CUST-1004"
  },
  "message": "Customer deleted successfully"
}
```

---

### 2.6 Get Customer's Accounts
- **HTTP Method:** `GET`
- **Path:** `/api/customers/:id/accounts`
- **Description:** Fetches all bank accounts belonging to a specific customer.

#### Example Request
```bash
curl -X GET http://localhost:5000/api/customers/CUST-1001/accounts
```

#### Success Response (HTTP 200 OK)
```json
{
  "success": true,
  "data": [
    {
      "id": "ACC-2001",
      "customerId": "CUST-1001",
      "accountType": "savings",
      "balance": 50000,
      "currency": "INR",
      "status": "active",
      "createdAt": "2026-09-01T10:05:00.000Z"
    },
    {
      "id": "ACC-2002",
      "customerId": "CUST-1001",
      "accountType": "current",
      "balance": 120000,
      "currency": "INR",
      "status": "active",
      "createdAt": "2026-09-02T11:15:00.000Z"
    }
  ],
  "message": "Customer accounts retrieved successfully"
}
```

---

## 3. Account Endpoints

### 3.1 List All Accounts
- **HTTP Method:** `GET`
- **Path:** `/api/accounts`
- **Description:** Retrieves all bank accounts across the institution with populated customer names.

#### Example Request
```bash
curl -X GET http://localhost:5000/api/accounts
```

#### Success Response (HTTP 200 OK)
```json
{
  "success": true,
  "data": [
    {
      "id": "ACC-2001",
      "customerId": "CUST-1001",
      "customerName": "Rajesh Sharma",
      "accountType": "savings",
      "balance": 50000,
      "currency": "INR",
      "status": "active",
      "createdAt": "2026-09-01T10:05:00.000Z"
    },
    {
      "id": "ACC-2004",
      "customerId": "CUST-1003",
      "customerName": "Amit Verma",
      "accountType": "savings",
      "balance": 15000,
      "currency": "INR",
      "status": "frozen",
      "createdAt": "2026-09-10T16:00:00.000Z"
    }
  ],
  "message": "Accounts retrieved successfully"
}
```

---

### 3.2 Get Account By ID
- **HTTP Method:** `GET`
- **Path:** `/api/accounts/:id`
- **Description:** Retrieves full account details for a specific Account ID.

#### Example Request
```bash
curl -X GET http://localhost:5000/api/accounts/ACC-2001
```

#### Success Response (HTTP 200 OK)
```json
{
  "success": true,
  "data": {
    "id": "ACC-2001",
    "customerId": "CUST-1001",
    "customerName": "Rajesh Sharma",
    "accountType": "savings",
    "balance": 50000,
    "currency": "INR",
    "status": "active",
    "createdAt": "2026-09-01T10:05:00.000Z"
  },
  "message": "Account retrieved successfully"
}
```

#### Error Response (HTTP 404 Not Found)
```json
{
  "success": false,
  "message": "Account with ID ACC-9999 not found"
}
```

---

### 3.3 Create Account
- **HTTP Method:** `POST`
- **Path:** `/api/accounts`
- **Description:** Opens a new bank account linked to an existing customer. If `initialDeposit` is provided and greater than 0, an opening deposit transaction is recorded immediately.

#### Request Body
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `customerId` | string | **Yes** | ID of registered customer (e.g., `CUST-1001`) |
| `accountType` | string | **Yes** | Either `"savings"` or `"current"` |
| `initialDeposit`| number | No | Opening deposit amount (default: `0`, must be `>= 0`) |

#### Example Request
```bash
curl -X POST http://localhost:5000/api/accounts \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "CUST-1001",
    "accountType": "savings",
    "initialDeposit": 15000
  }'
```

#### Success Response (HTTP 201 Created)
```json
{
  "success": true,
  "data": {
    "id": "ACC-2005",
    "customerId": "CUST-1001",
    "accountType": "savings",
    "balance": 15000,
    "currency": "INR",
    "status": "active",
    "createdAt": "2026-10-13T17:20:00.000Z"
  },
  "message": "Account opened successfully"
}
```

#### Error Response - Customer Not Found (HTTP 404 Not Found)
```json
{
  "success": false,
  "message": "Cannot open account: Customer with ID CUST-9999 not found"
}
```

#### Error Response - Invalid Type (HTTP 400 Bad Request)
```json
{
  "success": false,
  "message": "Invalid accountType. Allowed types: 'savings', 'current'"
}
```

---

### 3.4 Update Account Status
- **HTTP Method:** `PATCH`
- **Path:** `/api/accounts/:id/status`
- **Description:** Updates the operational state of an account. Can freeze, inactivate, or reactivate accounts.

#### Request Body
| Field | Type | Required | Allowed Values |
| :--- | :--- | :--- | :--- |
| `status` | string | **Yes** | `"active"`, `"inactive"`, `"frozen"` |

#### Example Request
```bash
curl -X PATCH http://localhost:5000/api/accounts/ACC-2001/status \
  -H "Content-Type: application/json" \
  -d '{
    "status": "frozen"
  }'
```

#### Success Response (HTTP 200 OK)
```json
{
  "success": true,
  "data": {
    "id": "ACC-2001",
    "status": "frozen",
    "updatedAt": "2026-10-13T17:25:00.000Z"
  },
  "message": "Account status updated to 'frozen'"
}
```

#### Error Response - Invalid Status Value (HTTP 400 Bad Request)
```json
{
  "success": false,
  "message": "Invalid status 'suspended'. Must be one of: 'active', 'inactive', 'frozen'"
}
```

---

### 3.5 Get Account Balance
- **HTTP Method:** `GET`
- **Path:** `/api/accounts/:id/balance`
- **Description:** Fast balance inquiry endpoint returning current funds and status.

#### Example Request
```bash
curl -X GET http://localhost:5000/api/accounts/ACC-2001/balance
```

#### Success Response (HTTP 200 OK)
```json
{
  "success": true,
  "data": {
    "accountId": "ACC-2001",
    "customerName": "Rajesh Sharma",
    "accountType": "savings",
    "balance": 50000,
    "currency": "INR",
    "status": "active",
    "asOf": "2026-10-13T17:30:00.000Z"
  },
  "message": "Account balance retrieved successfully"
}
```

---

## 4. Transaction Endpoints

### 4.1 List All Transactions
- **HTTP Method:** `GET`
- **Path:** `/api/transactions`
- **Description:** Retrieves paginated transaction records with optional query filtering by type and date range.

#### Query Parameters
| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `type` | string | No | `all` | Filter by `DEPOSIT`, `WITHDRAWAL`, `TRANSFER` |
| `startDate` | string | No | - | ISO date string lower boundary (e.g. `2026-09-01`) |
| `endDate` | string | No | - | ISO date string upper boundary (e.g. `2026-10-31`) |
| `page` | number | No | `1` | Page number for pagination |
| `limit` | number | No | `10` | Number of records per page (max 100) |

#### Example Request
```bash
curl -X GET "http://localhost:5000/api/transactions?type=TRANSFER&page=1&limit=5"
```

#### Success Response (HTTP 200 OK)
```json
{
  "success": true,
  "data": {
    "transactions": [
      {
        "id": "TXN-3006",
        "type": "TRANSFER",
        "accountId": "ACC-2001",
        "toAccountId": "ACC-2003",
        "amount": 5000,
        "balanceAfter": 50000,
        "description": "Family support transfer",
        "status": "COMPLETED",
        "timestamp": "2026-10-10T14:30:00.000Z"
      }
    ],
    "pagination": {
      "totalRecords": 1,
      "page": 1,
      "limit": 5,
      "totalPages": 1
    }
  },
  "message": "Transactions retrieved successfully"
}
```

---

### 4.2 Get Transactions By Account
- **HTTP Method:** `GET`
- **Path:** `/api/transactions/account/:accountId`
- **Description:** Retrieves all transaction history records associated with a given account (either as source or destination).

#### Example Request
```bash
curl -X GET http://localhost:5000/api/transactions/account/ACC-2001
```

#### Success Response (HTTP 200 OK)
```json
{
  "success": true,
  "data": [
    {
      "id": "TXN-3001",
      "type": "DEPOSIT",
      "accountId": "ACC-2001",
      "toAccountId": null,
      "amount": 50000,
      "balanceAfter": 50000,
      "description": "Initial account opening deposit",
      "status": "COMPLETED",
      "timestamp": "2026-09-01T10:05:00.000Z"
    },
    {
      "id": "TXN-3006",
      "type": "TRANSFER",
      "accountId": "ACC-2001",
      "toAccountId": "ACC-2003",
      "amount": 5000,
      "balanceAfter": 50000,
      "description": "Family support transfer",
      "status": "COMPLETED",
      "timestamp": "2026-10-10T14:30:00.000Z"
    }
  ],
  "message": "Account transaction statement retrieved successfully"
}
```

---

### 4.3 Make Cash Deposit
- **HTTP Method:** `POST`
- **Path:** `/api/transactions/deposit`
- **Description:** Credits cash funds to an active account.

#### Request Body
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `accountId` | string | **Yes** | Target account ID (e.g., `ACC-2001`) |
| `amount` | number | **Yes** | Monetary deposit amount (must be `> 0`) |
| `description`| string | No | Transaction memo/purpose |

#### Example Request
```bash
curl -X POST http://localhost:5000/api/transactions/deposit \
  -H "Content-Type: application/json" \
  -d '{
    "accountId": "ACC-2001",
    "amount": 10000,
    "description": "Cheque deposit"
  }'
```

#### Success Response (HTTP 200 OK)
```json
{
  "success": true,
  "data": {
    "transactionId": "TXN-3007",
    "accountId": "ACC-2001",
    "type": "DEPOSIT",
    "amount": 10000,
    "balanceBefore": 50000,
    "balanceAfter": 60000,
    "description": "Cheque deposit",
    "timestamp": "2026-10-13T17:35:00.000Z"
  },
  "message": "Deposit of 10000 processed successfully"
}
```

#### Error Response - Frozen Account (HTTP 400 Bad Request)
```json
{
  "success": false,
  "message": "Transaction rejected: Account ACC-2004 is frozen"
}
```

#### Error Response - Invalid Amount (HTTP 400 Bad Request)
```json
{
  "success": false,
  "message": "Deposit amount must be greater than zero"
}
```

---

### 4.4 Make Cash Withdrawal
- **HTTP Method:** `POST`
- **Path:** `/api/transactions/withdraw`
- **Description:** Debits cash funds from an active account. Rejects if available balance is insufficient.

#### Request Body
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `accountId` | string | **Yes** | Source account ID (e.g., `ACC-2001`) |
| `amount` | number | **Yes** | Monetary withdrawal amount (must be `> 0`) |
| `description`| string | No | Transaction memo |

#### Example Request
```bash
curl -X POST http://localhost:5000/api/transactions/withdraw \
  -H "Content-Type: application/json" \
  -d '{
    "accountId": "ACC-2001",
    "amount": 5000,
    "description": "ATM cash withdrawal"
  }'
```

#### Success Response (HTTP 200 OK)
```json
{
  "success": true,
  "data": {
    "transactionId": "TXN-3008",
    "accountId": "ACC-2001",
    "type": "WITHDRAWAL",
    "amount": 5000,
    "balanceBefore": 60000,
    "balanceAfter": 55000,
    "description": "ATM cash withdrawal",
    "timestamp": "2026-10-13T17:40:00.000Z"
  },
  "message": "Withdrawal of 5000 processed successfully"
}
```

#### Error Response - Insufficient Balance (HTTP 400 Bad Request)
```json
{
  "success": false,
  "message": "Insufficient funds in account ACC-2001. Available: 55000, Requested: 100000"
}
```

---

### 4.5 Make Fund Transfer
- **HTTP Method:** `POST`
- **Path:** `/api/transactions/transfer`
- **Description:** Performs atomic fund transfer from source account (`fromAccountId`) to destination account (`toAccountId`). Debits source and credits destination in a single consistent operation.

#### Request Body
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `fromAccountId` | string | **Yes** | Debited source account ID |
| `toAccountId` | string | **Yes** | Credited target account ID |
| `amount` | number | **Yes** | Transfer amount (must be `> 0`) |
| `description` | string | No | Transaction memo |

#### Example Request
```bash
curl -X POST http://localhost:5000/api/transactions/transfer \
  -H "Content-Type: application/json" \
  -d '{
    "fromAccountId": "ACC-2001",
    "toAccountId": "ACC-2003",
    "amount": 15000,
    "description": "Vendor invoice settlement"
  }'
```

#### Success Response (HTTP 200 OK)
```json
{
  "success": true,
  "data": {
    "transactionId": "TXN-3009",
    "type": "TRANSFER",
    "fromAccountId": "ACC-2001",
    "toAccountId": "ACC-2003",
    "amount": 15000,
    "fromBalanceAfter": 40000,
    "toBalanceAfter": 100000,
    "description": "Vendor invoice settlement",
    "timestamp": "2026-10-13T17:45:00.000Z"
  },
  "message": "Transfer of 15000 from ACC-2001 to ACC-2003 completed successfully"
}
```

#### Error Response - Same Account Transfer (HTTP 400 Bad Request)
```json
{
  "success": false,
  "message": "Source and destination accounts cannot be the same"
}
```

#### Error Response - Target Account Frozen (HTTP 400 Bad Request)
```json
{
  "success": false,
  "message": "Destination account ACC-2004 is frozen. Transfer rejected"
}
```

---

## 5. HTTP Status Code Summary

| Status Code | Meaning in CoreBanking Sandbox |
| :--- | :--- |
| **200 OK** | The request completed successfully and data is returned. |
| **201 Created** | A new entity (Customer or Account) was successfully provisioned. |
| **400 Bad Request** | Invariant violation (e.g. insufficient funds, duplicate email, negative amount, self-transfer). |
| **404 Not Found** | The specified entity ID does not exist in the in-memory store. |
| **500 Server Error** | Unexpected server execution exception. |
