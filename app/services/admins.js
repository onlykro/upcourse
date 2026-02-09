async function request(url, options = {}) {
  const res = await fetch(url, { ...options, cache: "no-store" });
  const text = await res.text().catch(() => "");
  const json = text ? JSON.parse(text) : {};
  if (!res.ok || json?.success === false) throw new Error(json?.error || "Request failed");
  return json;
}

export async function fetchAdmins() {
  const res = await fetch("/api/admins", { cache: "no-store" });
  const json = await res.json();
  if (!res.ok || json?.success === false) throw new Error(json?.error || "Request failed");
  return json.admins || json.data || [];
}

export async function createAdmin(payload) {
  const json = await request("/api/admins", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ admin: payload }),
  });
  return json?.data ?? null;
}

export async function updateAdmin(id, patch) {
  const json = await request(`/api/admins/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ patch }),
  });
  return json?.data ?? null;
}

export async function deleteAdmin(id) {
  const json = await request(`/api/admins/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  return json?.data ?? true;
}
