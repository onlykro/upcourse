async function request(url, options = {}) {
  const hasBody = options.body !== undefined && options.body !== null;
  const isFormData = hasBody && options.body instanceof FormData;

  const headers = {
    ...(options.headers || {}),
  };

  // Only set JSON content type when NOT FormData
  if (!isFormData && hasBody) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(url, {
    ...options,
    headers,
    cache: "no-store",
  });

  const text = await res.text().catch(() => "");
  const data = text ? JSON.parse(text) : {};

  if (!res.ok || data?.success === false) {
    throw new Error(data?.error || "Request failed");
  }
  return data;
}

export async function fetchResources(params = {}) {
    const sp = new URLSearchParams();
    if (params.subject_id) sp.set("subject_id", params.subject_id);
    if (params.search) sp.set("search", params.search);
    if (params.limit) sp.set("limit", String(params.limit));

    const qs = sp.toString() ? `?${sp.toString()}` : "";
    const data = await request(`/api/resources${qs}`, { method: "GET" });
    return data.resources || [];
}

export async function createResource(payload) {
    const data = await request("/api/resources", {
        method: "POST",
        body: JSON.stringify(payload),
    });
    return data.resource;
}

export async function updateResource(id, payload) {
    const data = await request(`/api/resources/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
    });
    return data.resource;
}

export async function deleteResource(id) {
    const data = await request(`/api/resources/${id}`, { method: "DELETE" });
    return data.success === true;
}

export async function uploadResourceFile(file) {
  const fd = new FormData();
  fd.append("file", file);

  const data = await request("/api/resources/upload", {
    method: "POST",
    body: fd,
  });

  // expects { success: true, key, url }
  return { key: data.key, url: data.url };
}
