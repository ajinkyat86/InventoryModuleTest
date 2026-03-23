/**
 * Shared aggregation helpers.
 * Note: SQLite has no DATE_TRUNC so month grouping is done in JS.
 */

export function computeSpendByMonth(items, dateField = 'createdAt', amountField = 'totalAmount') {
  const map = {};
  for (const item of items) {
    const month = new Date(item[dateField]).toISOString().slice(0, 7);
    map[month] = (map[month] || 0) + (item[amountField] || 0);
  }
  return Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, total]) => ({ month, total }));
}

export function computeOutstanding(invoices) {
  return invoices
    .filter((inv) => inv.status !== 'PAID')
    .reduce((sum, inv) => sum + (inv.amount - (inv.paidAmount || 0)), 0);
}

export function computeCommittedSpend(pos) {
  return pos.reduce((sum, po) => sum + po.totalAmount, 0);
}
