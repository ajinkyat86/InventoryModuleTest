import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import api from '../api/client'

const statusColors = {
  APPROVED: 'bg-green-100 text-green-800',
  PENDING_APPROVAL: 'bg-yellow-100 text-yellow-800',
  DRAFT: 'bg-gray-100 text-gray-700',
  INVOICED: 'bg-blue-100 text-blue-800',
  CANCELLED: 'bg-red-100 text-red-800',
  PAID: 'bg-green-100 text-green-800',
  OVERDUE: 'bg-red-100 text-red-800',
  PARTIALLY_PAID: 'bg-orange-100 text-orange-800',
  PENDING: 'bg-yellow-100 text-yellow-800',
}

function fmt(n) {
  return (n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function SupplierDetailPage() {
  const { id } = useParams()
  const { data, isLoading, error } = useQuery({
    queryKey: ['supplier-report', id],
    queryFn: () => api.get(`/suppliers/${id}/report`).then(r => r.data),
  })

  if (isLoading) return <div className="p-8 text-gray-500">Loading...</div>
  if (error) return <div className="p-8 text-red-500">Failed to load supplier report.</div>
  if (!data) return null

  const { supplier, totalCommittedSpend, totalInvoiced, totalPaid, outstandingPayables,
    spendByMonth, upcomingPDCs, recentPOs, recentInvoices, topMaterials } = data

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link to="/suppliers" className="text-sm text-blue-600 hover:underline mb-1 block">← Suppliers</Link>
          <h1 className="text-2xl font-bold text-gray-900">{supplier.name}</h1>
          <p className="text-gray-500 text-sm mt-1">
            {supplier.contactPerson && <span>{supplier.contactPerson} · </span>}
            {supplier.email && <span>{supplier.email} · </span>}
            {supplier.paymentTerms && <span>Payment terms: {supplier.paymentTerms} days</span>}
          </p>
        </div>
        <Link to={`/suppliers/${id}/edit`}
          className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium hover:bg-gray-50">
          Edit Supplier
        </Link>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Committed Spend', value: `AED ${fmt(totalCommittedSpend)}` },
          { label: 'Total Invoiced', value: `AED ${fmt(totalInvoiced)}` },
          { label: 'Total Paid', value: `AED ${fmt(totalPaid)}` },
          { label: 'Outstanding', value: `AED ${fmt(outstandingPayables)}`, highlight: outstandingPayables > 0 },
        ].map(kpi => (
          <div key={kpi.label} className={`bg-white rounded-xl border p-4 ${kpi.highlight ? 'border-red-200' : 'border-gray-200'} shadow-sm`}>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{kpi.label}</p>
            <p className={`text-xl font-bold mt-1 ${kpi.highlight ? 'text-red-600' : 'text-gray-900'}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Spend by Month */}
      {spendByMonth?.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-base font-semibold text-gray-800 mb-4">Spend by Month</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={spendByMonth}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={v => [`AED ${fmt(v)}`, 'Spend']} />
              <Bar dataKey="total" fill="#3b82f6" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Upcoming PDCs */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-base font-semibold text-gray-800 mb-4">Upcoming PDCs</h2>
        {upcomingPDCs?.length === 0 ? (
          <p className="text-gray-400 text-sm">No upcoming PDCs.</p>
        ) : (
          <table className="w-full text-sm">
            <thead><tr className="text-left text-gray-500 border-b">
              <th className="pb-2">Cheque #</th><th className="pb-2">Maturity Date</th><th className="pb-2 text-right">Amount</th><th className="pb-2">Status</th>
            </tr></thead>
            <tbody>
              {upcomingPDCs?.map((pdc, i) => (
                <tr key={i} className="border-b border-gray-50">
                  <td className="py-2 font-mono text-gray-700">{pdc.chequeNumber || '—'}</td>
                  <td className="py-2">{pdc.maturityDate ? new Date(pdc.maturityDate).toLocaleDateString() : <span className="text-gray-400">Pending date</span>}</td>
                  <td className="py-2 text-right font-medium">AED {fmt(pdc.amount)}</td>
                  <td className="py-2"><span className={`px-2 py-0.5 rounded text-xs font-medium ${pdc.isPaid ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{pdc.isPaid ? 'Paid' : 'Unpaid'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Purchase Orders */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-base font-semibold text-gray-800">Purchase Orders</h2>
          <Link to={`/purchase-orders?supplierId=${id}`} className="text-blue-600 text-sm hover:underline">View all</Link>
        </div>
        {recentPOs?.length === 0 ? (
          <p className="text-gray-400 text-sm">No purchase orders yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead><tr className="text-left text-gray-500 border-b">
              <th className="pb-2">PO #</th><th className="pb-2">Date</th><th className="pb-2">Status</th><th className="pb-2 text-right">Amount</th>
            </tr></thead>
            <tbody>
              {recentPOs?.map(po => (
                <tr key={po.id} className="border-b border-gray-50">
                  <td className="py-2"><Link to={`/purchase-orders/${po.id}`} className="text-blue-600 hover:underline font-mono">{po.poNumber}</Link></td>
                  <td className="py-2 text-gray-500">{new Date(po.createdAt).toLocaleDateString()}</td>
                  <td className="py-2"><span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors[po.status] || 'bg-gray-100 text-gray-700'}`}>{po.status.replace('_', ' ')}</span></td>
                  <td className="py-2 text-right font-medium">AED {fmt(po.totalAmount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Recent Invoices */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-base font-semibold text-gray-800 mb-4">Recent Invoices</h2>
        {recentInvoices?.length === 0 ? (
          <p className="text-gray-400 text-sm">No invoices yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead><tr className="text-left text-gray-500 border-b">
              <th className="pb-2">Invoice #</th><th className="pb-2">Due Date</th><th className="pb-2">Status</th><th className="pb-2 text-right">Amount</th>
            </tr></thead>
            <tbody>
              {recentInvoices?.map((inv, i) => (
                <tr key={i} className="border-b border-gray-50">
                  <td className="py-2 font-mono text-gray-700">{inv.invoiceNumber}</td>
                  <td className="py-2 text-gray-500">{inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : '—'}</td>
                  <td className="py-2"><span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors[inv.status] || 'bg-gray-100 text-gray-700'}`}>{inv.status}</span></td>
                  <td className="py-2 text-right font-medium">AED {fmt(inv.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Top Materials */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-base font-semibold text-gray-800 mb-4">Top Materials</h2>
        {topMaterials?.length === 0 ? (
          <p className="text-gray-400 text-sm">No material data yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead><tr className="text-left text-gray-500 border-b">
              <th className="pb-2">Material</th><th className="pb-2 text-right">Qty Ordered</th><th className="pb-2 text-right">Qty Received</th><th className="pb-2 text-right">Total Spend</th>
            </tr></thead>
            <tbody>
              {topMaterials?.map(mat => (
                <tr key={mat.materialId} className="border-b border-gray-50">
                  <td className="py-2 font-medium">{mat.name} <span className="text-gray-400 font-normal">{mat.unit}</span></td>
                  <td className="py-2 text-right">{mat.totalOrdered}</td>
                  <td className="py-2 text-right">{mat.totalReceived > 0 ? mat.totalReceived : <span className="text-gray-400">—</span>}</td>
                  <td className="py-2 text-right font-medium">AED {fmt(mat.totalSpend)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
