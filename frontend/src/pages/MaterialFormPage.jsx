import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { toast } from 'react-toastify'
import { getMaterial, createMaterial, updateMaterial } from '../api/materials'
import PageHeader from '../components/ui/PageHeader'

const UNITS = [
  { value: 'kg', label: 'Kilogram (kg)' },
  { value: 'g', label: 'Gram (g)' },
  { value: 'ton', label: 'Metric ton' },
  { value: 'liter', label: 'Liter (L)' },
  { value: 'unit', label: 'Unit / piece' },
  { value: 'box', label: 'Box' },
  { value: 'roll', label: 'Roll' },
  { value: 'sqm', label: 'Square meter (m²)' },
  { value: 'lm', label: 'Linear meter (lm)' },
  { value: 'set', label: 'Set' },
]

const emptyForm = {
  code: '',
  name: '',
  description: '',
  unit: 'unit',
  currentPrice: '',
  isActive: true,
}

export default function MaterialFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const isEdit = !!id

  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState({})
  const [originalPrice, setOriginalPrice] = useState(null)

  const { data: material, isLoading } = useQuery({
    queryKey: ['material', id],
    queryFn: () => getMaterial(id),
    enabled: isEdit,
  })

  useEffect(() => {
    if (material) {
      setForm({
        code: material.code || '',
        name: material.name || '',
        description: material.description || '',
        unit: material.unit || 'unit',
        currentPrice: material.currentPrice?.toString() || '',
        isActive: material.isActive !== false,
      })
      setOriginalPrice(material.currentPrice)
    }
  }, [material])

  const mutation = useMutation({
    mutationFn: isEdit
      ? (data) => updateMaterial({ id, ...data })
      : createMaterial,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['materials'] })
      if (isEdit) {
        queryClient.invalidateQueries({ queryKey: ['material', id] })
        queryClient.invalidateQueries({ queryKey: ['material-price-history', id] })
      }
      toast.success(isEdit ? 'Material updated.' : 'Material added.')
      navigate(isEdit ? `/materials/${id}` : '/materials')
    },
    onError: (err) => {
      toast.error(
        err.response?.data?.message || 'Could not save material. Try again.'
      )
    },
  })

  const validate = () => {
    const errs = {}
    if (!form.code.trim()) errs.code = 'Material code is required.'
    if (!form.name.trim()) errs.name = 'Material name is required.'
    if (!form.currentPrice || isNaN(Number(form.currentPrice)) || Number(form.currentPrice) < 0) {
      errs.currentPrice = 'Enter a valid price.'
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
    mutation.mutate({
      ...form,
      currentPrice: Number(form.currentPrice),
    })
  }

  const setField = (field, value) => {
    setForm((f) => ({ ...f, [field]: value }))
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }))
  }

  const priceChanged = isEdit &&
    originalPrice !== null &&
    form.currentPrice !== '' &&
    Number(form.currentPrice) !== originalPrice

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
        title={isEdit ? 'Edit Material' : 'Add Material'}
        subtitle={isEdit ? 'Update material details.' : 'Add a new material to your catalogue.'}
      />

      <div className="card max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Code + Name */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="input-label">
                Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.code}
                onChange={(e) => setField('code', e.target.value)}
                className={`input-field ${errors.code ? 'border-red-400' : ''}`}
                placeholder="e.g. MAT-001"
              />
              {errors.code && <p className="input-error">{errors.code}</p>}
            </div>
            <div>
              <label className="input-label">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setField('name', e.target.value)}
                className={`input-field ${errors.name ? 'border-red-400' : ''}`}
                placeholder="e.g. Steel Rod 10mm"
              />
              {errors.name && <p className="input-error">{errors.name}</p>}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="input-label">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setField('description', e.target.value)}
              className="input-field h-auto py-3"
              rows={3}
              placeholder="Optional description or specification details..."
            />
          </div>

          {/* Unit + Price */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="input-label">Unit</label>
              <select
                value={form.unit}
                onChange={(e) => setField('unit', e.target.value)}
                className="input-field"
              >
                {UNITS.map((u) => (
                  <option key={u.value} value={u.value}>{u.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="input-label">
                Current price (AED) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.currentPrice}
                onChange={(e) => setField('currentPrice', e.target.value)}
                className={`input-field ${errors.currentPrice ? 'border-red-400' : ''}`}
                placeholder="0.00"
              />
              {errors.currentPrice && <p className="input-error">{errors.currentPrice}</p>}
            </div>
          </div>

          {/* Price change notice */}
          {priceChanged && (
            <div className="info-banner-blue">
              <p className="info-banner-text">
                Saving this will add a new entry to the price history for this material.
              </p>
            </div>
          )}

          {/* Active toggle */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              role="switch"
              aria-checked={form.isActive}
              onClick={() => setField('isActive', !form.isActive)}
              className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                form.isActive ? 'bg-primary-green' : 'bg-gray-300'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transform ring-0 transition duration-200 ${
                  form.isActive ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
            <label className="text-sm text-gray-700 font-medium cursor-pointer" onClick={() => setField('isActive', !form.isActive)}>
              {form.isActive ? 'Active' : 'Inactive'}
            </label>
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
                : (isEdit ? 'Save Changes' : 'Add Material')
              }
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => navigate(isEdit ? `/materials/${id}` : '/materials')}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </motion.div>
  )
}
