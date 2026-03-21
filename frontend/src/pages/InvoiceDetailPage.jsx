import React, { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'react-toastify'
import { IoAddOutline, IoCheckmarkOutline } from 'react-icons/io5'
import { getInvoice, recordPayment, markPaymentPaid } from '../api/invoices'
import { formatCurrency, formatDate, daysUntil } from '../utils/format'
import PageHeader from '../components/ui/PageHeader'
import StatusBadge from '../components/ui/StatusBadge'

const PAYMENT_TYPE_LABELS = {
  CREDIT: 'Credit',
  PDC: 'PDC',
  BANK_TRANSFER: 'Bank Transfer',
}

function RecordPaymentModal({ invoiceId, onClose }) {
  const queryClient = useQueryClient()
  const [amount, setAmount] = useState('')
  const [paymentType, setPaymentType] = useState('BANK_TRANSFER')
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState('')
  const [errors, setErrors] = useState({})

  const mutation = useMutation({
    mutationFn: (payload) => recordPayment({ invoiceId, ...payload }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoice', invoiceId] })
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      toast.success('Payment recorded.')
      onClose()
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || err.response?.data?.message || 'Could not record payment. Try again.')
    },
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    const errs = {}
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      errs.amount = 'Enter a valid payment amount.'
    }
    if (!paymentDate) errs.paymentDate = 'Payment date is required.'
    if (Object.keys(errs).length) {
      setErrors(errs)
      return
    }
    mutation.mutate({
      amount: Number(amount),
      paymentType,
      paymentDate,
      notes: notes || undefined,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ type: 'spring', duration: 0.4, bounce: 0.2 }}
        className="relative bg-white rounded-lg shadow-xl border border-gray-100 w-full max-w-md mx-4 p-6"
      >
        <h2 className="text-base font-semibold text-gray-900 mb-5">Record Payment</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="input-label">Amount (AED) <span className="text-red-500">*</span></label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => { setAmount(e.target.value); setErrors((er) => ({ ...er, amount: undefined })) }}
              className={`input-field ${errors.amount ? 'border-red-400' : ''}`}
              placeholder="0.00"
              autoFocus
            />
            {errors.amount && <p className="input-error">{errors.amount}</p>}
          </div>
          <div>
            <label className="input-label">Payment type</label>
            <select
              value={paymentType}
              onChange={(e) => setPaymentType(e.target.value)}
              className="input-field"
            >
              <option value="BANK_TRANSFER">Bank Transfer</option>
              <option value="CREDIT">Credit</option>
              <option value="PDC">PDC</option>
            </select>
          </div>
          <div>
            <label className="input-label">Payment date <span className="text-red-500">*</span></label>
            <input
              type="date"
              value={paymentDate}
              onChange={(e) => { setPaymentDate(e.target.value); setErrors((er) => ({ ...er, paymentDate: undefined })) }}
              className={`input-field ${errors.paymentDate ? 'border-red-400' : ''}`}
            />
            {errors.paymentDate && <p className="input-error">{errors.paymentDate}</p>}
          </div>
          <div>
            <label className="input-label">Notes</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="input-field"
              placeholder="Optional reference or note..."
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary" disabled={mutation.isPending}>
              {mutation.isPending ? 'Recording..' : 'Record Payment'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

export default function InvoiceDetailPage() {
  const { id } = useParams()
  const queryClient = useQueryClient()
  const [showPaymentModal, setShowPaymentModal] = useState(false)

  const { data: invoice, isLoading } = useQuery({
    queryKey: ['invoice', id],
    queryFn: () => getInvoice(id),
  })

  const markPaidMutation = useMutation({
    mutationFn: (paymentId) => markPaymentPaid({ invoiceId: id, paymentId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoice', id] })
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      toast.success('Payment marked as paid.')
    },
    onError: () => toast.error('Could not mark payment as paid. Try again.'),
  })

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-64 bg-gray-200 rounded" />
        <div className="h-40 bg-gray-200 rounded-lg" />
        <div className="h-48 bg-gray-200 rounded-lg" />
      </div>
    )
  }

  if (!invoice) {
    return (
      <div className="info-banner-yellow">
        <p className="info-banner-text">Invoice not found.</p>
      </div>
    )
  }

  const outstanding = (invoice.amount || 0) - (invoice.paidAmount || 0)
  const isPDC = invoice.paymentType === 'PDC'
  const supplierName = invoice.supplier?.name || invoice.supplierName || '—'
  const daysLeft = daysUntil(invoice.dueDate)
  const isOverdue = invoice.status === 'OVERDUE' || (daysLeft !== null && daysLeft < 0 && invoice.status !== 'PAID')

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <PageHeader
        title={invoice.invoiceNumber}
        subtitle={`Invoice — ${supplierName}`}
        action={
          invoice.status !== 'PAID' && (
            <button
              onClick={() => setShowPaymentModal(true)}
              className="btn-primary flex items-center gap-2"
            >
              <IoAddOutline />
              Record Payment
            </button>
          )
        }
      />

      {/* Summary card */}
      <div className="card mb-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <p className="text-xs text-gray-500 font-medium mb-1">Status</p>
            <StatusBadge status={invoice.status} />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium mb-1">Supplier</p>
            <p className="text-sm font-medium text-gray-800">{supplierName}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium mb-1">Invoice Amount</p>
            <p className="text-base font-bold text-gray-900">{formatCurrency(invoice.amount)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium mb-1">Payment Type</p>
            <p className="text-sm text-gray-700">
              {PAYMENT_TYPE_LABELS[invoice.paymentType] || invoice.paymentType || '—'}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium mb-1">Paid</p>
            <p className="text-base font-bold text-primary-green">
              {formatCurrency(invoice.paidAmount || 0)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium mb-1">Outstanding</p>
            <p className={`text-base font-bold ${outstanding > 0 ? 'text-red-600' : 'text-gray-400'}`}>
              {formatCurrency(outstanding)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium mb-1">Due Date</p>
            <p className={`text-sm font-medium ${isOverdue ? 'text-red-600' : 'text-gray-700'}`}>
              {formatDate(invoice.dueDate)}
              {isOverdue && <span className="ml-1 text-xs">(overdue)</span>}
            </p>
          </div>
          {invoice.purchaseOrder && (
            <div>
              <p className="text-xs text-gray-500 font-medium mb-1">Linked PO</p>
              <Link
                to={`/purchase-orders/${invoice.purchaseOrder.id}`}
                className="text-sm text-primary-green font-medium hover:underline"
              >
                {invoice.purchaseOrder.poNumber}
              </Link>
            </div>
          )}
        </div>
        {invoice.notes && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-500 font-medium mb-1">Notes</p>
            <p className="text-sm text-gray-700">{invoice.notes}</p>
          </div>
        )}
      </div>

      {/* PDC details */}
      {isPDC && (invoice.chequeNumber || invoice.maturityDate) && (
        <div className="card mb-6">
          <h2 className="text-sm font-semibold text-gray-800 mb-4">Cheque Details</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <p className="text-xs text-gray-500 font-medium mb-1">Cheque Number</p>
              <p className="text-sm font-mono text-gray-800">{invoice.chequeNumber || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium mb-1">Bank</p>
              <p className="text-sm text-gray-700">{invoice.bankName || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium mb-1">Cheque Date</p>
              <p className="text-sm text-gray-700">{formatDate(invoice.chequeDate)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium mb-1">Maturity Date</p>
              <p className="text-sm text-gray-700">{formatDate(invoice.maturityDate)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Payments table */}
      <div className="card p-0 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-800">Payment History</h2>
          {invoice.status !== 'PAID' && (
            <button
              onClick={() => setShowPaymentModal(true)}
              className="btn-secondary text-xs py-1.5 flex items-center gap-1.5"
            >
              <IoAddOutline />
              Record Payment
            </button>
          )}
        </div>
        {(!invoice.payments || invoice.payments.length === 0) ? (
          <p className="text-sm text-gray-400 py-8 text-center px-6">
            No payments recorded yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="common-table">
              <thead>
                <tr>
                  <th className="common-table-header">Date</th>
                  <th className="common-table-header">Amount</th>
                  <th className="common-table-header">Type</th>
                  <th className="common-table-header">Status</th>
                  <th className="common-table-header">Notes</th>
                  <th className="common-table-header">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoice.payments.map((payment) => (
                  <tr key={payment.id} className="common-table-body-row">
                    <td className="common-table-cell">{formatDate(payment.paymentDate || payment.createdAt)}</td>
                    <td className="common-table-cell font-medium">{formatCurrency(payment.amount)}</td>
                    <td className="common-table-cell text-gray-600">
                      {PAYMENT_TYPE_LABELS[payment.paymentType] || payment.paymentType || '—'}
                    </td>
                    <td className="common-table-cell">
                      {payment.isPaid ? (
                        <span className="badge-green">Paid</span>
                      ) : (
                        <span className="badge-yellow">Pending</span>
                      )}
                    </td>
                    <td className="common-table-cell text-gray-500">{payment.notes || '—'}</td>
                    <td className="common-table-cell">
                      {!payment.isPaid && (
                        <button
                          onClick={() => markPaidMutation.mutate(payment.id)}
                          disabled={markPaidMutation.isPending}
                          className="flex items-center gap-1.5 text-xs text-primary-green font-medium hover:underline disabled:opacity-50"
                        >
                          <IoCheckmarkOutline className="text-sm" />
                          Mark as Paid
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payment modal */}
      <AnimatePresence>
        {showPaymentModal && (
          <RecordPaymentModal
            invoiceId={id}
            onClose={() => setShowPaymentModal(false)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  )
}
