import express from 'express';
import { getPrisma } from '../db.js';

const router = express.Router();
const prisma = getPrisma();

const getOwnerId = (req) => String(req.user?.sub || '');

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

// Prevent duplicate FinancialTransaction rows for the same (ownerId, session_id)
// under concurrent requests (e.g., recurring session creation).
const sessionIdLocks = new Map();

const withSessionIdLock = async (lockKey, fn) => {
  const existing = sessionIdLocks.get(lockKey);
  if (existing) return existing;

  const promise = (async () => {
    try {
      return await fn();
    } finally {
      sessionIdLocks.delete(lockKey);
    }
  })();

  sessionIdLocks.set(lockKey, promise);
  return promise;
};

router.get('/', async (req, res, next) => {
  try {
    const ownerId = getOwnerId(req);
    const all = await prisma.financialTransaction.findMany({
      where: { ownerId },
      orderBy: { createdAt: 'desc' },
    });
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

router.post('/bulk-delete-all', async (req, res, next) => {
  try {
    const ownerId = getOwnerId(req);
    const result = await prisma.financialTransaction.deleteMany({
      where: { ownerId },
    });
    return res.json({ ok: true, deleted: result.count });
  } catch (err) {
    return next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const ownerId = getOwnerId(req);
    const body = normalize(req.body || {});
    if (!body.type) return res.status(400).json({ error: 'type_required' });
    if (body.amount === undefined || body.amount === null || body.amount === '') {
      return res.status(400).json({ error: 'amount_required' });
    }

    const sessionId = body.session_id ? String(body.session_id) : '';
    if (sessionId) {
      const lockKey = `${ownerId}:${sessionId}`;
      const result = await withSessionIdLock(lockKey, async () => {
        const rows = await prisma.financialTransaction.findMany({
          where: { ownerId },
          orderBy: { createdAt: 'desc' },
        });

        const matches = [];
        for (const row of rows) {
          const parsed = safeParse(row.data) || {};
          if (String(parsed.session_id || '') === sessionId) {
            matches.push({ row, parsed });
          }
        }

        if (matches.length) {
          const [keep, ...dups] = matches;
          // Merge to keep the transaction up to date (but preserve created_date).
          const merged = normalize({ ...keep.parsed, ...body, created_date: keep.parsed.created_date });

          await prisma.financialTransaction.update({
            where: { id: keep.row.id },
            data: { data: JSON.stringify(merged) },
          });

          if (dups.length) {
            await prisma.financialTransaction.deleteMany({
              where: { ownerId, id: { in: dups.map((d) => d.row.id) } },
            });
          }

          return { status: 200, payload: { id: keep.row.id, ...merged } };
        }

        const created = await prisma.financialTransaction.create({
          data: { ownerId, data: JSON.stringify(body) },
        });
        return { status: 201, payload: { id: created.id, ...body } };
      });

      return res.status(result.status).json(result.payload);
    }

    const created = await prisma.financialTransaction.create({
      data: { ownerId, data: JSON.stringify(body) },
    });
    return res.status(201).json({ id: created.id, ...body });
  } catch (err) {
    return next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const ownerId = getOwnerId(req);
    const existing = await prisma.financialTransaction.findFirst({ where: { id: req.params.id, ownerId } });
    if (!existing) return res.status(404).json({ error: 'not_found' });
    const current = safeParse(existing.data) || {};
    const merged = normalize({ ...current, ...(req.body || {}) });
    await prisma.financialTransaction.update({ where: { id: req.params.id }, data: { data: JSON.stringify(merged) } });
    return res.json({ id: req.params.id, ...merged });
  } catch (err) {
    return next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const ownerId = getOwnerId(req);
    const existing = await prisma.financialTransaction.findFirst({ where: { id: req.params.id, ownerId } });
    if (!existing) return res.status(404).json({ error: 'not_found' });
    await prisma.financialTransaction.delete({ where: { id: req.params.id } });
    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
});

export default router;
