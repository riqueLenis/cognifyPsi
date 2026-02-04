import express from 'express';
import { getPrisma } from '../db.js';
// WhatsApp integration temporarily disabled by request.
// import { maybeSendSessionWhatsAppConfirmation } from '../services/whatsapp.js';

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
    const all = await prisma.session.findMany({ orderBy: { createdAt: 'desc' } });
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
    if (!body.patient_id) return res.status(400).json({ error: 'patient_id_required' });
    if (!body.date) return res.status(400).json({ error: 'date_required' });

    const created = await prisma.session.create({ data: { data: JSON.stringify(body) } });

    // WhatsApp integration temporarily disabled by request.
    // setImmediate(() => {
    //   maybeSendSessionWhatsAppConfirmation({ prisma, sessionId: created.id, session: body }).catch((err) => {
    //     // eslint-disable-next-line no-console
    //     console.warn('[whatsapp] failed to send confirmation', err?.message || err);
    //   });
    // });

    return res.status(201).json({ id: created.id, ...body });
  } catch (err) {
    return next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const existing = await prisma.session.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'not_found' });
    const current = safeParse(existing.data) || {};
    const merged = normalize({ ...current, ...(req.body || {}) });
    await prisma.session.update({ where: { id: req.params.id }, data: { data: JSON.stringify(merged) } });

    // WhatsApp integration temporarily disabled by request.
    // setImmediate(() => {
    //   maybeSendSessionWhatsAppConfirmation({ prisma, sessionId: req.params.id, session: merged }).catch((err) => {
    //     // eslint-disable-next-line no-console
    //     console.warn('[whatsapp] failed to send confirmation', err?.message || err);
    //   });
    // });

    return res.json({ id: req.params.id, ...merged });
  } catch (err) {
    return next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await prisma.session.delete({ where: { id: req.params.id } });
    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
});

export default router;
