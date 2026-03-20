import React, { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { toast } from 'react-toastify'
import { IoTrashOutline, IoCheckmarkOutline, IoArrowUndoOutline, IoSendOutline } from 'react-icons/io5'
import { getPurchaseOrder, updatePurchaseOrderStatus, deletePurchaseOrder } from '../api/purchaseOrders'
import { formatCurrency, formatDate } from '../utils/format'
import PageHeader from '../components/ui/PageHeader'
import StatusBadge from '../components/ui/StatusBadge'
import ConfirmDialog from '../components/ui/ConfirmDialog'

export default function PurchaseOrderDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [deleteDialog, setDeleteDialog] = useState(false)

  const { data: po, isLoading } = useQuery({
    queryKey: ['purchase-order', id],
    queryFn: () => getPurchaseOrder(id),
  })

  const statusMutation = useMutation({
    mutationFn: (status) => updatePurchaseOrderStatus({ id, status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-order', id] })
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] })
      toast.success('Status updated.')
    },
    onError: () => toast.error('Could not update status. Try again.'),
  })

  const deleteMutation = useMutation({
    mutationFn: () => deletePurchaseOrder(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] })
      toast.success('Purchase order deleted.')
      navigate('/purchase-orders')
    },
    onError: () => toast.error('Could not delete this purchase order.'),
  })

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-64 bg-gray-200 rounded" />
        <div className="h-40 bg-gray-200 rounded-lg" />
        <div className="h-64 bg-gray-200 rounded-lg" />
      </div>
    )
  }

  if (!po) {
    return (
      <div className="info-banner-yellow">
        <p className="info-banner-text">Purchase order not found.</p>
      </div>
    )
  }

  const canDelete = po.status === 'DRAFT'
  const supplierName = po.supplier?.name || po.supplierName || '—'

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <PageHeader
        title={po.poNumber}
        subtitle={`Purchase order — ${supplierName}`}
        action={
          <div className="flex items-center gap-2">
            {po.status === 'DRAFT' && (
              <button
                onClick={() => statusMutation.mutate('PENDING_APPROVAL')}
                disabled={statusMutation.isPending}
                className="btn-primary flex items-center gap-2"
              >
                <IoSendOutline />
                Submit for Approval
              </button>
            )}
            {po.status === 'PENDING_APPROVAL' && (
              <>
                <button
                  onClick={() => statusMutation.mutate('APPROVED')}
                  disabled={statusMutation.isPending}
                  className="btn-primary flex items-center gap-2"
                >
                  <IoCheckmarkOutline />
                  Approve
                </button>
                <button
                  onClick={() => statusMutation.mutate('DRAFT')}
                  disabled={statusMutation.isPending}
                  className="btn-secondary flex items-center gap-2"
                >
                  <IoArrowUndoOutline />
                  Send Back to Draft
                </button>
              </>
            )}
            {canDelete && (
              <button
                onClick={() => setDeleteDialog(true)}
                className="btn-danger flex items-center gap-2"
              >
                <IoTrashOutline />
                Delete
              </button>
            )}
          </div>
        }
      />

      {/* Header card */}
      <div className="card mb-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <p className="text-xs text-gray-500 font-medium mb-1">Status</p>
            <StatusBadge status={po.status} />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium mb-1">Supplier</p>
            <p className="text-sm font-medium text-gray-800">{supplierName}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium mb-1">Total Amount</p>
            <p className="text-base font-bold text-gray-900">{formatCurrency(po.totalAmount)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium mb-1">Created</p>
            <p className="text-sm text-gray-700">{formatDate(po.createdAt)}</p>
          </div>
        </div>
        {po.notes && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-500 font-medium mb-1">Notes</p>
            <p className="text-sm text-gray-700">{po.notes}</p>
          </div>
        )}
      </div>

      {/* Line items */}
      <div className="card p-0 overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-800">Line Items</h2>
        </div>
        {(!po.lineItems || po.lineItems.length === 0) ? (
          <p className="text-sm text-gray-400 py-8 text-center px-6">No line items on this order.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="common-table">
              <thead>
                <tr>
                  <th className="common-table-header">Material</th>
                  <th className="common-table-header">Quantity</th>
                  <th className="common-table-header">Unit Price</th>
                  <th className="common-table-header">Total</th>
                </tr>
              </thead>
              <tbody>
                {po.lineItems.map((item, i) => (
                  <tr key={item.id || i} className="common-table-body-row">
                    <td className="common-table-cell">
                      <span className="font-medium text-gray-900">
                        {item.material?.name || item.materialName || '—'}
                      </span>
                      {(item.material?.code || item.materialCode) && (
                        <span className="text-xs text-gray-400 ml-1.5 font-mono">
                          {item.material?.code || item.materialCode}
                        </span>
                      )}
                    </td>
                    <td className="common-table-cell">
                      {Number(item.quantity).toLocaleString()} {item.material?.unit || ''}
                    </td>
                    <td className="common-table-cell">{formatCurrency(item.unitPrice)}</td>
                    <td className="common-table-cell font-medium">
                      {formatCurrency(item.quantity * item.unitPrice)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3} className="common-table-cell text-right font-semibold text-gray-700">
                    Total
                  </td>
                  <td className="common-table-cell font-bold text-gray-900">
                    {formatCurrency(po.totalAmount)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Linked invoices */}
      {po.invoices && po.invoices.length > 0 && (
        <div className="card p-0 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-800">Linked Invoices</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="common-table">
              <thead>
                <tr>
                  <th className="common-table-header">Invoice No.</th>
                  <th className="common-table-header">Amount</th>
                  <th className="common-table-header">Due Date</th>
                  <th className="common-table-header">Status</th>
                </tr>
              </thead>
              <tbody>
                {po.invoices.map((inv) => (
                  <tr key={inv.id} className="common-table-body-row">
                    <td className="common-table-cell">
                      <Link
                        to={`/invoices/${inv.id}`}
                        className="text-primary-green font-medium hover:underline"
                      >
                        {inv.invoiceNumber}
                      </Link>
                    </td>
                    <td className="common-table-cell">{formatCurrency(inv.amount)}</td>
                    <td className="common-table-cell">{formatDate(inv.dueDate)}</td>
                    <td className="common-table-cell">
                      <StatusBadge status={inv.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={deleteDialog}
        title="Delete purchase order"
        description={`Are you sure you want to delete ${po.poNumber}? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
        onConfirm={() => deleteMutation.mutate()}
        onCancel={() => setDeleteDialog(false)}
      />
    </motion.div>
  )
}
