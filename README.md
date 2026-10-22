# CoreBanking Sandbox

```
  ██████╗ ██████╗ ██████╗ ███████╗██████╗  █████╗ ███╗   ██╗██╗  ██╗██╗███╗   ██╗ ██████╗ 
 ██╔════╝██╔═══██╗██╔══██╗██╔════╝██╔══██╗██╔══██╗████╗  ██║██║ ██╔╝██║████╗  ██║██╔════╝ 
 ██║     ██║   ██║██████╔╝█████╗  ██████╔╝███████║██╔██╗ ██║█████╔╝ ██║██╔██╗ ██║██║  ███╗
 ██║     ██║   ██║██╔══██╗██╔══╝  ██╔══██╗██╔══██║██║╚██╗██║██╔═██╗ ██║██║╚██╗██║██║   ██║
 ╚██████╗╚██████╔╝██║  ██║███████╗██████╔╝██║  ██║██║ ╚████║██║  ██╗██║██║ ╚████║╚██████╔╝
  ╚═════╝ ╚═════╝ ╚═╝  ╚═╝╚══════╝╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═══╝╚═╝  ╚═╝╚═╝╚═╝  ╚═══╝ ╚═════╝ 
                      --- S A N D B O X   E N V I R O N M E N T ---
```

> **Project ID:** `PST_PD_153`  
> **Track:** Product Development  
> **Difficulty:** Core, Level 2  
> **Industry:** FinTech  
> **Batch:** 2026 | **Duration:** 4 Weeks  
> 
> 🌐 **Live Demo (Render):** [https://corebanking-sandbox.onrender.com](https://corebanking-sandbox.onrender.com)  
> 📡 **API Base URL:** [https://corebanking-sandbox.onrender.com/api](https://corebanking-sandbox.onrender.com/api)  
> 📊 **Dashboard Health:** [https://corebanking-sandbox.onrender.com/api/health](https://corebanking-sandbox.onrender.com/api/health)  

---

## 📌 Project Overview

**CoreBanking Sandbox** is a modern core banking environment designed for learning, demonstration, and enterprise reference. It provides a full-stack, cloud-native architecture modeling foundational banking primitives: customer registration and KYC lifecycle, savings and current account management, atomic balance updates, double-entry transactional accounting, cryptographic SHA-256 audit trails, and strict role-based access control.

The system supports dual-mode operation: **Neon Cloud PostgreSQL** with connection pooling and relational integrity for persistent cloud deployments, with an automatic in-memory fallback for offline sandbox testing. In addition, production-grade **OWASP Security Hardening** protects all endpoints with HTTP security headers, JWT authentication, IDOR access controls, and rate limiting.

---

## 🎯 Problem Statement

Traditional core banking systems (like Finacle, Temenos T24, or FIS Profile) are intricate, proprietary, and inaccessible for classroom experiments or hands-on architectural study. Developers, students, and product analysts often lack an accessible, lightweight sandbox that illustrates:

1. How account states and balance invariants are guarded.
2. How deposits, withdrawals, and inter-account fund transfers propagate across ledgers.
3. How RESTful interfaces integrate with responsive financial dashboards without third-party API dependencies.

**CoreBanking Sandbox** solves this by providing a clean, self-contained educational platform that faithfully simulates day-to-day retail banking operations.

---

## ✨ Features

1. **Dashboard Overview**  
   Real-time aggregation displaying total customers, total open accounts, aggregate bank balance, total transaction volume, recent transaction activity feed, and account type distribution charts.

2. **Customer Management (CRUD)**  
   Create, view, update, and manage retail banking customers. Enforces email uniqueness, telephone validation, date-of-birth validation, and safeguards that prevent deleting customers who own active accounts.

3. **Account Management**  
   Open Savings or Current accounts with optional opening deposits, inspect real-time account parameters, and modify account operational statuses (`active`, `inactive`, `frozen`).

4. **Transaction Processing**  
   Perform core monetary operations:
   - **Cash Deposit:** Immediate credit to an active account.
   - **Cash Withdrawal:** Balance check and immediate debit.
   - **Internal Fund Transfer:** Atomic transfer debiting source account and crediting destination account with transactional integrity.

5. **Balance Inquiry**  
   Instant, dedicated real-time balance checks and verification for any selected account ID, displaying available funds, currency, and account status.

6. **Filterable Transaction History**  
   Paginated transaction ledger with multi-parameter filtering (by transaction type: `DEPOSIT`, `WITHDRAWAL`, `TRANSFER`, date ranges, and per-account view) and full audit metadata.

---

## 🛠️ Tech Stack

| Layer | Technology | Version | Purpose |
| :--- | :--- | :--- | :--- |
| **Frontend Framework** | React | 18.x | Dynamic, reactive single-page user interface |
| **Build Tool** | Vite | 5.x | Ultra-fast HMR and production frontend bundling |
| **Styling** | Tailwind CSS | 3.x | Modern utility-first responsive banking UI |
| **Icons & UI** | Lucide React | Latest | Clean financial and navigation iconography |
| **Backend Runtime** | Node.js | 18+ LTS | Asynchronous server-side JavaScript environment |
| **Web Framework** | Express.js | 4.x | RESTful API server and route handling |
| **Cloud Database** | PostgreSQL (Neon) | 16.x | Persistent relational storage with SSL connection pooling |
| **Security Suite** | Helmet / JWT / RateLimit | Latest | OWASP compliance, CSP, anti-clickjacking, auth, rate limiting |
| **Testing** | Node Test Runner | Native | Automated regression test suite (19 security/API tests) |
| **Hosting & Cloud** | Render | Native Web Service | Full-stack deployment serving SPA & backend API |

---

## 🛡️ Security & Enterprise Architecture

1. **HTTP Security Headers (OWASP Compliant):**
   - Helmet mounted globally with custom Content Security Policy (CSP).
   - `X-Frame-Options: DENY` preventing clickjacking.
   - `X-Content-Type-Options: nosniff` preventing MIME confusion.
   - `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload` (HSTS).
   - `X-Powered-By` header stripped to prevent server fingerprinting.
2. **Authentication & IDOR Protection:**
   - JWT Bearer Token required on all financial routes (`/api/accounts`, `/api/customers`, `/api/transactions`, `/api/dashboard`, `/api/admin`).
   - Unauthenticated access returns HTTP `401 Unauthorized`.
   - Insecure Direct Object References (IDOR) strictly blocked: customers can only view and transact on accounts belonging to their verified identity (`403 Forbidden`).
3. **Rate Limiting & CORS Hardening:**
   - 100 requests per 15 minutes globally, 30 requests per 15 minutes on sensitive endpoints.
   - CORS strictly restricted to trusted origin `https://corebanking-sandbox.onrender.com` and authorized local dev ports.
4. **Relational Database & Cryptographic Audit Ledger:**
   - Hosted on Neon Cloud Serverless PostgreSQL (`DATABASE_URL`).
   - Every transaction cryptographically chained with SHA-256 hashes linking each entry to previous transactions for tamper detection.

---

## 🏛️ System Architecture

CoreBanking Sandbox follows a modular client-server architecture:

```
+-------------------------------------------------------------+
|                     Client (Browser)                        |
|             React 18 + Vite + Tailwind CSS                  |
|    (https://corebanking-sandbox.onrender.com or Localhost)  |
+------------------------------+------------------------------+
                               |
                               | HTTPS / REST API (JWT Authenticated)
                               v
+-------------------------------------------------------------+
|                      Backend (Node.js)                      |
|                     Express.js Server                       |
|           (/api - Production on Render / Localhost)         |
|                                                             |
|   +-----------------------------------------------------+   |
|   |  Security (Helmet, CSP, RateLimit, CORS, JWT Auth)  |   |
|   +--------------------------+--------------------------+   |
|                              |                              |
|   +--------------------------v--------------------------+   |
|   |  Controllers & IDOR Guard (Accounts, Customers, Tx) |   |
|   +--------------------------+--------------------------+   |
|                              |                              |
|   +--------------------------v--------------------------+   |
|   |  Services (Business Rules & Transaction Integrity)  |   |
|   +--------------------------+--------------------------+   |
+------------------------------+------------------------------+
                               |
                +--------------+--------------+
                |                             |
                v                             v
+-------------------------------+ +---------------------------+
|    Neon Cloud PostgreSQL      | |   In-Memory Fallback      |
| (Persistent Cloud DB with SSL)| |   (Zero-config offline)   |
+-------------------------------+ +---------------------------+
```
|   [ Customers Store ]   [ Accounts Store ]   [ Tx Store ]   |
|   (Pre-loaded with sample seed data on server startup)      |
+-------------------------------------------------------------+
```

---

## 📂 Folder Structure

```text
corebanking-sandbox/
├── .gitignore
├── README.md
├── docs/
│   ├── api-documentation.md    # Detailed API endpoint reference
│   ├── architecture.md         # Deep-dive system design & data flow
│   ├── features.md             # Breakdown of all 6 banking features
│   ├── testing-checklist.md    # Manual verification test suites
│   └── user-flows.md           # Step-by-step user journey guide
├── backend/
│   ├── package.json
│   ├── src/
│   │   ├── app.js              # Express app bootstrap & middleware
│   │   ├── server.js           # Server listen entry point (port 5000)
│   │   ├── controllers/        # Request handling and response formatting
│   │   │   ├── accountController.js
│   │   │   ├── customerController.js
│   │   │   ├── dashboardController.js
│   │   │   └── transactionController.js
│   │   ├── services/           # Banking domain logic and invariants
│   │   │   ├── accountService.js
│   │   │   ├── customerService.js
│   │   │   ├── dashboardService.js
│   │   │   └── transactionService.js
│   │   ├── store/              # In-memory repository & seed initializers
│   │   │   ├── memoryStore.js
│   │   │   └── seedData.js
│   │   └── routes/             # Express route routers
│   │       ├── accountRoutes.js
│   │       ├── customerRoutes.js
│   │       ├── dashboardRoutes.js
│   │       └── transactionRoutes.js
│   └── .env.example
└── frontend/
    ├── package.json
    ├── vite.config.js
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── index.html
    └── src/
        ├── main.jsx            # React root mount
        ├── App.jsx             # Top-level routing and shell layout
        ├── components/         # Reusable UI widgets & modals
        │   ├── Navbar.jsx
        │   ├── Sidebar.jsx
        │   ├── StatCard.jsx
        │   ├── Modal.jsx
        │   └── AlertNotification.jsx
        ├── pages/              # Primary view pages
        │   ├── DashboardPage.jsx
        │   ├── CustomersPage.jsx
        │   ├── AccountsPage.jsx
        │   ├── TransactionsPage.jsx
        │   └── BalanceInquiryPage.jsx
        ├── services/           # Axios/Fetch API client integrations
        │   └── api.js
        └── hooks/              # Custom React helper hooks
```

---

## 📋 Prerequisites

Before setting up the project, make sure you have the following installed on your machine:
- **Node.js**: `v18.x` or higher (recommended: LTS Node 20+)
- **npm**: `v9.x` or higher (bundled with Node.js)
- Modern web browser (Chrome, Edge, Firefox, Safari)

Check your environment versions:
```bash
node -v
npm -v
```

---

## 🚀 Installation & Setup

### 1. Clone or Navigate to Project
```bash
cd corebanking-sandbox
```

### 2. Backend Setup
```bash
cd backend
npm install
```

### 3. Frontend Setup
```bash
cd ../frontend
npm install
```

---

## ⚙️ Environment Variables

### Backend (`backend/.env`)
Create a `.env` file in the `backend/` directory (or rely on built-in defaults):
```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173
```

### Frontend (`frontend/.env`)
Create a `.env` file in the `frontend/` directory (optional):
```env
VITE_API_BASE_URL=http://localhost:5000/api
```

---

## ▶️ Running the Application

### Option A: Online Live Cloud Deployment (Render)
The application is deployed and live for production/evaluations:
- **Web Application URL:** [https://corebanking-sandbox.onrender.com](https://corebanking-sandbox.onrender.com)
- **API Health Endpoint:** [https://corebanking-sandbox.onrender.com/api/health](https://corebanking-sandbox.onrender.com/api/health)

### Option B: Running Locally

#### Start Backend Server
From the project root:
```bash
cd backend
npm run dev
```
> Server runs locally at: `http://localhost:5000`  
> Ready health message: `CoreBanking Sandbox API running on port 5000`

#### Start Frontend Application
In a separate terminal window, from the project root:
```bash
cd frontend
npm run dev
```
> Client runs locally at: `http://localhost:3000` or `http://localhost:5173`  
> Open the browser to test locally.

---

## 📡 API Documentation Summary

All responses follow the unified response envelopes:
- **Success:** `{ "success": true, "data": { ... }, "message": "..." }`
- **Failure:** `{ "success": false, "message": "..." }`

| Category | Method | Endpoint | Description |
| :--- | :--- | :--- | :--- |
| **Dashboard** | `GET` | `/api/dashboard` | Aggregated metrics, transaction counts, balance totals |
| **Customers** | `GET` | `/api/customers` | Retrieve all registered bank customers |
| | `GET` | `/api/customers/:id` | Retrieve customer profile by ID |
| | `POST` | `/api/customers` | Register a new customer (`firstName`, `lastName`, etc.) |
| | `PUT` | `/api/customers/:id` | Update customer personal & contact information |
| | `DELETE` | `/api/customers/:id` | Remove customer (only if they have 0 active accounts) |
| | `GET` | `/api/customers/:id/accounts` | Fetch all accounts owned by a specific customer |
| **Accounts** | `GET` | `/api/accounts` | Retrieve list of all bank accounts |
| | `GET` | `/api/accounts/:id` | Retrieve account details by ID |
| | `POST` | `/api/accounts` | Open a new account (`customerId`, `accountType`, deposit) |
| | `PATCH` | `/api/accounts/:id/status` | Update account status (`active`, `inactive`, `frozen`) |
| | `GET` | `/api/accounts/:id/balance` | Query real-time available balance for an account |
| **Transactions** | `GET` | `/api/transactions` | Query all transactions with filters (`type`, date, paging) |
| | `GET` | `/api/transactions/account/:accountId` | Ledger history filtered by specific account ID |
| | `POST` | `/api/transactions/deposit` | Execute credit cash deposit into account |
| | `POST` | `/api/transactions/withdraw` | Execute debit cash withdrawal from account |
| | `POST` | `/api/transactions/transfer` | Execute atomic fund transfer between two accounts |

*For complete schema specifications, sample payloads, and error codes, refer to [docs/api-documentation.md](docs/api-documentation.md).*

---

## 💾 Seed Data Reference

The backend initializes automatically with realistic mock banking records:
- **3 Customers:**
  1. `CUST-1001`: Rajesh Sharma (`rajesh.sharma@example.com`, +91 98765 43210)
  2. `CUST-1002`: Priya Patel (`priya.patel@example.com`, +91 98765 12345)
  3. `CUST-1003`: Amit Verma (`amit.verma@example.com`, +91 98111 22334)
- **4 Accounts:**
  1. `ACC-2001`: Savings Account (Rajesh Sharma) - Initial Balance: ₹50,000 (Active)
  2. `ACC-2002`: Current Account (Rajesh Sharma) - Initial Balance: ₹120,000 (Active)
  3. `ACC-2003`: Savings Account (Priya Patel) - Initial Balance: ₹85,000 (Active)
  4. `ACC-2004`: Savings Account (Amit Verma) - Initial Balance: ₹15,000 (Frozen)
- **6 Transactions:**
  - Initial account opening deposits, subsequent ATM withdrawals, salary credits, and inter-customer transfers already indexed in the ledger.

---

## 🧪 Testing Instructions

You can verify the sandbox using either the built-in UI or direct API calls (`curl` / Postman):

1. **Dashboard Check:**  
   Navigate to the Dashboard view and verify that total balance equals the sum of account balances (₹270,000 across initial seed accounts).
2. **Customer Lifecycle:**  
   Create a customer with valid fields. Try creating another customer with the same email to confirm duplicate validation.
3. **Account Creation:**  
   Link a new Savings account to the newly created customer with an opening deposit of ₹5,000.
4. **Deposit & Withdrawal:**  
   Deposit ₹2,500 into an account and check the updated balance. Withdraw ₹1,000 and verify the deduction. Attempt withdrawing ₹1,000,000 to verify insufficient balance rejection.
5. **Fund Transfer:**  
   Transfer ₹10,000 from Rajesh (`ACC-2001`) to Priya (`ACC-2003`). Confirm that `ACC-2001` drops by ₹10,000 and `ACC-2003` increases by ₹10,000 with a matched transaction ID.
6. **Account Freezing:**  
   Set an account status to `frozen`. Attempt a withdrawal or transfer against it to verify the transaction block.

*For complete test scenarios, refer to [docs/testing-checklist.md](docs/testing-checklist.md).*

---

## 🎬 Demo Walkthrough Flow

Follow this sequence to present the project:
1. **Launch App:** Open the live link `https://corebanking-sandbox.onrender.com` (or start locally at `http://localhost:3000`).
2. **Dashboard Overview:** Review key KPIs, the balance metric, and the recent transaction feed.
3. **Register Customer:** Navigate to Customers, click "Add Customer", and submit details for a new user (e.g., Ananya Roy).
4. **Open Account:** In the Accounts page, select Ananya Roy, choose "Savings", and deposit ₹20,000.
5. **Deposit Funds:** Perform a deposit of ₹5,000 into the account via the Transactions modal.
6. **Withdraw Funds:** Perform an ATM withdrawal of ₹3,000 and confirm balance reflects ₹22,000.
7. **Perform Transfer:** Initiate a transfer from Ananya's account to Rajesh's account (`ACC-2001`).
8. **Inspect History:** Filter transaction logs by type `TRANSFER` to showcase the immutable audit trail.
9. **Balance Verification:** Use the Balance Inquiry tool to check real-time state.
10. **Safety Guards:** Attempt to delete Rajesh Sharma (fails because active accounts exist).

*For the comprehensive step-by-step narration, see [docs/user-flows.md](docs/user-flows.md).*

---

## 📸 Screenshots

*(Place application UI screenshots in this section for documentation & submission)*

| Dashboard View | Customer Management |
| :---: | :---: |
| *(Placeholder: Dashboard showing KPI cards, recent transactions)* | *(Placeholder: Customer table with Add/Edit/Delete actions)* |

| Account Management | Transaction History |
| :---: | :---: |
| *(Placeholder: Accounts grid with status badges & open account)* | *(Placeholder: Filterable transaction audit table)* |

---

## 👥 Project Team & Mentorship

- **Project ID:** `PST_PD_153`
- **Batch / Level:** 2026 Level 2 (Core)
- **Student Team:**
  - Kunal Tayde *(Full Stack Development & Architecture)*
  - Gajangi Nikhileshwar *(Frontend & Testing)*
- **Mentors / Reviewers:**
  - Madhushri Tangali *(Lead Reviewer - PRD Sign-off)*
  - Jasmeet Singh
  - Kshitiz Dhooria

---

## 📄 License

This project is open-source and distributed under the [MIT License](https://opensource.org/licenses/MIT). You are free to use, modify, and distribute this software for educational and development purposes.
