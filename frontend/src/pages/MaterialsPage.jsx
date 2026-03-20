import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { IoCubeOutline, IoArrowUpOutline, IoArrowDownOutline } from 'react-icons/io5'
import { getMaterials } from '../api/materials'
import { formatCurrency } from '../utils/format'
import PageHeader from '../components/ui/PageHeader'
import EmptyState from '../components/ui/EmptyState'

function PriceChangeBadge({ currentPrice, avgPrice90d }) {
  if (!avgPrice90d || !currentPrice) {
    return <span className="text-gray-400">—</span>
  }
  const change = ((currentPrice - avgPrice90d) / avgPrice90d) * 100
  if (Math.abs(change) < 0.01) return <span className="text-gray-400">—</span>
  if (change > 0) {
    return (
      <span className="flex items-center gap-1 text-red-600 font-medium text-xs">
        <IoArrowUpOutline />
        +{change.toFixed(1)}%
      </span>
    )
  }
  return (
    <span className="flex items-center gap-1 text-primary-green font-medium text-xs">
      <IoArrowDownOutline />
      {change.toFixed(1)}%
    </span>
  )
}

export default function MaterialsPage() {
  const navigate = useNavigate()
  const { data: materials = [], isLoading } = useQuery({
    queryKey: ['materials'],
    queryFn: getMaterials,
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
        title="Materials"
        subtitle="Track your material catalogue and price history."
        action={
          <button onClick={() => navigate('/materials/new')} className="btn-primary">
            Add Material
          </button>
        }
      />

      <div className="card p-0 overflow-hidden">
        {materials.length === 0 ? (
          <EmptyState
            icon={IoCubeOutline}
            title="No materials yet"
            description="Add materials to your catalogue to start tracking prices and inventory."
            action={
              <Link to="/materials/new" className="btn-primary">
                Add Material
              </Link>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="common-table">
              <thead>
                <tr>
                  <th className="common-table-header">Code</th>
                  <th className="common-table-header">Name</th>
                  <th className="common-table-header">Unit</th>
                  <th className="common-table-header">Current Price</th>
                  <th className="common-table-header">Price Change</th>
                  <th className="common-table-header">Status</th>
                  <th className="common-table-header">Actions</th>
                </tr>
              </thead>
              <tbody>
                {materials.map((mat) => (
                  <tr key={mat.id} className="common-table-body-row">
                    <td className="common-table-cell font-mono text-xs text-gray-600">{mat.code}</td>
                    <td className="common-table-cell">
                      <Link
                        to={`/materials/${mat.id}`}
                        className="font-medium text-gray-900 hover:text-primary-green hover:underline"
                      >
                        {mat.name}
                      </Link>
                    </td>
                    <td className="common-table-cell text-gray-600">{mat.unit || '—'}</td>
                    <td className="common-table-cell font-medium">{formatCurrency(mat.currentPrice)}</td>
                    <td className="common-table-cell">
                      <PriceChangeBadge
                        currentPrice={mat.currentPrice}
                        avgPrice90d={mat.avgPrice90d}
                      />
                    </td>
                    <td className="common-table-cell">
                      {mat.isActive !== false ? (
                        <span className="badge-green">Active</span>
                      ) : (
                        <span className="badge-gray">Inactive</span>
                      )}
                    </td>
                    <td className="common-table-cell">
                      <button
                        onClick={() => navigate(`/materials/${mat.id}/edit`)}
                        className="text-xs text-primary-green font-medium hover:underline"
                      >
                        Edit
                      </button>
                    </td>
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
