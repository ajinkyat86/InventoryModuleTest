import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { toast } from 'react-toastify'
import { getSupplier, createSupplier, updateSupplier } from '../api/suppliers'
import PageHeader from '../components/ui/PageHeader'

const PAYMENT_TERMS = [
  { value: 'NET_30', label: 'Net 30' },
  { value: 'NET_60', label: 'Net 60' },
  { value: 'NET_90', label: 'Net 90' },
  { value: 'PDC', label: 'PDC' },
]

const emptyForm = {
  name: '',
  contactName: '',
  email: '',
  phone: '',
  paymentTerms: 'NET_30',
  notes: '',
}

export default function SupplierFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const isEdit = !!id

  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState({})

  const { data: supplier, isLoading } = useQuery({
    queryKey: ['supplier', id],
    queryFn: () => getSupplier(id),
    enabled: isEdit,
  })

  useEffect(() => {
    if (supplier) {
      setForm({
        name: supplier.name || '',
        contactName: supplier.contactName || '',
        email: supplier.email || '',
        phone: supplier.phone || '',
        paymentTerms: supplier.paymentTerms || 'NET_30',
        notes: supplier.notes || '',
      })
    }
  }, [supplier])

  const mutation = useMutation({
    mutationFn: isEdit
      ? (data) => updateSupplier({ id, ...data })
      : createSupplier,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
      if (isEdit) queryClient.invalidateQueries({ queryKey: ['supplier', id] })
      toast.success(isEdit ? 'Supplier updated.' : 'Supplier added.')
      navigate('/suppliers')
    },
    onError: (err) => {
      toast.error(
        err.response?.data?.error || err.response?.data?.message || 'Could not save supplier. Try again.'
      )
    },
  })

  const validate = () => {
    const errs = {}
    if (!form.name.trim()) errs.name = 'Supplier name is required.'
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errs.email = 'Enter a valid email address.'
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
    mutation.mutate(form)
  }

  const setField = (field, value) => {
    setForm((f) => ({ ...f, [field]: value }))
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }))
  }

  if (isEdit && isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-48 bg-gray-200 rounded" />
        <div className="h-96 bg-gray-200 rounded-lg" />
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <PageHeader
        title={isEdit ? 'Edit Supplier' : 'Add Supplier'}
        subtitle={isEdit ? 'Update supplier details.' : 'Fill in the details to add a new supplier.'}
      />

      <div className="card max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Name */}
          <div>
            <label className="input-label">
              Supplier name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              id="name"
              value={form.name}
              onChange={(e) => setField('name', e.target.value)}
              className={`input-field ${errors.name ? 'border-red-400' : ''}`}
              placeholder="e.g. Al Futtaim Trading"
            />
            {errors.name && <p className="input-error">{errors.name}</p>}
          </div>

          {/* Contact Name */}
          <div>
            <label className="input-label">Contact name</label>
            <input
              type="text"
              value={form.contactName}
              onChange={(e) => setField('contactName', e.target.value)}
              className="input-field"
              placeholder="e.g. Ahmed Al-Rashid"
            />
          </div>

          {/* Email + Phone */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="input-label">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setField('email', e.target.value)}
                className={`input-field ${errors.email ? 'border-red-400' : ''}`}
                placeholder="contact@supplier.com"
              />
              {errors.email && <p className="input-error">{errors.email}</p>}
            </div>
            <div>
              <label className="input-label">Phone</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setField('phone', e.target.value)}
                className="input-field"
                placeholder="+971 50 000 0000"
              />
            </div>
          </div>

          {/* Payment Terms */}
          <div>
            <label className="input-label">Payment terms</label>
            <select
              value={form.paymentTerms}
              onChange={(e) => setField('paymentTerms', e.target.value)}
              className="input-field"
            >
              {PAYMENT_TERMS.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="input-label">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setField('notes', e.target.value)}
              className="input-field h-auto py-3"
              rows={3}
              placeholder="Any additional notes about this supplier..."
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              className="btn-primary"
              disabled={mutation.isPending}
            >
              {mutation.isPending
                ? (isEdit ? 'Saving..' : 'Adding..')
                : (isEdit ? 'Save Changes' : 'Add Supplier')
              }
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => navigate('/suppliers')}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </motion.div>
  )
}
