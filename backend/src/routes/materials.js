import express from 'express';
import prisma from '../prisma.js';
import { computeSpendByMonth } from '../lib/aggregates.js';

const router = express.Router();

function computePriceChange(currentPrice, history) {
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const recent = history.filter((h) => new Date(h.createdAt) >= ninetyDaysAgo);

  if (recent.length === 0) return { avgPrice90d: null, changePercent: null };

  const avg = recent.reduce((sum, h) => sum + h.price, 0) / recent.length;
  const changePercent = avg > 0 ? ((currentPrice - avg) / avg) * 100 : null;

  return { avgPrice90d: avg, changePercent };
}

// GET / — list all materials with latest price and price change %
router.get('/', async (req, res) => {
  try {
    const materials = await prisma.material.findMany({
      include: {
        priceHistory: {
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const result = materials.map((m) => {
      const { avgPrice90d, changePercent } = computePriceChange(m.currentPrice, m.priceHistory);
      return {
        ...m,
        avgPrice90d,
        changePercent,
        priceHistory: undefined,
      };
    });

    return res.json({ data: result });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch materials' });
  }
});

// POST / — create material
router.post('/', async (req, res) => {
  try {
    const { code, name, description, unit, currentPrice, isActive, notes } = req.body;

    if (!code || code.trim() === '') {
      return res.status(400).json({ error: 'Material code is required' });
    }
    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Material name is required' });
    }
    if (currentPrice === undefined || currentPrice === null) {
      return res.status(400).json({ error: 'currentPrice is required' });
    }
    if (typeof currentPrice !== 'number' || currentPrice < 0) {
      return res.status(400).json({ error: 'currentPrice must be a non-negative number' });
    }

    const validUnits = ['UNIT', 'KG', 'LITRE', 'METRE', 'BOX'];
    if (unit && !validUnits.includes(unit)) {
      return res.status(400).json({ error: `unit must be one of: ${validUnits.join(', ')}` });
    }

    // Check code uniqueness
    const existing = await prisma.material.findUnique({ where: { code: code.trim() } });
    if (existing) {
      return res.status(409).json({ error: `Material with code '${code.trim()}' already exists` });
    }

    const material = await prisma.material.create({
      data: {
        code: code.trim(),
        name: name.trim(),
        description: description || null,
        unit: unit || 'UNIT',
        currentPrice,
        isActive: isActive !== undefined ? isActive : true,
        priceHistory: {
          create: {
            price: currentPrice,
            note: notes || 'Initial price',
          },
        },
      },
      include: {
        priceHistory: { orderBy: { createdAt: 'desc' } },
      },
    });

    return res.status(201).json({ data: material });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to create material' });
  }
});

// GET /:id — get material with full price history
router.get('/:id', async (req, res) => {
  try {
    const material = await prisma.material.findUnique({
      where: { id: req.params.id },
      include: {
        priceHistory: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!material) {
      return res.status(404).json({ error: 'Material not found' });
    }

    const { avgPrice90d, changePercent } = computePriceChange(material.currentPrice, material.priceHistory);

    // Spend aggregates
    const lineGroups = await prisma.purchaseOrderLine.groupBy({
      by: ['purchaseOrderId'],
      where: { materialId: req.params.id, purchaseOrder: { status: 'APPROVED' } },
      _sum: { totalPrice: true, quantity: true, qtyReceived: true },
    });

    const poIds = lineGroups.map((g) => g.purchaseOrderId);
    const relatedPOs = poIds.length > 0 ? await prisma.purchaseOrder.findMany({
      where: { id: { in: poIds } },
      select: { id: true, supplierId: true, supplier: { select: { id: true, name: true } }, createdAt: true },
    }) : [];

    const totalOrdered = lineGroups.reduce((s, g) => s + (g._sum.quantity || 0), 0);
    const totalReceived = lineGroups.reduce((s, g) => s + (g._sum.qtyReceived || 0), 0);
    const totalSpend = lineGroups.reduce((s, g) => s + (g._sum.totalPrice || 0), 0);

    const supplierSpendMap = {};
    for (const po of relatedPOs) {
      if (!po.supplier) continue;
      supplierSpendMap[po.supplierId] = supplierSpendMap[po.supplierId] || { id: po.supplierId, name: po.supplier.name, spend: 0 };
      const grp = lineGroups.find((g) => g.purchaseOrderId === po.id);
      supplierSpendMap[po.supplierId].spend += grp?._sum.totalPrice || 0;
    }
    const topSuppliers = Object.values(supplierSpendMap).sort((a, b) => b.spend - a.spend).slice(0, 3);

    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1);
    const spendByMonth = computeSpendByMonth(
      relatedPOs.filter((po) => new Date(po.createdAt) >= twelveMonthsAgo),
      'createdAt',
      'totalAmount'
    );

    return res.json({ data: { ...material, avgPrice90d, changePercent, totalOrdered, totalReceived, totalSpend, topSuppliers, spendByMonth } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch material' });
  }
});

// PUT /:id — update material, auto-create price history if price changes
router.put('/:id', async (req, res) => {
  try {
    const existing = await prisma.material.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      return res.status(404).json({ error: 'Material not found' });
    }

    const { code, name, description, unit, currentPrice, isActive, priceNote } = req.body;

    if (code !== undefined && code.trim() === '') {
      return res.status(400).json({ error: 'Material code cannot be empty' });
    }
    if (name !== undefined && name.trim() === '') {
      return res.status(400).json({ error: 'Material name cannot be empty' });
    }
    if (currentPrice !== undefined && (typeof currentPrice !== 'number' || currentPrice < 0)) {
      return res.status(400).json({ error: 'currentPrice must be a non-negative number' });
    }

    const validUnits = ['UNIT', 'KG', 'LITRE', 'METRE', 'BOX'];
    if (unit && !validUnits.includes(unit)) {
      return res.status(400).json({ error: `unit must be one of: ${validUnits.join(', ')}` });
    }

    // Check code uniqueness if changing
    if (code !== undefined && code.trim() !== existing.code) {
      const codeConflict = await prisma.material.findUnique({ where: { code: code.trim() } });
      if (codeConflict) {
        return res.status(409).json({ error: `Material with code '${code.trim()}' already exists` });
      }
    }

    const priceChanged = currentPrice !== undefined && currentPrice !== existing.currentPrice;

    const updated = await prisma.material.update({
      where: { id: req.params.id },
      data: {
        ...(code !== undefined && { code: code.trim() }),
        ...(name !== undefined && { name: name.trim() }),
        ...(description !== undefined && { description }),
        ...(unit !== undefined && { unit }),
        ...(currentPrice !== undefined && { currentPrice }),
        ...(isActive !== undefined && { isActive }),
        ...(priceChanged && {
          priceHistory: {
            create: {
              price: currentPrice,
              note: priceNote || `Price updated from ${existing.currentPrice} to ${currentPrice}`,
            },
          },
        }),
      },
      include: {
        priceHistory: { orderBy: { createdAt: 'desc' } },
      },
    });

    const { avgPrice90d, changePercent } = computePriceChange(updated.currentPrice, updated.priceHistory);

    return res.json({ data: { ...updated, avgPrice90d, changePercent } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to update material' });
  }
});

// DELETE /:id — soft delete (set isActive=false)
router.delete('/:id', async (req, res) => {
  try {
    const existing = await prisma.material.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      return res.status(404).json({ error: 'Material not found' });
    }

    const updated = await prisma.material.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });

    return res.json({ data: updated });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to deactivate material' });
  }
});

// GET /:id/price-history — return all price history records
router.get('/:id/price-history', async (req, res) => {
  try {
    const material = await prisma.material.findUnique({ where: { id: req.params.id } });
    if (!material) {
      return res.status(404).json({ error: 'Material not found' });
    }

    const history = await prisma.materialPriceHistory.findMany({
      where: { materialId: req.params.id },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ data: history });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch price history' });
  }
});

export default router;
