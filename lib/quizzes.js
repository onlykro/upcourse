// @/lib/quizzes.js

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

  // Some responses might be 204 or empty
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
 * Client-side normalization:
 * - prioritize track_id, fallback strand_id
 * - ALWAYS send only track_id (never strand_id)
 * This keeps your JSON files clean while still supporting old UI/state.
 */
function normalizeQuizPayload(payload) {
  const p = payload && typeof payload === "object" ? payload : {};

  const track_id =
    String(p.track_id ?? "").trim() || String(p.strand_id ?? "").trim() || "";

  const out = { ...p, track_id: track_id || null };

  // never send legacy key back (we only READ it elsewhere)
  delete out.strand_id;

  return out;
}

/**
 * Robust id getter for saveQuiz:
 * - supports quiz_id, id, assessment_id
 */
function getIdFromPayload(p) {
  const v = p?.quiz_id ?? p?.id ?? p?.assessment_id ?? "";
  return String(v ?? "").trim();
}

/* ----------------------------------- API ---------------------------------- */

export async function fetchQuizzes(params = {}) {
  const sp = new URLSearchParams();
  if (params.subject_id) sp.set("subject_id", params.subject_id);
  if (params.track_id) sp.set("track_id", params.track_id);
  if (params.search) sp.set("search", params.search);
  if (params.limit) sp.set("limit", String(params.limit));

  const qs = sp.toString() ? `?${sp.toString()}` : "";
  const data = await request(`/api/quizzes${qs}`, { method: "GET" });
  return data.quizzes || [];
}

export async function getQuiz(id) {
  const quizId = String(id ?? "").trim();
  if (!quizId) throw new Error("Missing quiz id");

  const data = await request(`/api/quizzes/${encodeURIComponent(quizId)}`, {
    method: "GET",
  });
  return data.quiz;
}

export async function createQuiz(payload) {
  const normalized = normalizeQuizPayload(payload);

  const data = await request("/api/quizzes", {
    method: "POST",
    body: JSON.stringify(normalized),
  });

  return data.quiz;
}

export async function updateQuiz(id, payload) {
  const quizId = String(id ?? "").trim();
  if (!quizId) throw new Error("Missing quiz id");

  const normalized = normalizeQuizPayload(payload);

  const data = await request(`/api/quizzes/${encodeURIComponent(quizId)}`, {
    method: "PUT",
    body: JSON.stringify({
      ...normalized,
      // ✅ keep stable identifiers present for your route/service
      quiz_id: normalized.quiz_id || quizId,
      id: normalized.id || quizId,
      assessment_id: normalized.assessment_id || quizId,
    }),
  });

  return data.quiz;
}

export async function deleteQuiz(id) {
  const quizId = String(id ?? "").trim();
  if (!quizId) throw new Error("Missing quiz id");

  const data = await request(`/api/quizzes/${encodeURIComponent(quizId)}`, {
    method: "DELETE",
    // ✅ your route supports body fallback; keep it for safety
    body: JSON.stringify({ quiz_id: quizId, id: quizId, assessment_id: quizId }),
  });

  return data.success === true;
}

/**
 * Save helper:
 * - uses quiz_id / id / assessment_id
 * - normalizes payload so we only ever send track_id
 */
export async function saveQuiz(payload) {
  const normalized = normalizeQuizPayload(payload);
  const id = getIdFromPayload(normalized);

  return id ? updateQuiz(id, normalized) : createQuiz(normalized);
}

/* --------------------------------- uploads -------------------------------- */

export async function uploadQuizImage(file) {
  const fd = new FormData();
  fd.append("file", file);

  const data = await request("/api/quizzes/upload/image", {
    method: "POST",
    body: fd,
  });

  return data.media;
}

export async function uploadQuizFile(file) {
  const fd = new FormData();
  fd.append("file", file);

  const data = await request("/api/quizzes/upload/file", {
    method: "POST",
    body: fd,
  });

  return data.media;
}

export default {
  fetchQuizzes,
  getQuiz,
  createQuiz,
  updateQuiz,
  deleteQuiz,
  saveQuiz,
  uploadQuizImage,
  uploadQuizFile,
};
