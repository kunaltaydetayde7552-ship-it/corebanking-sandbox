# Manual Testing Checklist - CoreBanking Sandbox

> **Project ID:** PST_PD_153  
> **Platform:** CoreBanking Sandbox  
> **Document Purpose:** Quality Assurance & Functional Verification Test Suite  
> **Tester Instructions:** Execute each test case step-by-step and mark Status as `PASS` or `FAIL`.

---

## Summary Matrix

| Module | Total Tests | Edge Case Tests | UI State Tests |
| :--- | :---: | :---: | :---: |
| 1. Dashboard Overview (`DASH`) | 4 | 2 | 1 |
| 2. Customer Management (`CUST`) | 7 | 4 | 1 |
| 3. Account Management (`ACC`) | 6 | 3 | 1 |
| 4. Transactions Processing (`TXN`) | 9 | 6 | 1 |
| 5. Balance Inquiry (`BAL`) | 4 | 2 | 1 |
| 6. Transaction History (`HIST`) | 5 | 3 | 1 |
| 7. UI / UX & System States (`UI`) | 4 | 2 | 4 |
| **Total Test Suite** | **39** | **22** | **10** |

---

## 1. Dashboard Module (`TC-DASH`)

| Test ID | Test Description | Steps to Reproduce | Expected Result | Status |
| :--- | :--- | :--- | :--- | :---: |
| **TC-DASH-01** | Initial KPI metrics verification | 1. Launch backend and frontend.<br>2. Navigate to Dashboard (`/`). | Displays 3 Total Customers, 4 Total Accounts, ₹2,70,000.00 Total Balance, 6 Total Transactions. | `[ ]` |
| **TC-DASH-02** | Real-time metric update on new deposit | 1. Record current Total Balance on Dashboard.<br>2. Execute ₹10,000 deposit on `ACC-2001`.<br>3. Return to Dashboard. | Total Balance increases by exactly ₹10,000.00. Total Transactions increments by +1. | `[ ]` |
| **TC-DASH-03** | Recent transactions feed updates | 1. Perform any new transaction.<br>2. Inspect Recent Transactions table on Dashboard. | Newly executed transaction appears at the top (sorted by timestamp descending). | `[ ]` |
| **TC-DASH-04** | Account distribution chart integrity | 1. Inspect Account Distribution chart with seed data.<br>2. Open a new Current account for Priya Patel. | Ratio changes to reflect 3 Savings and 2 Current accounts correctly. | `[ ]` |

---

## 2. Customer Management Module (`TC-CUST`)

| Test ID | Test Description | Steps to Reproduce | Expected Result | Status |
| :--- | :--- | :--- | :--- | :---: |
| **TC-CUST-01** | Create valid customer (Happy Path) | 1. Go to Customers -> Click "Add Customer".<br>2. Enter valid names, unique email, phone, address, and DOB.<br>3. Click Submit. | Modal closes, success banner appears, new customer is assigned ID `CUST-1004` in the table. | `[ ]` |
| **TC-CUST-02** | Duplicate email rejection (Edge Case) | 1. Click "Add Customer".<br>2. Enter an existing email: `rajesh.sharma@example.com`.<br>3. Click Submit. | Form submission is rejected with error: *"A customer with email already exists"*. No duplicate created. | `[ ]` |
| **TC-CUST-03** | Missing mandatory fields (Edge Case) | 1. Click "Add Customer".<br>2. Leave First Name or DOB blank.<br>3. Click Submit. | Form shows validation warning highlight on missing fields; request is not sent. | `[ ]` |
| **TC-CUST-04** | Update customer details | 1. Click "Edit" on customer `CUST-1002`.<br>2. Change phone number to `+91 99999 88888`.<br>3. Save changes. | Table updates immediately with new phone number; ID and createdAt remain unchanged. | `[ ]` |
| **TC-CUST-05** | View customer linked accounts | 1. Click on customer row or "View Accounts" for `Rajesh Sharma`. | Drawer or view displays accounts `ACC-2001` (Savings) and `ACC-2002` (Current). | `[ ]` |
| **TC-CUST-06** | Delete customer with active accounts (Edge Case Guard) | 1. Attempt to delete `Rajesh Sharma (CUST-1001)`.<br>2. Confirm deletion dialog. | Deletion fails with error: *"Cannot delete customer with active accounts"*. Customer remains intact. | `[ ]` |
| **TC-CUST-07** | Delete customer with zero accounts | 1. Create a customer "Temp User" with no accounts.<br>2. Click Delete and confirm. | Customer is successfully deleted and removed from the customer table. | `[ ]` |

---

## 3. Account Management Module (`TC-ACC`)

| Test ID | Test Description | Steps to Reproduce | Expected Result | Status |
| :--- | :--- | :--- | :--- | :---: |
| **TC-ACC-01** | Open account with zero initial deposit | 1. Go to Accounts -> Click "Open Account".<br>2. Select customer, choose `Savings`, set deposit to `0`.<br>3. Submit form. | Account is created with `status: active` and `balance: 0.00`. | `[ ]` |
| **TC-ACC-02** | Open account with positive initial deposit | 1. Click "Open Account".<br>2. Select customer, choose `Current`, set deposit to `25000`.<br>3. Submit form. | Account is created with `balance: 25000.00`. Ledger logs an opening deposit transaction. | `[ ]` |
| **TC-ACC-03** | Negative initial deposit rejection (Edge Case) | 1. Click "Open Account".<br>2. Enter initial deposit `-500`.<br>3. Submit. | Form blocks submission or API returns error: *"Initial deposit cannot be negative"*. | `[ ]` |
| **TC-ACC-04** | Change account status to `frozen` | 1. Select account `ACC-2001`.<br>2. Update status dropdown to `frozen`. | Status badge turns Red (`Frozen`). System records state change. | `[ ]` |
| **TC-ACC-05** | Reactivate frozen account to `active` | 1. Select frozen account `ACC-2004`.<br>2. Change status dropdown to `active`. | Status badge turns Green (`Active`). Account is now eligible for transactions. | `[ ]` |
| **TC-ACC-06** | Filter accounts by customer | 1. Enter customer name or ID in Accounts search filter. | Table displays only accounts matching that specific customer. | `[ ]` |

---

## 4. Transaction Processing Module (`TC-TXN`)

| Test ID | Test Description | Steps to Reproduce | Expected Result | Status |
| :--- | :--- | :--- | :--- | :---: |
| **TC-TXN-01** | Process Cash Deposit (Happy Path) | 1. Go to Transactions -> "Deposit".<br>2. Select `ACC-2001` (Balance: 50,000), Amount: `10000`.<br>3. Submit. | Success confirmation. Balance updates to ₹60,000.00. Transaction ID generated. | `[ ]` |
| **TC-TXN-02** | Process Cash Withdrawal (Happy Path) | 1. Select "Withdraw".<br>2. Select `ACC-2001` (Balance: 60,000), Amount: `5000`.<br>3. Submit. | Success confirmation. Balance drops to ₹55,000.00. | `[ ]` |
| **TC-TXN-03** | Insufficient balance withdrawal (Edge Case) | 1. Select "Withdraw".<br>2. Select `ACC-2001` (Balance: 55,000), Amount: `100000`.<br>3. Submit. | Transaction rejected with error: *"Insufficient funds in account"*. Balance remains ₹55,000.00. | `[ ]` |
| **TC-TXN-04** | Negative / Zero amount deposit or withdrawal (Edge Case) | 1. Enter amount `0` or `-100` in Deposit or Withdraw.<br>2. Click Submit. | Rejected with error: *"Amount must be greater than zero"*. | `[ ]` |
| **TC-TXN-05** | Inter-account fund transfer (Happy Path) | 1. Select "Transfer".<br>2. From: `ACC-2001` (55k), To: `ACC-2003` (85k), Amount: `15000`.<br>3. Submit. | `ACC-2001` drops to 40,000. `ACC-2003` increases to 100,000. Single transfer record generated. | `[ ]` |
| **TC-TXN-06** | Transfer with insufficient source funds (Edge Case) | 1. Select "Transfer".<br>2. From: `ACC-2001` (40k), To: `ACC-2003`, Amount: `50000`.<br>3. Submit. | Transfer rejected: *"Insufficient funds in source account"*. Neither balance changes. | `[ ]` |
| **TC-TXN-07** | Transfer to same account (Self-Transfer Edge Case) | 1. Select "Transfer".<br>2. From: `ACC-2001`, To: `ACC-2001`, Amount: `5000`.<br>3. Submit. | Rejected with error: *"Source and destination accounts cannot be the same"*. | `[ ]` |
| **TC-TXN-08** | Transaction on `frozen` source account (Edge Case) | 1. Ensure `ACC-2004` is `frozen`.<br>2. Attempt withdrawal of `₹1,000` from `ACC-2004`. | Blocked with error: *"Account ACC-2004 is frozen. Transactions cannot be processed"*. | `[ ]` |
| **TC-TXN-09** | Transfer to `frozen` destination account (Edge Case) | 1. Ensure `ACC-2004` is `frozen`.<br>2. Attempt transfer from active `ACC-2001` to `ACC-2004`. | Blocked with error: *"Destination account ACC-2004 is frozen. Transfer rejected"*. | `[ ]` |

---

## 5. Balance Inquiry Module (`TC-BAL`)

| Test ID | Test Description | Steps to Reproduce | Expected Result | Status |
| :--- | :--- | :--- | :--- | :---: |
| **TC-BAL-01** | Real-time balance lookup for active account | 1. Open Balance Inquiry page.<br>2. Select `ACC-2002` (Rajesh Sharma). | Card displays Account ID, Account Holder Name, Current Balance (₹120,000.00), and Active status. | `[ ]` |
| **TC-BAL-02** | Real-time balance lookup for frozen account | 1. Select `ACC-2004` (Amit Verma). | Displays balance (₹15,000.00) with Red "Frozen" status warning banner. | `[ ]` |
| **TC-BAL-03** | Non-existent account lookup (Edge Case) | 1. Search for non-existent Account ID: `ACC-9999`. | Displays message: *"Account ACC-9999 not found"*. UI does not crash. | `[ ]` |
| **TC-BAL-04** | Currency and numerical formatting | 1. Inspect balance display for any account. | Balance is formatted cleanly with Indian currency symbol and commas (e.g. `₹1,20,000.00`). | `[ ]` |

---

## 6. Transaction History Module (`TC-HIST`)

| Test ID | Test Description | Steps to Reproduce | Expected Result | Status |
| :--- | :--- | :--- | :--- | :---: |
| **TC-HIST-01** | Paginated transaction listing | 1. Go to Transaction History.<br>2. Set page limit to 5 records. | Displays first 5 transactions with Next / Previous pagination controls active. | `[ ]` |
| **TC-HIST-02** | Filter by Transaction Type | 1. Select Filter Type: `DEPOSIT`.<br>2. Observe table rows. | Only deposit transactions are visible. `WITHDRAWAL` and `TRANSFER` records are filtered out. | `[ ]` |
| **TC-HIST-03** | Filter by Account ID | 1. Enter `ACC-2001` in account filter field. | Shows exclusively transactions where `ACC-2001` is source or destination. | `[ ]` |
| **TC-HIST-04** | Date range filter | 1. Set Start Date: `2026-09-01`, End Date: `2026-09-30`. | Table shows only transactions executed within September 2026. | `[ ]` |
| **TC-HIST-05** | Empty filter results state | 1. Set filter with criteria matching zero records (e.g. Type: `TRANSFER`, Date: `2020-01-01`). | Renders "No transactions found matching your filters" with a "Clear Filters" button. | `[ ]` |

---

## 7. UI States, Error Handling & Invariants (`TC-UI`)

| Test ID | Test Description | Steps to Reproduce | Expected Result | Status |
| :--- | :--- | :--- | :--- | :---: |
| **TC-UI-01** | Loading state indication | 1. Refresh any page or apply complex search filter on slow connection. | Subtle loading skeleton or spinner displays until API payload resolves. | `[ ]` |
| **TC-UI-02** | Network failure / Backend offline handling | 1. Stop backend terminal (`Ctrl + C`).<br>2. Attempt to open Accounts or submit a transaction. | Friendly toast banner displays: *"Unable to reach banking server. Please check your connection."* | `[ ]` |
| **TC-UI-03** | Form validation inline feedback | 1. Open customer form, type invalid email `notanemail`.<br>2. Blur input field. | Shows red border and inline message: *"Please enter a valid email address"*. | `[ ]` |
| **TC-UI-04** | Mobile & Tablet responsive layout | 1. Resize browser viewport to 375px (Mobile) and 768px (Tablet). | Sidebar folds into hamburger drawer; tables enable horizontal scroll or transform into cards. | `[ ]` |

---

## Sign-off & Execution Record

| Role | Name | Signature / Date | Overall Result |
| :--- | :--- | :--- | :---: |
| **Lead QA / Student** | Kunal Tayde | `____________________` | `[ ] PASS  [ ] FAIL` |
| **Mentor Reviewer** | Jasmeet Singh / Kshitiz Dhooria | `____________________` | `[ ] APPROVED` |
