import express from 'express';
import prisma from '../prisma.js';

const router = express.Router();

async function generateInvoiceNumber() {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
  const prefix = `INV-${dateStr}-`;

  const existing = await prisma.invoice.findMany({
    where: { invoiceNumber: { startsWith: prefix } },
    orderBy: { invoiceNumber: 'desc' },
  });

  let nextNum = 1;
  if (existing.length > 0) {
    const last = existing[0].invoiceNumber;
    const lastNum = parseInt(last.split('-').pop(), 10);
    if (!isNaN(lastNum)) nextNum = lastNum + 1;
  }

  return `${prefix}${String(nextNum).padStart(3, '0')}`;
}

// GET / — list all invoices
router.get('/', async (req, res) => {
  try {
    const { status } = req.query;
    const where = {};
    if (status) {
      const validStatuses = ['PENDING', 'PARTIALLY_PAID', 'PAID', 'OVERDUE'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: `Invalid status filter. Must be one of: ${validStatuses.join(', ')}` });
      }
      where.status = status;
    }

    const invoices = await prisma.invoice.findMany({
      where,
      include: {
        purchaseOrder: {
          include: {
            supplier: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const result = invoices.map((inv) => ({
      ...inv,
      supplierName: inv.supplierId
        ? null // direct supplier would need a separate lookup
        : inv.purchaseOrder?.supplier?.name || null,
      outstanding: inv.amount - inv.paidAmount,
    }));

    return res.json({ data: result });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch invoices' });
  }
});

// POST / — create invoice
router.post('/', async (req, res) => {
  try {
    const { purchaseOrderId, supplierId, amount, paymentType, dueDate, notes } = req.body;

    if (amount === undefined || amount === null) {
      return res.status(400).json({ error: 'amount is required' });
    }
    if (typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ error: 'amount must be a positive number' });
    }

    const validPaymentTypes = ['CREDIT', 'PDC', 'BANK_TRANSFER'];
    if (paymentType && !validPaymentTypes.includes(paymentType)) {
      return res.status(400).json({ error: `paymentType must be one of: ${validPaymentTypes.join(', ')}` });
    }

    if (purchaseOrderId) {
      const po = await prisma.purchaseOrder.findUnique({ where: { id: purchaseOrderId } });
      if (!po) {
        return res.status(404).json({ error: 'Purchase order not found' });
      }
    }

    const invoiceNumber = await generateInvoiceNumber();

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        purchaseOrderId: purchaseOrderId || null,
        supplierId: supplierId || null,
        amount,
        paidAmount: 0,
        status: 'PENDING',
        paymentType: paymentType || 'CREDIT',
        dueDate: dueDate ? new Date(dueDate) : null,
        notes: notes || null,
      },
      include: {
        purchaseOrder: {
          include: { supplier: { select: { id: true, name: true } } },
        },
        payments: true,
      },
    });

    return res.status(201).json({ data: invoice });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to create invoice' });
  }
});

// GET /:id — get invoice with payments and linked PO
router.get('/:id', async (req, res) => {
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: req.params.id },
      include: {
        payments: { orderBy: { createdAt: 'desc' } },
        purchaseOrder: {
          include: {
            supplier: true,
            lines: {
              include: { material: { select: { id: true, name: true, code: true, unit: true } } },
            },
          },
        },
      },
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    return res.json({ data: { ...invoice, outstanding: invoice.amount - invoice.paidAmount } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch invoice' });
  }
});

// PUT /:id — update invoice (only if not PAID)
router.put('/:id', async (req, res) => {
  try {
    const existing = await prisma.invoice.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    if (existing.status === 'PAID') {
      return res.status(400).json({ error: 'Cannot modify a fully paid invoice' });
    }

    const { notes, dueDate, paymentType } = req.body;

    const validPaymentTypes = ['CREDIT', 'PDC', 'BANK_TRANSFER'];
    if (paymentType && !validPaymentTypes.includes(paymentType)) {
      return res.status(400).json({ error: `paymentType must be one of: ${validPaymentTypes.join(', ')}` });
    }

    const updated = await prisma.invoice.update({
      where: { id: req.params.id },
      data: {
        ...(notes !== undefined && { notes }),
        ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
        ...(paymentType !== undefined && { paymentType }),
      },
      include: {
        payments: { orderBy: { createdAt: 'desc' } },
        purchaseOrder: {
          include: { supplier: { select: { id: true, name: true } } },
        },
      },
    });

    return res.json({ data: { ...updated, outstanding: updated.amount - updated.paidAmount } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to update invoice' });
  }
});

// POST /:id/payments — add a payment to invoice
router.post('/:id/payments', async (req, res) => {
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: req.params.id },
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    if (invoice.status === 'PAID') {
      return res.status(400).json({ error: 'Invoice is already fully paid' });
    }

    const { amount, paymentType, chequeDate, maturityDate, chequeNumber, bankName, notes } = req.body;

    if (amount === undefined || amount === null) {
      return res.status(400).json({ error: 'amount is required' });
    }
    if (typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ error: 'amount must be a positive number' });
    }

    const validPaymentTypes = ['CREDIT', 'PDC', 'BANK_TRANSFER'];
    if (!paymentType || !validPaymentTypes.includes(paymentType)) {
      return res.status(400).json({ error: `paymentType must be one of: ${validPaymentTypes.join(', ')}` });
    }

    const outstanding = invoice.amount - invoice.paidAmount;
    if (amount > outstanding) {
      return res.status(400).json({
        error: `Payment amount (${amount}) exceeds outstanding balance (${outstanding})`,
      });
    }

    const newPaidAmount = invoice.paidAmount + amount;
    let newStatus;
    if (newPaidAmount >= invoice.amount) {
      newStatus = 'PAID';
    } else {
      newStatus = 'PARTIALLY_PAID';
    }

    const isPdc = paymentType === 'PDC';

    const [payment] = await prisma.$transaction([
      prisma.invoicePayment.create({
        data: {
          invoiceId: invoice.id,
          amount,
          paymentType,
          chequeDate: chequeDate ? new Date(chequeDate) : null,
          maturityDate: maturityDate ? new Date(maturityDate) : null,
          chequeNumber: chequeNumber || null,
          bankName: bankName || null,
          isPaid: !isPdc, // PDC payments start as not yet cleared
          paidAt: !isPdc ? new Date() : null,
          notes: notes || null,
        },
      }),
      prisma.invoice.update({
        where: { id: invoice.id },
        data: {
          paidAmount: newPaidAmount,
          status: newStatus,
        },
      }),
    ]);

    const updatedInvoice = await prisma.invoice.findUnique({
      where: { id: invoice.id },
      include: { payments: { orderBy: { createdAt: 'desc' } } },
    });

    return res.status(201).json({ data: { payment, invoice: updatedInvoice } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to add payment' });
  }
});

// PATCH /:id/payments/:paymentId/mark-paid — mark a PDC payment as paid
router.patch('/:id/payments/:paymentId/mark-paid', async (req, res) => {
  try {
    const invoice = await prisma.invoice.findUnique({ where: { id: req.params.id } });
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const payment = await prisma.invoicePayment.findUnique({ where: { id: req.params.paymentId } });
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    if (payment.invoiceId !== invoice.id) {
      return res.status(400).json({ error: 'Payment does not belong to this invoice' });
    }

    if (payment.isPaid) {
      return res.status(400).json({ error: 'Payment is already marked as paid' });
    }

    const updatedPayment = await prisma.invoicePayment.update({
      where: { id: payment.id },
      data: { isPaid: true, paidAt: new Date() },
    });

    return res.json({ data: updatedPayment });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to mark payment as paid' });
  }
});

export default router;
