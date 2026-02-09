// @/lib/quizSubmissions.js
import { createClient } from "@/lib/client";

const supabase = createClient();
const TABLE = "quiz_attempts";

const iso = (d = new Date()) => new Date(d).toISOString();

async function currentUserId() {
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data?.user?.id ?? null;
}

function buildFullName(u) {
  const parts = [u?.first_name, u?.middle_name, u?.last_name, u?.suffix]
    .map((s) => (typeof s === "string" ? s.trim() : ""))
    .filter((s) => s.length > 0);
  return parts.join(" ");
}

const isObj = (v) => v && typeof v === "object" && !Array.isArray(v);

const toNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const clamp = (n, min, max) => {
  const x = Number(n);
  if (!Number.isFinite(x)) return min;
  if (Number.isFinite(max)) return Math.max(min, Math.min(x, max));
  return Math.max(min, x);
};

function normalizeAnswers(sub) {
  const a =
    (isObj(sub?.answers) && Object.keys(sub.answers).length && sub.answers) ||
    (isObj(sub?.meta?.answers) &&
      Object.keys(sub.meta.answers).length &&
      sub.meta.answers) ||
    {};
  return a;
}

function normalizeMeta(sub) {
  return isObj(sub?.meta) ? sub.meta : {};
}

/**
 * Remove columns that MUST NOT be written:
 * - score_pct is GENERATED in your DB
 * - max_score does not exist in quiz_attempts
 */
function stripForbiddenCols(obj) {
  if (!obj || typeof obj !== "object") return obj;
  const copy = { ...obj };
  delete copy.score_pct;
  delete copy.max_score; // critical: schema cache error if sent
  return copy;
}

/* -------------------- points-based score helpers -------------------- */

/**
 * Try to extract an array of questions (with id + points) from common shapes.
 * We support:
 * - sub.questions
 * - sub.quiz.questions
 * - sub.meta.quiz.questions
 * - sub.meta.questions
 */
function extractQuestionsArray(sub, meta) {
  const candidates = [
    sub?.questions,
    sub?.quiz?.questions,
    meta?.quiz?.questions,
    meta?.questions,
  ];

  for (const c of candidates) {
    if (Array.isArray(c) && c.length) return c;
  }
  return null;
}

/**
 * Build a { [questionId]: points } map from common inputs:
 * - sub.question_points / sub.points_by_question
 * - meta.question_points / meta.points_by_question
 * - questions arrays (id + points)
 */
function extractPointsByQuestion(sub, meta) {
  const direct =
    (isObj(sub?.question_points) && sub.question_points) ||
    (isObj(sub?.points_by_question) && sub.points_by_question) ||
    (isObj(meta?.question_points) && meta.question_points) ||
    (isObj(meta?.points_by_question) && meta.points_by_question) ||
    null;

  if (direct) {
    // normalize numeric points
    const out = {};
    for (const [k, v] of Object.entries(direct)) {
      const n = toNum(v);
      out[String(k)] = n != null ? Math.max(0, n) : 0;
    }
    return out;
  }

  // fallback: try questions array
  const qs = extractQuestionsArray(sub, meta);
  if (qs) {
    const out = {};
    for (const q of qs) {
      const qid = q?.id ?? q?.question_id ?? q?.qid;
      if (!qid) continue;

      // points field variations
      const p =
        toNum(q?.points) ??
        toNum(q?.point) ??
        toNum(q?.score) ??
        toNum(q?.max_points) ??
        toNum(q?.max_score) ??
        0;

      out[String(qid)] = Math.max(0, p || 0);
    }
    return out;
  }

  return {};
}

/**
 * Extract earned-by-question map if caller provides it:
 * - sub.earned_by_question / sub.points_earned_by_question
 * - meta.earned_by_question / meta.points_earned_by_question
 * - meta.grade_breakdown / meta.grading.by_question (common)
 */
function extractEarnedByQuestion(sub, meta) {
  const direct =
    (isObj(sub?.earned_by_question) && sub.earned_by_question) ||
    (isObj(sub?.points_earned_by_question) && sub.points_earned_by_question) ||
    (isObj(meta?.earned_by_question) && meta.earned_by_question) ||
    (isObj(meta?.points_earned_by_question) && meta.points_earned_by_question) ||
    null;

  if (direct) {
    const out = {};
    for (const [k, v] of Object.entries(direct)) {
      const n = toNum(v);
      out[String(k)] = n != null ? Math.max(0, n) : 0;
    }
    return out;
  }

  // grade breakdown shapes (try hard)
  const breakdown =
    (isObj(meta?.grade_breakdown) && meta.grade_breakdown) ||
    (isObj(meta?.grading?.by_question) && meta.grading.by_question) ||
    null;

  if (breakdown) {
    const out = {};
    for (const [qid, info] of Object.entries(breakdown)) {
      if (info == null) continue;

      // accept earned / points_earned / score
      const earned =
        toNum(info?.earned) ??
        toNum(info?.points_earned) ??
        toNum(info?.score) ??
        null;

      if (earned != null) out[String(qid)] = Math.max(0, earned);
    }
    return out;
  }

  return null;
}

/**
 * Extract correct-by-question boolean map if provided:
 * - sub.correct_by_question / sub.is_correct_by_question
 * - meta.correct_by_question / meta.is_correct_by_question
 * - meta.grade_breakdown entries containing { correct: true/false }
 */
function extractCorrectByQuestion(sub, meta) {
  const direct =
    (isObj(sub?.correct_by_question) && sub.correct_by_question) ||
    (isObj(sub?.is_correct_by_question) && sub.is_correct_by_question) ||
    (isObj(meta?.correct_by_question) && meta.correct_by_question) ||
    (isObj(meta?.is_correct_by_question) && meta.is_correct_by_question) ||
    null;

  if (direct) {
    const out = {};
    for (const [k, v] of Object.entries(direct)) {
      out[String(k)] = Boolean(v);
    }
    return out;
  }

  const breakdown =
    (isObj(meta?.grade_breakdown) && meta.grade_breakdown) ||
    (isObj(meta?.grading?.by_question) && meta.grading.by_question) ||
    null;

  if (breakdown) {
    const out = {};
    for (const [qid, info] of Object.entries(breakdown)) {
      if (!info) continue;
      if (typeof info?.correct === "boolean") out[String(qid)] = info.correct;
      else if (typeof info?.is_correct === "boolean") out[String(qid)] = info.is_correct;
    }
    return out;
  }

  return null;
}

/**
 * Points-based normalization (preferred):
 * - If caller passes points_earned/points_total → use directly.
 * - Else compute from per-question points + correctness/earned breakdown:
 *    total = sum(points[qid])
 *    earned = sum(earned_by_question[qid] OR (correct_by_question[qid] ? points[qid] : 0))
 *
 * Falls back to legacy:
 * - earned = score OR correct
 * - total  = total OR max_score (input only)
 */
function normalizeScoreTotal(sub, answers, meta) {
  // 1) strongest: direct totals in meta/sub
  const directEarned =
    toNum(sub?.points_earned) ??
    toNum(meta?.points_earned) ??
    toNum(sub?.earned_points) ??
    toNum(meta?.earned_points) ??
    null;

  const directTotal =
    toNum(sub?.points_total) ??
    toNum(meta?.points_total) ??
    toNum(sub?.total_points) ??
    toNum(meta?.total_points) ??
    null;

  if (directEarned != null && directTotal != null) {
    const total = Math.max(0, directTotal);
    const earned = total > 0 ? clamp(directEarned, 0, total) : Math.max(0, directEarned);
    return { earned, total };
  }

  // 2) compute per-question points
  const pointsByQ = extractPointsByQuestion(sub, meta) || {};
  const earnedByQ = extractEarnedByQuestion(sub, meta); // may be null
  const correctByQ = extractCorrectByQuestion(sub, meta); // may be null

  const ids = new Set([
    ...Object.keys(pointsByQ),
    ...(earnedByQ ? Object.keys(earnedByQ) : []),
    ...(correctByQ ? Object.keys(correctByQ) : []),
    ...(answers && isObj(answers) ? Object.keys(answers) : []),
  ]);

  // Only use points-based if we actually have meaningful per-question points
  const hasAnyPoints = Object.values(pointsByQ).some((p) => toNum(p) != null && p > 0);

  if (ids.size && hasAnyPoints) {
    let total = 0;
    let earned = 0;

    for (const qid of ids) {
      const p = Math.max(0, toNum(pointsByQ[qid]) ?? 0);
      total += p;

      if (earnedByQ && qid in earnedByQ) {
        earned += Math.max(0, toNum(earnedByQ[qid]) ?? 0);
      } else if (correctByQ && qid in correctByQ) {
        earned += correctByQ[qid] ? p : 0;
      } else {
        // no per-question grading info → earned stays 0 for that qid
      }
    }

    total = Math.max(0, total);
    earned = total > 0 ? clamp(earned, 0, total) : Math.max(0, earned);

    return { earned, total };
  }

  // 3) fallback legacy (count-based)
  const earnedRaw =
    typeof sub?.score === "number"
      ? sub.score
      : typeof sub?.correct === "number"
      ? sub.correct
      : 0;

  const totalRaw =
    typeof sub?.total === "number"
      ? sub.total
      : typeof sub?.max_score === "number"
      ? sub.max_score // input-only convenience
      : 0;

  const total = Number.isFinite(totalRaw) ? Math.max(0, totalRaw) : 0;
  const earned = total > 0 ? clamp(earnedRaw, 0, total) : Math.max(0, Number(earnedRaw) || 0);

  return { earned, total };
}

/* ---------------- reads (attempts) ------------------ */

export async function listQuizSubmissions(quiz_id) {
  const qid = String(quiz_id || "").trim().toLowerCase();

  const { data: attempts, error } = await supabase
    .from(TABLE)
    .select("*")
    .ilike("quiz_id", qid)
    .order("finished_at", { ascending: false, nullsFirst: false });

  if (error) throw error;

  const userIds = Array.from(new Set((attempts || []).map((a) => a.user_id).filter(Boolean)));

  let usersById = {};
  if (userIds.length) {
    const { data: users, error: uErr } = await supabase
      .from("users")
      .select("supabase_id, first_name, middle_name, last_name, suffix")
      .in("supabase_id", userIds);

    if (uErr) throw uErr;

    usersById = Object.fromEntries(
      (users || []).map((u) => [u.supabase_id, { ...u, display_name: buildFullName(u) }])
    );
  }

  return (attempts || []).map((r) => ({
    ...r,
    id: r.id,
    user: usersById[r.user_id] || null,
  }));
}

export async function getQuizSubmission(attempt_id) {
  const { data, error } = await supabase.from(TABLE).select("*").eq("id", attempt_id).maybeSingle();
  if (error) throw error;
  if (!data) return null;

  let user = null;
  if (data.user_id) {
    const { data: usr, error: uErr } = await supabase
      .from("users")
      .select("supabase_id, first_name, middle_name, last_name, suffix")
      .eq("supabase_id", data.user_id)
      .maybeSingle();

    if (uErr) throw uErr;
    if (usr) user = { ...usr, display_name: buildFullName(usr) };
  }

  return { ...data, id: data.id, user };
}

/* ------------------------------ upsert ----------------------------- */
/**
 * Used by admin auto-grade and other writes.
 * ✅ Writes ONLY columns that exist
 * ✅ Treats score/correct/total as POINTS (not count)
 * ❌ Never writes: score_pct, max_score
 *
 * For points-based grading, pass any of:
 * - sub.points_earned + sub.points_total
 * - sub.question_points + sub.correct_by_question
 * - sub.question_points + sub.earned_by_question
 * - or put those inside sub.meta.*
 */
export async function upsertQuizSubmission(sub) {
  const qid = String(sub?.quiz_id || "").trim().toLowerCase();

  const answers = normalizeAnswers(sub);
  const meta = normalizeMeta(sub);

  // ✅ points-first normalization
  const { earned, total } = normalizeScoreTotal(sub, answers, meta);

  const finishedAt = sub?.finished_at ?? sub?.submitted_at ?? null; // may be null

  // build patch payload (IMPORTANT: omit finished_at if null)
  let payload = {
    user_id: sub?.user_id ?? null,
    quiz_id: qid,

    // generated percent uses these (treat as POINTS)
    correct: earned,
    total: total,

    // primary field your UI uses (POINTS)
    score: earned,

    duration_sec:
      typeof sub?.duration_sec === "number"
        ? sub.duration_sec
        : typeof sub?.duration === "number"
        ? sub.duration
        : null,

    ...(finishedAt ? { finished_at: finishedAt } : {}), // ✅ don’t send null

    meta,
    is_returned: typeof sub?.is_returned === "boolean" ? sub.is_returned : false,
    returned_at: sub?.returned_at ?? null,
    returned_by: sub?.returned_by ?? null,

    feedback: typeof sub?.feedback === "string" ? sub.feedback : null,
    answers,

    status:
      typeof sub?.status === "string"
        ? sub.status
        : sub?.reviewed
        ? "reviewed"
        : "pending_review",
  };

  payload = stripForbiddenCols(payload);

  // If we have an ID, treat it as an update-first (prevents accidental inserts that require finished_at)
  if (sub?.id != null) {
    const attemptId = sub.id;

    // update (do NOT include id in update patch)
    const { data: updated, error: uErr } = await supabase
      .from(TABLE)
      .update(payload)
      .eq("id", attemptId)
      .select()
      .maybeSingle();

    if (uErr) throw uErr;
    if (updated) return { ...updated, id: updated.id };

    // fallback insert (row didn’t exist): finished_at must be non-null
    if (!payload.user_id || !payload.quiz_id) {
      throw new Error("Cannot insert quiz_attempts row without user_id and quiz_id.");
    }

    const insertRow = {
      id: attemptId,
      ...payload,
      finished_at: finishedAt ?? iso(), // ✅ satisfy NOT NULL on insert
    };

    const { data: inserted, error: iErr } = await supabase
      .from(TABLE)
      .insert(insertRow)
      .select()
      .single();

    if (iErr) throw iErr;
    return inserted ? { ...inserted, id: inserted.id } : null;
  }

  // Insert path (no id): finished_at must be non-null
  const insertRow = {
    ...payload,
    finished_at: finishedAt ?? iso(), // ✅ satisfy NOT NULL
  };

  const { data, error } = await supabase.from(TABLE).insert(insertRow).select().single();
  if (error) throw error;
  return data ? { ...data, id: data.id } : null;
}

/* ----------------------- targeted grade save ----------------------- */
/**
 * ✅ No max_score column. But we still accept `total` (or caller can pass max_score as input)
 * so generated score_pct remains correct.
 *
 * Usage:
 *  saveGrade(id, { score, total, feedback, reviewed, status })
 *  OR saveGrade(id, { score, max_score: maxPoints, ... })  // accepted as input only
 */
export async function saveGrade(
  attempt_id,
  { score, total, max_score, feedback, reviewed, status } = {}
) {
  let patch = {};

  // Accept total from either `total` or `max_score` input, but never write max_score column
  const totalInput =
    typeof total === "number" && Number.isFinite(total)
      ? total
      : typeof max_score === "number" && Number.isFinite(max_score)
      ? max_score
      : null;

  if (totalInput != null) patch.total = Math.max(0, totalInput);

  if (typeof score === "number" && Number.isFinite(score)) {
    const s = Math.max(0, score);
    // if we know total, clamp
    patch.score = patch.total != null ? clamp(s, 0, patch.total) : s;
    patch.correct = patch.score;
  }

  if (typeof feedback === "string") patch.feedback = feedback;

  if (typeof status === "string") patch.status = status;
  else if (typeof reviewed === "boolean" && reviewed) patch.status = "reviewed";

  patch = stripForbiddenCols(patch);

  const { data, error } = await supabase
    .from(TABLE)
    .update(patch)
    .eq("id", attempt_id)
    .select()
    .maybeSingle();

  if (error) throw error;
  return data ? { ...data, id: data.id } : null;
}

/* --------------------------- student submit ------------------------ */
/**
 * Student submit:
 * - Accepts legacy (correct/total) OR points (score/total)
 * - Also supports points-by-question if provided (same shapes as upsert)
 * - Never writes score_pct/max_score.
 */
export async function turnInSubmission({
  quiz_id,
  user_id,
  answers = {},

  // legacy (count-based)
  correct = 0,
  total = 0,

  // preferred (points-based)
  score,
  max_score, // input-only convenience; not written

  // optional points-by-question shapes (recommended for consistency)
  question_points,
  points_by_question,
  correct_by_question,
  earned_by_question,

  duration_sec = null,
  meta = { app: "web" },
  finished_at,
  status = "pending_review",
} = {}) {
  const now = iso();
  const qid = String(quiz_id || "").trim().toLowerCase();

  // Merge any points data into meta so normalizeScoreTotal can see it
  const meta2 = isObj(meta) ? { ...meta } : { app: "web" };
  if (isObj(question_points)) meta2.question_points = question_points;
  if (isObj(points_by_question)) meta2.points_by_question = points_by_question;
  if (isObj(correct_by_question)) meta2.correct_by_question = correct_by_question;
  if (isObj(earned_by_question)) meta2.earned_by_question = earned_by_question;

  // Prefer points-by-question if available; else use numeric score/total; else legacy
  const subLike = {
    quiz_id: qid,
    user_id,
    answers,
    meta: meta2,

    // numeric hints (optional)
    score: typeof score === "number" ? score : undefined,
    total: typeof total === "number" ? total : undefined,
    max_score: typeof max_score === "number" ? max_score : undefined,
    correct: typeof correct === "number" ? correct : undefined,
  };

  const { earned, total: totalPts } = normalizeScoreTotal(subLike, answers, meta2);

  let row = {
    user_id,
    quiz_id: qid,

    // generated percent uses these (POINTS)
    correct: earned,
    total: totalPts,

    // UI uses this (POINTS)
    score: earned,

    duration_sec: typeof duration_sec === "number" ? duration_sec : null,
    finished_at: finished_at ?? now,

    meta: meta2,

    is_returned: false,
    returned_at: null,
    feedback: null,
    returned_by: null,

    answers: isObj(answers) ? answers : {},
    status,
  };

  row = stripForbiddenCols(row);

  const { data, error } = await supabase.from(TABLE).insert(row).select().single();
  if (error) throw error;
  return data ? { ...data, id: data.id } : null;
}

/* --------------------------- return lifecycle ---------------------- */

export async function returnSubmission(attempt_id, opts = {}) {
  const now = iso();
  const uid = await currentUserId();

  let patch = {
    is_returned: true,
    status: "returned",
    returned_at: now,
  };

  if (typeof opts?.feedback === "string") patch.feedback = opts.feedback;
  if (uid) patch.returned_by = uid;

  patch = stripForbiddenCols(patch);

  const { data, error } = await supabase
    .from(TABLE)
    .update(patch)
    .eq("id", attempt_id)
    .select()
    .single();

  if (error) throw error;
  return data ? { ...data, id: data.id } : null;
}

export async function unreturnSubmission(attempt_id) {
  let patch = {
    is_returned: false,
    returned_at: null,
    returned_by: null,
    status: "pending_review",
  };

  patch = stripForbiddenCols(patch);

  const { data, error } = await supabase
    .from(TABLE)
    .update(patch)
    .eq("id", attempt_id)
    .select()
    .single();

  if (error) throw error;
  return data ? { ...data, id: data.id } : null;
}
  