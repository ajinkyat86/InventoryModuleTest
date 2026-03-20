import express from 'express';
import prisma from '../prisma.js';

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
