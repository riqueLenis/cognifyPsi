import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { getPrisma } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();
const prisma = getPrisma();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().min(1).optional(),
});

const emailExistsSchema = z.object({
  email: z.string().email(),
});

router.get('/exists', async (req, res, next) => {
  try {
    const query = emailExistsSchema.parse(req.query);
    const existing = await prisma.user.findUnique({ where: { email: query.email } });
    return res.json({ exists: Boolean(existing) });
  } catch (err) {
    if (err?.name === 'ZodError') return res.status(400).json({ error: 'invalid_query', details: err.issues });
    return next(err);
  }
});

router.post('/register', async (req, res, next) => {
  try {
    const body = registerSchema.parse(req.body);
    const existing = await prisma.user.findUnique({ where: { email: body.email } });
    if (existing) return res.status(409).json({ error: 'email_already_exists' });

    const passwordHash = await bcrypt.hash(body.password, 10);
    const user = await prisma.user.create({
      data: {
        email: body.email,
        fullName: body.fullName,
        passwordHash,
      },
      select: { id: true, email: true, fullName: true, role: true, createdAt: true },
    });

    return res.status(201).json(user);
  } catch (err) {
    if (err?.name === 'ZodError') return res.status(400).json({ error: 'invalid_body', details: err.issues });
    return next(err);
  }
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post('/login', async (req, res, next) => {
  try {
    const body = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: body.email } });
    if (!user) return res.status(401).json({ error: 'invalid_credentials' });

    const ok = await bcrypt.compare(body.password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'invalid_credentials' });

    const token = jwt.sign(
      { sub: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    return res.json({
      token,
      user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role },
    });
  } catch (err) {
    if (err?.name === 'ZodError') return res.status(400).json({ error: 'invalid_body', details: err.issues });
    return next(err);
  }
});

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.sub },
      select: { id: true, email: true, fullName: true, role: true, createdAt: true },
    });
    if (!user) return res.status(404).json({ error: 'user_not_found' });
    return res.json(user);
  } catch (err) {
    return next(err);
  }
});

export default router;
