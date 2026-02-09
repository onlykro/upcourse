// app/services/subjects.server.js
import "server-only";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error(
    "Missing Supabase env vars. Check NEXT_PUBLIC_SUPABASE_URL and SUPABASE_*_KEY."
  );
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
});

const TABLE = "subjects";
const TRACKS_TABLE = "tracks";

const toStr = (v) => String(v ?? "").trim();

const emptyToNull = (v) => {
  const s = toStr(v);
  return s ? s : null;
};

const normalizeStatus = (v) => {
  const s = String(v ?? "").trim().toLowerCase();
  if (s === "inactive") return "Inactive";
  if (s === "active") return "Active";
  // If they already pass "Active"/"Inactive", keep it
  if (v === "Inactive") return "Inactive";
  return "Active";
};

// ✅ Support category "group" filters like: "A|B|C"
const parseCategoryFilter = (category) => {
  const raw = toStr(category);
  if (!raw) return null;

  const parts = raw
    .split("|")
    .map((x) => x.trim())
    .filter(Boolean);

  if (parts.length <= 1)
    return { mode: "eq", values: parts.length ? parts[0] : raw };
  return { mode: "in", values: parts };
};

/**
 * Schema (current):
 * subjects.subject_id TEXT PRIMARY KEY
 * subjects.track_id TEXT (FK -> tracks.track_id)
 * subjects.subject_description TEXT
 *
 * NOTE:
 * - Do NOT fallback to "id" because it does not exist.
 */

const ALLOWED = [
  "subject_id",
  "subject_name",
  "track_id",
  "subject_category",
  "subject_status",
  "subject_description",
];

function pickAllowed(payload = {}) {
  const out = {};
  for (const k of ALLOWED) {
    if (typeof payload[k] !== "undefined") out[k] = payload[k];
  }
  return out;
}

/* ------------------------------ Track lookup ------------------------------ */
async function fetchTrackByUnknownKey(trackId) {
  const key = toStr(trackId);
  if (!key) return null;

  const { data, error } = await supabase
    .from(TRACKS_TABLE)
    .select(
      [
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
      ].join(",")
    )
    .eq("track_id", key)
    .maybeSingle();

  if (!error && data) return data;
  return null;
}

/* ------------------------------ CRUD ------------------------------ */

export async function getSubjects({
  search = "",
  track_id = "",
  category = "",
  status = "",
  sort = "name-asc",
  page = 1,
  limit = 12,
  includeTrack = false,
} = {}) {
  const q = toStr(search);
  const track = toStr(track_id);

  // ✅ normalize status filter to match DB values ("Active"/"Inactive")
  const stRaw = toStr(status);
  const st = stRaw ? normalizeStatus(stRaw) : "";

  const catFilter = parseCategoryFilter(category);

  const p = Math.max(1, Number(page) || 1);
  const l = Math.min(100, Math.max(1, Number(limit) || 12));
  const from = (p - 1) * l;
  const to = from + l - 1;

  const SELECT_BASE =
    "subject_id, subject_name, track_id, subject_category, subject_status, subject_description, created_at, updated_at";

  const SELECT_WITH_TRACK_TRY_1 =
    "subject_id, subject_name, track_id, subject_category, subject_status, subject_description, created_at, updated_at, tracks:tracks(track_id, track_name, summary, badge_color, gradient_start, gradient_end)";

  const SELECT_WITH_TRACK_TRY_2 =
    "subject_id, subject_name, track_id, subject_category, subject_status, subject_description, created_at, updated_at, tracks(track_id, track_name, summary, badge_color, gradient_start, gradient_end)";

  async function run(selectStr) {
    let query = supabase.from(TABLE).select(selectStr, { count: "exact" });

    if (track) query = query.eq("track_id", track);
    if (st) query = query.eq("subject_status", st);

    if (catFilter) {
      if (catFilter.mode === "in") {
        query = query.in("subject_category", catFilter.values);
      } else {
        query = query.eq("subject_category", catFilter.values);
      }
    }

    if (q) {
      const like = `%${q}%`;
      query = query.or(`subject_name.ilike.${like},subject_id.ilike.${like}`);
    }

    switch (sort) {
      case "name-desc":
        query = query.order("subject_name", { ascending: false });
        break;
      case "newest":
        query = query
          .order("updated_at", { ascending: false })
          .order("created_at", { ascending: false });
        break;
      case "oldest":
        query = query
          .order("updated_at", { ascending: true })
          .order("created_at", { ascending: true });
        break;
      case "name-asc":
      default:
        query = query.order("subject_name", { ascending: true });
        break;
    }

    query = query.range(from, to);

    const { data, error, count } = await query;
    if (error) throw error;

    const total = Number(count || 0);
    const totalPages = Math.max(1, Math.ceil(total / l));

    return {
      subjects: Array.isArray(data) ? data : [],
      pagination: {
        page: p,
        limit: l,
        total,
        totalPages,
        hasNext: p < totalPages,
        hasPrev: p > 1,
      },
    };
  }

  if (includeTrack) {
    try {
      return await run(SELECT_WITH_TRACK_TRY_1);
    } catch {
      try {
        return await run(SELECT_WITH_TRACK_TRY_2);
      } catch {
        // Fallback: fetch tracks manually
        const res = await run(SELECT_BASE);
        const subjects = res.subjects;

        const cache = new Map();
        for (const s of subjects) {
          const key = toStr(s?.track_id);
          if (!key) {
            s.tracks = null;
            continue;
          }
          if (cache.has(key)) {
            s.tracks = cache.get(key);
            continue;
          }
          const trackRow = await fetchTrackByUnknownKey(key);
          cache.set(key, trackRow);
          s.tracks = trackRow;
        }

        return { ...res, subjects };
      }
    }
  }

  return await run(SELECT_BASE);
}

export async function getSubjectById(subject_id, { includeTrack = false } = {}) {
  const id = toStr(subject_id);
  if (!id) throw new Error("Missing subject_id.");

  const selectBase =
    "subject_id, subject_name, track_id, subject_category, subject_status, subject_description, created_at, updated_at";

  const selectWithTrackTry1 =
    "subject_id, subject_name, track_id, subject_category, subject_status, subject_description, created_at, updated_at, tracks:tracks(track_id, track_name, summary, badge_color, gradient_start, gradient_end)";

  const selectWithTrackTry2 =
    "subject_id, subject_name, track_id, subject_category, subject_status, subject_description, created_at, updated_at, tracks(track_id, track_name, summary, badge_color, gradient_start, gradient_end)";

  let data = null;
  let error = null;

  if (!includeTrack) {
    const res = await supabase
      .from(TABLE)
      .select(selectBase)
      .eq("subject_id", id)
      .maybeSingle();
    data = res.data;
    error = res.error;
  } else {
    const a = await supabase
      .from(TABLE)
      .select(selectWithTrackTry1)
      .eq("subject_id", id)
      .maybeSingle();

    if (!a.error) {
      data = a.data;
      error = null;
    } else {
      const b = await supabase
        .from(TABLE)
        .select(selectWithTrackTry2)
        .eq("subject_id", id)
        .maybeSingle();

      data = b.data;
      error = b.error;
    }
  }

  if (error) throw error;
  if (!data) return null;

  if (!includeTrack) return data;

  if (!("tracks" in data) || (data.tracks == null && data?.track_id)) {
    data.tracks = await fetchTrackByUnknownKey(data.track_id);
  }

  return data;
}

export async function createSubject(payload) {
  try {
    const incoming = payload || {};

    const subject_id = toStr(incoming.subject_id);
    const subject_name = toStr(incoming.subject_name);

    if (!subject_id)
      return { success: false, error: "Subject Code (subject_id) is required." };
    if (!subject_name)
      return { success: false, error: "Subject Name is required." };

    const insertData = pickAllowed(incoming);

    insertData.subject_id = subject_id;
    insertData.subject_name = subject_name;

    if (typeof insertData.track_id !== "undefined") {
      insertData.track_id = emptyToNull(insertData.track_id);
    }
    if (typeof insertData.subject_description !== "undefined") {
      insertData.subject_description = emptyToNull(insertData.subject_description);
    }
    if (typeof insertData.subject_category !== "undefined") {
      insertData.subject_category = emptyToNull(insertData.subject_category);
    }

    insertData.subject_status = normalizeStatus(insertData.subject_status);

    const { data, error } = await supabase
      .from(TABLE)
      .insert([insertData])
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, subject: data };
  } catch (e) {
    return { success: false, error: e?.message || "Failed to create subject" };
  }
}

export async function updateSubject(subject_id, payload) {
  try {
    const id = toStr(subject_id);
    if (!id) return { success: false, error: "Missing subject_id." };

    const updateData = pickAllowed(payload || {});

    // do not allow changing PK
    if ("subject_id" in updateData) delete updateData.subject_id;

    if (typeof updateData.subject_name !== "undefined") {
      updateData.subject_name = emptyToNull(updateData.subject_name);
    }
    if (typeof updateData.track_id !== "undefined") {
      updateData.track_id = emptyToNull(updateData.track_id);
    }
    if (typeof updateData.subject_category !== "undefined") {
      updateData.subject_category = emptyToNull(updateData.subject_category);
    }
    if (typeof updateData.subject_status !== "undefined") {
      updateData.subject_status = normalizeStatus(updateData.subject_status);
    }
    if (typeof updateData.subject_description !== "undefined") {
      updateData.subject_description = emptyToNull(updateData.subject_description);
    }

    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from(TABLE)
      .update(updateData)
      .eq("subject_id", id)
      .select()
      .maybeSingle();

    if (error) return { success: false, error: error.message };
    if (!data) return { success: false, error: "Subject not found." };

    return { success: true, subject: data };
  } catch (e) {
    return { success: false, error: e?.message || "Failed to update subject" };
  }
}

export async function deleteSubject(subject_id) {
  try {
    const id = toStr(subject_id);
    if (!id) return { success: false, error: "Missing subject_id." };

    const { error } = await supabase.from(TABLE).delete().eq("subject_id", id);
    if (error) return { success: false, error: error.message };

    return { success: true };
  } catch (e) {
    return { success: false, error: e?.message || "Failed to delete subject" };
  }
}
