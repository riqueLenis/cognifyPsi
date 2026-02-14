import { getPrisma } from '../db.js';

const prisma = getPrisma();

const normalizeEmail = (value) => String(value || '').trim().toLowerCase();

const countNullOwner = async () => {
  const [clinic, patients, sessions, records, transactions] = await Promise.all([
    prisma.clinicSettings.count({ where: { ownerId: null } }),
    prisma.patient.count({ where: { ownerId: null } }),
    prisma.session.count({ where: { ownerId: null } }),
    prisma.medicalRecord.count({ where: { ownerId: null } }),
    prisma.financialTransaction.count({ where: { ownerId: null } }),
  ]);

  return { clinic, patients, sessions, records, transactions };
};

export async function runBackfillOwnerFromEnv() {
  const raw = process.env.BACKFILL_OWNER_EMAIL;
  if (!raw) return { skipped: true };

  const targetEmail = normalizeEmail(raw);
  const dryRun = String(process.env.BACKFILL_DRY_RUN || '').toLowerCase() === 'true' || process.env.BACKFILL_DRY_RUN === '1';

  // eslint-disable-next-line no-console
  console.log(`[backfill] starting (dryRun=${dryRun}) for email=${targetEmail}`);

  const user = await prisma.user.findFirst({
    where: { email: { equals: targetEmail, mode: 'insensitive' } },
    select: { id: true, email: true },
  });

  if (!user) {
    // eslint-disable-next-line no-console
    console.log(`[backfill] user not found for email=${targetEmail}. Skipping.`);
    return { skipped: true, reason: 'user_not_found' };
  }

  const before = await countNullOwner();
  // eslint-disable-next-line no-console
  console.log('[backfill] rows with ownerId NULL (before):', before);

  if (dryRun) {
    // eslint-disable-next-line no-console
    console.log('[backfill] DRY RUN enabled. No changes applied.');
    return { skipped: false, dryRun: true, before };
  }

  const [clinicRes, patientsRes, sessionsRes, recordsRes, transactionsRes] = await Promise.all([
    prisma.clinicSettings.updateMany({ where: { ownerId: null }, data: { ownerId: user.id } }),
    prisma.patient.updateMany({ where: { ownerId: null }, data: { ownerId: user.id } }),
    prisma.session.updateMany({ where: { ownerId: null }, data: { ownerId: user.id } }),
    prisma.medicalRecord.updateMany({ where: { ownerId: null }, data: { ownerId: user.id } }),
    prisma.financialTransaction.updateMany({ where: { ownerId: null }, data: { ownerId: user.id } }),
  ]);

  const updated = {
    clinicSettings: clinicRes.count,
    patients: patientsRes.count,
    sessions: sessionsRes.count,
    medicalRecords: recordsRes.count,
    financialTransactions: transactionsRes.count,
  };

  const after = await countNullOwner();
  // eslint-disable-next-line no-console
  console.log('[backfill] updated counts:', updated);
  // eslint-disable-next-line no-console
  console.log('[backfill] rows with ownerId NULL (after):', after);
  // eslint-disable-next-line no-console
  console.log('[backfill] done');

  return { skipped: false, dryRun: false, user, before, updated, after };
}
