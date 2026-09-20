# LaboTrack — Institutional Laboratory Asset Management System (PS 8)

> **Domain:** Academic & Institutional Laboratory Asset Management  
> **Course Assignment:** Assignment-2 Problem Statement 8  
> **Design Language:** Authentic **Labotrack** aesthetic (`#10b981` emerald accents, stone neutrals, monospace badges, dot-grid background) with workflows inspired by academic instrument management platforms.

---

## 🌟 Overview & System Capabilities

Academic research institutions require rigorous tracking of analytical apparatus, delicate optical instruments, and shared consumables across multiple departments and labs. **LaboTrack** provides complete lifecycle visibility from procurement and inventory intake to checkout requisition, handover inspection, overdue tracking, and return condition triage.

### ✨ Core Modules Implemented:

1. **Role-Tailored Administrative Suite (Admin & Lab In-Charge)**:
   * 📊 **Dashboard** (`/dashboard`): Institutional asset telemetry, active research checkouts, overdue return alerts, category breakdowns, and maintenance records.
   * 🔬 **Equipment Catalog** (`/assets`): Institutional apparatus directory with search and categorization. The administrative view features a dedicated **Details** view with checkout controls reserved for authorized requesters.
   * 📋 **Order Information** (`/requests/order-info`): Central dispatch ledger auditing all orders placed, in-review, dispatched/handed over, and safely received back with metrics counters and status filters.
   * 📝 **Requisition Desk** (`/requests/manage`): Review incoming requisitions, approve or decline with reasons, record physical handovers (which automatically decrements available lab stock), and perform return condition triage (**OK / Damaged / Lost**).
   * 📦 **Stock Management** (`/supplier`): Direct inventory replenishment, metadata editing, item decommissioning, and catalog registration (`+ Add New Stock Item`).

2. **Dedicated Requester Experience (Staff & Students)**:
   * **Equipment Catalog** (`/assets`): Interactive catalog featuring both **Details** and **Request Equipment** action buttons.
   * **Request Equipment** (`/requests/new`): Dedicated equipment requisition flow with 14-day default return deadline calculations and purpose validation.
   * **My Orders & Assets** (`/requests/my-requests`): Segmented into *"What I Currently Own (Active In-Hand Assets)"*, *"Ordered & In-Review"*, and *"Past Order History"*.

3. **Isolated Overdue Tracking**:
   * Items past their expected return date are marked with high-visibility overdue flags.
   * Overdue notifications are scoped specifically to the borrower responsible, ensuring focused alerting without cross-user noise.

4. **Condition Triage & Inventory Balance**:
   * **OK**: Units return safely to the available inventory pool.
   * **Damaged**: Units remain in total inventory but are flagged as `Repair` for maintenance calibration.
   * **Lost**: Units are permanently deducted from total stock and marked `Decommissioned`.

---

## 📸 Screenshots

<!-- Place your application screenshots in the assets/ directory or your image host and update the links below -->

### Operational Dashboard
![Operational Dashboard showing equipment stock metrics, active checkouts, and category distribution](screenshots/dashboard.png)

### Equipment Handover & Requisition Desk
![Requisition Desk interface showing approval, handover recording, and return condition triage](screenshots/requisition-desk.png)

### Stock Management & Inventory Control
![Stock Management portal showing replenishment, item editing, and catalog addition](screenshots/stock-management.png)

---

## 🔒 Application Security & Baseline Controls

The application implements standard security controls suitable for institutional evaluation:

* **Rate Limiting**: `express-rate-limit` enforces a maximum of 20 authentication attempts per 15-minute window per IP on `/auth/login` and `/auth/register` to prevent brute-force attacks.
* **CSRF Protection**: State-changing operations (`POST`, `PUT`, `DELETE`) require a valid session-bound CSRF token supplied via form payload (`_csrf`) or request header (`X-CSRF-Token`).
* **Cryptographic Password Hashing**: Passwords are encrypted with `bcryptjs` using a cost factor of 10 salt rounds before persistence. Passwords and credentials are never written to server logs.
* **HTTP Security Headers**: `helmet` establishes Content Security Policy (CSP), frameguard, MIME-type sniffing prevention, and cross-site scripting filters.
* **Injection Filtering**: Custom sanitization middleware recursively strips NoSQL operator injections (`$gt`, `$ne`, etc.) and suspicious SQL query signatures from incoming request bodies and parameters.

---

## 🔑 Local Development / Grading Access

Demo credential fill buttons are rendered **strictly in non-production environments** (`NODE_ENV !== 'production'`) to simplify local testing and grading. In production deployments, demo buttons are automatically omitted from the UI.

| Designated Role | Login Email | Password | Primary Capabilities |
|---|---|---|---|
| ⚙️ **System Administrator** | `admin@labotrack.edu` | `AdminPassword123!` | Full inventory control, add/edit/replenish/delete stock, system audit logs |
| 🔬 **Lab In-charge** | `incharge@labotrack.edu` | `InchargePassword123!` | Requisition desk, approve/decline orders, handover recording, return condition triage |
| 🎓 **Staff / Student** | `requester@labotrack.edu` | `RequesterPassword123!` | Equipment requisition checkout, catalog search, personal active asset tracking |

---

## 🛠️ Architecture Notes

### Client-Side Diagnostic Inspect Array
For client-side diagnostics and debugging during developmental evaluation, requisition payloads form an in-memory array (`window.__laboTrackInspectQueue`) in browser memory before asynchronous dispatch. Evaluators can inspect this array in browser DevTools via `getInspectQueue()` or `console.table(window.__laboTrackInspectQueue)`. Database write operations are executed exclusively upon promise resolution on the server.

### Dual Database Engine
The application utilizes a hybrid database layer:
* **MongoDB Atlas**: Primary persistent cloud database connected via Mongoose.
* **In-Memory Store Fallback**: If remote MongoDB connectivity is unavailable or offline during evaluation, the application automatically falls back to an internal in-memory dataset with pre-seeded users and laboratory instruments, allowing zero-configuration local booting.

---

## 🚀 Quickstart Guide

### 1. Clone & Install
```bash
git clone https://github.com/Phantom6Paradise7/Labo_track.git
cd Labo_track
npm install
```

### 2. Configure Environment Variables
Create a `.env` file in the project root:
```env
PORT=3000
NODE_ENV=development
SESSION_SECRET=replace_with_a_long_random_string
MONGODB_URI=mongodb+srv://<username>:<password>@cluster7.klfzxyk.mongodb.net/labotrack?retryWrites=true&w=majority&appName=Cluster7
```

### 3. Seed Initial Laboratory Dataset
To populate the database with research instruments, user accounts, and maintenance records:
```bash
npm run seed
```

### 4. Run the Application
```bash
# Production mode
npm start

# Development mode (auto-reload on changes)
npm run dev
```
Access the application at **`http://localhost:3000`**.

---

## 🧪 Automated Test Suite

A minimal test suite built with **Jest** and **Supertest** verifies critical business logic and security controls:

* **Route-Level Role Access Control**: Verifies that unauthorized users and requesters are blocked (HTTP 403) from accessing administrative routes (`/supplier` and `/requests/manage`), while Admins and Lab In-charges have appropriate access.
* **Inventory Balance Logic**: Verifies that issuing equipment decrements `availableQuantity` and returning equipment restores available units.
* **Condition Triage Logic**: Tests `OK` (restores stock to Good condition), `Damaged` (restores units but flags condition as Repair), and `Lost` (permanently decrements total inventory and sets condition to Decommissioned).

Run the test suite with:
```bash
npm test
```

---

## ☁️ Deployment to Render

This repository includes a `render.yaml` specification for deployment on Render:

1. Connect your repository to [Render](https://render.com).
2. Configure a **Web Service**:
   * **Environment:** `Node`
   * **Build Command:** `npm install`
   * **Start Command:** `node server.js`
3. Set the following **Environment Variables**:
   * `NODE_ENV`: `production`
   * `SESSION_SECRET`: `replace_with_a_long_random_string`
   * `MONGODB_URI`: `mongodb+srv://<username>:<password>@cluster.mongodb.net/labotrack?retryWrites=true&w=majority`
4. Deploy the service and seed initial data using the Render shell:
   ```bash
   node scripts/seed.js
   ```

---

## 📁 Repository Structure

```
├── config/
│   └── db.js                 # Database connection & memory fallback
├── controllers/
│   ├── assetController.js    # Equipment catalog & maintenance logs
│   ├── authController.js     # Authentication & role enforcement
│   ├── dashboardController.js# Telemetry metrics & overdue alerts
│   ├── requestController.js  # Orders, handovers, returns & order info
│   └── supplierController.js # Stock replenishment, item edit & creation
├── middleware/
│   ├── auth.js               # Role guards & permission middleware
│   ├── csrf.js               # CSRF token generation & validation
│   ├── rateLimiter.js        # Authentication brute-force rate limiter
│   └── security.js           # NoSQL & SQL injection sanitization
├── models/
│   ├── Asset.js              # Equipment schema & hybrid proxy
│   ├── AuditLog.js           # Action audit trails
│   ├── IssueRequest.js       # Requisition & triage schema
│   ├── MaintenanceLog.js     # Equipment service records
│   └── User.js               # Users with bcrypt password hashing
├── public/
│   ├── css/style.css         # Authentic Labotrack design system
│   └── js/                   # Client-side validation & staging scripts
├── routes/                   # Modular Express route definitions
├── scripts/
│   ├── seed.js               # Initial database population script
│   └── verify_role_ui.js     # Role UI verification script
├── tests/
│   └── app.test.js           # Jest/Supertest suite for security & triage
├── views/                    # Server-rendered EJS templates
├── LICENSE                   # ISC License file
├── render.yaml               # Render infrastructure blueprint
└── server.js                 # Express application entry point
```

---

## 📄 Academic Integrity & License
Developed for Assignment-2 Problem Statement 8 (PS 8 Institutional Asset Management). Distributed under the [ISC License](LICENSE).
