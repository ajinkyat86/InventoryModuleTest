import express from 'express';
import prisma from '../prisma.js';

const router = express.Router();

async function generatePoNumber() {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
  const prefix = `PO-${dateStr}-`;

  const existing = await prisma.purchaseOrder.findMany({
    where: { poNumber: { startsWith: prefix } },
    orderBy: { poNumber: 'desc' },
  });

  let nextNum = 1;
  if (existing.length > 0) {
    const last = existing[0].poNumber;
    const lastNum = parseInt(last.split('-').pop(), 10);
    if (!isNaN(lastNum)) nextNum = lastNum + 1;
  }

  return `${prefix}${String(nextNum).padStart(3, '0')}`;
}

const VALID_TRANSITIONS = {
  DRAFT: ['PENDING_APPROVAL'],
  PENDING_APPROVAL: ['APPROVED', 'DRAFT'],
  APPROVED: ['CANCELLED'],
  INVOICED: [],
  PAID: [],
  CANCELLED: [],
};

// GET / — list all POs with supplier name, line count, total amount
router.get('/', async (req, res) => {
  try {
    const { status } = req.query;
    const where = {};
    if (status) {
      const validStatuses = ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'INVOICED', 'PAID', 'CANCELLED'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: `Invalid status filter. Must be one of: ${validStatuses.join(', ')}` });
      }
      where.status = status;
    }

    const orders = await prisma.purchaseOrder.findMany({
      where,
      include: {
        supplier: { select: { id: true, name: true } },
        _count: { select: { lines: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const result = orders.map((o) => ({
      ...o,
      lineCount: o._count.lines,
      _count: undefined,
    }));

    return res.json({ data: result });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch purchase orders' });
  }
});

// POST / — create PO with lines
router.post('/', async (req, res) => {
  try {
    const { supplierId, notes, lines } = req.body;

    if (!supplierId) {
      return res.status(400).json({ error: 'supplierId is required' });
    }

    const supplier = await prisma.supplier.findUnique({ where: { id: supplierId } });
    if (!supplier) {
      return res.status(404).json({ error: 'Supplier not found' });
    }

    if (!lines || !Array.isArray(lines) || lines.length === 0) {
      return res.status(400).json({ error: 'At least one line item is required' });
    }

    // Validate all lines
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line.materialId) {
        return res.status(400).json({ error: `Line ${i + 1}: materialId is required` });
      }
      if (!line.quantity || line.quantity <= 0) {
        return res.status(400).json({ error: `Line ${i + 1}: quantity must be greater than 0` });
      }
      if (line.unitPrice === undefined || line.unitPrice < 0) {
        return res.status(400).json({ error: `Line ${i + 1}: unitPrice must be non-negative` });
      }

      const material = await prisma.material.findUnique({ where: { id: line.materialId } });
      if (!material) {
        return res.status(404).json({ error: `Line ${i + 1}: Material with id '${line.materialId}' not found` });
      }
    }

    const poNumber = await generatePoNumber();

    const processedLines = lines.map((line) => ({
      materialId: line.materialId,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      totalPrice: line.quantity * line.unitPrice,
      notes: line.notes || null,
    }));

    const totalAmount = processedLines.reduce((sum, l) => sum + l.totalPrice, 0);

    const order = await prisma.purchaseOrder.create({
      data: {
        poNumber,
        supplierId,
        status: 'DRAFT',
        totalAmount,
        notes: notes || null,
        lines: {
          create: processedLines,
        },
      },
      include: {
        supplier: { select: { id: true, name: true } },
        lines: {
          include: { material: { select: { id: true, name: true, code: true, unit: true } } },
        },
      },
    });

    return res.status(201).json({ data: order });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to create purchase order' });
  }
});

// GET /:id — get PO with full lines, supplier, and linked invoices
router.get('/:id', async (req, res) => {
  try {
    const order = await prisma.purchaseOrder.findUnique({
      where: { id: req.params.id },
      include: {
        supplier: true,
        lines: {
          include: {
            material: { select: { id: true, name: true, code: true, unit: true } },
          },
        },
        invoices: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!order) {
      return res.status(404).json({ error: 'Purchase order not found' });
    }

    return res.json({ data: order });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch purchase order' });
  }
});

// PUT /:id — update PO header (only if DRAFT)
router.put('/:id', async (req, res) => {
  try {
    const existing = await prisma.purchaseOrder.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      return res.status(404).json({ error: 'Purchase order not found' });
    }

    if (existing.status !== 'DRAFT') {
      return res.status(400).json({ error: 'Only DRAFT purchase orders can be edited' });
    }

    const { notes, supplierId } = req.body;

    if (supplierId !== undefined) {
      const supplier = await prisma.supplier.findUnique({ where: { id: supplierId } });
      if (!supplier) {
        return res.status(404).json({ error: 'Supplier not found' });
      }
    }

    const updated = await prisma.purchaseOrder.update({
      where: { id: req.params.id },
      data: {
        ...(notes !== undefined && { notes }),
        ...(supplierId !== undefined && { supplierId }),
      },
      include: {
        supplier: { select: { id: true, name: true } },
        lines: {
          include: { material: { select: { id: true, name: true, code: true, unit: true } } },
        },
      },
    });

    return res.json({ data: updated });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to update purchase order' });
  }
});

// PATCH /:id/status — transition status
router.patch('/:id/status', async (req, res) => {
  try {
    const existing = await prisma.purchaseOrder.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      return res.status(404).json({ error: 'Purchase order not found' });
    }

    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ error: 'status is required' });
    }

    const allowedTransitions = VALID_TRANSITIONS[existing.status] || [];
    if (!allowedTransitions.includes(status)) {
      return res.status(400).json({
        error: `Cannot transition from ${existing.status} to ${status}. Allowed transitions: ${allowedTransitions.join(', ') || 'none'}`,
      });
    }

    const updated = await prisma.purchaseOrder.update({
      where: { id: req.params.id },
      data: { status },
      include: {
        supplier: { select: { id: true, name: true } },
      },
    });

    return res.json({ data: updated });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to update purchase order status' });
  }
});

// DELETE /:id — delete PO (only if DRAFT)
router.delete('/:id', async (req, res) => {
  try {
    const existing = await prisma.purchaseOrder.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      return res.status(404).json({ error: 'Purchase order not found' });
    }

    if (existing.status !== 'DRAFT') {
      return res.status(400).json({ error: 'Only DRAFT purchase orders can be deleted' });
    }

    await prisma.purchaseOrder.delete({ where: { id: req.params.id } });

    return res.json({ data: { message: 'Purchase order deleted successfully' } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to delete purchase order' });
  }
});

export default router;
