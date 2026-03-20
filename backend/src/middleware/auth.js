import jwt from 'jsonwebtoken';
import express from 'express';

const HARDCODED_USER = {
  email: 'admin@crossval.com',
  password: 'crossval2026',
};

const JWT_SECRET = process.env.JWT_SECRET || 'crossval-inventory-secret-2026';

export function createAuthRouter() {
  const router = express.Router();

  router.post('/login', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (email !== HARDCODED_USER.email || password !== HARDCODED_USER.password) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { email: HARDCODED_USER.email, role: 'admin' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      data: {
        token,
        user: { email: HARDCODED_USER.email, role: 'admin' },
      },
    });
  });

  return router;
}

export function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization token required' });
  }

  const token = authHeader.slice(7);

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}
