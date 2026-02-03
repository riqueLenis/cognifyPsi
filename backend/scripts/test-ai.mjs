import dotenv from 'dotenv';
import { invokeLLM } from '../src/services/ai.js';

dotenv.config({ path: new URL('../.env', import.meta.url) });

try {
  const result = await invokeLLM({
    prompt: 'Responda APENAS com JSON válido, sem texto extra: {"ok": true, "provider": "gemini"}',
  });
  console.log(JSON.stringify(result));
} catch (err) {
  console.error('AI_TEST_FAILED');
  console.error(err?.message || String(err));
  process.exitCode = 1;
}
