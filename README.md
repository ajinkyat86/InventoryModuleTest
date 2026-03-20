# CrossVal Inventory — V1 Prototype

A procurement and inventory visibility tool for MENA businesses. Replaces Excel-based tracking with a clean dashboard showing committed spend, pending approvals, upcoming PDC payments, and material price changes.

## Stack

- **Backend**: Node.js + Express + Prisma + SQLite
- **Frontend**: React + Vite + Tailwind CSS (CrossVal design system)

## Quick Start

### Backend
```bash
cd backend
npm install
npx prisma db push
node src/seed.js     # loads demo data
npm run dev          # starts on port 3001
```

### Frontend
```bash
cd frontend
npm install
npm run dev          # starts on port 5173
```

Open http://localhost:5173

**Demo login**: admin@crossval.com / crossval2026

## Features

- **Dashboard** — KPI cards (committed spend, pending approvals, outstanding payables, overdue invoices), spend-by-month chart, PDC payment schedule, price alerts
- **Purchase Orders** — Full lifecycle: Draft → Pending Approval → Approved → Invoiced
- **Invoices** — Link to POs, track credit terms and PDCs, record partial/full payments
- **Materials** — Catalog with price history tracking and change indicators
- **Suppliers** — Directory with payment terms

## Project Structure

```
backend/
  prisma/schema.prisma   6 models: Supplier, Material, MaterialPriceHistory,
                         PurchaseOrder, PurchaseOrderLine, Invoice, InvoicePayment
  src/
    index.js             Express entry point
    routes/              suppliers, materials, purchaseOrders, invoices, dashboard
    middleware/auth.js   JWT authentication
    seed.js              Demo data

frontend/
  src/
    pages/               13 pages (Dashboard, POs, Invoices, Materials, Suppliers + forms)
    components/          Layout, Sidebar, StatusBadge, ConfirmDialog, EmptyState
    api/                 Axios client + resource API modules
    hooks/useAuth.js     Auth state management
```
