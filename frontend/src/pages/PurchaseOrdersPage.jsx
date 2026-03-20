import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { IoDocumentTextOutline } from 'react-icons/io5'
import { getPurchaseOrders } from '../api/purchaseOrders'
import { formatCurrency, formatDate } from '../utils/format'
import PageHeader from '../components/ui/PageHeader'
import StatusBadge from '../components/ui/StatusBadge'
import EmptyState from '../components/ui/EmptyState'

const TABS = [
  { label: 'All', value: '' },
  { label: 'Draft', value: 'DRAFT' },
  { label: 'Pending Approval', value: 'PENDING_APPROVAL' },
  { label: 'Approved', value: 'APPROVED' },
  { label: 'Invoiced', value: 'INVOICED' },
  { label: 'Paid', value: 'PAID' },
  { label: 'Cancelled', value: 'CANCELLED' },
]

export default function PurchaseOrdersPage() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('')

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['purchase-orders', activeTab],
    queryFn: () => getPurchaseOrders(activeTab || undefined),
  })

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <PageHeader
        title="Purchase Orders"
        subtitle="Manage and track all procurement orders."
        action={
          <button onClick={() => navigate('/purchase-orders/new')} className="btn-primary">
            New Purchase Order
          </button>
        }
      />

      {/* Filter tabs */}
      <div className="flex items-center gap-1 mb-4 border-b border-gray-200 overflow-x-auto hide-scrollbar">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`px-3 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors duration-150 -mb-px ${
              activeTab === tab.value
                ? 'border-primary-green text-primary-green'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="card p-0 overflow-hidden">
        {isLoading ? (
          <div className="animate-pulse h-48 bg-gray-50" />
        ) : orders.length === 0 ? (
          <EmptyState
            icon={IoDocumentTextOutline}
            title="No purchase orders found"
            description={
              activeTab
                ? `No ${TABS.find((t) => t.value === activeTab)?.label} purchase orders yet.`
                : 'Create your first purchase order to get started.'
            }
            action={
              !activeTab && (
                <Link to="/purchase-orders/new" className="btn-primary">
                  New Purchase Order
                </Link>
              )
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="common-table">
              <thead>
                <tr>
                  <th className="common-table-header">PO Number</th>
                  <th className="common-table-header">Supplier</th>
                  <th className="common-table-header">Status</th>
                  <th className="common-table-header">Line Items</th>
                  <th className="common-table-header">Total Amount</th>
                  <th className="common-table-header">Created</th>
                  <th className="common-table-header">Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((po) => (
                  <tr key={po.id} className="common-table-body-row">
                    <td className="common-table-cell">
                      <Link
                        to={`/purchase-orders/${po.id}`}
                        className="font-medium text-primary-green hover:underline"
                      >
                        {po.poNumber}
                      </Link>
                    </td>
                    <td className="common-table-cell text-gray-700">
                      {po.supplier?.name || po.supplierName || '—'}
                    </td>
                    <td className="common-table-cell">
                      <StatusBadge status={po.status} />
                    </td>
                    <td className="common-table-cell text-gray-600">
                      {po.lineItems?.length ?? po._count?.lineItems ?? '—'}
                    </td>
                    <td className="common-table-cell font-medium">
                      {formatCurrency(po.totalAmount)}
                    </td>
                    <td className="common-table-cell text-gray-600">
                      {formatDate(po.createdAt)}
                    </td>
                    <td className="common-table-cell">
                      <button
                        onClick={() => navigate(`/purchase-orders/${po.id}`)}
                        className="text-xs text-primary-green font-medium hover:underline"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </motion.div>
  )
}
