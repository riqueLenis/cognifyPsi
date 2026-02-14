import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const usage = () => {
  console.log('Usage: node scripts/backfill-owner.mjs --email <email> [--dry-run]');
  console.log('Env alternative: TARGET_EMAIL=<email> DRY_RUN=1');
};

const getArg = (name) => {
  const idx = process.argv.indexOf(name);
  if (idx === -1) return null;
  return process.argv[idx + 1] || null;
};

const targetEmailRaw = getArg('--email') || process.env.TARGET_EMAIL;
const dryRun = process.argv.includes('--dry-run') || process.env.DRY_RUN === '1' || process.env.DRY_RUN === 'true';

if (!targetEmailRaw) {
  usage();
  process.exit(1);
}

const targetEmail = String(targetEmailRaw).trim().toLowerCase();

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

try {
  const user = await prisma.user.findFirst({
    where: { email: { equals: targetEmail, mode: 'insensitive' } },
    select: { id: true, email: true },
  });

  if (!user) {
    console.error(`User not found for email: ${targetEmail}`);
    process.exit(1);
  }

  const before = await countNullOwner();
  console.log('Backfill target:', user);
  console.log('Rows with ownerId NULL (before):', before);

  if (dryRun) {
    console.log('DRY RUN enabled. No changes applied.');
    process.exit(0);
  }

  const [clinicRes, patientsRes, sessionsRes, recordsRes, transactionsRes] = await Promise.all([
    prisma.clinicSettings.updateMany({ where: { ownerId: null }, data: { ownerId: user.id } }),
    prisma.patient.updateMany({ where: { ownerId: null }, data: { ownerId: user.id } }),
    prisma.session.updateMany({ where: { ownerId: null }, data: { ownerId: user.id } }),
    prisma.medicalRecord.updateMany({ where: { ownerId: null }, data: { ownerId: user.id } }),
    prisma.financialTransaction.updateMany({ where: { ownerId: null }, data: { ownerId: user.id } }),
  ]);

  console.log('Updated counts:', {
    clinicSettings: clinicRes.count,
    patients: patientsRes.count,
    sessions: sessionsRes.count,
    medicalRecords: recordsRes.count,
    financialTransactions: transactionsRes.count,
  });

  const after = await countNullOwner();
  console.log('Rows with ownerId NULL (after):', after);

  console.log('Done.');
} catch (err) {
  console.error(err);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
