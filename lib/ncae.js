// lib/ncae.js

/* -------------------------------- request -------------------------------- */

async function request(url, options = {}) {
  const hasBody = options.body !== undefined && options.body !== null;

  const headers = {
    ...(options.headers || {}),
  };

  // Only set JSON content-type if it's not FormData and body exists
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
 * NCAE format:
 * [
 *   { text: string, options: string[], category: string, correct_index: number }
 * ]
 */
export function normalizeNcaePayload(payload) {
  const arr = Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : [];

  return arr.map((q) => {
    const text = String(q?.text ?? "").trim();
    const category = String(q?.category ?? "GENERAL").trim() || "GENERAL";

    const optionsRaw = Array.isArray(q?.options) ? q.options : [];
    const options = optionsRaw.map((o) => String(o ?? "").trim());

    // keep at least 2 options
    const safeOptions = options.length >= 2 ? options : ["", ""];

    let correct_index = Number(q?.correct_index);
    if (!Number.isFinite(correct_index)) correct_index = 0;
    if (correct_index < 0) correct_index = 0;
    if (correct_index >= safeOptions.length) correct_index = safeOptions.length - 1;

    return {
      text,
      options: safeOptions,
      category,
      correct_index,
    };
  });
}

/* ----------------------------------- API ---------------------------------- */

/**
 * GET /api/ncae
 * expected: { success, bucket, path, data }
 */
export async function fetchNcaeQuestionnaire() {
  const out = await request("/api/ncae", { method: "GET" });
  return out; // { success, bucket, path, data }
}

export async function getNcaeData() {
  const out = await fetchNcaeQuestionnaire();
  return normalizeNcaePayload(out?.data || []);
}

/**
 * POST /api/ncae
 * body: { data: [...] }
 */
export async function createNcaeQuestionnaire(payload) {
  const normalized = normalizeNcaePayload(payload);

  const out = await request("/api/ncae", {
    method: "POST",
    body: JSON.stringify({ data: normalized }),
  });

  return out;
}

/**
 * PUT /api/ncae
 * body: { data: [...] }
 */
export async function updateNcaeQuestionnaire(payload) {
  const normalized = normalizeNcaePayload(payload);

  const out = await request("/api/ncae", {
    method: "PUT",
    body: JSON.stringify({ data: normalized }),
  });

  return out;
}

/**
 * DELETE /api/ncae
 */
export async function deleteNcaeQuestionnaire() {
  const out = await request("/api/ncae", { method: "DELETE" });
  return out?.success === true;
}

/**
 * Save helper:
 * Since NCAE is a single bucket JSON, saving is typically PUT (upsert).
 */
export async function saveNcaeQuestionnaire(payload) {
  return updateNcaeQuestionnaire(payload);
}

export default {
  fetchNcaeQuestionnaire,
  getNcaeData,
  createNcaeQuestionnaire,
  updateNcaeQuestionnaire,
  deleteNcaeQuestionnaire,
  saveNcaeQuestionnaire,
  normalizeNcaePayload,
};
