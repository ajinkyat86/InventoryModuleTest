import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { toast } from 'react-toastify'
import { IoAddOutline, IoTrashOutline } from 'react-icons/io5'
import { createPurchaseOrder } from '../api/purchaseOrders'
import { getSuppliers } from '../api/suppliers'
import { getMaterials } from '../api/materials'
import { formatCurrency } from '../utils/format'
import PageHeader from '../components/ui/PageHeader'

const emptyLine = () => ({
  _key: Math.random().toString(36).slice(2),
  materialId: '',
  quantity: '',
  unitPrice: '',
})

export default function PurchaseOrderFormPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [supplierId, setSupplierId] = useState('')
  const [notes, setNotes] = useState('')
  const [lineItems, setLineItems] = useState([emptyLine()])
  const [errors, setErrors] = useState({})

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: getSuppliers,
  })

  const { data: materials = [] } = useQuery({
    queryKey: ['materials'],
    queryFn: getMaterials,
  })

  const mutation = useMutation({
    mutationFn: createPurchaseOrder,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] })
      toast.success('Purchase order created as draft.')
      navigate(`/purchase-orders/${data.id}`)
    },
    onError: (err) => {
      toast.error(
        err.response?.data?.message || 'Could not create purchase order. Try again.'
      )
    },
  })

  const materialMap = Object.fromEntries(materials.map((m) => [m.id, m]))

  const setLineField = (key, field, value) => {
    setLineItems((lines) =>
      lines.map((line) => {
        if (line._key !== key) return line
        const updated = { ...line, [field]: value }
        // Auto-fill price when material selected
        if (field === 'materialId' && value && materialMap[value]) {
          updated.unitPrice = materialMap[value].currentPrice?.toString() || ''
        }
        return updated
      })
    )
    setErrors((e) => ({ ...e, [`line_${key}_${field}`]: undefined }))
  }

  const addLine = () => setLineItems((lines) => [...lines, emptyLine()])

  const removeLine = (key) => {
    if (lineItems.length === 1) return
    setLineItems((lines) => lines.filter((l) => l._key !== key))
  }

  const calculateTotal = () => {
    return lineItems.reduce((sum, line) => {
      const qty = Number(line.quantity) || 0
      const price = Number(line.unitPrice) || 0
      return sum + qty * price
    }, 0)
  }

  const validate = () => {
    const errs = {}
    if (!supplierId) errs.supplierId = 'Select a supplier.'
    lineItems.forEach((line) => {
      if (!line.materialId) errs[`line_${line._key}_materialId`] = 'Select a material.'
      if (!line.quantity || Number(line.quantity) <= 0) errs[`line_${line._key}_quantity`] = 'Enter a valid quantity.'
      if (!line.unitPrice || Number(line.unitPrice) < 0) errs[`line_${line._key}_unitPrice`] = 'Enter a valid price.'
    })
    return errs
  }

  const handleSaveDraft = () => {
    const errs = validate()
    if (Object.keys(errs).length) {
      setErrors(errs)
      return
    }
    setErrors({})
    mutation.mutate({
      supplierId,
      notes,
      status: 'DRAFT',
      lineItems: lineItems.map(({ materialId, quantity, unitPrice }) => ({
        materialId,
        quantity: Number(quantity),
        unitPrice: Number(unitPrice),
      })),
    })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <PageHeader
        title="New Purchase Order"
        subtitle="Fill in the details below to create a draft purchase order."
      />

      <div className="space-y-6 max-w-4xl">
        {/* Header section */}
        <div className="card space-y-4">
          <h2 className="text-sm font-semibold text-gray-800">Order details</h2>

          <div>
            <label className="input-label">
              Supplier <span className="text-red-500">*</span>
            </label>
            <select
              value={supplierId}
              onChange={(e) => {
                setSupplierId(e.target.value)
                setErrors((er) => ({ ...er, supplierId: undefined }))
              }}
              className={`input-field ${errors.supplierId ? 'border-red-400' : ''}`}
            >
              <option value="">Select a supplier...</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            {errors.supplierId && <p className="input-error">{errors.supplierId}</p>}
          </div>

          <div>
            <label className="input-label">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="input-field h-auto py-3"
              rows={2}
              placeholder="Add any notes or special instructions..."
            />
          </div>
        </div>

        {/* Line items */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-800">Line items</h2>
            <button
              type="button"
              onClick={addLine}
              className="btn-secondary flex items-center gap-1.5 text-xs py-1.5"
            >
              <IoAddOutline className="text-sm" />
              Add Line
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="common-table">
              <thead>
                <tr>
                  <th className="common-table-header" style={{ minWidth: 220 }}>Material</th>
                  <th className="common-table-header" style={{ minWidth: 100 }}>Qty</th>
                  <th className="common-table-header" style={{ minWidth: 140 }}>Unit Price (AED)</th>
                  <th className="common-table-header" style={{ minWidth: 120 }}>Total</th>
                  <th className="common-table-header" style={{ width: 48 }}></th>
                </tr>
              </thead>
              <tbody>
                {lineItems.map((line) => {
                  const lineTotal = (Number(line.quantity) || 0) * (Number(line.unitPrice) || 0)
                  return (
                    <tr key={line._key} className="common-table-body-row">
                      <td className="common-table-cell py-3">
                        <select
                          value={line.materialId}
                          onChange={(e) => setLineField(line._key, 'materialId', e.target.value)}
                          className={`input-field ${errors[`line_${line._key}_materialId`] ? 'border-red-400' : ''}`}
                        >
                          <option value="">Select material...</option>
                          {materials.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name} ({m.code})
                            </option>
                          ))}
                        </select>
                        {errors[`line_${line._key}_materialId`] && (
                          <p className="input-error">{errors[`line_${line._key}_materialId`]}</p>
                        )}
                      </td>
                      <td className="common-table-cell py-3">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={line.quantity}
                          onChange={(e) => setLineField(line._key, 'quantity', e.target.value)}
                          className={`input-field ${errors[`line_${line._key}_quantity`] ? 'border-red-400' : ''}`}
                          placeholder="0"
                        />
                        {errors[`line_${line._key}_quantity`] && (
                          <p className="input-error">{errors[`line_${line._key}_quantity`]}</p>
                        )}
                      </td>
                      <td className="common-table-cell py-3">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={line.unitPrice}
                          onChange={(e) => setLineField(line._key, 'unitPrice', e.target.value)}
                          className={`input-field ${errors[`line_${line._key}_unitPrice`] ? 'border-red-400' : ''}`}
                          placeholder="0.00"
                        />
                        {errors[`line_${line._key}_unitPrice`] && (
                          <p className="input-error">{errors[`line_${line._key}_unitPrice`]}</p>
                        )}
                      </td>
                      <td className="common-table-cell py-3 font-medium text-gray-700">
                        {formatCurrency(lineTotal)}
                      </td>
                      <td className="common-table-cell py-3">
                        <button
                          type="button"
                          onClick={() => removeLine(line._key)}
                          disabled={lineItems.length === 1}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <IoTrashOutline className="text-base" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Total */}
          <div className="flex justify-end pt-4 border-t border-gray-100 mt-2">
            <div className="text-right">
              <p className="text-xs text-gray-500 mb-0.5">Order total</p>
              <p className="text-lg font-bold text-gray-900">{formatCurrency(calculateTotal())}</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={mutation.isPending}
            className="btn-primary"
          >
            {mutation.isPending ? 'Saving..' : 'Save as Draft'}
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => navigate('/purchase-orders')}
          >
            Cancel
          </button>
        </div>
      </div>
    </motion.div>
  )
}
