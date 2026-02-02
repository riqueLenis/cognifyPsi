import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const safeParse = (value) => {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const sessions = await prisma.session.findMany();
const financial = await prisma.financialTransaction.findMany();

console.log('sessions:', sessions.length);
console.log('financial:', financial.length);

const sessionIds = new Set(sessions.map((r) => String(r.id)));

const finItems = financial.map((r) => ({ id: r.id, ...(safeParse(r.data) || {}) }));
const sessionFinancials = finItems.filter((f) => f.category === 'sessao');
const orphans = sessionFinancials.filter((f) => (f.session_id ? !sessionIds.has(String(f.session_id)) : false));

console.log('financial category=sessao:', sessionFinancials.length);
console.log('orphans (session_id not found):', orphans.length);
console.log('orphans sample:', orphans.slice(0, 10));
console.log('sessao without session_id:', sessionFinancials.filter((f) => !f.session_id).length);

await prisma.$disconnect();
