// lib/riasec.js

/* -------------------------------- request -------------------------------- */

async function request(url, options = {}) {
  const hasBody = options.body !== undefined && options.body !== null;

  const headers = {
    ...(options.headers || {}),
  };

  if (!(options.body instanceof FormData) && hasBody) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(url, {
    ...options,
    headers,
    cache: "no-store",
  });

  const text = await res.text().catch(() => "");
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = {};
  }

  if (!res.ok || data?.success === false) {
    throw new Error(data?.error || "Request failed");
  }

  return data;
}

/* -------------------------- payload normalization -------------------------- */
/**
 * RIASEC format:
 * {
 *   version: number,
 *   scale_min: number,
 *   scale_max: number,
 *   likert_labels: string[],
 *   items: [{ id:number, text:string, code:"R|I|A|S|E|C", reverse?:boolean }]
 * }
 */
export function normalizeRiasecPayload(payload) {
  const p =
    payload && typeof payload === "object" && !Array.isArray(payload)
      ? payload
      : payload?.data && typeof payload.data === "object"
      ? payload.data
      : {};

  const version = Number(p?.version) || 1;
  const scale_min = Number(p?.scale_min) || 1;
  const scale_max = Number(p?.scale_max) || 5;

  const likert_labels = Array.isArray(p?.likert_labels)
    ? p.likert_labels.map((x) => String(x ?? "").trim()).filter(Boolean)
    : ["Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"];

  const validCodes = new Set(["R", "I", "A", "S", "E", "C"]);

  const itemsRaw = Array.isArray(p?.items) ? p.items : [];
  const items = itemsRaw
    .map((it, idx) => {
      const code = String(it?.code ?? "R").trim().toUpperCase();
      const safeCode = validCodes.has(code) ? code : "R";

      return {
        id: idx + 1, // enforce sequential IDs
        text: String(it?.text ?? "").trim(),
        code: safeCode,
        ...(it?.reverse === true ? { reverse: true } : {}),
      };
    })
    .filter((it) => it.text); // drop empty lines

  return { version, scale_min, scale_max, likert_labels, items };
}

/* ----------------------------------- API ---------------------------------- */

/**
 * GET /api/riasec
 * expected: { success, bucket, path, data }
 */
export async function fetchRiasecItems() {
  const out = await request("/api/riasec", { method: "GET" });
  return out;
}

export async function getRiasecData() {
  const out = await fetchRiasecItems();
  return normalizeRiasecPayload(out?.data || {});
}

/**
 * POST /api/riasec
 * body: { data: {...} }
 */
export async function createRiasec(payload) {
  const normalized = normalizeRiasecPayload(payload);

  const out = await request("/api/riasec", {
    method: "POST",
    body: JSON.stringify({ data: normalized }),
  });

  return out;
}

/**
 * PUT /api/riasec
 * body: { data: {...} }
 */
export async function updateRiasec(payload) {
  const normalized = normalizeRiasecPayload(payload);

  const out = await request("/api/riasec", {
    method: "PUT",
    body: JSON.stringify({ data: normalized }),
  });

  return out;
}

/**
 * DELETE /api/riasec
 */
export async function deleteRiasec() {
  const out = await request("/api/riasec", { method: "DELETE" });
  return out?.success === true;
}

/**
 * Save helper:
 * Since RIASEC is a single bucket JSON, saving is typically PUT (upsert).
 */
export async function saveRiasec(payload) {
  return updateRiasec(payload);
}

export default {
  fetchRiasecItems,
  getRiasecData,
  createRiasec,
  updateRiasec,
  deleteRiasec,
  saveRiasec,
  normalizeRiasecPayload,
};
