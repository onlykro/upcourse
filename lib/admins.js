// lib/admins.js

async function request(url, options = {}) {
  const hasBody = options.body !== undefined && options.body !== null;
  const headers = { ...(options.headers || {}) };

  if (!(options.body instanceof FormData) && hasBody) headers["Content-Type"] = "application/json";

  const res = await fetch(url, { ...options, headers, cache: "no-store" });
  const text = await res.text().catch(() => "");
  const json = text ? JSON.parse(text) : {};

  if (!res.ok || json?.success === false) {
    throw new Error(json?.error || `Request failed (${res.status})`);
  }
  return json;
}

export async function fetchAdmins() {
  const json = await request("/api/admin/admins", { method: "GET" });
  // supports either {data:[...]} or {admins:[...]}
  return json.data || json.admins || [];
}

export async function createAdmin(payload) {
  return request("/api/admin/admins", { method: "POST", body: JSON.stringify(payload) });
}

export async function updateAdmin(adminId, patch) {
  return request(`/api/admin/admins/${adminId}`, { method: "PATCH", body: JSON.stringify(patch) });
}

export async function deleteAdmin(adminId) {
  return request(`/api/admin/admins/${adminId}`, { method: "DELETE" });
}