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

router.get('/', async (req, res, next) => {
  try {
    const ownerId = getOwnerId(req);
    const all = await prisma.patient.findMany({
      where: { ownerId },
      orderBy: { createdAt: 'desc' },
    });
    const items = all
      .map((row) => ({ id: row.id, ...(safeParse(row.data) || {}) }))
      .filter(Boolean);

    // Generic filter: matches query params against top-level fields.
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

router.get('/:id', async (req, res, next) => {
  try {
    const ownerId = getOwnerId(req);
    const row = await prisma.patient.findFirst({ where: { id: req.params.id, ownerId } });
    if (!row) return res.status(404).json({ error: 'not_found' });
    const patient = { id: row.id, ...(safeParse(row.data) || {}) };

    const [sessions, medicalRecords, transactions] = await Promise.all([
      prisma.session.findMany({ where: { ownerId }, orderBy: { createdAt: 'desc' } }),
      prisma.medicalRecord.findMany({ where: { ownerId }, orderBy: { createdAt: 'desc' } }),
      prisma.financialTransaction.findMany({ where: { ownerId }, orderBy: { createdAt: 'desc' } }),
    ]);

    const byPatient = (rows) =>
      rows
        .map((r) => ({ id: r.id, ...(safeParse(r.data) || {}) }))
        .filter((x) => x.patient_id === req.params.id);

    return res.json({
      ...patient,
      sessions: byPatient(sessions),
      medicalRecords: byPatient(medicalRecords),
      transactions: byPatient(transactions),
    });
  } catch (err) {
    return next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const ownerId = getOwnerId(req);
    const body = normalize(req.body || {});
    if (!body.full_name) return res.status(400).json({ error: 'full_name_required' });

    const created = await prisma.patient.create({
      data: {
        ownerId,
        data: JSON.stringify(body),
      },
    });
    return res.status(201).json({ id: created.id, ...body });
  } catch (err) {
    return next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const ownerId = getOwnerId(req);
    const existing = await prisma.patient.findFirst({ where: { id: req.params.id, ownerId } });
    if (!existing) return res.status(404).json({ error: 'not_found' });
    const current = safeParse(existing.data) || {};
    const merged = normalize({ ...current, ...(req.body || {}) });

    await prisma.patient.update({
      where: { id: req.params.id },
      data: { data: JSON.stringify(merged) },
    });
    return res.json({ id: req.params.id, ...merged });
  } catch (err) {
    return next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const ownerId = getOwnerId(req);

    const patient = await prisma.patient.findFirst({ where: { id: req.params.id, ownerId } });
    if (!patient) return res.status(404).json({ error: 'not_found' });

    // Cascade delete related docs by patient_id
    const [sessions, medicalRecords, transactions] = await Promise.all([
      prisma.session.findMany({ where: { ownerId } }),
      prisma.medicalRecord.findMany({ where: { ownerId } }),
      prisma.financialTransaction.findMany({ where: { ownerId } }),
    ]);

    const matchPatient = (row) => (safeParse(row.data) || {}).patient_id === req.params.id;
    await Promise.all([
      ...sessions.filter(matchPatient).map((r) => prisma.session.delete({ where: { id: r.id } })),
      ...medicalRecords.filter(matchPatient).map((r) => prisma.medicalRecord.delete({ where: { id: r.id } })),
      ...transactions.filter(matchPatient).map((r) => prisma.financialTransaction.delete({ where: { id: r.id } })),
    ]);

    await prisma.patient.delete({ where: { id: req.params.id } });
    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
});

export default router;
