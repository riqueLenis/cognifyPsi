const TOKEN_KEY = "menteclara_token";

const getApiBaseUrl = () => {
  // In local dev we rely on Vite proxy for /api.
  // In production (e.g. Vercel), set VITE_API_BASE_URL to your backend origin.
  try {
    /** @type {any} */
    const meta = import.meta;
    const value = meta && meta.env ? meta.env.VITE_API_BASE_URL : undefined;
    if (!value) return "";
    return String(value).replace(/\/+$/, "");
  } catch {
    return "";
  }
};

/**
 * @typedef {Object} RequestArgs
 * @property {'GET'|'POST'|'PUT'|'DELETE'} method
 * @property {string} path
 * @property {any=} body
 * @property {Record<string, any>=} query
 */

class HttpError extends Error {
  /** @param {string} message @param {number} status @param {any} data */
  constructor(message, status, data) {
    super(message);
    this.name = "HttpError";
    /** @type {number} */
    this.status = status;
    /** @type {any} */
    this.data = data;
  }
}

const getToken = () => {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
};

const setToken = (token) => {
  if (typeof window === "undefined") return;
  if (!token) window.localStorage.removeItem(TOKEN_KEY);
  else window.localStorage.setItem(TOKEN_KEY, token);
};

const toQueryString = (params = {}) => {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    searchParams.set(key, String(value));
  });
  const qs = searchParams.toString();
  return qs ? `?${qs}` : "";
};

/** @param {RequestArgs} args */
const request = async ({ method, path, body, query }) => {
  const token = getToken();
  const apiBaseUrl = getApiBaseUrl();
  const url = `${apiBaseUrl}/api${path}${toQueryString(query)}`;
  const res = await fetch(url, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const contentType = res.headers.get("content-type") || "";
  const data = contentType.includes("application/json")
    ? await res.json().catch(() => null)
    : await res.text().catch(() => null);

  if (!res.ok) {
    throw new HttpError(
      (data && data.error) || res.statusText,
      res.status,
      data,
    );
  }
  return data;
};

const makeEntity = (resource) => {
  return {
    list: async (_order) => request({ method: "GET", path: `/${resource}` }),
    filter: async (criteria = {}) =>
      request({ method: "GET", path: `/${resource}`, query: criteria }),
    create: async (data) =>
      request({ method: "POST", path: `/${resource}`, body: data }),
    update: async (id, data) =>
      request({ method: "PUT", path: `/${resource}/${id}`, body: data }),
    delete: async (id) =>
      request({ method: "DELETE", path: `/${resource}/${id}` }),
  };
};

const inferSentiment = (text = "") => {
  const t = String(text).toLowerCase();
  const positives = [
    "melhor",
    "bem",
    "calmo",
    "confiante",
    "alívio",
    "progresso",
    "feliz",
    "esperança",
    "motivado",
  ];
  const negatives = [
    "pior",
    "mal",
    "ansioso",
    "ansiedade",
    "triste",
    "depress",
    "raiva",
    "culpa",
    "medo",
    "crise",
    "pânico",
    "suic",
  ];
  const posCount = positives.reduce(
    (acc, w) => acc + (t.includes(w) ? 1 : 0),
    0,
  );
  const negCount = negatives.reduce(
    (acc, w) => acc + (t.includes(w) ? 1 : 0),
    0,
  );
  const score = Math.max(-1, Math.min(1, (posCount - negCount) / 6));
  let overall_sentiment = "neutro";
  if (score <= -0.6) overall_sentiment = "muito_negativo";
  else if (score <= -0.2) overall_sentiment = "negativo";
  else if (score <= 0.2) overall_sentiment = "neutro";
  else if (score <= 0.6) overall_sentiment = "positivo";
  else overall_sentiment = "muito_positivo";
  return { score, overall_sentiment };
};

const integrations = {
  Core: {
    /** @param {{ prompt?: string, response_json_schema?: any }=} args */
    async InvokeLLM(args = {}) {
      const { prompt, response_json_schema } = args;
      try {
        return await request({
          method: "POST",
          path: "/integrations/core/invoke-llm",
          body: { prompt, response_json_schema },
        });
      } catch (_err) {
        // If the backend responded with a meaningful 4xx (auth/config/quota/etc),
        // propagate it so the UI can show the real cause.
        if (_err?.name === "HttpError" && _err?.status && _err.status < 500) {
          throw _err;
        }

        const { score, overall_sentiment } = inferSentiment(prompt);
        return {
          overall_sentiment,
          sentiment_score: score,
          emotions_detected: overall_sentiment.includes("neg")
            ? ["ansiedade", "tristeza"]
            : overall_sentiment.includes("pos")
              ? ["esperança", "alívio"]
              : ["neutro"],
          key_themes: ["sessão clínica", "relato do paciente"],
          risk_indicators: prompt?.toLowerCase?.().includes("suic")
            ? ["menção a ideação suicida (verificar)"]
            : [],
          positive_indicators: overall_sentiment.includes("pos")
            ? ["sinais de progresso percebido"]
            : [],
          therapeutic_progress:
            "Avaliação inicial gerada automaticamente (revise clinicamente).",
          recommendations: [
            "Explorar temas emergentes com perguntas abertas",
            "Registrar fatores de risco/proteção",
            "Definir próximos objetivos terapêuticos",
          ],
          summary:
            "Fallback local: backend de IA indisponível ou não configurado.",
        };
      }
    },
  },
};

export const base44 = {
  integrations,
  auth: {
    integrations,
    async login(email, password) {
      const res = await request({
        method: "POST",
        path: "/auth/login",
        body: { email, password },
      });
      setToken(res.token);
      return res;
    },
    async register(email, password, fullName) {
      return request({
        method: "POST",
        path: "/auth/register",
        body: { email, password, fullName },
      });
    },
    async me() {
      return request({ method: "GET", path: "/auth/me" });
    },
    logout(redirectUrl) {
      setToken(null);
      if (redirectUrl) {
        window.location.href = `/login?from=${encodeURIComponent(redirectUrl)}`;
      }
    },
    redirectToLogin(returnUrl) {
      window.location.href = `/login?from=${encodeURIComponent(returnUrl || window.location.href)}`;
    },
  },
  appLogs: {
    async logUserInApp(_pageName) {
      // Optional: wire to backend later. Keep as no-op so navigation tracking never breaks the UI.
      return { ok: true };
    },
  },
  entities: {
    Patient: makeEntity("patients"),
    Session: makeEntity("sessions"),
    MedicalRecord: makeEntity("medical-records"),
    Financial: makeEntity("financial"),
    ClinicSettings: {
      list: async () => request({ method: "GET", path: "/clinic-settings" }),
      create: async (data) =>
        request({ method: "POST", path: "/clinic-settings", body: data }),
      update: async (id, data) =>
        request({ method: "PUT", path: `/clinic-settings/${id}`, body: data }),
      delete: async (id) =>
        request({ method: "DELETE", path: `/clinic-settings/${id}` }),
      filter: async (criteria = {}) =>
        request({ method: "GET", path: "/clinic-settings", query: criteria }),
    },
  },
};
