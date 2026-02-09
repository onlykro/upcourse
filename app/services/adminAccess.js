// lib/adminAccess.api.js (or wherever you keep your client API helpers)

async function request(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    cache: "no-store",
    // ✅ important so your httpOnly cookie session is sent
    credentials: "include",
    headers: {
      ...(options.headers || {}),
    },
  });

  const text = await res.text().catch(() => "");
  let json = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = {};
  }

  if (!res.ok || json?.success === false) {
    throw new Error(json?.error || `Request failed (${res.status})`);
  }

  // your API returns { success:true, data: ... }
  return json?.data ?? null;
}

export async function apiGetAdminAccess(adminId) {
  return request(`/api/admin/access/${encodeURIComponent(adminId)}`, {
    method: "GET",
  });
}

export async function apiEnsureAdminAccess(adminId) {
  return request(`/api/admin/access/${encodeURIComponent(adminId)}`, {
    method: "POST",
  });
}

export async function apiSaveAdminAccess(adminId, patch) {
  return request(`/api/admin/access/${encodeURIComponent(adminId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ patch }),
  });
}
