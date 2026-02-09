// @/app/services/quizzes.server.js
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

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

const BUCKET = "quizzes";

// ✅ allow customizing table names if yours differ
const SUBJECTS_TABLE = process.env.QUIZZES_SUBJECTS_TABLE || "subjects";
const TRACKS_TABLE = process.env.QUIZZES_TRACKS_TABLE || "tracks";

const toStr = (v) => String(v ?? "").trim();

/**
 * If you want legacy files (strand_id-only) to be auto-upgraded to track_id
 * when they are read, set this env var to "true".
 *
 * NOTE: This will perform an upsert write during read operations.
 */
const AUTO_UPGRADE_TRACK_ID =
  String(process.env.QUIZZES_AUTO_UPGRADE_TRACK_ID || "").toLowerCase() ===
  "true";

function generatePrettyQuizId() {
  // 9 bytes => 12 chars base64url (matches your sample length)
  // base64url can include "_" so we replace "_" with "-" to match your example style
  const token = crypto
    .randomBytes(9)
    .toString("base64url")
    .replace(/_/g, "-");
  return `quiz_${token}`;
}

function parseJsonSafe(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function ensureJsonName(idOrName) {
  const n = String(idOrName || "").trim();
  if (!n) return null;

  // if already a path like "folder/file.json" keep it
  if (n.toLowerCase().endsWith(".json")) return n;

  return `${n}.json`;
}

function publicUrlFor(path) {
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data?.publicUrl || null;
}

/**
 * Canonicalize track_id:
 * - read track_id first
 * - fallback to strand_id
 * - output ONLY track_id (we will never write strand_id again)
 */
function resolveTrackId(doc) {
  const t = toStr(doc?.track_id);
  if (t) return t;
  const legacy = toStr(doc?.strand_id);
  return legacy || "";
}

/**
 * Optional: if a legacy quiz file has strand_id but no track_id,
 * we can auto-upsert track_id into the same file.
 */
async function maybeUpgradeTrackIdInStorage(storage_path, doc, fileMeta) {
  try {
    if (!AUTO_UPGRADE_TRACK_ID) return;

    const hasTrack = !!toStr(doc?.track_id);
    const legacy = toStr(doc?.strand_id);

    // only upgrade when legacy exists and track_id is missing
    if (hasTrack || !legacy) return;

    const nowIso = new Date().toISOString();
    const quiz_id = toStr(doc?.quiz_id) || storage_path.replace(/\.json$/i, "");

    const upgraded = {
      ...doc,
      quiz_id,
      storage_path,
      track_id: legacy,
      // do not persist legacy field anymore
      strand_id: undefined,
      created_at: doc?.created_at ?? fileMeta?.created_at ?? nowIso,
      updated_at: nowIso,
    };

    Object.keys(upgraded).forEach((k) => {
      if (typeof upgraded[k] === "undefined") delete upgraded[k];
    });

    const body = Buffer.from(JSON.stringify(upgraded, null, 2));

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(storage_path, body, {
        upsert: true,
        contentType: "application/json",
        cacheControl: "no-store",
      });
    if (error) throw error;
  } catch {
    // silent: upgrade is best-effort
  }
}

/**
 * ✅ Read raw JSON doc (best-effort). Used to preserve missing fields during partial updates.
 */
async function readQuizDocIfExists(storage_path) {
  try {
    const { data: blob, error } = await supabase.storage
      .from(BUCKET)
      .download(storage_path);
    if (error) return null;

    const text = await blob.text();
    const doc = parseJsonSafe(text);
    return doc && typeof doc === "object" ? doc : null;
  } catch {
    return null;
  }
}

/**
 * ✅ Find course_id via subject (handles common schemas: subjects.id OR subjects.subject_id).
 */
async function findCourseIdBySubjectId(subject_id) {
  const sid = toStr(subject_id);
  if (!sid) return null;

  try {
    // try subjects.id
    {
      const { data, error } = await supabase
        .from(SUBJECTS_TABLE)
        .select("course_id")
        .eq("id", sid)
        .maybeSingle();
      if (!error && data?.course_id) return toStr(data.course_id);
    }

    // try subjects.subject_id (if you use custom PK field)
    {
      const { data, error } = await supabase
        .from(SUBJECTS_TABLE)
        .select("course_id")
        .eq("subject_id", sid)
        .maybeSingle();
      if (!error && data?.course_id) return toStr(data.course_id);
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * ✅ Find course_id via track (handles common schemas: tracks.id OR tracks.track_id OR tracks.strand_id).
 * If track row only has subject_id, we fallback to subjects->course_id.
 */
async function findCourseIdByTrackId(track_id) {
  const tid = toStr(track_id);
  if (!tid) return null;

  async function tryRow(matchCol) {
    const { data, error } = await supabase
      .from(TRACKS_TABLE)
      .select("course_id, subject_id")
      .eq(matchCol, tid)
      .maybeSingle();

    if (error || !data) return null;

    if (data.course_id) return toStr(data.course_id);
    if (data.subject_id) {
      const c = await findCourseIdBySubjectId(data.subject_id);
      if (c) return c;
    }
    return null;
  }

  try {
    // try tracks.id
    {
      const c = await tryRow("id");
      if (c) return c;
    }
    // try tracks.track_id
    {
      const c = await tryRow("track_id");
      if (c) return c;
    }
    // try tracks.strand_id (legacy)
    {
      const c = await tryRow("strand_id");
      if (c) return c;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * ✅ Resolve course_id for saving:
 * Priority:
 *  1) payload.course_id
 *  2) existingDoc.course_id
 *  3) derive from subject_id (payload or existingDoc)
 *  4) derive from track_id (payload or existingDoc)
 *  5) null
 *
 * This ensures:
 * - creating new quiz gets course_id if possible
 * - updating old quiz adds course_id column if missing
 * - partial update doesn't wipe existing course_id
 */
async function resolveCourseIdForSave(payload, existingDoc) {
  const direct = toStr(payload?.course_id);
  if (direct) return direct;

  const existing = toStr(existingDoc?.course_id);
  if (existing) return existing;

  const subj = toStr(payload?.subject_id) || toStr(existingDoc?.subject_id);
  if (subj) {
    const c = await findCourseIdBySubjectId(subj);
    if (c) return c;
  }

  const track =
    toStr(payload?.track_id) ||
    toStr(payload?.strand_id) ||
    toStr(existingDoc?.track_id) ||
    toStr(existingDoc?.strand_id);

  if (track) {
    const c = await findCourseIdByTrackId(track);
    if (c) return c;
  }

  return null;
}

async function parseQuizFromStoragePath(storage_path, fileMeta = null) {
  try {
    const { data: blob, error } = await supabase.storage
      .from(BUCKET)
      .download(storage_path);
    if (error) throw error;

    const text = await blob.text();
    const doc = parseJsonSafe(text) || {};

    // ✅ prioritize quiz_id in doc; fallback from filename
    const quiz_id = toStr(doc?.quiz_id) || storage_path.replace(/\.json$/i, "");
    const quiz_title = doc?.quiz_title || doc?.title || storage_path;
    const quiz_description =
      doc?.quiz_description || doc?.description || null;

    // ✅ prioritize track_id, fallback strand_id
    const track_id = resolveTrackId(doc) || null;

    // optional auto-upgrade
    await maybeUpgradeTrackIdInStorage(storage_path, doc, fileMeta);

    return {
      quiz_id,
      quiz_title,
      quiz_description,

      // ✅ canonical only
      track_id,

      subject_id: doc?.subject_id ?? null,
      course_id: doc?.course_id ?? null,
      school_level: doc?.school_level ?? null,
      visibility: doc?.visibility ?? "private",
      due_date: doc?.due_date ?? null,
      questions: Array.isArray(doc?.questions) ? doc.questions : [],
      status: doc?.status ?? "draft",
      created_at: doc?.created_at ?? fileMeta?.created_at ?? null,
      updated_at: doc?.updated_at ?? fileMeta?.updated_at ?? null,
      storage_path,
      public_url: publicUrlFor(storage_path),
      _source: "storage",
    };
  } catch (e) {
    return {
      quiz_id: storage_path.replace(/\.json$/i, ""),
      quiz_title: storage_path,
      quiz_description: null,
      track_id: null,
      subject_id: null,
      course_id: null,
      school_level: null,
      visibility: "private",
      due_date: null,
      questions: [],
      status: "draft",
      created_at: fileMeta?.created_at || null,
      updated_at: fileMeta?.updated_at || null,
      storage_path,
      public_url: publicUrlFor(storage_path),
      _source: "storage",
      _error: "parse_failed",
    };
  }
}

export async function getQuizzesFromBucket({
  subject_id = "",
  search = "",
  limit = 200,
  track_id = "",
  course_id = "",
} = {}) {
  const subj = toStr(subject_id);
  const track = toStr(track_id);
  const course = toStr(course_id);
  const q = toStr(search).toLowerCase();

  const { data: files, error } = await supabase.storage.from(BUCKET).list("", {
    limit: Math.max(200, Math.min(2000, Number(limit) || 200)),
    offset: 0,
  });
  if (error) throw error;

  const jsonFiles = (files || []).filter((f) =>
    String(f.name || "").toLowerCase().endsWith(".json")
  );

  const parsed = await Promise.all(
    jsonFiles.map((f) => parseQuizFromStoragePath(f.name, f))
  );

  let rows = parsed;

  if (subj) rows = rows.filter((r) => toStr(r.subject_id) === subj);
  if (track) rows = rows.filter((r) => toStr(r.track_id) === track);
  if (course) rows = rows.filter((r) => toStr(r.course_id) === course);

  if (q) {
    rows = rows.filter((r) => {
      const hay = `${r.quiz_title || ""} ${r.quiz_description || ""} ${
        r.quiz_id || ""
      }`.toLowerCase();
      return hay.includes(q);
    });
  }

  rows.sort(
    (a, b) =>
      new Date(b.updated_at || b.created_at || 0) -
      new Date(a.updated_at || a.created_at || 0)
  );

  return rows.slice(0, Number(limit) || 200);
}

export async function getQuizFromBucket(quiz_id) {
  const id = toStr(quiz_id);
  if (!id) throw new Error("Missing quiz_id");

  // 1) try exact or legacy filename resolution
  const resolved = await resolveStoragePathForQuizId(id);

  // 2) fallback to id.json if nothing was found
  const storage_path = resolved || ensureJsonName(id);

  return parseQuizFromStoragePath(storage_path);
}

export async function saveQuizToBucket(payload = {}) {
  const nowIso = new Date().toISOString();

  const incomingId = toStr(payload.quiz_id);
  const quiz_id = incomingId || generatePrettyQuizId();

  let storage_path = payload.storage_path ? ensureJsonName(payload.storage_path) : null;

  // If updating and storage_path isn't provided, preserve legacy filename if it exists
  if (!storage_path) {
    const resolved = await resolveStoragePathForQuizId(quiz_id).catch(() => null);
    storage_path = resolved || ensureJsonName(quiz_id);
  }

  // ✅ read existing raw doc (so partial updates don't wipe missing fields)
  const existingDoc = await readQuizDocIfExists(storage_path);

  const created_at = existingDoc?.created_at || payload.created_at || nowIso;

  // ✅ prioritize track_id; fallback to legacy; fallback to existing (prevents wipe)
  const normalizedTrackId =
    toStr(payload.track_id) ||
    toStr(payload.strand_id) ||
    toStr(existingDoc?.track_id) ||
    toStr(existingDoc?.strand_id) ||
    null;

  // ✅ NEW: resolve course_id (create on new quiz + backfill on edit if missing)
  const normalizedCourseId = await resolveCourseIdForSave(payload, existingDoc);

  const doc = {
    // ✅ preserve existing fields first, then override with payload
    ...(existingDoc && typeof existingDoc === "object" ? existingDoc : {}),
    ...payload,

    quiz_id,
    storage_path,

    // ✅ write ONLY canonical key
    track_id: normalizedTrackId,

    // ✅ ensure course_id exists in the JSON (even if it was missing before)
    course_id: normalizedCourseId,

    // ✅ ensure legacy key never gets persisted
    strand_id: undefined,

    created_at,
    updated_at: nowIso,
  };

  // remove undefined keys (but keep nulls)
  Object.keys(doc).forEach((k) => {
    if (typeof doc[k] === "undefined") delete doc[k];
  });

  const body = Buffer.from(JSON.stringify(doc, null, 2));

  const { error } = await supabase.storage.from(BUCKET).upload(storage_path, body, {
    upsert: true,
    contentType: "application/json",
    cacheControl: "no-store",
  });
  if (error) throw error;

  return {
    ...(await getQuizFromBucket(quiz_id)),
    storage_path,
    public_url: publicUrlFor(storage_path),
  };
}

/**
 * ✅ More flexible delete:
 * - accepts "uuid"
 * - accepts "uuid.json"
 * - accepts "folder/uuid.json"
 */
export async function deleteQuizFromBucket(quiz_id) {
  const raw = toStr(quiz_id);
  if (!raw) throw new Error("Missing quiz_id");

  // if caller passes full path, keep it; else normalize to "<id>.json"
  const storage_path = raw.includes("/") ? raw : ensureJsonName(raw);

  const { error } = await supabase.storage.from(BUCKET).remove([storage_path]);
  if (error) throw error;

  return true;
}

export async function uploadQuizMediaToBucket(file, folder = "media") {
  if (!file) throw new Error("Missing file");

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const original = toStr(file.name) || "file";
  const ext = original.includes(".") ? original.split(".").pop() : "";
  const safeExt = ext ? `.${ext}` : "";

  const name = `${crypto.randomUUID()}${safeExt}`;
  const storage_path = `${folder}/${name}`;

  const { error } = await supabase.storage.from(BUCKET).upload(storage_path, buffer, {
    upsert: false,
    contentType: file.type || "application/octet-stream",
    cacheControl: "3600",
  });
  if (error) throw error;

  return {
    storage_path,
    url: publicUrlFor(storage_path),
    name: original,
    type: file.type || null,
    size: file.size || null,
  };
}

// Helper

async function resolveStoragePathForQuizId(quiz_id) {
  const id = toStr(quiz_id);
  if (!id) return null;

  // if caller already passed a json filename/path, keep it
  if (id.toLowerCase().endsWith(".json")) return id;

  // list all root files (your quizzes are stored at bucket root)
  const { data: files, error } = await supabase.storage.from(BUCKET).list("", {
    limit: 2000,
    offset: 0,
  });
  if (error) throw error;

  const jsonFiles = (files || []).filter((f) =>
    String(f.name || "").toLowerCase().endsWith(".json")
  );

  const exact = ensureJsonName(id); // id.json
  const exactHit = jsonFiles.find((f) => f.name === exact);
  if (exactHit) return exactHit.name;

  // legacy filenames often include the quiz_id somewhere
  const candidates = jsonFiles.filter((f) => String(f.name || "").includes(id));
  if (!candidates.length) return null;

  if (candidates.length === 1) return candidates[0].name;

  // If multiple candidates match, open the smallest set and verify quiz_id inside
  for (const f of candidates) {
    const parsed = await parseQuizFromStoragePath(f.name, f);
    if (toStr(parsed?.quiz_id) === id) return f.name;
  }

  // fallback: most recently updated
  candidates.sort(
    (a, b) =>
      new Date(b.updated_at || b.created_at || 0) -
      new Date(a.updated_at || a.created_at || 0)
  );
  return candidates[0].name;
}
