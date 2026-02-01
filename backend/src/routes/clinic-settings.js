import express from 'express';
import { getPrisma } from '../db.js';

const router = express.Router();
const prisma = getPrisma();

const safeParse = (value) => {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const normalize = (obj) => {
  const created = obj.created_date || obj.createdAt || new Date().toISOString();
  return {
    ...obj,
    created_date: created,
    updated_date: new Date().toISOString(),
  };
};

router.get('/', async (req, res, next) => {
  try {
    const all = await prisma.clinicSettings.findMany({ orderBy: { createdAt: 'desc' } });
    const items = all.map((row) => ({ id: row.id, ...(safeParse(row.data) || {}) }));

    const query = { ...req.query };
    const filtered = Object.keys(query).length
      ? items.filter((item) =>
          Object.entries(query).every(([key, value]) => String(item[key]) === String(value))
        )
      : items;

    return res.json(filtered);
  } catch (err) {
    return next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const body = normalize(req.body || {});
    const created = await prisma.clinicSettings.create({ data: { data: JSON.stringify(body) } });
    return res.status(201).json({ id: created.id, ...body });
  } catch (err) {
    return next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const existing = await prisma.clinicSettings.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'not_found' });
    const current = safeParse(existing.data) || {};
    const merged = normalize({ ...current, ...(req.body || {}) });
    await prisma.clinicSettings.update({ where: { id: req.params.id }, data: { data: JSON.stringify(merged) } });
    return res.json({ id: req.params.id, ...merged });
  } catch (err) {
    return next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await prisma.clinicSettings.delete({ where: { id: req.params.id } });
    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
});

export default router;
