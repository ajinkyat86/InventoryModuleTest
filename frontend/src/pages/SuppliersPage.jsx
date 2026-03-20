import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { toast } from 'react-toastify'
import { IoPeopleOutline, IoPencilOutline, IoTrashOutline } from 'react-icons/io5'
import { getSuppliers, deleteSupplier } from '../api/suppliers'
import PageHeader from '../components/ui/PageHeader'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import EmptyState from '../components/ui/EmptyState'

const PAYMENT_TERMS_LABELS = {
  NET_30: 'Net 30',
  NET_60: 'Net 60',
  NET_90: 'Net 90',
  PDC: 'PDC',
}

export default function SuppliersPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [deleteTarget, setDeleteTarget] = useState(null)

  const { data: suppliers = [], isLoading } = useQuery({
    queryKey: ['suppliers'],
    queryFn: getSuppliers,
  })

  const deleteMutation = useMutation({
    mutationFn: deleteSupplier,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
      toast.success('Supplier deleted.')
      setDeleteTarget(null)
    },
    onError: () => {
      toast.error('Could not delete supplier. It may be linked to existing records.')
      setDeleteTarget(null)
    },
  })

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-48 bg-gray-200 rounded" />
        <div className="h-64 bg-gray-200 rounded-lg" />
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
        title="Suppliers"
        subtitle="Manage your supplier directory."
        action={
          <button onClick={() => navigate('/suppliers/new')} className="btn-primary">
            Add Supplier
          </button>
        }
      />

      <div className="card p-0 overflow-hidden">
        {suppliers.length === 0 ? (
          <EmptyState
            icon={IoPeopleOutline}
            title="No suppliers yet"
            description="Add your first supplier to start creating purchase orders."
            action={
              <Link to="/suppliers/new" className="btn-primary">
                Add Supplier
              </Link>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="common-table">
              <thead>
                <tr>
                  <th className="common-table-header">Name</th>
                  <th className="common-table-header">Contact</th>
                  <th className="common-table-header">Email</th>
                  <th className="common-table-header">Payment Terms</th>
                  <th className="common-table-header">PO Count</th>
                  <th className="common-table-header">Actions</th>
                </tr>
              </thead>
              <tbody>
                {suppliers.map((supplier) => (
                  <tr key={supplier.id} className="common-table-body-row">
                    <td className="common-table-cell font-medium text-gray-900">{supplier.name}</td>
                    <td className="common-table-cell text-gray-600">{supplier.contactName || '—'}</td>
                    <td className="common-table-cell text-gray-600">{supplier.email || '—'}</td>
                    <td className="common-table-cell">
                      {PAYMENT_TERMS_LABELS[supplier.paymentTerms] || supplier.paymentTerms || '—'}
                    </td>
                    <td className="common-table-cell text-gray-600">
                      {supplier.poCount ?? supplier._count?.purchaseOrders ?? '—'}
                    </td>
                    <td className="common-table-cell">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => navigate(`/suppliers/${supplier.id}/edit`)}
                          className="p-1.5 text-gray-500 hover:text-primary-green hover:bg-secondary-green rounded transition-colors"
                          title="Edit supplier"
                        >
                          <IoPencilOutline className="text-base" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(supplier)}
                          className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Delete supplier"
                        >
                          <IoTrashOutline className="text-base" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete supplier"
        description={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
        onConfirm={() => deleteMutation.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
      />
    </motion.div>
  )
}
