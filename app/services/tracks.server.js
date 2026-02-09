// app/services/tracks.server.js
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error(
        "Missing Supabase env vars. Check NEXT_PUBLIC_SUPABASE_URL and SUPABASE_*_KEY."
    );
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ✅ NEW DB table
const TABLE = "tracks";

const toStr = (v) => String(v ?? "").trim();

const normalizeHex = (v, fallback) => {
    const s = toStr(v);
    if (!s) return fallback;
    const hex = s.startsWith("#") ? s : `#${s}`;
    return /^#[0-9A-Fa-f]{6}$/.test(hex) ? hex : fallback;
};

const normalizeJsonb = (v, fallback = []) => {
    if (v === undefined || v === null) return fallback;

    if (typeof v === "string") {
        const s = v.trim();
        if (!s) return fallback;
        try {
        return JSON.parse(s);
        } catch {
        return fallback;
        }
    }

    if (typeof v === "object") return v;
    return fallback;
};

/**
 * Backward compatibility mapper:
 * - old "code" => track_id
 * - old "name" => track_name
 */
function applyAliases(payload = {}) {
    const p = { ...payload };

    if (typeof p.track_id === "undefined" && typeof p.code !== "undefined") {
        p.track_id = p.code;
    }
    if (typeof p.track_name === "undefined" && typeof p.name !== "undefined") {
        p.track_name = p.name;
    }

    // keep summary as-is (you already have summary column)
    // sample_curriculum already matches your column

    // optional: remove old keys so they won't be accidentally used elsewhere
    delete p.code;
    delete p.name;

    return p;
}

// ✅ Only allow columns that exist in public.tracks
const ALLOWED = [
    "track_id",
    "track_name",
    "track_duration",
    "track_description",
    "track_profile",
    "track_status",

    "summary",
    "badge_color",
    "gradient_start",
    "gradient_end",

    "points",
    "sample_curriculum",
    "entry_roles",
    "skills",
    "sources",
];

function pickAllowed(payload = {}) {
    const out = {};
    for (const k of ALLOWED) {
        if (typeof payload[k] !== "undefined") out[k] = payload[k];
    }
    return out;
}

export async function getTracks({ search = "" } = {}) {
    const q = toStr(search);

    let query = supabase
        .from(TABLE)
        .select("*")
        .order("track_name", { ascending: true });

    if (q) {
        const like = `%${q}%`;
        query = query.or(
        `track_id.ilike.${like},track_name.ilike.${like},summary.ilike.${like},track_description.ilike.${like}`
        );
    }

    const { data, error } = await query;
    if (error) throw error;
    return Array.isArray(data) ? data : [];
}

export async function getTrackById(track_id) {
    const id = toStr(track_id);
    const { data, error } = await supabase
        .from(TABLE)
        .select("*")
        .eq("track_id", id)
        .single();

    if (error) throw error;
    return data || null;
}

export async function createTrack(payload) {
    try {
        const p = applyAliases(payload);

        const track_id = toStr(p?.track_id).toUpperCase(); // ✅ you can keep uppercase IDs
        const track_name = toStr(p?.track_name);
        const summary = toStr(p?.summary);

        if (!track_id || !track_name) {
        return { success: false, error: "Track ID and Track Name are required." };
        }

        const insertData = {
        track_id,
        track_name,

        track_duration:
            typeof p?.track_duration === "undefined" || p?.track_duration === null || p?.track_duration === ""
            ? null
            : Number(p.track_duration),

        track_description: toStr(p?.track_description) || null,
        track_profile: toStr(p?.track_profile) || null,
        track_status: toStr(p?.track_status) || null,

        summary: summary || null,

        // defaults based on table defaults
        badge_color: normalizeHex(p?.badge_color, "#1976D2"),
        gradient_start: normalizeHex(p?.gradient_start, "#B3E5FC"),
        gradient_end: normalizeHex(p?.gradient_end, "#81D4FA"),

        points: normalizeJsonb(p?.points, []),
        sample_curriculum: normalizeJsonb(p?.sample_curriculum, []),
        entry_roles: normalizeJsonb(p?.entry_roles, []),
        skills: normalizeJsonb(p?.skills, []),
        sources: normalizeJsonb(p?.sources, []),
        };

        const { data, error } = await supabase
        .from(TABLE)
        .insert([insertData])
        .select()
        .single();

        if (error) return { success: false, error: error.message };
        return { success: true, track: data };
    } catch (e) {
        return { success: false, error: e?.message || "Failed to create track" };
    }
}

export async function updateTrack(track_id, payload) {
    try {
        const id = toStr(track_id);
        if (!id) return { success: false, error: "Missing track_id." };

        const p = applyAliases(payload);
        const updateData = pickAllowed(p);

        // Never allow changing primary key via update (safe default)
        delete updateData.track_id;

        // Normalize only if provided
        if (typeof updateData.track_name !== "undefined") {
        updateData.track_name = toStr(updateData.track_name);
        }

        if (typeof updateData.track_duration !== "undefined") {
        updateData.track_duration =
            updateData.track_duration === null || updateData.track_duration === ""
            ? null
            : Number(updateData.track_duration);
        }

        if (typeof updateData.track_description !== "undefined") {
        updateData.track_description = toStr(updateData.track_description) || null;
        }

        if (typeof updateData.track_profile !== "undefined") {
        updateData.track_profile = toStr(updateData.track_profile) || null;
        }

        if (typeof updateData.track_status !== "undefined") {
        updateData.track_status = toStr(updateData.track_status) || null;
        }

        if (typeof updateData.summary !== "undefined") {
        updateData.summary = toStr(updateData.summary) || null;
        }

        if (typeof updateData.badge_color !== "undefined") {
        updateData.badge_color = normalizeHex(updateData.badge_color, "#1976D2");
        }

        if (typeof updateData.gradient_start !== "undefined") {
        updateData.gradient_start = normalizeHex(updateData.gradient_start, "#B3E5FC");
        }

        if (typeof updateData.gradient_end !== "undefined") {
        updateData.gradient_end = normalizeHex(updateData.gradient_end, "#81D4FA");
        }

        if (typeof updateData.points !== "undefined") {
        updateData.points = normalizeJsonb(updateData.points, []);
        }

        if (typeof updateData.sample_curriculum !== "undefined") {
        updateData.sample_curriculum = normalizeJsonb(updateData.sample_curriculum, []);
        }

        if (typeof updateData.entry_roles !== "undefined") {
        updateData.entry_roles = normalizeJsonb(updateData.entry_roles, []);
        }

        if (typeof updateData.skills !== "undefined") {
        updateData.skills = normalizeJsonb(updateData.skills, []);
        }

        if (typeof updateData.sources !== "undefined") {
        updateData.sources = normalizeJsonb(updateData.sources, []);
        }

        const { data, error } = await supabase
        .from(TABLE)
        .update(updateData)
        .eq("track_id", id)
        .select()
        .single();

        if (error) return { success: false, error: error.message };
        return { success: true, track: data };
    } catch (e) {
        return { success: false, error: e?.message || "Failed to update track" };
    }
}

export async function deleteTrack(track_id) {
    try {
        const id = toStr(track_id);
        if (!id) return { success: false, error: "Missing track_id." };

        const { error } = await supabase.from(TABLE).delete().eq("track_id", id);
        if (error) return { success: false, error: error.message };
        return { success: true };
    } catch (e) {
        return { success: false, error: e?.message || "Failed to delete track" };
    }
}
