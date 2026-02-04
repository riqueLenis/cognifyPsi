import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { maybeSendSessionWhatsAppConfirmation } from '../src/services/whatsapp.js';

dotenv.config({ path: new URL('../.env', import.meta.url) });

const prisma = new PrismaClient();

const sessionId = process.argv[2];
if (!sessionId) {
  console.error('Usage: node scripts/test-whatsapp.mjs <sessionId>');
  process.exit(2);
}

try {
  const result = await maybeSendSessionWhatsAppConfirmation({ prisma, sessionId });
  console.log(JSON.stringify(result));
} catch (err) {
  console.error('WHATSAPP_TEST_FAILED');
  console.error(err?.message || String(err));
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
