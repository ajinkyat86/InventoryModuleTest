import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Clean existing data in order
  await prisma.invoicePayment.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.purchaseOrderLine.deleteMany();
  await prisma.purchaseOrder.deleteMany();
  await prisma.materialPriceHistory.deleteMany();
  await prisma.material.deleteMany();
  await prisma.supplier.deleteMany();

  console.log('Cleared existing data');

  // --- Suppliers ---
  const supplier1 = await prisma.supplier.create({
    data: {
      name: 'BuildCore Materials Ltd',
      contactName: 'James Harrington',
      email: 'james.h@buildcore.com',
      phone: '+971-4-555-0101',
      paymentTerms: 'NET_30',
      notes: 'Primary supplier for structural steel and cement. Reliable delivery within 5 days.',
    },
  });

  const supplier2 = await prisma.supplier.create({
    data: {
      name: 'ElectroPro Gulf FZE',
      contactName: 'Priya Nair',
      email: 'priya.nair@electropro.ae',
      phone: '+971-4-555-0202',
      paymentTerms: 'NET_60',
      notes: 'Electrical materials and copper wiring. Requires PDC for orders over AED 50,000.',
    },
  });

  const supplier3 = await prisma.supplier.create({
    data: {
      name: 'SafeGuard Industrial Supplies',
      contactName: 'Ahmed Al-Rashidi',
      email: 'a.rashidi@safeguard-ind.com',
      phone: '+971-4-555-0303',
      paymentTerms: 'PDC',
      notes: 'Safety equipment and PPE. Post-dated cheque payments required. Lead time 7-10 days.',
    },
  });

  console.log('Created 3 suppliers');

  // --- Materials with price history ---

  // Helper to create material with multiple price history entries
  async function createMaterialWithHistory(data, priceHistory) {
    const material = await prisma.material.create({
      data: {
        ...data,
        priceHistory: {
          create: priceHistory,
        },
      },
    });
    return material;
  }

  const now = new Date();
  const daysAgo = (d) => {
    const date = new Date(now);
    date.setDate(date.getDate() - d);
    return date;
  };

  const steelPipe = await createMaterialWithHistory(
    {
      code: 'MAT-SP-001',
      name: 'Steel Pipe 6" SCH40',
      description: 'Schedule 40 carbon steel pipe, 6 inch diameter, per metre',
      unit: 'METRE',
      currentPrice: 185.0,
      isActive: true,
    },
    [
      { price: 155.0, note: 'Initial price at onboarding', createdAt: daysAgo(120) },
      { price: 162.0, note: 'Q3 price adjustment', createdAt: daysAgo(90) },
      { price: 170.0, note: 'Steel market increase Oct', createdAt: daysAgo(60) },
      { price: 178.0, note: 'Supplier revised rate', createdAt: daysAgo(30) },
      { price: 185.0, note: 'Current rate as of latest PO', createdAt: daysAgo(5) },
    ]
  );

  const cement = await createMaterialWithHistory(
    {
      code: 'MAT-CEM-001',
      name: 'Portland Cement 50kg Bag',
      description: 'OPC 53 Grade Portland Cement, 50kg bag',
      unit: 'BOX',
      currentPrice: 28.5,
      isActive: true,
    },
    [
      { price: 26.0, note: 'Initial price', createdAt: daysAgo(100) },
      { price: 27.0, note: 'Slight increase due to demand', createdAt: daysAgo(70) },
      { price: 28.5, note: 'Updated rate from BuildCore', createdAt: daysAgo(20) },
    ]
  );

  const copperWire = await createMaterialWithHistory(
    {
      code: 'MAT-CW-002',
      name: 'Copper Wire 4mm²',
      description: 'Multi-strand copper conductor, 4mm², 100m roll',
      unit: 'UNIT',
      currentPrice: 420.0,
      isActive: true,
    },
    [
      { price: 380.0, note: 'Initial price', createdAt: daysAgo(110) },
      { price: 395.0, note: 'Copper LME adjustment', createdAt: daysAgo(75) },
      { price: 410.0, note: 'Q4 market rate', createdAt: daysAgo(45) },
      { price: 420.0, note: 'Current rate', createdAt: daysAgo(10) },
    ]
  );

  const safetyGear = await createMaterialWithHistory(
    {
      code: 'MAT-PPE-003',
      name: 'Safety Harness Full Body',
      description: 'EN361 certified full body safety harness with double lanyard',
      unit: 'UNIT',
      currentPrice: 320.0,
      isActive: true,
    },
    [
      { price: 310.0, note: 'Initial price', createdAt: daysAgo(80) },
      { price: 315.0, note: 'Minor revision', createdAt: daysAgo(40) },
      { price: 320.0, note: 'Current', createdAt: daysAgo(15) },
    ]
  );

  const diesel = await createMaterialWithHistory(
    {
      code: 'MAT-DSL-001',
      name: 'Diesel Fuel (Red)',
      description: 'Off-road red diesel for construction equipment, per litre',
      unit: 'LITRE',
      currentPrice: 3.2,
      isActive: true,
    },
    [
      { price: 2.9, note: 'Initial price', createdAt: daysAgo(95) },
      { price: 3.0, note: 'Fuel price update', createdAt: daysAgo(65) },
      { price: 3.15, note: 'OPEC adjustment', createdAt: daysAgo(35) },
      { price: 3.2, note: 'Current ENOC rate', createdAt: daysAgo(8) },
    ]
  );

  console.log('Created 5 materials with price history');

  // --- Purchase Orders ---

  // PO 1: APPROVED - Steel and Cement from BuildCore
  const po1 = await prisma.purchaseOrder.create({
    data: {
      poNumber: 'PO-20260110-001',
      supplierId: supplier1.id,
      status: 'APPROVED',
      totalAmount: 0,
      notes: 'Phase 1 structural materials for Al Quoz warehouse project',
      createdAt: daysAgo(45),
      lines: {
        create: [
          {
            materialId: steelPipe.id,
            quantity: 200,
            unitPrice: 178.0,
            totalPrice: 200 * 178.0,
            notes: 'For main structural frame',
          },
          {
            materialId: cement.id,
            quantity: 500,
            unitPrice: 27.5,
            totalPrice: 500 * 27.5,
            notes: 'Foundation and slabs',
          },
        ],
      },
    },
    include: { lines: true },
  });

  const po1Total = po1.lines.reduce((s, l) => s + l.totalPrice, 0);
  await prisma.purchaseOrder.update({ where: { id: po1.id }, data: { totalAmount: po1Total } });

  // PO 2: PENDING_APPROVAL - Copper wire from ElectroPro
  const po2 = await prisma.purchaseOrder.create({
    data: {
      poNumber: 'PO-20260205-001',
      supplierId: supplier2.id,
      status: 'PENDING_APPROVAL',
      totalAmount: 0,
      notes: 'Electrical phase 2 - main distribution cabling',
      createdAt: daysAgo(20),
      lines: {
        create: [
          {
            materialId: copperWire.id,
            quantity: 30,
            unitPrice: 410.0,
            totalPrice: 30 * 410.0,
            notes: '30 rolls for main DB to sub-panels',
          },
        ],
      },
    },
    include: { lines: true },
  });

  const po2Total = po2.lines.reduce((s, l) => s + l.totalPrice, 0);
  await prisma.purchaseOrder.update({ where: { id: po2.id }, data: { totalAmount: po2Total } });

  // PO 3: DRAFT - Safety gear from SafeGuard
  const po3 = await prisma.purchaseOrder.create({
    data: {
      poNumber: 'PO-20260301-001',
      supplierId: supplier3.id,
      status: 'DRAFT',
      totalAmount: 0,
      notes: 'Q1 safety replenishment for site workers',
      createdAt: daysAgo(5),
      lines: {
        create: [
          {
            materialId: safetyGear.id,
            quantity: 25,
            unitPrice: 320.0,
            totalPrice: 25 * 320.0,
            notes: 'Harnesses for new joiners',
          },
          {
            materialId: diesel.id,
            quantity: 2000,
            unitPrice: 3.2,
            totalPrice: 2000 * 3.2,
            notes: 'Monthly fuel allocation',
          },
        ],
      },
    },
    include: { lines: true },
  });

  const po3Total = po3.lines.reduce((s, l) => s + l.totalPrice, 0);
  await prisma.purchaseOrder.update({ where: { id: po3.id }, data: { totalAmount: po3Total } });

  // PO 4: INVOICED - Cement from BuildCore (older)
  const po4 = await prisma.purchaseOrder.create({
    data: {
      poNumber: 'PO-20251215-001',
      supplierId: supplier1.id,
      status: 'INVOICED',
      totalAmount: 0,
      notes: 'Pre-season cement stockpile',
      createdAt: daysAgo(75),
      lines: {
        create: [
          {
            materialId: cement.id,
            quantity: 800,
            unitPrice: 27.0,
            totalPrice: 800 * 27.0,
            notes: 'Stockpile for Q1 projects',
          },
          {
            materialId: steelPipe.id,
            quantity: 100,
            unitPrice: 170.0,
            totalPrice: 100 * 170.0,
            notes: 'Secondary frame members',
          },
        ],
      },
    },
    include: { lines: true },
  });

  const po4Total = po4.lines.reduce((s, l) => s + l.totalPrice, 0);
  await prisma.purchaseOrder.update({ where: { id: po4.id }, data: { totalAmount: po4Total } });

  console.log('Created 4 purchase orders');

  // --- Invoices ---

  // Invoice 1: Linked to PO4 (INVOICED status), partially paid
  const inv1DueDate = new Date(now);
  inv1DueDate.setDate(inv1DueDate.getDate() + 15);

  const invoice1 = await prisma.invoice.create({
    data: {
      invoiceNumber: 'INV-20260115-001',
      purchaseOrderId: po4.id,
      amount: po4Total,
      paidAmount: 10000,
      status: 'PARTIALLY_PAID',
      paymentType: 'BANK_TRANSFER',
      dueDate: inv1DueDate,
      notes: 'BuildCore invoice for Dec cement and steel delivery',
      createdAt: daysAgo(60),
      payments: {
        create: [
          {
            amount: 10000,
            paymentType: 'BANK_TRANSFER',
            isPaid: true,
            paidAt: daysAgo(55),
            notes: 'Advance payment 30%',
          },
        ],
      },
    },
  });

  // Invoice 2: Linked to PO1 (APPROVED), PENDING with PDC payment
  const inv2DueDate = new Date(now);
  inv2DueDate.setDate(inv2DueDate.getDate() + 45);

  const pdcMaturity = new Date(now);
  pdcMaturity.setDate(pdcMaturity.getDate() + 30);

  const invoice2 = await prisma.invoice.create({
    data: {
      invoiceNumber: 'INV-20260210-001',
      purchaseOrderId: po1.id,
      amount: po1Total,
      paidAmount: 0,
      status: 'PENDING',
      paymentType: 'PDC',
      dueDate: inv2DueDate,
      notes: 'BuildCore invoice for Phase 1 approved steel and cement',
      createdAt: daysAgo(25),
      payments: {
        create: [
          {
            amount: po1Total,
            paymentType: 'PDC',
            chequeNumber: 'CHQ-004892',
            bankName: 'Emirates NBD',
            chequeDate: new Date(now),
            maturityDate: pdcMaturity,
            isPaid: false,
            notes: 'Post-dated cheque for full invoice amount',
          },
        ],
      },
    },
  });

  // Invoice 3: Direct (no PO), OVERDUE from ElectroPro
  const inv3DueDate = new Date(now);
  inv3DueDate.setDate(inv3DueDate.getDate() - 10); // Past due

  const invoice3 = await prisma.invoice.create({
    data: {
      invoiceNumber: 'INV-20260120-001',
      supplierId: supplier2.id,
      amount: 8500,
      paidAmount: 0,
      status: 'OVERDUE',
      paymentType: 'CREDIT',
      dueDate: inv3DueDate,
      notes: 'ElectroPro small materials invoice - miscellaneous connectors and conduit',
      createdAt: daysAgo(40),
    },
  });

  console.log('Created 3 invoices with payments (including 1 PDC)');

  console.log('\n=== Seed Complete ===');
  console.log(`Suppliers: 3`);
  console.log(`Materials: 5`);
  console.log(`Purchase Orders: 4 (APPROVED, PENDING_APPROVAL, DRAFT, INVOICED)`);
  console.log(`Invoices: 3 (PARTIALLY_PAID, PENDING/PDC, OVERDUE)`);
  console.log('\nLogin credentials:');
  console.log('  Email: admin@crossval.com');
  console.log('  Password: crossval2026');
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
