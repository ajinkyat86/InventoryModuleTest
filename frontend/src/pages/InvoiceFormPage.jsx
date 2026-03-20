import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { toast } from 'react-toastify'
import { createInvoice } from '../api/invoices'
import { getPurchaseOrders } from '../api/purchaseOrders'
import { getSuppliers } from '../api/suppliers'
import PageHeader from '../components/ui/PageHeader'

const PAYMENT_TYPES = [
  { value: 'CREDIT', label: 'Credit' },
  { value: 'PDC', label: 'PDC (Post-Dated Cheque)' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
]

function generateInvoiceNumber() {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const rand = Math.floor(1000 + Math.random() * 9000)
  return `INV-${y}${m}-${rand}`
}

const emptyForm = {
  invoiceNumber: generateInvoiceNumber(),
  purchaseOrderId: '',
  supplierId: '',
  amount: '',
  paymentType: 'CREDIT',
  dueDate: '',
  notes: '',
  // PDC fields
  chequeNumber: '',
  chequeDate: '',
  maturityDate: '',
  bankName: '',
}

export default function InvoiceFormPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState({})

  const { data: approvedPOs = [] } = useQuery({
    queryKey: ['purchase-orders', 'APPROVED'],
    queryFn: () => getPurchaseOrders('APPROVED'),
  })

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: getSuppliers,
  })

  const mutation = useMutation({
    mutationFn: createInvoice,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      toast.success('Invoice created.')
      navigate(`/invoices/${data.id}`)
    },
    onError: (err) => {
      toast.error(
        err.response?.data?.message || 'Could not create invoice. Try again.'
      )
    },
  })

  // When a PO is selected, auto-fill supplier + amount
  const poMap = Object.fromEntries(approvedPOs.map((po) => [po.id, po]))
  useEffect(() => {
    if (form.purchaseOrderId && poMap[form.purchaseOrderId]) {
      const po = poMap[form.purchaseOrderId]
      setForm((f) => ({
        ...f,
        supplierId: po.supplierId || po.supplier?.id || f.supplierId,
        amount: po.totalAmount?.toString() || f.amount,
      }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.purchaseOrderId])

  const setField = (field, value) => {
    setForm((f) => ({ ...f, [field]: value }))
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }))
  }

  const validate = () => {
    const errs = {}
    if (!form.invoiceNumber.trim()) errs.invoiceNumber = 'Invoice number is required.'
    if (!form.amount || isNaN(Number(form.amount)) || Number(form.amount) <= 0) {
      errs.amount = 'Enter a valid amount.'
    }
    if (!form.dueDate) errs.dueDate = 'Due date is required.'
    if (!form.supplierId && !form.purchaseOrderId) {
      errs.supplierId = 'Select a supplier or link a purchase order.'
    }
    if (form.paymentType === 'PDC') {
      if (!form.chequeNumber.trim()) errs.chequeNumber = 'Cheque number is required.'
      if (!form.maturityDate) errs.maturityDate = 'Maturity date is required.'
    }
    return errs
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) {
      setErrors(errs)
      return
    }
    setErrors({})

    const payload = {
      invoiceNumber: form.invoiceNumber,
      amount: Number(form.amount),
      paymentType: form.paymentType,
      dueDate: form.dueDate,
      notes: form.notes || undefined,
    }
    if (form.purchaseOrderId) payload.purchaseOrderId = form.purchaseOrderId
    if (form.supplierId) payload.supplierId = form.supplierId
    if (form.paymentType === 'PDC') {
      payload.chequeNumber = form.chequeNumber
      payload.chequeDate = form.chequeDate || undefined
      payload.maturityDate = form.maturityDate
      payload.bankName = form.bankName || undefined
    }

    mutation.mutate(payload)
  }

  const isPDC = form.paymentType === 'PDC'

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <PageHeader
        title="New Invoice"
        subtitle="Record a supplier invoice and link it to a purchase order."
      />

      <div className="card max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Invoice Number */}
          <div>
            <label className="input-label">
              Invoice number <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.invoiceNumber}
              onChange={(e) => setField('invoiceNumber', e.target.value)}
              className={`input-field ${errors.invoiceNumber ? 'border-red-400' : ''}`}
              placeholder="INV-2026-001"
            />
            {errors.invoiceNumber && <p className="input-error">{errors.invoiceNumber}</p>}
          </div>

          {/* Linked PO */}
          <div>
            <label className="input-label">Linked purchase order (optional)</label>
            <select
              value={form.purchaseOrderId}
              onChange={(e) => setField('purchaseOrderId', e.target.value)}
              className="input-field"
            >
              <option value="">— No linked PO —</option>
              {approvedPOs.map((po) => (
                <option key={po.id} value={po.id}>
                  {po.poNumber} — {po.supplier?.name || 'Unknown supplier'}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-400 mt-1">
              Selecting a PO will auto-fill the supplier and amount.
            </p>
          </div>

          {/* Supplier */}
          <div>
            <label className="input-label">
              Supplier {!form.purchaseOrderId && <span className="text-red-500">*</span>}
            </label>
            <select
              value={form.supplierId}
              onChange={(e) => setField('supplierId', e.target.value)}
              className={`input-field ${errors.supplierId ? 'border-red-400' : ''}`}
              disabled={!!form.purchaseOrderId}
            >
              <option value="">Select a supplier...</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            {errors.supplierId && <p className="input-error">{errors.supplierId}</p>}
          </div>

          {/* Amount + Due Date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="input-label">
                Amount (AED) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.amount}
                onChange={(e) => setField('amount', e.target.value)}
                className={`input-field ${errors.amount ? 'border-red-400' : ''}`}
                placeholder="0.00"
              />
              {errors.amount && <p className="input-error">{errors.amount}</p>}
            </div>
            <div>
              <label className="input-label">
                Due date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={form.dueDate}
                onChange={(e) => setField('dueDate', e.target.value)}
                className={`input-field ${errors.dueDate ? 'border-red-400' : ''}`}
              />
              {errors.dueDate && <p className="input-error">{errors.dueDate}</p>}
            </div>
          </div>

          {/* Payment Type */}
          <div>
            <label className="input-label">Payment type</label>
            <div className="flex gap-3">
              {PAYMENT_TYPES.map((pt) => (
                <label
                  key={pt.value}
                  className={`flex items-center gap-2 px-4 py-2.5 border rounded-lg cursor-pointer text-sm font-medium transition-colors ${
                    form.paymentType === pt.value
                      ? 'border-primary-green bg-secondary-green text-primary-green'
                      : 'border-gray-300 text-gray-600 hover:border-gray-400'
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentType"
                    value={pt.value}
                    checked={form.paymentType === pt.value}
                    onChange={() => setField('paymentType', pt.value)}
                    className="sr-only"
                  />
                  {pt.label}
                </label>
              ))}
            </div>
          </div>

          {/* PDC fields */}
          {isPDC && (
            <div className="border border-blue-200 rounded-lg p-4 bg-blue-50 space-y-4">
              <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Cheque Details</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="input-label">
                    Cheque number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.chequeNumber}
                    onChange={(e) => setField('chequeNumber', e.target.value)}
                    className={`input-field ${errors.chequeNumber ? 'border-red-400' : ''}`}
                    placeholder="e.g. 100234"
                  />
                  {errors.chequeNumber && <p className="input-error">{errors.chequeNumber}</p>}
                </div>
                <div>
                  <label className="input-label">Bank name</label>
                  <input
                    type="text"
                    value={form.bankName}
                    onChange={(e) => setField('bankName', e.target.value)}
                    className="input-field"
                    placeholder="e.g. Emirates NBD"
                  />
                </div>
                <div>
                  <label className="input-label">Cheque date</label>
                  <input
                    type="date"
                    value={form.chequeDate}
                    onChange={(e) => setField('chequeDate', e.target.value)}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="input-label">
                    Maturity date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={form.maturityDate}
                    onChange={(e) => setField('maturityDate', e.target.value)}
                    className={`input-field ${errors.maturityDate ? 'border-red-400' : ''}`}
                  />
                  {errors.maturityDate && <p className="input-error">{errors.maturityDate}</p>}
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="input-label">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setField('notes', e.target.value)}
              className="input-field h-auto py-3"
              rows={2}
              placeholder="Any additional notes..."
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button type="submit" className="btn-primary" disabled={mutation.isPending}>
              {mutation.isPending ? 'Creating..' : 'Create Invoice'}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => navigate('/invoices')}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </motion.div>
  )
}
