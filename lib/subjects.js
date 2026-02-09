// lib/subjects.js

async function request(url, options) {
  const res = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options?.headers || {}) },
    cache: "no-store",
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.success === false) throw new Error(data?.error || "Request failed");
  return data;
}

const toStr = (v) => String(v ?? "").trim();

export async function fetchSubjects(params = {}) {
  const p = params && typeof params === "object" ? params : {};
  const qs = new URLSearchParams();

  if (p.search) qs.set("search", String(p.search));

  // ✅ NEW: track_id filter (current schema)
  if (p.track_id) qs.set("track_id", String(p.track_id));

  // ✅ Backward compatibility: if some page still sends strand_id, map it to track_id
  // (keep this while you migrate old pages/forms)
  if (!p.track_id && p.strand_id) qs.set("track_id", String(p.strand_id));

  if (p.category) qs.set("category", String(p.category));
  if (p.status) qs.set("status", String(p.status));
  if (p.type) qs.set("type", String(p.type));
  if (p.sort) qs.set("sort", String(p.sort));

  if (p.page) qs.set("page", String(p.page));
  if (p.limit) qs.set("limit", String(p.limit));

  const url = `/api/subjects${qs.toString() ? `?${qs.toString()}` : ""}`;
  const data = await request(url, { method: "GET" });

  return {
    subjects: data.subjects || [],
    pagination: data.pagination || null,
  };
}

export async function createSubject(payload) {
  const data = await request("/api/subjects", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return data.subject;
}

export async function updateSubject(subject_id, payload) {
  const id = toStr(subject_id);
  if (!id) throw new Error("Missing subject_id in URL.");
  const data = await request(`/api/subjects/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  return data.subject;
}

export async function deleteSubject(subject_id) {
  const id = toStr(subject_id);
  if (!id) throw new Error("Missing subject_id in URL.");
  const data = await request(`/api/subjects/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  return data.success === true;
}

export default {
  fetchSubjects,
  createSubject,
  updateSubject,
  deleteSubject,
};
