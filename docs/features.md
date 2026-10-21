# Features Specification - CoreBanking Sandbox

> **Project ID:** PST_PD_153  
> **Platform:** CoreBanking Sandbox  
> **Document Purpose:** Complete technical & functional feature manual

---

## Table of Contents
1. [Feature 1: Dashboard Overview](#feature-1-dashboard-overview)
2. [Feature 2: Customer Management](#feature-2-customer-management)
3. [Feature 3: Account Management](#feature-3-account-management)
4. [Feature 4: Transaction Processing](#feature-4-transaction-processing)
5. [Feature 5: Balance Inquiry](#feature-5-balance-inquiry)
6. [Feature 6: Transaction History & Audit Ledger](#feature-6-transaction-history--audit-ledger)

---

## Feature 1: Dashboard Overview

### 1. Purpose
Provides banking administrators and tellers with a unified command-center view of the entire bank's operational health, volume metrics, liquidity status, and recent transactional activity.

### 2. How It Works
- **Frontend:**
  - Upon loading `/` or `/dashboard`, triggers an asynchronous `GET /api/dashboard` request.
  - Displays four high-visibility metric cards:
    - **Total Customers** (active customer count)
    - **Total Accounts** (all accounts in system)
    - **Total Balance** (sum of all liquid balances across active and frozen accounts)
    - **Total Transactions** (cumulative count of processed transactions)
  - Visualizes account type distribution (e.g. Ratio of Savings vs Current accounts) and account status breakdown (`active`, `inactive`, `frozen`).
  - Renders a live "Recent Activity" table showing the latest 5 transactions with status indicators, timestamps, and formatted monetary values.
- **Backend:**
  - `dashboardService.getDashboardMetrics()` scans the in-memory collections:
    - Counts `customers.length`
    - Counts `accounts.length`
    - Computes `accounts.reduce((sum, acc) => sum + acc.balance, 0)`
    - Counts `transactions.length`
    - Fetches the most recent transactions sorted by `timestamp DESC` limited to 5.
    - Aggregates accounts by `accountType` (`savings` vs `current`) and `status`.

### 3. Related Endpoints
- `GET /api/dashboard` - Fetches aggregated dashboard metrics and recent activity.

### 4. How to Test / Demo
1. Open the web interface at `http://localhost:5173`.
2. Inspect the 4 KPI cards against the seed data:
   - Initial Customers: `3`
   - Initial Accounts: `4`
   - Initial Total Balance: `₹270,000`
   - Initial Transactions: `6`
3. Execute a new deposit of `₹10,000` in the transaction module.
4. Return to Dashboard and confirm:
   - Total Balance immediately reflects `₹280,000`.
   - Total Transactions increments to `7`.
   - The new deposit appears at the top of the "Recent Transactions" table.

### 5. Edge Cases Handled
- **Zero Records:** If all collections are cleared or empty, returns zero values gracefully (`0` balance, `0` accounts, empty table) without throwing `NaN` or `null` reference exceptions.
- **Floating Point Rounding:** Balances are formatted using precision arithmetic (`parseFloat(balance.toFixed(2))`) to prevent JavaScript floating point inaccuracies (e.g., `0.1 + 0.2 = 0.30000000000000004`).

---

## Feature 2: Customer Management

### 2. Purpose
Enables comprehensive Customer Information File (CIF) management, handling onboarding, profile inspection, contact information updates, and safe offboarding of retail banking clients.

### 2. How It Works
- **Frontend:**
  - Renders a searchable list of customers displaying Customer ID, full name, email, phone number, date of birth, and registration date.
  - Includes an **"Add Customer"** modal dialog with strict field validation.
  - Includes an **"Edit Customer"** modal to modify phone numbers, email, or physical address.
  - Includes a **"Delete"** button with confirmation prompts.
  - Clicking a customer row navigates to or opens a drawer displaying all linked accounts for that customer.
- **Backend:**
  - `POST /api/customers`: Validates mandatory fields (`firstName`, `lastName`, `email`, `phone`, `address`, `dateOfBirth`). Validates email format and uniqueness. Auto-generates IDs in format `CUST-XXXX`.
  - `PUT /api/customers/:id`: Updates mutable attributes. Preserves immutable IDs and creation timestamps.
  - `DELETE /api/customers/:id`: Verifies whether the customer owns any accounts with status `active` or non-zero balance. If found, rejects with `400 Bad Request` to preserve relational integrity.
  - `GET /api/customers/:id/accounts`: Resolves foreign keys (`account.customerId === customer.id`).

### 3. Related Endpoints
- `GET /api/customers` - List all customers.
- `GET /api/customers/:id` - Fetch customer details by ID.
- `POST /api/customers` - Register a new customer.
- `PUT /api/customers/:id` - Update existing customer details.
- `DELETE /api/customers/:id` - Remove customer (only if zero active accounts).
- `GET /api/customers/:id/accounts` - Retrieve all accounts belonging to customer.

### 4. How to Test / Demo
1. Go to the **Customers** screen.
2. Click **"Add Customer"** and fill:
   - First Name: `Vikram`
   - Last Name: `Malhotra`
   - Email: `vikram.m@example.com`
   - Phone: `+91 99887 76655`
   - Address: `42 Park Street, Kolkata`
   - DOB: `1992-08-15`
3. Click **Save** and verify `CUST-1004` appears in the list.
4. Try to add another customer with the exact same email `vikram.m@example.com` -> observe immediate duplicate email error.
5. Attempt to delete existing customer `Rajesh Sharma (CUST-1001)` -> observe error: *"Cannot delete customer with active accounts"*.

### 5. Edge Cases Handled
- **Duplicate Email Detection:** Rejects email collisions case-insensitively (`test@domain.com` vs `TEST@domain.com`).
- **Orphan Accounts Prevention:** Strict safety block forbidding customer deletion while active accounts exist.
- **Empty Mandatory Fields:** Whitespace-only names or incomplete dates are trapped by validation prior to persistence.
- **Non-existent Customer Lookup:** Returns 404 with structured `{ success: false, message: "Customer not found" }`.

---

## Feature 3: Account Management

### 1. Purpose
Provides account lifecycle administration, allowing bank staff to open savings and current accounts, review account ownership, and modulate account operational states (`active`, `inactive`, `frozen`).

### 2. How It Works
- **Frontend:**
  - Displays account cards and table view with Account ID (`ACC-XXXX`), Customer Name, Account Type (`Savings` or `Current`), Balance, and Status Badge.
  - Status badges are color-coded:
    - 🟢 Green: `active`
    - 🟡 Amber: `inactive`
    - 🔴 Red: `frozen`
  - Modal form for opening an account with customer dropdown, account type selector, and optional opening deposit input.
  - Status dropdown/action button to toggle state between `active`, `inactive`, and `frozen`.
- **Backend:**
  - `POST /api/accounts`: Validates that `customerId` exists in `customersStore`. Sets default balance to `0` or initial deposit if specified. If an initial deposit > 0 is provided, automatically generates an initial `DEPOSIT` transaction record.
  - `PATCH /api/accounts/:id/status`: Updates the status enum to one of `['active', 'inactive', 'frozen']`.
  - `GET /api/accounts/:id/balance`: Quick endpoint returning current balance, account type, and operational status.

### 3. Related Endpoints
- `GET /api/accounts` - List all bank accounts.
- `GET /api/accounts/:id` - Retrieve account by ID.
- `POST /api/accounts` - Create new account (`customerId`, `accountType`, `initialDeposit?`).
- `PATCH /api/accounts/:id/status` - Modify account status (`status`).
- `GET /api/accounts/:id/balance` - Retrieve balance and status for account.

### 4. How to Test / Demo
1. Navigate to **Accounts**.
2. Click **"Open New Account"**.
3. Select Customer: `Priya Patel (CUST-1002)`.
4. Choose Account Type: `Current`.
5. Enter Initial Deposit: `₹25,000`.
6. Submit and confirm `ACC-2005` is generated with `balance: 25000` and status `active`.
7. Click the status dropdown on `ACC-2005` and switch it to `frozen`.
8. Confirm the badge turns red and transactions against this account become disabled.

### 5. Edge Cases Handled
- **Invalid Customer Linkage:** Opening an account for an invalid or non-existent `customerId` is rejected with `404 Not Found`.
- **Negative Initial Deposit:** Rejects any initial deposit less than `0`.
- **Unsupported Account Type:** Rejects any account type other than `savings` or `current`.
- **Invalid Status Values:** Rejects arbitrary strings; only permits `active`, `inactive`, or `frozen`.

---

## Feature 4: Transaction Processing

### 1. Purpose
Implements the core monetary engine of the bank, handling single-account credits (deposits), single-account debits (withdrawals), and multi-account fund transfers with strict validation.

### 2. How It Works
- **Frontend:**
  - Dedicated **Transaction Modal / Page** providing 3 actionable tabs:
    1. **Deposit:** Select destination account, enter amount, add description.
    2. **Withdraw:** Select source account, enter amount, add description.
    3. **Transfer:** Select source account, select destination account, enter amount, add description.
  - Live feedback displays account balance before confirming a withdrawal or transfer.
  - Displays instant success receipt with transaction ID and updated balances.
- **Backend:**
  - `POST /api/transactions/deposit`:
    - Checks account existence and status (`active`).
    - Validates `amount > 0`.
    - Increments account balance: `account.balance += amount`.
    - Generates transaction record with type `DEPOSIT`.
  - `POST /api/transactions/withdraw`:
    - Checks account existence and status (`active`).
    - Validates `amount > 0`.
    - Verifies sufficient funds: `account.balance >= amount`.
    - Decrements account balance: `account.balance -= amount`.
    - Generates transaction record with type `WITHDRAWAL`.
  - `POST /api/transactions/transfer`:
    - Ensures `fromAccountId !== toAccountId`.
    - Checks both accounts exist and both statuses are `active`.
    - Validates `fromAccount.balance >= amount`.
    - Decrements source balance and increments target balance atomically.
    - Generates transaction record with type `TRANSFER`, linking both source and destination accounts.

### 3. Related Endpoints
- `POST /api/transactions/deposit` - Credit funds to an account.
- `POST /api/transactions/withdraw` - Debit funds from an account.
- `POST /api/transactions/transfer` - Transfer funds between accounts.

### 4. How to Test / Demo
1. Open the **Transactions** view.
2. Select **Deposit**: Choose `ACC-2001` (Rajesh Sharma), Amount: `₹15,000`, Description: *"Consulting Fee"*.
   - Confirm balance increases from ₹50,000 to ₹65,000.
3. Select **Withdraw**: Choose `ACC-2001`, Amount: `₹5,000`, Description: *"Cash ATM"*.
   - Confirm balance drops to ₹60,000.
4. Select **Transfer**: From `ACC-2001` to `ACC-2003` (Priya Patel), Amount: `₹20,000`.
   - Confirm `ACC-2001` drops from ₹60,000 to ₹40,000.
   - Confirm `ACC-2003` increases from ₹85,000 to ₹105,000.
5. Attempt to withdraw `₹50,000` from `ACC-2001` (balance is now ₹40,000).
   - Confirm error: *"Insufficient balance in account"*.

### 5. Edge Cases Handled
- **Zero or Negative Amounts:** Rejects amounts `<= 0` (e.g. `0`, `-500`, `abc`).
- **Insufficient Funds:** Explicitly rejects any debit attempt exceeding available liquid balance.
- **Self-Transfer Guard:** Rejects transfers where source and destination account are identical (`fromAccountId === toAccountId`).
- **Account State Interceptors:** Rejects any transaction if source or destination account is `frozen` or `inactive`.

---

## Feature 5: Balance Inquiry

### 1. Purpose
Provides a lightweight, dedicated real-time balance lookup interface for tellers and customer service representatives to check funds without navigating through dense tables.

### 2. How It Works
- **Frontend:**
  - Dedicated screen at `/balance` with an account selector dropdown or searchable Account ID input field.
  - Instant balance presentation card displaying:
    - Account ID and Customer Full Name
    - Account Type (`Savings` / `Current`)
    - Available Balance with currency formatting (`₹xx,xxx.xx`)
    - Status Badge (`Active`, `Inactive`, `Frozen`)
    - Last updated timestamp
  - Quick action buttons to immediately navigate to "Deposit", "Withdraw", or "View Statement" for that specific account.
- **Backend:**
  - `GET /api/accounts/:id/balance`:
    - Validates that the account exists.
    - Resolves customer details for ownership context.
    - Returns `{ accountId, customerName, accountType, balance, currency, status }`.

### 3. Related Endpoints
- `GET /api/accounts/:id/balance` - Get real-time balance and status.
- `GET /api/accounts/:id` - Full account record retrieval.

### 4. How to Test / Demo
1. Navigate to the **Balance Inquiry** page.
2. Select `ACC-2002` (Rajesh Sharma - Current Account) from the account selector.
3. Verify that the displayed balance matches `₹120,000` with an "Active" badge.
4. Input an invalid account ID (e.g. `ACC-9999`) and confirm the message: *"Account ACC-9999 not found"*.

### 5. Edge Cases Handled
- **Account Not Found:** Graceful display of "Account ID not recognized" without page crash.
- **Currency Formatting:** Numbers are displayed with standard locale currency separators (`en-IN` formatting: ₹1,20,000.00).

---

## Feature 6: Transaction History & Audit Ledger

### 1. Purpose
Maintains an immutable, append-only chronological journal of all monetary activities executed across the bank, supporting auditing, transaction lookup, and statement generation.

### 2. How It Works
- **Frontend:**
  - Tabular view of all transactions with columns:
    - Transaction ID (`TXN-XXXX`)
    - Timestamp (Date and Time formatted)
    - Type (`DEPOSIT`, `WITHDRAWAL`, `TRANSFER`) with distinctive color badges
    - Source Account & Target Account
    - Amount (formatted in Green for credit, Red for debit)
    - Balance After Transaction
    - Description / Memo
  - Interactive Filter Bar:
    - Filter by Type dropdown (`All`, `DEPOSIT`, `WITHDRAWAL`, `TRANSFER`)
    - Filter by Account ID
    - Date range pickers (Start Date, End Date)
    - Pagination controls (Previous, Next, items per page selector: 10, 25, 50)
- **Backend:**
  - `GET /api/transactions`:
    - Parses query parameters: `type`, `startDate`, `endDate`, `page`, `limit`.
    - Filters in-memory array by type and ISO date range.
    - Applies pagination slicing: `transactions.slice(skip, skip + limit)`.
    - Returns total count, current page, total pages, and filtered items.
  - `GET /api/transactions/account/:accountId`:
    - Fetches all entries where `accountId === req.params.accountId` OR `toAccountId === req.params.accountId`.

### 3. Related Endpoints
- `GET /api/transactions` - Filterable, paginated transaction ledger.
- `GET /api/transactions/account/:accountId` - Account-specific transaction statement.

### 4. How to Test / Demo
1. Navigate to **Transaction History**.
2. Select filter **Type: TRANSFER** and verify only transfer transactions are shown.
3. Clear filters and enter an Account ID filter for `ACC-2001`. Confirm only transactions involving `ACC-2001` (either as debit or credit) appear.
4. Verify pagination by setting limit to `5` and clicking "Next Page".

### 5. Edge Cases Handled
- **Pagination Boundary Checks:** Safely clamps page index; requesting page 99 returns an empty list without crashing.
- **Invalid Date Range:** Rejects or normalizes cases where `startDate` is later than `endDate`.
- **Empty Result States:** Displays an intuitive "No transactions found matching your criteria" card with a "Reset Filters" action.
