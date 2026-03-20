import express from 'express';
import prisma from '../prisma.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const now = new Date();

    // 1. Summary stats
    const [approvedPOs, pendingApprovalCount, allInvoices] = await Promise.all([
      prisma.purchaseOrder.findMany({
        where: { status: 'APPROVED' },
        select: { totalAmount: true },
      }),
      prisma.purchaseOrder.count({ where: { status: 'PENDING_APPROVAL' } }),
      prisma.invoice.findMany({
        select: { amount: true, paidAmount: true, status: true, dueDate: true },
      }),
    ]);

    const totalCommittedSpend = approvedPOs.reduce((sum, po) => sum + po.totalAmount, 0);

    const outstandingPayables = allInvoices
      .filter((inv) => inv.status !== 'PAID')
      .reduce((sum, inv) => sum + (inv.amount - inv.paidAmount), 0);

    const overdueInvoices = allInvoices.filter(
      (inv) => inv.status !== 'PAID' && inv.dueDate && new Date(inv.dueDate) < now
    ).length;

    // 2. PDC payments due in next 90 days
    const ninetyDaysFromNow = new Date();
    ninetyDaysFromNow.setDate(ninetyDaysFromNow.getDate() + 90);

    const pdcPayments = await prisma.invoicePayment.findMany({
      where: {
        paymentType: 'PDC',
        isPaid: false,
        maturityDate: {
          gte: now,
          lte: ninetyDaysFromNow,
        },
      },
      include: {
        invoice: {
          include: {
            purchaseOrder: {
              include: { supplier: { select: { name: true } } },
            },
          },
        },
      },
      orderBy: { maturityDate: 'asc' },
    });

    const pdcsDue = pdcPayments.map((p) => {
      const maturityDate = new Date(p.maturityDate);
      const daysUntilDue = Math.ceil((maturityDate - now) / (1000 * 60 * 60 * 24));
      const supplierName = p.invoice?.purchaseOrder?.supplier?.name || 'Unknown';

      return {
        invoiceNumber: p.invoice?.invoiceNumber || '',
        supplierName,
        amount: p.amount,
        maturityDate: maturityDate.toISOString(),
        daysUntilDue,
        chequeNumber: p.chequeNumber || '',
      };
    });

    // 3. Recent POs (last 5)
    const recentPOsRaw = await prisma.purchaseOrder.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        supplier: { select: { name: true } },
      },
    });

    const recentPOs = recentPOsRaw.map((po) => ({
      poNumber: po.poNumber,
      supplierName: po.supplier?.name || '',
      status: po.status,
      totalAmount: po.totalAmount,
      createdAt: po.createdAt.toISOString(),
    }));

    // 4. Price alerts — materials where currentPrice > 90-day avg by >5%
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const materials = await prisma.material.findMany({
      where: { isActive: true },
      include: {
        priceHistory: {
          where: { createdAt: { gte: ninetyDaysAgo } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    const priceAlerts = [];
    for (const m of materials) {
      if (m.priceHistory.length === 0) continue;
      const avg = m.priceHistory.reduce((sum, h) => sum + h.price, 0) / m.priceHistory.length;
      if (avg > 0) {
        const changePercent = ((m.currentPrice - avg) / avg) * 100;
        if (changePercent > 5) {
          priceAlerts.push({
            materialId: m.id,
            materialName: m.name,
            currentPrice: m.currentPrice,
            avgPrice90d: avg,
            changePercent,
          });
        }
      }
    }

    // 5. Spend by month — last 6 months (APPROVED/INVOICED/PAID POs)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const spendPOs = await prisma.purchaseOrder.findMany({
      where: {
        status: { in: ['APPROVED', 'INVOICED', 'PAID'] },
        createdAt: { gte: sixMonthsAgo },
      },
      select: { totalAmount: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    // Build month buckets for last 6 months
    const monthBuckets = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleString('en-US', { month: 'short', year: 'numeric' });
      monthBuckets[key] = { month: label, amount: 0 };
    }

    for (const po of spendPOs) {
      const d = new Date(po.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (monthBuckets[key]) {
        monthBuckets[key].amount += po.totalAmount;
      }
    }

    const spendByMonth = Object.values(monthBuckets);

    return res.json({
      data: {
        summary: {
          totalCommittedSpend,
          pendingApprovals: pendingApprovalCount,
          outstandingPayables,
          overdueInvoices,
        },
        pdcsDue,
        recentPOs,
        priceAlerts,
        spendByMonth,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

export default router;
