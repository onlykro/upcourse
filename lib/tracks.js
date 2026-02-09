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

export async function fetchTracks({ search = "" } = {}) {
    const q = String(search ?? "").trim();
    const qs = q ? `?search=${encodeURIComponent(q)}` : "";
    const data = await request(`/api/tracks${qs}`, { method: "GET" });
    return data.tracks || [];
}

export async function createTrack(payload) {
    const data = await request("/api/tracks", { method: "POST", body: JSON.stringify(payload) });
    return data.track;
}

export async function updateTrack(id, payload) {
    const data = await request(`/api/tracks/${id}`, { method: "PUT", body: JSON.stringify(payload) });
    return data.track;
}

export async function deleteTrack(id) {
    const data = await request(`/api/tracks/${id}`, { method: "DELETE" });
    return data.success === true;
}

export default {
    fetchTracks,
    createTrack,
    updateTrack,
    deleteTrack,
};
