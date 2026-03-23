import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import Layout from './components/layout/Layout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import SuppliersPage from './pages/SuppliersPage'
import SupplierFormPage from './pages/SupplierFormPage'
import SupplierDetailPage from './pages/SupplierDetailPage'
import MaterialsPage from './pages/MaterialsPage'
import MaterialDetailPage from './pages/MaterialDetailPage'
import MaterialFormPage from './pages/MaterialFormPage'
import PurchaseOrdersPage from './pages/PurchaseOrdersPage'
import PurchaseOrderFormPage from './pages/PurchaseOrderFormPage'
import PurchaseOrderDetailPage from './pages/PurchaseOrderDetailPage'
import InvoicesPage from './pages/InvoicesPage'
import InvoiceFormPage from './pages/InvoiceFormPage'
import InvoiceDetailPage from './pages/InvoiceDetailPage'

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth()
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  return <Layout>{children}</Layout>
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      <Route
        path="/dashboard"
        element={<ProtectedRoute><DashboardPage /></ProtectedRoute>}
      />

      <Route
        path="/suppliers"
        element={<ProtectedRoute><SuppliersPage /></ProtectedRoute>}
      />
      <Route
        path="/suppliers/new"
        element={<ProtectedRoute><SupplierFormPage /></ProtectedRoute>}
      />
      <Route
        path="/suppliers/:id/edit"
        element={<ProtectedRoute><SupplierFormPage /></ProtectedRoute>}
      />
      <Route
        path="/suppliers/:id"
        element={<ProtectedRoute><SupplierDetailPage /></ProtectedRoute>}
      />

      <Route
        path="/materials"
        element={<ProtectedRoute><MaterialsPage /></ProtectedRoute>}
      />
      <Route
        path="/materials/new"
        element={<ProtectedRoute><MaterialFormPage /></ProtectedRoute>}
      />
      <Route
        path="/materials/:id"
        element={<ProtectedRoute><MaterialDetailPage /></ProtectedRoute>}
      />
      <Route
        path="/materials/:id/edit"
        element={<ProtectedRoute><MaterialFormPage /></ProtectedRoute>}
      />

      <Route
        path="/purchase-orders"
        element={<ProtectedRoute><PurchaseOrdersPage /></ProtectedRoute>}
      />
      <Route
        path="/purchase-orders/new"
        element={<ProtectedRoute><PurchaseOrderFormPage /></ProtectedRoute>}
      />
      <Route
        path="/purchase-orders/:id"
        element={<ProtectedRoute><PurchaseOrderDetailPage /></ProtectedRoute>}
      />

      <Route
        path="/invoices"
        element={<ProtectedRoute><InvoicesPage /></ProtectedRoute>}
      />
      <Route
        path="/invoices/new"
        element={<ProtectedRoute><InvoiceFormPage /></ProtectedRoute>}
      />
      <Route
        path="/invoices/:id"
        element={<ProtectedRoute><InvoiceDetailPage /></ProtectedRoute>}
      />

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
