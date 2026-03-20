import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import {
  IoTrendingUpOutline,
  IoTimeOutline,
  IoWalletOutline,
  IoWarningOutline,
} from 'react-icons/io5'
import { getDashboard } from '../api/dashboard'
import { formatCurrency, formatDate, daysUntil } from '../utils/format'
import StatusBadge from '../components/ui/StatusBadge'
import PageHeader from '../components/ui/PageHeader'

function KPICard({ icon: Icon, label, value, sub, color }) {
  const colorMap = {
    green: 'text-primary-green bg-secondary-green',
    yellow: 'text-yellow-700 bg-yellow-100',
    blue: 'text-blue-700 bg-blue-100',
    red: 'text-red-600 bg-red-100',
  }
  return (
    <div className="card flex items-start gap-4">
      <div className={`p-2.5 rounded-lg ${colorMap[color]}`}>
        <Icon className="text-xl" />
      </div>
      <div>
        <p className="text-xs text-gray-500 font-medium">{label}</p>
        <p className="text-xl font-bold text-gray-900 mt-0.5">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="grid grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 bg-gray-200 rounded-lg" />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-6">
        <div className="h-64 bg-gray-200 rounded-lg" />
        <div className="h-64 bg-gray-200 rounded-lg" />
      </div>
      <div className="h-48 bg-gray-200 rounded-lg" />
    </div>
  )
}

export default function DashboardPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard'],
    queryFn: getDashboard,
    refetchInterval: 30000,
  })

  if (isLoading) return <LoadingSkeleton />
  if (error) {
    return (
      <div className="info-banner-yellow">
        <p className="info-banner-text">Failed to load dashboard data. Try refreshing the page.</p>
      </div>
    )
  }

  const {
    committedSpend = 0,
    pendingApprovals = 0,
    outstandingPayables = 0,
    overdueInvoices = 0,
    spendByMonth = [],
    pdcsDue = [],
    recentPurchaseOrders = [],
    priceAlerts = [],
  } = data || {}

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <PageHeader title="Dashboard" subtitle="Overview of your inventory and financial activity." />

      {/* Price alerts */}
      {priceAlerts && priceAlerts.length > 0 && (
        <div className="info-banner-yellow mb-6">
          <p className="info-banner-heading mb-1">Price alert</p>
          <ul className="space-y-0.5">
            {priceAlerts.map((alert, i) => (
              <li key={i} className="info-banner-text">
                {alert.materialName} — price increased by {alert.changePercent?.toFixed(1)}% vs 90-day average
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <KPICard
          icon={IoTrendingUpOutline}
          label="Committed Spend"
          value={formatCurrency(committedSpend)}
          sub="Approved POs"
          color="green"
        />
        <KPICard
          icon={IoTimeOutline}
          label="Pending Approvals"
          value={pendingApprovals}
          sub="Purchase orders awaiting review"
          color="yellow"
        />
        <KPICard
          icon={IoWalletOutline}
          label="Outstanding Payables"
          value={formatCurrency(outstandingPayables)}
          sub="Total unpaid invoices"
          color="blue"
        />
        <KPICard
          icon={IoWarningOutline}
          label="Overdue Invoices"
          value={overdueInvoices}
          sub="Require immediate action"
          color="red"
        />
      </div>

      {/* Charts + PDCs */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
        {/* Spend by month */}
        <div className="card">
          <h2 className="text-sm font-semibold text-gray-800 mb-4">Spend by Month</h2>
          {spendByMonth.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
              No spend data available yet.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={spendByMonth} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(value) => [formatCurrency(value), 'Spend']}
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="amount" fill="#007019" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* PDCs Due */}
        <div className="card">
          <h2 className="text-sm font-semibold text-gray-800 mb-4">PDCs Due</h2>
          {(!pdcsDue || pdcsDue.length === 0) ? (
            <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
              No PDCs due in the near term.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="common-table">
                <thead>
                  <tr>
                    <th className="common-table-header py-3 pl-0">Cheque No.</th>
                    <th className="common-table-header py-3">Supplier</th>
                    <th className="common-table-header py-3">Amount</th>
                    <th className="common-table-header py-3">Maturity</th>
                    <th className="common-table-header py-3 pr-0">Days</th>
                  </tr>
                </thead>
                <tbody>
                  {pdcsDue.map((pdc, i) => {
                    const days = daysUntil(pdc.maturityDate)
                    const isUrgent = days !== null && days < 30
                    return (
                      <tr key={i} className="common-table-body-row">
                        <td className="common-table-cell py-3 pl-0 font-mono text-xs">{pdc.chequeNumber}</td>
                        <td className="common-table-cell py-3">{pdc.supplierName}</td>
                        <td className="common-table-cell py-3">{formatCurrency(pdc.amount)}</td>
                        <td className="common-table-cell py-3">{formatDate(pdc.maturityDate)}</td>
                        <td className={`common-table-cell py-3 pr-0 font-medium ${isUrgent ? 'text-red-600' : 'text-gray-600'}`}>
                          {days !== null ? (days < 0 ? `${Math.abs(days)}d overdue` : `${days}d`) : '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Recent Purchase Orders */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-800">Recent Purchase Orders</h2>
          <Link to="/purchase-orders" className="text-xs text-primary-green font-medium hover:underline">
            View all
          </Link>
        </div>
        {(!recentPurchaseOrders || recentPurchaseOrders.length === 0) ? (
          <p className="text-sm text-gray-400 py-6 text-center">No purchase orders yet. Create one to get started.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="common-table">
              <thead>
                <tr>
                  <th className="common-table-header">PO Number</th>
                  <th className="common-table-header">Supplier</th>
                  <th className="common-table-header">Status</th>
                  <th className="common-table-header">Amount</th>
                  <th className="common-table-header">Created</th>
                </tr>
              </thead>
              <tbody>
                {recentPurchaseOrders.map((po) => (
                  <tr key={po.id} className="common-table-body-row">
                    <td className="common-table-cell">
                      <Link
                        to={`/purchase-orders/${po.id}`}
                        className="text-primary-green font-medium hover:underline"
                      >
                        {po.poNumber}
                      </Link>
                    </td>
                    <td className="common-table-cell">{po.supplierName || po.supplier?.name || '—'}</td>
                    <td className="common-table-cell">
                      <StatusBadge status={po.status} />
                    </td>
                    <td className="common-table-cell">{formatCurrency(po.totalAmount)}</td>
                    <td className="common-table-cell">{formatDate(po.createdAt)}</td>
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
