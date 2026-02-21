const toISODate = (value) => {
  if (!value) return "";
  const s = String(value);
  // yyyy-mm-dd
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().split("T")[0];
};

const normalizeAmount = (value) => {
  const num =
    typeof value === "number"
      ? value
      : Number(String(value ?? "").replace(",", "."));
  if (Number.isNaN(num) || !Number.isFinite(num)) return 0;
  return num;
};

export const mapSessionToFinancial = (session) => {
  const dueDate =
    toISODate(session?.date) || new Date().toISOString().split("T")[0];

  const paymentStatus = session?.payment_status || "pendente";
  const isPaid = paymentStatus === "pago" || paymentStatus === "isento";

  const amount = normalizeAmount(session?.price);

  const baseDescription = session?.patient_name
    ? `Sessão - ${session.patient_name}`
    : "Sessão";
  const description = `${baseDescription} (${dueDate})`;

  return {
    type: "receita",
    category: "sessao",
    description,
    amount: isPaid && paymentStatus === "isento" ? 0 : amount,
    status: isPaid ? "pago" : "pendente",
    due_date: dueDate,
    payment_date: isPaid ? dueDate : "",
    patient_id: session?.patient_id || "",
    patient_name: session?.patient_name || "",
    session_id: session?.id || "",
  };
};

export const ensureFinancialForSession = async (base44, session) => {
  if (!base44?.entities?.Financial)
    throw new Error("base44_missing_financial_entity");
  if (!session?.id) return null;
  if (!session?.patient_id) return null;
  if (!session?.date) return null;

  // Não criar lançamentos para sessões canceladas/falta.
  if (session.status === "cancelada" || session.status === "falta") return null;

  const desired = mapSessionToFinancial(session);

  // Backend filtra em memória, então dá para filtrar por session_id.
  const existing = await base44.entities.Financial.filter({
    session_id: session.id,
  });
  const current = Array.isArray(existing) ? existing[0] : null;

  if (current?.id) {
    // Preserva campos que podem ser editados manualmente no Financeiro.
    const keepPaid = current.status === "pago" && desired.status === "pendente";
    const merged = {
      ...current,
      ...desired,
      payment_method: current.payment_method || desired.payment_method,
      notes: current.notes || desired.notes,
    };

    if (keepPaid) {
      merged.status = current.status;
      merged.payment_date = current.payment_date || merged.payment_date;
    }
    return base44.entities.Financial.update(current.id, merged);
  }

  // Se o usuário criou manualmente uma transação de sessão no Financeiro (sem session_id),
  // tentamos vincular essa transação à sessão para evitar duplicidades e permitir limpeza.
  try {
    const candidates = await base44.entities.Financial.filter({
      category: desired.category,
      due_date: desired.due_date,
      patient_id: desired.patient_id,
      type: desired.type,
    });
    const candidate = Array.isArray(candidates)
      ? candidates.find((t) => !t?.session_id)
      : null;

    if (candidate?.id) {
      const merged = {
        ...candidate,
        ...desired,
        payment_method: candidate.payment_method || desired.payment_method,
        notes: candidate.notes || desired.notes,
      };
      return base44.entities.Financial.update(candidate.id, merged);
    }
  } catch {
    // Se falhar, seguimos criando normalmente.
  }

  return base44.entities.Financial.create(desired);
};
