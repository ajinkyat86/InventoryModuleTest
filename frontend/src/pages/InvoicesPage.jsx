import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { IoReceiptOutline } from 'react-icons/io5'
import { getInvoices } from '../api/invoices'
import { formatCurrency, formatDate, daysUntil } from '../utils/format'
import PageHeader from '../components/ui/PageHeader'
import StatusBadge from '../components/ui/StatusBadge'
import EmptyState from '../components/ui/EmptyState'

const TABS = [
  { label: 'All', value: '' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Partially Paid', value: 'PARTIALLY_PAID' },
  { label: 'Paid', value: 'PAID' },
  { label: 'Overdue', value: 'OVERDUE' },
]

const PAYMENT_TYPE_LABELS = {
  CREDIT: 'Credit',
  PDC: 'PDC',
  BANK_TRANSFER: 'Bank Transfer',
}

export default function InvoicesPage() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('')

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['invoices', activeTab],
    queryFn: () => getInvoices(activeTab || undefined),
  })

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <PageHeader
        title="Invoices"
        subtitle="Track all supplier invoices and payment status."
        action={
          <button onClick={() => navigate('/invoices/new')} className="btn-primary">
            New Invoice
          </button>
        }
      />

      {/* Tabs */}
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
        ) : invoices.length === 0 ? (
          <EmptyState
            icon={IoReceiptOutline}
            title="No invoices found"
            description={
              activeTab
                ? `No ${TABS.find((t) => t.value === activeTab)?.label} invoices yet.`
                : 'Create your first invoice to start tracking payments.'
            }
            action={
              !activeTab && (
                <Link to="/invoices/new" className="btn-primary">
                  New Invoice
                </Link>
              )
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="common-table">
              <thead>
                <tr>
                  <th className="common-table-header">Invoice No.</th>
                  <th className="common-table-header">Linked PO</th>
                  <th className="common-table-header">Supplier</th>
                  <th className="common-table-header">Amount</th>
                  <th className="common-table-header">Paid</th>
                  <th className="common-table-header">Outstanding</th>
                  <th className="common-table-header">Type</th>
                  <th className="common-table-header">Due Date</th>
                  <th className="common-table-header">Status</th>
                  <th className="common-table-header">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => {
                  const isOverdue = inv.status === 'OVERDUE'
                  const daysLeft = daysUntil(inv.dueDate)
                  const almostDue = daysLeft !== null && daysLeft >= 0 && daysLeft <= 7 && inv.status !== 'PAID'
                  const outstanding = (inv.amount || 0) - (inv.paidAmount || 0)

                  return (
                    <tr
                      key={inv.id}
                      className={`common-table-body-row ${isOverdue ? 'bg-red-50 hover:bg-red-100' : ''}`}
                    >
                      <td className="common-table-cell">
                        <Link
                          to={`/invoices/${inv.id}`}
                          className="font-medium text-primary-green hover:underline"
                        >
                          {inv.invoiceNumber}
                        </Link>
                      </td>
                      <td className="common-table-cell">
                        {inv.purchaseOrder ? (
                          <Link
                            to={`/purchase-orders/${inv.purchaseOrder.id}`}
                            className="text-xs text-primary-green hover:underline"
                          >
                            {inv.purchaseOrder.poNumber}
                          </Link>
                        ) : '—'}
                      </td>
                      <td className="common-table-cell text-gray-700">
                        {inv.supplier?.name || inv.supplierName || '—'}
                      </td>
                      <td className="common-table-cell font-medium">{formatCurrency(inv.amount)}</td>
                      <td className="common-table-cell text-primary-green font-medium">
                        {formatCurrency(inv.paidAmount || 0)}
                      </td>
                      <td className="common-table-cell font-medium text-gray-800">
                        {formatCurrency(outstanding)}
                      </td>
                      <td className="common-table-cell text-gray-600">
                        {PAYMENT_TYPE_LABELS[inv.paymentType] || inv.paymentType || '—'}
                      </td>
                      <td className={`common-table-cell ${almostDue ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
                        {formatDate(inv.dueDate)}
                      </td>
                      <td className="common-table-cell">
                        <StatusBadge status={inv.status} />
                      </td>
                      <td className="common-table-cell">
                        <button
                          onClick={() => navigate(`/invoices/${inv.id}`)}
                          className="text-xs text-primary-green font-medium hover:underline"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </motion.div>
  )
}
