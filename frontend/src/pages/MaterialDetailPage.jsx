import React from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  LineChart,
  Line,
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
    </motion.div>
  )
}
