import React from 'react'

const statusMap = {
  DRAFT: { className: 'badge-gray', label: 'Draft' },
  PENDING_APPROVAL: { className: 'badge-yellow', label: 'Pending Approval' },
  APPROVED: { className: 'badge-green', label: 'Approved' },
  PAID: { className: 'badge-green', label: 'Paid' },
  PARTIALLY_PAID: { className: 'badge-blue', label: 'Partially Paid' },
  PENDING: { className: 'badge-yellow', label: 'Pending' },
  OVERDUE: { className: 'badge-red', label: 'Overdue' },
  CANCELLED: { className: 'badge-red', label: 'Cancelled' },
  INVOICED: { className: 'badge-blue', label: 'Invoiced' },
}

export default function StatusBadge({ status }) {
  const config = statusMap[status] || { className: 'badge-gray', label: status }
  return (
    <span className={config.className}>
      {config.label}
    </span>
  )
}
