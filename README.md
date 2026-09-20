# LaboTrack Pro — Institutional Lab Asset & Equipment Management System (PS 8)

> **Domain:** Academic & Institutional Laboratory Asset Management  
> **Course Assignment:** Assignment-2 Problem Statement 8  
> **Design Language:** Authentic **Labotrack** aesthetic (`#10b981` emerald accents, stone neutrals, monospace badges, dot-grid background) with features inspired by **Scispot**, **LabArchives**, and **ezo.io**.

---

## 🌟 Overview & Capabilities

Modern research facilities and academic laboratories require rigorous tracking of delicate apparatus, shared analytical instrumentation, and consumables across multiple buildings and labs. **LaboTrack Pro** delivers complete lifecycle visibility from procurement and inventory intake to student checkout, handover inspection, overdue tracking, and service calibration.

### ✨ Key Features Implemented:

1. **Strict 5-Module Navigation for Admin & Lab In-Charge**:
   * 📊 **Dashboard** (`/dashboard`): Institutional asset telemetry, active research checkouts, overdue return alerts, category breakdowns, and maintenance logs.
   * 🔬 **Equipment Catalog** (`/assets`): Complete research instrument discovery without requester checkout actions. The `ACTION` column exclusively provides **Details** inspection.
   * 📋 **Order Information** (`/requests/order-info`): Central dispatch ledger tracking all orders placed, in-review, dispatched/handed over, and safely received back with metrics counters and status filter tabs.
   * 📝 **Requisition Desk** (`/requests/manage`): Review incoming requisitions, approve or decline with reasons, record physical handovers (which automatically decrements available lab stock), and perform return inspections with condition triage (**OK / Damaged / Lost**).
   * 📦 **Stock Management** (`/supplier`): Direct inventory replenishment, metadata editing, item decommissioning, and catalog creation (`+ Add New Stock Item`).
   * *(Note: Personal "My Orders & Assets" and "+ Request Equipment" are strictly excluded from the Admin and Lab In-charge UI).*

2. **Dedicated Requester / Student / Staff Experience**:
   * **Equipment Catalog** (`/assets`): Features both **Details** and **Request Equipment** action buttons.
   * **Request Equipment** (`/requests/new`): Dedicated equipment requisition ordering flow with automatic 14-day default return deadline calculations and purpose validation.
   * **My Orders & Assets** (`/requests/my-requests`): Segmented into *"What I Currently Own (Active In-Hand Assets)"*, *"Ordered & In-Review"*, and *"Past Order History"*.

3. **Isolated Overdue Tracking**:
   * Equipment past its expected return date is highlighted with red overdue badges.
   * **Privacy & Role Isolation**: Overdue alert banners on the dashboard are displayed *strictly* to the particular borrower responsible for returning that equipment, keeping other users' dashboards clean and focused.

3. **Client-Side DevTools Inspect Staging Queue**:
   * Requisition orders are formed directly in client-side memory (`window.__laboTrackInspectQueue`).
   * Diagnostic output is logged to the browser DevTools Console via `console.table(getInspectQueue())`.
   * MongoDB Atlas remains completely untouched until the async checkout promise is explicitly submitted by the user.

4. **Instant Client-Side Password Validation**:
   * Password strength and criteria (≥ 8 characters, uppercase, number, symbol) are verified dynamically with real-time feedback.
   * Prevents premature server roundtrips and provides instant user feedback.

5. **Stretch Goal: Maintenance & Calibration Logs**:
   * Track service dates, calibration cycles, technician details, costs, and upcoming service deadlines per asset.

6. **Enterprise Security & Reliability**:
   * Helmet Content Security Policy (CSP).
   * Protection against NoSQL operator injection and SQL-like patterns.
   * Dual-mode database architecture: Native **MongoDB Atlas** (Mongoose) with an automated in-memory standalone fallback for zero-configuration local booting.

---

## 🎨 Tech Stack & Architecture

* **Frontend:** Server-Side Rendered (SSR) with **EJS** (Embedded JavaScript Templates) + Vanilla CSS using curated Labotrack tokens (`#10b981`, `#059669`, `#0f172a`, `#f8fafc`, JetBrains Mono tags).
* **Backend:** **Node.js** (v18+) + **Express.js** in a clean Model-View-Controller (MVC) architecture.
* **Database:** **MongoDB Atlas** cloud cluster with automated schema indexing and memory fallback.
* **Authentication:** Stateful sessions with `express-session`, `cookie-parser`, and `bcryptjs` password encryption.
* **Deployment:** Preconfigured for **Render** via `render.yaml` and standard production scripts.

---

## 🔑 Default Evaluation Credentials

The login portal includes **1-Click Demo Fill** buttons for immediate evaluation:

| Role | Email | Password | Primary Capabilities |
|---|---|---|---|
| ⚙️ **System Administrator** | `admin@labotrack.edu` | `AdminPassword123!` | Full inventory control, add/edit/replenish/delete stock, oversight |
| 🔬 **Lab In-charge** | `incharge@labotrack.edu` | `InchargePassword123!` | Requisition desk, approve/decline orders, handover, return triage |
| 🎓 **Staff / Student** | `requester@labotrack.edu` | `RequesterPassword123!` | Request/order equipment, catalog search, personal issues |

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
SESSION_SECRET=labotrack_institutional_session_secret_2026
MONGODB_URI=mongodb+srv://<username>:<password>@cluster7.klfzxyk.mongodb.net/labotrack?retryWrites=true&w=majority&appName=Cluster7
```

### 3. Seed Initial Inventory & Users
To populate the database with realistic laboratory equipment, users, and maintenance records:
```bash
npm run seed
```

### 4. Run the Application
```bash
# Production / Standard run
npm start

# Development (auto-restart on changes)
npm run dev
```
Open **`http://localhost:3000`** in your browser.

---

## 🧪 Step-by-Step Workflow Walkthrough

### Scenario A: Staff / Student Orders Equipment
1. Sign in as **Staff / Student** (`requester@labotrack.edu`).
2. On the Dashboard or top navbar, click **"+ Request / Order Equipment"** (or **"Equipment Catalog"**).
3. On any available asset (e.g. *Gilson Pipetman Classic* or *Eppendorf Microcentrifuge*), click **"Request Issue"**.
4. Open your browser DevTools Console (**F12** $\rightarrow$ **Console**):
   * Inspect the memory queue: `console.table(window.__laboTrackInspectQueue)` or `getInspectQueue()`.
   * Note that no database queries are made yet.
5. Enter required quantity, research purpose, and expected return date, then click **"Confirm & Submit Request"**.
6. The request is committed to MongoDB and appears under **"My Issues"** (`/requests/my-requests`) with status `Pending Review`.

### Scenario B: Lab In-charge Reviews, Approves, and Issues
1. Sign in as **Lab In-charge** (`incharge@labotrack.edu`).
2. Navigate to **"Requisition Desk"** (`/requests/manage`).
3. Locate the pending order and click **"Approve"** (or click **"Decline"** to reject with a stated reason).
4. Once approved, click **"Record Handover / Issue"**:
   * The equipment is marked as `Issued`.
   * The available units in the inventory automatically decrement.

### Scenario C: Return Inspection & Condition Triage
1. When equipment is returned, the Lab In-charge clicks **"Record Return & Triage"** on the Requisition Desk.
2. Select condition:
   * **OK (Good Working Condition)**: Units are restored to the free available stock pool.
   * **Damaged (Needs Repair)**: Units return to total stock but are flagged for maintenance/recalibration.
   * **Lost (Unrecoverable)**: Units are permanently deducted from total inventory and decommissioned.
3. Enter inspection findings (e.g. lens clarity, motor stability) and click **"Confirm Return & Update Stock"**.

### Scenario D: Administrator Manages Stock & Inventory
1. Sign in as **System Administrator** (`admin@labotrack.edu`).
2. Click **"Stock Management"** (`/supplier`) in the navigation bar.
3. **Add Stock**: Click **"+ Add New Stock Item"** to register a new instrument.
4. **Edit**: Click **"✎ Edit"** on any item to modify specs, location, or unit cost.
5. **Replenish**: Click **"+ Replenish"** to add units to existing stock.
6. **Delete**: Click **"Delete Stock"** to remove discontinued apparatus.

---

## ☁️ Deployment to Render

This repository includes a `render.yaml` specification for automated deployment:

1. Push your repository to **GitHub**.
2. Log in to [Render](https://render.com) and click **"New +"** $\rightarrow$ **"Web Service"**.
3. Select your repository.
4. Configure the service:
   * **Environment:** `Node`
   * **Build Command:** `npm install`
   * **Start Command:** `node server.js`
5. Under **Environment Variables**, add:
   * `NODE_ENV`: `production`
   * `SESSION_SECRET`: `[any-random-secret-key]`
   * `MONGODB_URI`: `mongodb+srv://<username>:<password>@cluster7.klfzxyk.mongodb.net/labotrack?retryWrites=true&w=majority&appName=Cluster7`
6. Click **"Deploy Web Service"**.
7. Run the seed script once via Render Shell:
   ```bash
   node scripts/seed.js
   ```

---

## 📁 Repository Structure

```
├── config/
│   └── db.js                 # MongoDB Atlas connection with memory fallback
├── controllers/
│   ├── assetController.js    # Catalog, specs, and maintenance logs
│   ├── authController.js     # Authentication & strict role enforcement
│   ├── dashboardController.js# Aggregated metrics & user-isolated overdue tracking
│   ├── requestController.js  # Batch requisitions, approvals, and return triage
│   └── supplierController.js # Stock management, intake, editing, replenishment
├── middleware/
│   ├── auth.js               # Route guards & JSON 401/403 handlers
│   └── security.js           # Injection and parameter sanitization
├── models/
│   ├── Asset.js              # Equipment schema & hybrid proxy
│   ├── AuditLog.js           # Institutional action trails
│   ├── IssueRequest.js       # Requisitions & return triage schema
│   ├── MaintenanceLog.js     # Service & calibration records
│   ├── User.js               # Users with bcrypt password hashing
│   └── store.js              # Preloaded in-memory seed dataset
├── public/
│   ├── css/
│   │   └── style.css         # Authentic Labotrack design system & components
│   └── js/
│       ├── passwordValidation.js # Live client-side password checklist
│       └── stagingQueue.js   # DevTools inspect memory queue handler
├── routes/                   # Modular Express routers
├── scripts/
│   └── seed.js               # Database population script
├── views/                    # EJS templates (SSR)
├── render.yaml               # Render infrastructure blueprint
└── server.js                 # Express application entry point
```

---

## 📄 Academic Integrity & License
Developed for Assignment-2 Problem Statement 8 (PS 8 Institutional Asset Management). Distributed under the ISC License.
