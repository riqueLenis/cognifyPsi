import express from "express";
import { getPrisma } from "../db.js";
// WhatsApp integration temporarily disabled by request.
// import { maybeSendSessionWhatsAppConfirmation } from '../services/whatsapp.js';

const router = express.Router();
const prisma = getPrisma();

const getOwnerId = (req) => String(req.user?.sub || "");

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

const parseYmdAsUtcDate = (value) => {
  if (!value) return null;
  const raw = String(value);
  const str = raw.includes("T") ? raw.slice(0, 10) : raw;
  const [y, m, d] = str.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(Date.UTC(y, m - 1, d));
};

const formatUtcDateAsYmd = (date) => {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const chunk = (arr, size) => {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

const normalizeDateStr = (value) => {
  if (!value) return "";
  const raw = String(value);
  return raw.includes("T") ? raw.slice(0, 10) : raw;
};

router.get("/", async (req, res, next) => {
  try {
    const ownerId = getOwnerId(req);
    const all = await prisma.session.findMany({
      where: { ownerId },
      orderBy: { createdAt: "desc" },
    });
    const items = all.map((row) => ({
      id: row.id,
      ...(safeParse(row.data) || {}),
    }));

    const query = { ...req.query };
    const filtered = Object.keys(query).length
      ? items.filter((item) =>
          Object.entries(query).every(
            ([key, value]) => String(item[key]) === String(value),
          ),
        )
      : items;

    return res.json(filtered);
  } catch (err) {
    return next(err);
  }
});

// Bulk operations (must be defined before /:id)
router.post("/bulk-reschedule", async (req, res, next) => {
  try {
    const ownerId = getOwnerId(req);
    const { patient_id, from_date, new_date } = req.body || {};
    if (!patient_id)
      return res.status(400).json({ error: "patient_id_required" });
    if (!from_date)
      return res.status(400).json({ error: "from_date_required" });
    if (!new_date) return res.status(400).json({ error: "new_date_required" });

    const from = parseYmdAsUtcDate(from_date);
    const to = parseYmdAsUtcDate(new_date);
    if (!from) return res.status(400).json({ error: "from_date_invalid" });
    if (!to) return res.status(400).json({ error: "new_date_invalid" });

    const deltaDays = Math.round(
      (to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000),
    );

    const rows = await prisma.session.findMany({
      where: { ownerId },
      select: { id: true, data: true },
    });

    const fromStr = String(from_date);
    const targets = [];
    for (const row of rows) {
      const obj = safeParse(row.data) || {};
      if (String(obj.patient_id) !== String(patient_id)) continue;
      if (!obj.date) continue;
      const rawDateStr = String(obj.date);
      const dateStr = rawDateStr.includes("T")
        ? rawDateStr.slice(0, 10)
        : rawDateStr;
      // ISO yyyy-mm-dd compares lexicographically for ordering
      if (dateStr < fromStr) continue;
      targets.push({ id: row.id, obj });
    }

    const updates = targets
      .map(({ id, obj }) => {
        const current = parseYmdAsUtcDate(obj.date);
        if (!current) return null;
        const nextDate = new Date(
          current.getTime() + deltaDays * 24 * 60 * 60 * 1000,
        );
        const merged = normalize({
          ...obj,
          date: formatUtcDateAsYmd(nextDate),
        });
        return prisma.session.update({
          where: { id },
          data: { data: JSON.stringify(merged) },
        });
      })
      .filter(Boolean);

    for (const batch of chunk(updates, 50)) {
      // eslint-disable-next-line no-await-in-loop
      await prisma.$transaction(batch);
    }

    return res.json({
      ok: true,
      updated: updates.length,
      delta_days: deltaDays,
    });
  } catch (err) {
    return next(err);
  }
});

router.post("/bulk-delete", async (req, res, next) => {
  try {
    const ownerId = getOwnerId(req);
    const { patient_id } = req.body || {};
    if (!patient_id)
      return res.status(400).json({ error: "patient_id_required" });

    const rows = await prisma.session.findMany({
      where: { ownerId },
      select: { id: true, data: true },
    });

    const ids = [];
    for (const row of rows) {
      const obj = safeParse(row.data) || {};
      if (String(obj.patient_id) !== String(patient_id)) continue;
      ids.push(row.id);
    }

    if (!ids.length) return res.json({ ok: true, deleted: 0 });

    const result = await prisma.session.deleteMany({
      where: { ownerId, id: { in: ids } },
    });

    return res.json({ ok: true, deleted: result.count });
  } catch (err) {
    return next(err);
  }
});

router.post("/bulk-delete-future", async (req, res, next) => {
  try {
    const ownerId = getOwnerId(req);
    const { patient_id, from_date, from_start_time } = req.body || {};
    if (!patient_id)
      return res.status(400).json({ error: "patient_id_required" });
    if (!from_date)
      return res.status(400).json({ error: "from_date_required" });

    const fromDateStr = normalizeDateStr(from_date);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fromDateStr)) {
      return res.status(400).json({ error: "from_date_invalid" });
    }

    const fromTimeStr = from_start_time ? String(from_start_time) : "";

    const rows = await prisma.session.findMany({
      where: { ownerId },
      select: { id: true, data: true },
    });

    const sessionIdsToDelete = [];
    for (const row of rows) {
      const obj = safeParse(row.data) || {};
      if (String(obj.patient_id) !== String(patient_id)) continue;
      const dateStr = normalizeDateStr(obj.date);
      if (!dateStr) continue;

      const isAfterDate = dateStr > fromDateStr;
      const isSameDate = dateStr === fromDateStr;

      // "Futuras": por padrão, não inclui a sessão atual; se vier from_start_time,
      // só remove as sessões do mesmo dia com start_time maior.
      let isFuture = false;
      if (isAfterDate) isFuture = true;
      else if (isSameDate && fromTimeStr) {
        const start = obj.start_time ? String(obj.start_time) : "";
        if (start && start > fromTimeStr) isFuture = true;
      }

      if (!isFuture) continue;
      sessionIdsToDelete.push(row.id);
    }

    if (!sessionIdsToDelete.length) {
      return res.json({ ok: true, deleted_sessions: 0, deleted_financial: 0 });
    }

    const deletedSessions = await prisma.session.deleteMany({
      where: { ownerId, id: { in: sessionIdsToDelete } },
    });

    // Remove linked financial transactions for deleted sessions.
    const finRows = await prisma.financialTransaction.findMany({
      where: { ownerId },
      select: { id: true, data: true },
    });

    const finIds = [];
    const sessionIdSet = new Set(sessionIdsToDelete.map(String));
    for (const row of finRows) {
      const obj = safeParse(row.data) || {};
      const sid = obj.session_id ? String(obj.session_id) : "";
      if (!sid) continue;
      if (!sessionIdSet.has(sid)) continue;
      finIds.push(row.id);
    }

    let deletedFinancialCount = 0;
    if (finIds.length) {
      const deletedFin = await prisma.financialTransaction.deleteMany({
        where: { ownerId, id: { in: finIds } },
      });
      deletedFinancialCount = deletedFin.count;
    }

    return res.json({
      ok: true,
      deleted_sessions: deletedSessions.count,
      deleted_financial: deletedFinancialCount,
    });
  } catch (err) {
    return next(err);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const ownerId = getOwnerId(req);
    const body = normalize(req.body || {});
    if (!body.patient_id)
      return res.status(400).json({ error: "patient_id_required" });
    if (!body.date) return res.status(400).json({ error: "date_required" });

    const created = await prisma.session.create({
      data: { ownerId, data: JSON.stringify(body) },
    });

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

router.put("/:id", async (req, res, next) => {
  try {
    const ownerId = getOwnerId(req);
    const existing = await prisma.session.findFirst({
      where: { id: req.params.id, ownerId },
    });
    if (!existing) return res.status(404).json({ error: "not_found" });
    const current = safeParse(existing.data) || {};
    const merged = normalize({ ...current, ...(req.body || {}) });
    await prisma.session.update({
      where: { id: req.params.id },
      data: { data: JSON.stringify(merged) },
    });

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

router.delete("/:id", async (req, res, next) => {
  try {
    const ownerId = getOwnerId(req);
    const existing = await prisma.session.findFirst({
      where: { id: req.params.id, ownerId },
    });
    if (!existing) return res.status(404).json({ error: "not_found" });
    await prisma.session.delete({ where: { id: req.params.id } });
    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
});

export default router;
