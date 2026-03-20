import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import { createAuthRouter, authMiddleware } from './middleware/auth.js';
import suppliersRouter from './routes/suppliers.js';
import materialsRouter from './routes/materials.js';
import purchaseOrdersRouter from './routes/purchaseOrders.js';
import invoicesRouter from './routes/invoices.js';
import dashboardRouter from './routes/dashboard.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json());

// Public routes
app.use('/api/auth', createAuthRouter());

// Protected routes
app.use('/api/suppliers', authMiddleware, suppliersRouter);
app.use('/api/materials', authMiddleware, materialsRouter);
app.use('/api/purchase-orders', authMiddleware, purchaseOrdersRouter);
app.use('/api/invoices', authMiddleware, invoicesRouter);
app.use('/api/dashboard', authMiddleware, dashboardRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

// Global error handler
app.use((err, req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`CrossVal Inventory API running on port ${PORT}`);
});

export default app;
