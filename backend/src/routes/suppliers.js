import express from 'express';
import prisma from '../prisma.js';
import { computeSpendByMonth, computeOutstanding } from '../lib/aggregates.js';

const router = express.Router();

// GET / — list all suppliers with purchase order count
router.get('/', async (req, res) => {
  try {
    const suppliers = await prisma.supplier.findMany({
      include: {
        _count: {
          select: { purchaseOrders: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const result = suppliers.map((s) => ({
      ...s,
      purchaseOrderCount: s._count.purchaseOrders,
      _count: undefined,
    }));

    return res.json({ data: result });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch suppliers' });
  }
});

// POST / — create supplier
router.post('/', async (req, res) => {
  try {
    const { name, contactName, email, phone, paymentTerms, notes } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Supplier name is required' });
    }

    const validPaymentTerms = ['NET_30', 'NET_60', 'NET_90', 'PDC'];
    if (paymentTerms && !validPaymentTerms.includes(paymentTerms)) {
      return res.status(400).json({ error: `paymentTerms must be one of: ${validPaymentTerms.join(', ')}` });
    }

    const supplier = await prisma.supplier.create({
      data: {
        name: name.trim(),
        contactName: contactName || null,
        email: email || null,
        phone: phone || null,
        paymentTerms: paymentTerms || 'NET_30',
        notes: notes || null,
      },
    });

    return res.status(201).json({ data: supplier });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to create supplier' });
  }
});

// GET /:id — get supplier with their POs
router.get('/:id', async (req, res) => {
  try {
    const supplier = await prisma.supplier.findUnique({
      where: { id: req.params.id },
      include: {
        purchaseOrders: {
          orderBy: { createdAt: 'desc' },
          include: {
            _count: { select: { lines: true } },
          },
        },
      },
    });

    if (!supplier) {
      return res.status(404).json({ error: 'Supplier not found' });
    }

    return res.json({ data: supplier });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch supplier' });
  }
});

// GET /:id/report — full financial profile for a supplier
router.get('/:id/report', async (req, res) => {
  try {
    const { id } = req.params;
    const supplier = await prisma.supplier.findUnique({ where: { id } });
    if (!supplier) return res.status(404).json({ error: 'Supplier not found' });

    const now = new Date();
    const ninetyDaysFromNow = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
    const twelveMonthsAgo = new Date(now.getFullYear() - 1, now.getMonth(), 1);

    const approvedPOs = await prisma.purchaseOrder.findMany({
      where: { supplierId: id, status: 'APPROVED' },
      select: { id: true, poNumber: true, totalAmount: true, createdAt: true, status: true },
    });

    const totalCommittedSpend = approvedPOs.reduce((sum, po) => sum + po.totalAmount, 0);
    const spendByMonth = computeSpendByMonth(
      approvedPOs.filter((po) => new Date(po.createdAt) >= twelveMonthsAgo),
      'createdAt',
      'totalAmount'
    );

    const invoices = await prisma.invoice.findMany({
      where: {
        OR: [{ supplierId: id }, { purchaseOrder: { supplierId: id } }],
      },
      select: { id: true, amount: true, paidAmount: true, status: true, invoiceNumber: true, dueDate: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });

    const totalInvoiced = invoices.reduce((sum, inv) => sum + inv.amount, 0);
    const totalPaid = invoices.reduce((sum, inv) => sum + (inv.paidAmount || 0), 0);
    const outstandingPayables = computeOutstanding(invoices);
    const recentInvoices = invoices.slice(0, 10).map((inv) => ({
      invoiceNumber: inv.invoiceNumber,
      status: inv.status,
      amount: inv.amount,
      dueDate: inv.dueDate,
    }));

    const invoiceIds = invoices.map((inv) => inv.id);
    const upcomingPDCs = await prisma.invoicePayment.findMany({
      where: {
        invoiceId: { in: invoiceIds },
        paymentType: 'PDC',
        isPaid: false,
        OR: [
          { maturityDate: { lte: ninetyDaysFromNow } },
          { maturityDate: null },
        ],
      },
      select: { amount: true, chequeNumber: true, maturityDate: true, isPaid: true },
      orderBy: [{ maturityDate: 'asc' }],
    });

    const recentPOs = await prisma.purchaseOrder.findMany({
      where: { supplierId: id },
      select: { id: true, poNumber: true, status: true, totalAmount: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    const materialGroups = await prisma.purchaseOrderLine.groupBy({
      by: ['materialId'],
      where: { purchaseOrder: { supplierId: id, status: 'APPROVED' } },
      _sum: { totalPrice: true, quantity: true, qtyReceived: true },
      orderBy: { _sum: { totalPrice: 'desc' } },
      take: 5,
    });

    const materialIds = materialGroups.map((g) => g.materialId);
    const materials = materialIds.length > 0 ? await prisma.material.findMany({
      where: { id: { in: materialIds } },
      select: { id: true, name: true, unit: true },
    }) : [];
    const materialMap = Object.fromEntries(materials.map((m) => [m.id, m]));

    const topMaterials = materialGroups.map((g) => ({
      materialId: g.materialId,
      name: materialMap[g.materialId]?.name || 'Unknown',
      unit: materialMap[g.materialId]?.unit || '',
      totalSpend: g._sum.totalPrice || 0,
      totalOrdered: g._sum.quantity || 0,
      totalReceived: g._sum.qtyReceived || 0,
    }));

    return res.json({
      data: {
        supplier,
        totalCommittedSpend,
        totalInvoiced,
        totalPaid,
        outstandingPayables,
        spendByMonth,
        upcomingPDCs,
        recentPOs,
        recentInvoices,
        topMaterials,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch supplier report' });
  }
});

// PUT /:id — update supplier
router.put('/:id', async (req, res) => {
  try {
    const existing = await prisma.supplier.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      return res.status(404).json({ error: 'Supplier not found' });
    }

    const { name, contactName, email, phone, paymentTerms, notes } = req.body;

    if (name !== undefined && name.trim() === '') {
      return res.status(400).json({ error: 'Supplier name cannot be empty' });
    }

    const validPaymentTerms = ['NET_30', 'NET_60', 'NET_90', 'PDC'];
    if (paymentTerms && !validPaymentTerms.includes(paymentTerms)) {
      return res.status(400).json({ error: `paymentTerms must be one of: ${validPaymentTerms.join(', ')}` });
    }

    const updated = await prisma.supplier.update({
      where: { id: req.params.id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(contactName !== undefined && { contactName }),
        ...(email !== undefined && { email }),
        ...(phone !== undefined && { phone }),
        ...(paymentTerms !== undefined && { paymentTerms }),
        ...(notes !== undefined && { notes }),
      },
    });

    return res.json({ data: updated });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to update supplier' });
  }
});

// DELETE /:id — delete (block if has POs)
router.delete('/:id', async (req, res) => {
  try {
    const existing = await prisma.supplier.findUnique({
      where: { id: req.params.id },
      include: { _count: { select: { purchaseOrders: true } } },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Supplier not found' });
    }

    if (existing._count.purchaseOrders > 0) {
      return res.status(409).json({
        error: `Cannot delete supplier with ${existing._count.purchaseOrders} existing purchase order(s)`,
      });
    }

    await prisma.supplier.delete({ where: { id: req.params.id } });

    return res.json({ data: { message: 'Supplier deleted successfully' } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to delete supplier' });
  }
});

export default router;
