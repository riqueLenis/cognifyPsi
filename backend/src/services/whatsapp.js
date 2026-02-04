function toBool(value) {
  return String(value || '').trim().toLowerCase() === 'true';
}

function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function makeHttpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

export function normalizePhoneToE164BR(raw) {
  if (!raw) return null;
  const digits = String(raw).replace(/\D/g, '');
  if (!digits) return null;

  // Accept already with country code (55).
  if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) {
    return `+${digits}`;
  }

  // Common BR lengths without country code: 10 (landline) or 11 (mobile).
  if (digits.length === 10 || digits.length === 11) {
    return `+55${digits}`;
  }

  return null;
}

export function formatDateBR(dateOnly) {
  if (!dateOnly) return '';
  const s = String(dateOnly);
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return s;
  return `${m[3]}/${m[2]}/${m[1]}`;
}

export function composeSessionConfirmationMessage({
  patientName,
  psychologistName,
  dateBR,
  time,
}) {
  const pName = patientName || 'Olá';
  const psy = psychologistName || 'a psicóloga';
  const when = [dateBR, time].filter(Boolean).join(' às ');

  return (
    `Olá, ${pName}!\n\n` +
    `Sua sessão com ${psy} foi agendada para ${when}.\n\n` +
    `Por favor, responda CONFIRMO para confirmar.\n` +
    `Se precisar reagendar, avise com antecedência. Obrigado!`
  );
}

function getProvider() {
  return String(process.env.WHATSAPP_PROVIDER || 'disabled').trim().toLowerCase();
}

async function sendViaMeta({ toE164, message, template }) {
  const token = process.env.WHATSAPP_META_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_META_PHONE_NUMBER_ID;
  if (!token || !phoneNumberId) {
    throw makeHttpError(503, 'WHATSAPP_META_not_configured');
  }

  const toDigits = toE164.replace(/^\+/, '');

  const payload = template
    ? {
        messaging_product: 'whatsapp',
        to: toDigits,
        type: 'template',
        template,
      }
    : {
        messaging_product: 'whatsapp',
        to: toDigits,
        type: 'text',
        text: { body: message },
      };

  const res = await fetch(`https://graph.facebook.com/v19.0/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = data?.error?.message || 'whatsapp_meta_error';
    throw makeHttpError(res.status, msg);
  }

  const messageId = data?.messages?.[0]?.id || null;
  return { ok: true, provider: 'meta', messageId };
}

function buildMetaTemplate({ patientName, psychologistName, dateBR, time }) {
  const name = process.env.WHATSAPP_TEMPLATE_NAME;
  if (!name) return null;
  const languageCode = process.env.WHATSAPP_TEMPLATE_LANGUAGE || 'pt_BR';

  return {
    name,
    language: { code: languageCode },
    components: [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: patientName || '' },
          { type: 'text', text: psychologistName || '' },
          { type: 'text', text: dateBR || '' },
          { type: 'text', text: time || '' },
        ],
      },
    ],
  };
}

export async function maybeSendSessionWhatsAppConfirmation({ prisma, sessionId, session }) {
  const enabled = toBool(process.env.WHATSAPP_ENABLED);
  if (!enabled) return { ok: true, skipped: true, reason: 'disabled' };

  if (!sessionId) return { ok: true, skipped: true, reason: 'missing_session_id' };

  const provider = getProvider();
  if (provider === 'disabled') return { ok: true, skipped: true, reason: 'provider_disabled' };

  const sessionRow = await prisma.session.findUnique({ where: { id: sessionId } });
  const stored = sessionRow ? safeJsonParse(sessionRow.data) || {} : {};
  const effective = { ...stored, ...(session || {}) };

  if (String(effective.status || '').toLowerCase() !== 'agendada') {
    return { ok: true, skipped: true, reason: 'status_not_agendada' };
  }

  const patientId = effective.patient_id;
  if (!patientId) return { ok: true, skipped: true, reason: 'missing_patient_id' };

  const patientRow = await prisma.patient.findUnique({ where: { id: patientId } });
  const patient = patientRow ? safeJsonParse(patientRow.data) || {} : null;
  if (!patient) return { ok: true, skipped: true, reason: 'patient_not_found' };

  const patientName = patient.full_name || patient.name || '';
  const rawPhone = patient.phone || patient.whatsapp || patient.telefone || patient.celular || '';
  const toE164 = normalizePhoneToE164BR(rawPhone);
  if (!toE164) return { ok: true, skipped: true, reason: 'invalid_or_missing_phone' };

  let psychologistName = process.env.WHATSAPP_PSYCHOLOGIST_NAME || '';
  if (!psychologistName) {
    const settingsAll = await prisma.clinicSettings.findMany({ orderBy: { createdAt: 'desc' }, take: 1 });
    const settings = settingsAll?.[0] ? safeJsonParse(settingsAll[0].data) || {} : {};
    psychologistName = settings.psychologist_name || '';
  }

  const dateBR = formatDateBR(effective.date);
  const time = effective.start_time || effective.time || '';

  const fingerprint = JSON.stringify({ date: effective.date || '', time: time || '', psychologistName: psychologistName || '' });
  if (effective.whatsapp_confirmation_fingerprint === fingerprint && effective.whatsapp_confirmation_sent_at) {
    return { ok: true, skipped: true, reason: 'already_sent_for_same_schedule' };
  }

  const message = composeSessionConfirmationMessage({
    patientName,
    psychologistName,
    dateBR,
    time,
  });

  let sendResult;

  if (provider === 'meta') {
    const template = buildMetaTemplate({ patientName, psychologistName, dateBR, time });
    sendResult = await sendViaMeta({ toE164, message, template });
  } else if (provider === 'link') {
    const toDigits = toE164.replace(/^\+/, '');
    const url = `https://wa.me/${toDigits}?text=${encodeURIComponent(message)}`;
    sendResult = { ok: true, provider: 'link', url, prepared: true };
  } else {
    return { ok: true, skipped: true, reason: 'unknown_provider' };
  }

  const nowIso = new Date().toISOString();
  const updated = {
    ...effective,
    whatsapp_confirmation_fingerprint: fingerprint,
    whatsapp_confirmation_provider: sendResult.provider,
    whatsapp_confirmation_to: toE164,
    whatsapp_confirmation_sent_at: sendResult.provider === 'link' ? null : nowIso,
    whatsapp_confirmation_prepared_at: sendResult.provider === 'link' ? nowIso : null,
    whatsapp_confirmation_message_id: sendResult.messageId || null,
    whatsapp_confirmation_error: null,
    updated_date: nowIso,
  };

  await prisma.session.update({
    where: { id: sessionId },
    data: { data: JSON.stringify(updated) },
  });

  return sendResult;
}
