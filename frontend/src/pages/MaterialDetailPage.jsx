import React from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { IoPencilOutline } from 'react-icons/io5'
import { getMaterial, getMaterialPriceHistory } from '../api/materials'
import { formatCurrency, formatDate } from '../utils/format'
import PageHeader from '../components/ui/PageHeader'

export default function MaterialDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const { data: material, isLoading: loadingMaterial } = useQuery({
    queryKey: ['material', id],
    queryFn: () => getMaterial(id),
  })

  const { data: priceHistory = [], isLoading: loadingHistory } = useQuery({
    queryKey: ['material-price-history', id],
    queryFn: () => getMaterialPriceHistory(id),
  })

  if (loadingMaterial) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-64 bg-gray-200 rounded" />
        <div className="h-48 bg-gray-200 rounded-lg" />
        <div className="h-64 bg-gray-200 rounded-lg" />
      </div>
    )
  }

  if (!material) {
    return (
      <div className="info-banner-yellow">
        <p className="info-banner-text">Material not found.</p>
      </div>
    )
  }

  // Sort price history ascending by date for chart
  const chartData = [...priceHistory]
    .sort((a, b) => new Date(a.date || a.createdAt) - new Date(b.date || b.createdAt))
    .map((h) => ({
      date: formatDate(h.date || h.createdAt),
      price: h.price,
    }))

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <PageHeader
        title={material.name}
        subtitle={`${material.code} · ${material.unit || 'Unit not set'}`}
        action={
          <button
            onClick={() => navigate(`/materials/${id}/edit`)}
            className="btn-secondary flex items-center gap-2"
          >
            <IoPencilOutline />
            Edit Material
          </button>
        }
      />

      {/* Material summary card */}
      <div className="card mb-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <p className="text-xs text-gray-500 font-medium mb-1">Current Price</p>
            <p className="text-lg font-bold text-gray-900">{formatCurrency(material.currentPrice)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium mb-1">Unit</p>
            <p className="text-base font-medium text-gray-700">{material.unit || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium mb-1">Status</p>
            {material.isActive !== false ? (
              <span className="badge-green">Active</span>
            ) : (
              <span className="badge-gray">Inactive</span>
            )}
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium mb-1">Description</p>
            <p className="text-sm text-gray-600">{material.description || '—'}</p>
          </div>
        </div>
      </div>

      {/* Price history chart */}
      <div className="card mb-6">
        <h2 className="text-sm font-semibold text-gray-800 mb-4">Price History</h2>
        {loadingHistory ? (
          <div className="h-48 bg-gray-100 animate-pulse rounded" />
        ) : chartData.length < 2 ? (
          <p className="text-sm text-gray-400 py-8 text-center">
            Not enough price history to display a chart yet.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: '#6b7280' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#6b7280' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${v.toLocaleString()}`}
              />
              <Tooltip
                formatter={(value) => [formatCurrency(value), 'Price']}
                contentStyle={{
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb',
                  fontSize: '12px',
                }}
              />
              <Line
                type="monotone"
                dataKey="price"
                stroke="#007019"
                strokeWidth={2}
                dot={{ fill: '#007019', r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Price history table */}
      <div className="card p-0 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-800">Price Log</h2>
        </div>
        {loadingHistory ? (
          <div className="animate-pulse h-32 bg-gray-50" />
        ) : priceHistory.length === 0 ? (
          <p className="text-sm text-gray-400 py-8 text-center px-6">
            No price history recorded yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="common-table">
              <thead>
                <tr>
                  <th className="common-table-header">Date</th>
                  <th className="common-table-header">Price</th>
                  <th className="common-table-header">Change</th>
                  <th className="common-table-header">Note</th>
                </tr>
              </thead>
              <tbody>
                {[...priceHistory]
                  .sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt))
                  .map((entry, i, arr) => {
                    const prev = arr[i + 1]
                    const change = prev ? ((entry.price - prev.price) / prev.price) * 100 : null
                    return (
                      <tr key={entry.id || i} className="common-table-body-row">
                        <td className="common-table-cell">{formatDate(entry.date || entry.createdAt)}</td>
                        <td className="common-table-cell font-medium">{formatCurrency(entry.price)}</td>
                        <td className="common-table-cell">
                          {change === null ? (
                            <span className="text-gray-400 text-xs">Initial</span>
                          ) : change > 0 ? (
                            <span className="text-red-600 text-xs font-medium">+{change.toFixed(1)}%</span>
                          ) : change < 0 ? (
                            <span className="text-primary-green text-xs font-medium">{change.toFixed(1)}%</span>
                          ) : (
                            <span className="text-gray-400 text-xs">No change</span>
                          )}
                        </td>
                        <td className="common-table-cell text-gray-500">{entry.note || '—'}</td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {/* Procurement Summary */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-6">
        <h2 className="text-base font-semibold text-gray-800">Procurement Summary</h2>

        {/* KPI cards */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total Ordered', value: `${material.totalOrdered || 0} ${material.unit || ''}` },
            { label: 'Total Received', value: `${material.totalReceived || 0} ${material.unit || ''}` },
            { label: 'Total Spend', value: `AED ${(material.totalSpend || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}` },
          ].map(kpi => (
            <div key={kpi.label} className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wide">{kpi.label}</p>
              <p className="text-lg font-bold text-gray-900 mt-1">{kpi.value}</p>
            </div>
          ))}
        </div>

        {/* Top suppliers */}
        {material.topSuppliers?.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Top Suppliers</h3>
            <table className="w-full text-sm">
              <thead><tr className="text-left text-gray-500 border-b">
                <th className="pb-2">Supplier</th><th className="pb-2 text-right">Spend</th>
              </tr></thead>
              <tbody>
                {material.topSuppliers.map(s => (
                  <tr key={s.id} className="border-b border-gray-50">
                    <td className="py-2"><Link to={`/suppliers/${s.id}`} className="text-blue-600 hover:underline">{s.name}</Link></td>
                    <td className="py-2 text-right font-medium">AED {s.spend.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Spend by month */}
        {material.spendByMonth?.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Spend by Month</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={material.spendByMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={v => [`AED ${v.toLocaleString()}`, 'Spend']} />
                <Bar dataKey="total" fill="#6366f1" radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </motion.div>
  )
}
