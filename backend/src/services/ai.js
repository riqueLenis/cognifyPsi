function toProvider(name) {
  return String(name || '').trim().toLowerCase();
}

function makeHttpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function safeJsonParse(text) {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch (err) {
    return { ok: false, error: err };
  }
}

function buildSystemInstruction(responseJsonSchema) {
  const base =
    'Você é um assistente que deve responder APENAS com um JSON válido, sem markdown, sem texto extra.';

  if (!responseJsonSchema) return base;

  return `${base}\n\nSiga este schema JSON (aproximado) para estruturar a resposta:\n${JSON.stringify(
    responseJsonSchema,
    null,
    2
  )}`;
}

async function invokeGemini({ prompt, responseJsonSchema }) {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

  if (!apiKey) {
    throw makeHttpError(503, 'GEMINI_API_KEY_not_configured');
  }

  const systemInstruction = buildSystemInstruction(responseJsonSchema);

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model
  )}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemInstruction }] },
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: 'application/json',
      },
    }),
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const message =
      data?.error?.message || data?.error || res.statusText || 'gemini_error';
    throw makeHttpError(res.status, message);
  }

  const text =
    data?.candidates?.[0]?.content?.parts?.map((p) => p?.text).filter(Boolean).join('') ||
    '';

  const parsed = safeJsonParse(text);
  if (!parsed.ok) {
    throw makeHttpError(502, 'gemini_returned_non_json');
  }

  return parsed.value;
}

async function invokeOpenAICompatible({ baseUrl, apiKey, model, prompt, responseJsonSchema }) {
  if (!apiKey) {
    throw makeHttpError(503, 'AI_API_KEY_not_configured');
  }

  const systemInstruction = buildSystemInstruction(responseJsonSchema);

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemInstruction },
        { role: 'user', content: prompt },
      ],
    }),
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const message = data?.error?.message || data?.error || res.statusText || 'ai_error';
    throw makeHttpError(res.status, message);
  }

  const text = data?.choices?.[0]?.message?.content || '';
  const parsed = safeJsonParse(text);
  if (!parsed.ok) {
    throw makeHttpError(502, 'ai_returned_non_json');
  }

  return parsed.value;
}

export async function invokeLLM({ prompt, responseJsonSchema }) {
  const provider = toProvider(process.env.AI_PROVIDER || 'gemini');

  if (provider === 'gemini') {
    return invokeGemini({ prompt, responseJsonSchema });
  }

  if (provider === 'groq') {
    const model = process.env.GROQ_MODEL || 'openai/gpt-oss-20b';
    return invokeOpenAICompatible({
      baseUrl: 'https://api.groq.com/openai/v1',
      apiKey: process.env.GROQ_API_KEY,
      model,
      prompt,
      responseJsonSchema,
    });
  }

  if (provider === 'hf' || provider === 'huggingface') {
    const model = process.env.HF_MODEL || 'deepseek-ai/DeepSeek-R1:fastest';
    return invokeOpenAICompatible({
      baseUrl: 'https://router.huggingface.co/v1',
      apiKey: process.env.HF_TOKEN,
      model,
      prompt,
      responseJsonSchema,
    });
  }

  throw makeHttpError(400, 'unknown_ai_provider');
}
