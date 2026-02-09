// app/admin/assessments/[id]/edit/page.jsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Save,
  Plus,
  Sparkles,
  ListChecks,
  Trash2,
  Copy,
  ArrowUp,
  ArrowDown,
} from "lucide-react";

import { useToast } from "@/hooks/use-toast";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import QuizQuestionCard from "@/components/quizzes/quiz-question-card";

import {
  fetchQuizzes,
  getQuiz,
  saveQuiz,
  uploadQuizImage,
  uploadQuizFile,
} from "@/lib/quizzes";

/* -------------------------------- helpers -------------------------------- */

const quizTypes = ["Career Interest", "Personality", "Skills", "Academic"];

const normalizeDifficulty = (d = "") => {
  const v = String(d || "").trim().toLowerCase();
  if (v === "hard") return "difficult";
  if (v === "medium") return "medium";
  if (v === "easy") return "easy";
  if (v === "difficult") return "difficult";
  return "";
};

function safeStr(v) {
  return String(v ?? "").trim();
}

function getQuizId(q) {
  const raw = q?.id ?? q?.quiz_id ?? q?.quizId ?? q?.assessment_id ?? "";
  let id = String(raw || "").trim();

  if (!id) {
    const sp = String(q?.storage_path || "").trim();
    if (sp) {
      id = sp.split("/").pop() || "";
      id = id.replace(/\.(json|txt)$/i, "");
    }
  }
  return id;
}

function makeBlankQuestion(type, index) {
  const base = {
    question_id: `q${index + 1}`,
    question_text: "",
    question_type: type,
    required: false,
    points: 0,
    enable_math: false,
    difficulty: "",
    images: [],
    files: [],
  };

  if (type === "choice") {
    return {
      ...base,
      allow_multiple: false,
      choices: ["", ""],
      correct_answers: [],
    };
  }
  if (type === "text") {
    return { ...base, choices: [""], text_any_case: false };
  }
  if (type === "rating") {
    return { ...base, rating_max: 5 };
  }
  if (type === "likert") {
    return {
      ...base,
      likert_rows: ["Statement 1"],
      likert_cols: [
        "Strongly disagree",
        "Disagree",
        "Neutral",
        "Agree",
        "Strongly agree",
      ],
    };
  }
  return base;
}

const renumber = (arr) => arr.map((q, i) => ({ ...q, question_id: `q${i + 1}` }));

/* -------------------------- API helpers (UPDATED) -------------------------- */

function unwrapArray(data, keys = []) {
  if (Array.isArray(data)) return data;
  for (const k of keys) {
    if (Array.isArray(data?.[k])) return data[k];
  }
  return [];
}

async function fetchTracks() {
  try {
    const r = await fetch("/api/tracks?limit=500", { cache: "no-store" });
    if (!r.ok) return [];
    const data = await r.json();
    return unwrapArray(data, ["tracks", "data", "items"]);
  } catch {
    return [];
  }
}

async function fetchSubjectsAll() {
  try {
    const r = await fetch("/api/subjects?limit=1000&sort=name-asc", { cache: "no-store" });
    if (!r.ok) return [];
    const data = await r.json();
    return unwrapArray(data, ["subjects", "data", "items"]);
  } catch {
    return [];
  }
}

async function fetchSubjectsByTrack(trackId) {
  try {
    const id = safeStr(trackId);
    if (!id) return [];

    const url = `/api/subjects?track_id=${encodeURIComponent(id)}&limit=1000&sort=name-asc`;
    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) return [];
    const data = await r.json();
    return unwrapArray(data, ["subjects", "data", "items"]);
  } catch {
    return [];
  }
}

function heroBg() {
  return (
    <>
      <motion.div
        aria-hidden
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="pointer-events-none absolute -left-44 -top-32 w-[520px] h-[520px] rounded-full bg-gradient-to-tr from-primary/30 to-secondary/30 blur-3xl mix-blend-screen"
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -right-32 bottom-8 w-80 h-80 rounded-full bg-gradient-to-br from-accent/20 to-primary/10 blur-3xl mix-blend-screen"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1.05, opacity: 1 }}
        transition={{
          duration: 1.2,
          repeat: Infinity,
          repeatType: "mirror",
          ease: "easeInOut",
        }}
      />
      <style>{`
        @keyframes gradientX { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
        .animate-gradient-x { animation: gradientX 6s ease infinite; }
      `}</style>
    </>
  );
}

/* --------------------------- Bucket API (NCAE/RIASEC) --------------------------- */

async function apiRequest(url, options = {}) {
  const hasBody = options.body !== undefined && options.body !== null;

  const headers = { ...(options.headers || {}) };
  if (!(options.body instanceof FormData) && hasBody) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(url, { ...options, headers, cache: "no-store" });

  const text = await res.text().catch(() => "");
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  if (!res.ok || data?.success === false) {
    // Prefer JSON error, else show raw body for debugging
    const msg =
      data?.error ||
      (text ? `Server error (${res.status}): ${text.slice(0, 500)}` : `Request failed (${res.status})`);

    // Helpful console logging (remove later)
    console.error("API ERROR", { url, status: res.status, text, data });

    throw new Error(msg);
  }

  return data ?? {};
}

async function fetchNcaeFromBucket() {
  return apiRequest("/api/ncae", { method: "GET" });
}

async function fetchRiasecFromBucket() {
  return apiRequest("/api/riasec", { method: "GET" });
}

async function saveNcaeToBucket(ncaeArray) {
  const body = JSON.stringify({ data: ncaeArray });
  // PUT should work, but keep POST fallback
  try {
    return await apiRequest("/api/ncae", { method: "PUT", body });
  } catch {
    return await apiRequest("/api/ncae", { method: "POST", body });
  }
}

async function saveRiasecToBucket(riasecObject) {
  const body = JSON.stringify({ data: riasecObject });
  try {
    return await apiRequest("/api/riasec", { method: "PUT", body });
  } catch {
    return await apiRequest("/api/riasec", { method: "POST", body });
  }
}

/* --------------------------- NCAE / RIASEC formats --------------------------- */

function safeNum(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeText(v) {
  return String(v ?? "").trim();
}

// Convert correct answers (strings or indices) -> indices for UI
function correctToIdx(correct_answers, choices) {
  const ca = Array.isArray(correct_answers) ? correct_answers : [];
  const ch = Array.isArray(choices) ? choices : [];

  if (!ca.length) return [];

  // if already indices
  if (typeof ca[0] === "number") {
    return ca
      .map((x) => Number(x))
      .filter((n) => Number.isFinite(n) && n >= 0 && n < ch.length);
  }

  // strings -> index match
  return ca
    .map((ans) => ch.findIndex((c) => normalizeText(c) === normalizeText(ans)))
    .filter((i) => i >= 0);
}

// Normalize any stored question row into the schema the card expects
function normalizeStandardQuestion(raw, index) {
  const typeRaw = normalizeText(raw?.question_type ?? raw?.type ?? raw?.kind ?? "choice").toLowerCase();

  const question_type = ["choice", "text", "rating", "likert"].includes(typeRaw) ? typeRaw : "choice";

  const question_text = normalizeText(
    raw?.question_text ??
      raw?.text ??
      raw?.question ??
      raw?.prompt ??
      raw?.questionText ??
      ""
  );

  const choicesRaw = raw?.choices ?? raw?.options ?? raw?.answers ?? [];
  const choices =
    Array.isArray(choicesRaw) && choicesRaw.length
      ? choicesRaw.map((x) => normalizeText(x))
      : ["", ""];

  const base = {
    question_id: normalizeText(raw?.question_id) || `q${index + 1}`,
    question_text,
    question_type,
    required: raw?.required === true,
    points: safeNum(raw?.points ?? raw?.score ?? 0, 0),
    enable_math: raw?.enable_math === true,
    difficulty: normalizeDifficulty(raw?.difficulty),
    images: Array.isArray(raw?.images) ? raw.images : [],
    files: Array.isArray(raw?.files) ? raw.files : [],
  };

  if (question_type === "choice") {
    const allow_multiple = raw?.allow_multiple === true;
    const correct_answers_idx = correctToIdx(raw?.correct_answers, choices) ?? [];

    // also support "correct_index" style fields if you ever had them
    const fallbackCI = raw?.correct_index ?? raw?.correctIndex;
    const finalIdx =
      correct_answers_idx.length
        ? correct_answers_idx
        : Number.isFinite(Number(fallbackCI))
        ? [Number(fallbackCI)]
        : [];

    return {
      ...base,
      allow_multiple,
      choices: choices.length >= 2 ? choices : ["", ""],
      // UI uses indices
      correct_answers: finalIdx,
    };
  }

  if (question_type === "text") {
    const ans = normalizeText(
      (Array.isArray(raw?.choices) ? raw.choices[0] : null) ??
        raw?.answer ??
        raw?.correct_answer ??
        ""
    );

    return {
      ...base,
      text_any_case: raw?.text_any_case === true,
      choices: [ans],
    };
  }

  if (question_type === "rating") {
    return {
      ...base,
      rating_max: safeNum(raw?.rating_max ?? 5, 5),
    };
  }

  if (question_type === "likert") {
    return {
      ...base,
      likert_rows:
        Array.isArray(raw?.likert_rows) && raw.likert_rows.length
          ? raw.likert_rows
          : ["Statement 1"],
      likert_cols:
        Array.isArray(raw?.likert_cols) && raw.likert_cols.length
          ? raw.likert_cols
          : ["Strongly disagree", "Disagree", "Neutral", "Agree", "Strongly agree"],
    };
  }

  return base;
}

// NCAE: [{ text, options:[], category, correct_index }]
function isNcaeFormat(val) {
  if (!Array.isArray(val) || !val.length) return false;
  const x = val[0];
  return (
    x &&
    typeof x === "object" &&
    typeof x.text === "string" &&
    Array.isArray(x.options) &&
    typeof x.category === "string" &&
    "correct_index" in x
  );
}

// RIASEC: { version?, scale_min?, scale_max?, likert_labels?, items:[{id,text,code,reverse?}] }
function isRiasecFormat(val) {
  if (!val || typeof val !== "object" || Array.isArray(val)) return false;
  const items = val.items;
  if (!Array.isArray(items) || !items.length) return false;
  const x = items[0];
  return x && typeof x === "object" && typeof x.text === "string" && typeof x.code === "string";
}

function normalizeNcaeItem(item) {
  const text = safeStr(item?.text);
  const options = Array.isArray(item?.options) ? item.options.map((o) => safeStr(o)) : [];
  const category = safeStr(item?.category) || "GENERAL";

  let ci = Number(item?.correct_index);
  if (!Number.isFinite(ci)) ci = 0;
  if (ci < 0) ci = 0;
  if (options.length && ci >= options.length) ci = options.length - 1;

  const opts = options.length >= 2 ? options : ["", ""];
  if (ci >= opts.length) ci = Math.max(0, opts.length - 1);

  return { text, options: opts, category, correct_index: ci };
}

function normalizeRiasecPayload(payload) {
  const version = Number(payload?.version) || 1;
  const scale_min = Number(payload?.scale_min) || 1;
  const scale_max = Number(payload?.scale_max) || 5;
  const likert_labels = Array.isArray(payload?.likert_labels)
    ? payload.likert_labels.map((x) => safeStr(x)).filter(Boolean)
    : ["Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"];

  const validCodes = new Set(["R", "I", "A", "S", "E", "C"]);

  const itemsRaw = Array.isArray(payload?.items) ? payload.items : [];
  const items = itemsRaw.map((it, idx) => {
    const code = safeStr(it?.code).toUpperCase();
    return {
      id: idx + 1,
      text: safeStr(it?.text),
      code: validCodes.has(code) ? code : "R",
      reverse: it?.reverse === true,
    };
  });

  return { version, scale_min, scale_max, likert_labels, items };
}

/* ------------------------------- templates ------------------------------- */

function detectTemplateKind(idLower) {
  const s = safeStr(idLower).toLowerCase();

  if (
    s === "ncae" ||
    s.startsWith("ncae") ||
    s.includes("ncae") ||
    s === "questionnaire" ||
    s === "questionnaire.json" ||
    s.includes("questionnaire")
  ) {
    return "NCAE";
  }

  if (
    s === "riasec" ||
    s.startsWith("riasec") ||
    s.includes("riasec") ||
    s === "items" ||
    s === "items.json"
  ) {
    return "RIASEC";
  }

  return null;
}

/* -------------------------------- Page -------------------------------- */

export default function EditAssessmentPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();

  const quizIdParam = safeStr(params?.id);
  const idLower = safeStr(params?.id).toLowerCase();

  const templateKind = useMemo(() => detectTemplateKind(idLower), [idLower]);
  const isTemplate = !!templateKind;

  // IMPORTANT: ref for beforeunload; state for UI "dirty" badge
  const isDirtyRef = useRef(false);
  const [dirty, setDirty] = useState(false);

  const markDirty = useCallback(() => {
    isDirtyRef.current = true;
    setDirty(true);
  }, []);

  const clearDirty = useCallback(() => {
    isDirtyRef.current = false;
    setDirty(false);
  }, []);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // ✅ Prevent “level effect” from wiping loaded track/subject during initial hydration
  const didHydrateRef = useRef(false);

  // Meta state (used for STANDARD quizzes only)
  const [quizTitle, setQuizTitle] = useState("");
  const [quizDescription, setQuizDescription] = useState("");
  const [quizType, setQuizType] = useState("Career Interest");
  const [status, setStatus] = useState("Draft");

  const [quizLevel, setQuizLevel] = useState(""); // JHS | SHS
  const [quizTrack, setQuizTrack] = useState(""); // track_id
  const [quizSubject, setQuizSubject] = useState(""); // subject_id

  const [visibility, setVisibility] = useState("private");
  const [dueDate, setDueDate] = useState("");

  /**
   * Mode:
   * - STANDARD: quizzes
   * - NCAE: bucket template
   * - RIASEC: bucket template
   */
  const [mode, setMode] = useState("STANDARD");

  // STANDARD questions
  const [questions, setQuestions] = useState(() => [makeBlankQuestion("choice", 0)]);
  const [difficultyFilter, setDifficultyFilter] = useState("all");

  // NCAE
  const [ncaeItems, setNcaeItems] = useState([]);

  // RIASEC
  const [riasecMeta, setRiasecMeta] = useState({
    version: 1,
    scale_min: 1,
    scale_max: 5,
    likert_labels: ["Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"],
  });
  const [riasecItems, setRiasecItems] = useState([]);

  // Dropdown data
  const [allTracks, setAllTracks] = useState([]);

  // Subjects
  const [allSubjects, setAllSubjects] = useState([]);
  const [subjectsForTrack, setSubjectsForTrack] = useState([]);
  const [subjectsLoading, setSubjectsLoading] = useState(false);

  /**
   * store original identity fields from loaded quiz
   */
  const originalRef = useRef({
    quiz_id: "",
    storage_path: "",
    created_at: "",
  });

  // Load tracks + all subjects fallback
  useEffect(() => {
    fetchTracks().then((t) => setAllTracks(Array.isArray(t) ? t : []));
    fetchSubjectsAll().then((s) => setAllSubjects(Array.isArray(s) ? s : []));
  }, []);

  // Load quiz OR bucket template (NCAE / RIASEC)
  useEffect(() => {
    let alive = true;

    async function load() {
      if (!quizIdParam) {
        setLoading(false);
        toast({
          title: "Missing ID",
          description: "No id in URL.",
          variant: "destructive",
        });
        return;
      }

      setLoading(true);

      try {
        // ✅ Templates: do NOT touch /api/quizzes at all
        if (templateKind === "NCAE") {
          const out = await fetchNcaeFromBucket();
          if (!alive) return;

          const raw = Array.isArray(out?.data) ? out.data : [];
          setMode("NCAE");
          setNcaeItems(raw.map(normalizeNcaeItem));

          // template labels (not a quiz)
          setQuizTitle("NCAE Questionnaire");
          setQuizDescription("Bucket-based NCAE question bank.");
          setQuizType("Academic");
          setStatus("Draft");
          setVisibility("private");

          originalRef.current.quiz_id = "ncae";
          originalRef.current.storage_path = safeStr(out?.path || "");
          originalRef.current.created_at = "";

          didHydrateRef.current = true;
          clearDirty();
          return;
        }

        if (templateKind === "RIASEC") {
          const out = await fetchRiasecFromBucket();
          if (!alive) return;

          const normalized = normalizeRiasecPayload(out?.data || {});
          setMode("RIASEC");
          setRiasecMeta({
            version: normalized.version,
            scale_min: normalized.scale_min,
            scale_max: normalized.scale_max,
            likert_labels: normalized.likert_labels,
          });
          setRiasecItems(normalized.items);

          setQuizTitle("RIASEC Items");
          setQuizDescription("Bucket-based RIASEC item bank.");
          setQuizType("Career Interest");
          setStatus("Draft");
          setVisibility("private");

          originalRef.current.quiz_id = "riasec";
          originalRef.current.storage_path = safeStr(out?.path || "");
          originalRef.current.created_at = "";

          didHydrateRef.current = true;
          clearDirty();
          return;
        }

        // ✅ STANDARD quiz: try direct getQuiz(id) first
        let found = null;

        try {
          found = await getQuiz(quizIdParam);
        } catch {
          found = null;
        }

        // fallback: search list (only if getQuiz failed)
        if (!found) {
          const list = await fetchQuizzes({ search: quizIdParam, limit: 200 });
          const arr = Array.isArray(list) ? list : [];

          const candidates = new Set([
            quizIdParam,
            safeStr(decodeURIComponent(quizIdParam)),
            safeStr(quizIdParam).replace(/\.(json|txt)$/i, ""),
          ]);

          found =
            arr.find((q) => candidates.has(getQuizId(q))) ||
            arr.find((q) => [...candidates].some((c) => safeStr(q?.storage_path).includes(c))) ||
            null;
        }

        if (!found) throw new Error("Quiz not found.");
        if (!alive) return;

        const stableId =
          safeStr(found.quiz_id ?? found.id ?? found.assessment_id) || getQuizId(found);

        originalRef.current.quiz_id = stableId || quizIdParam;
        originalRef.current.storage_path = safeStr(found.storage_path || "");
        originalRef.current.created_at = safeStr(found.created_at || found.inserted_at || "");

        const loadedTitle = safeStr(found.quiz_title || found.title || "");
        const loadedDesc = safeStr(found.quiz_description || found.description || "");

        setQuizTitle(loadedTitle);
        setQuizDescription(loadedDesc);
        setQuizType(safeStr(found.type) || "Career Interest");

        const st = safeStr(found.status);
        setStatus(st ? st[0].toUpperCase() + st.slice(1) : "Draft");

        const loadedTrack = safeStr(found.track_id ?? found.tracks_id ?? found.strand_id);
        setQuizTrack(loadedTrack);

        const loadedSubject = safeStr(
          found.subject_id ?? found.subjectId ?? found.subjectID ?? found.quiz_subject_id
        );
        setQuizSubject(loadedSubject);

        setQuizLevel(safeStr(found.school_level || found.level || ""));
        setVisibility(safeStr(found.visibility) || "private");

        const dd = found.due_date ? new Date(found.due_date) : null;
        if (dd && !Number.isNaN(dd.getTime())) {
          const pad = (n) => String(n).padStart(2, "0");
          const local = `${dd.getFullYear()}-${pad(dd.getMonth() + 1)}-${pad(dd.getDate())}T${pad(
            dd.getHours()
          )}:${pad(dd.getMinutes())}`;
          setDueDate(local);
        } else {
          setDueDate("");
        }

        // questions formats
        const raw = found.questions;

        if (isRiasecFormat(raw)) {
          const normalized = normalizeRiasecPayload(raw);
          setMode("RIASEC");
          setRiasecMeta({
            version: normalized.version,
            scale_min: normalized.scale_min,
            scale_max: normalized.scale_max,
            likert_labels: normalized.likert_labels,
          });
          setRiasecItems(normalized.items);
        } else if (isNcaeFormat(raw)) {
          setMode("NCAE");
          setNcaeItems(raw.map(normalizeNcaeItem));
        } else {
          setMode("STANDARD");
          const qs = Array.isArray(raw) ? raw : [];
          setQuestions(
            qs.length ? renumber(qs.map((q, i) => normalizeStandardQuestion(q, i))) : [makeBlankQuestion("choice", 0)]
          );
        }

        didHydrateRef.current = true;
        clearDirty();
      } catch (e) {
        toast({
          title: "Load failed",
          description: e?.message || "Could not load.",
          variant: "destructive",
        });
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, [quizIdParam, templateKind, toast, clearDirty]);

  // Warn on browser close
  useEffect(() => {
    const beforeUnload = (e) => {
      if (!isDirtyRef.current) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, []);

  const handleBack = useCallback(() => {
    if (isDirtyRef.current) {
      toast({
        title: "Unsaved changes",
        description: "Please save first (or refresh to discard).",
        variant: "destructive",
      });
      return;
    }
    router.push("/admin/assessments");
  }, [router, toast]);

  /* ---------------- STANDARD question mutators ---------------- */

  const addQuestion = (type) => {
    markDirty();
    setQuestions((prev) => renumber([...prev, makeBlankQuestion(type, prev.length)]));
  };

  const updateQuestionAt = (idx, next) => {
    markDirty();
    setQuestions((prev) => {
      const arr = [...prev];
      arr[idx] = { ...next, difficulty: normalizeDifficulty(next.difficulty) };
      return arr;
    });
  };

  const removeQuestionAt = (idx) => {
    markDirty();
    setQuestions((prev) => renumber(prev.filter((_, i) => i !== idx)));
  };

  const duplicateQuestionAt = (idx) => {
    markDirty();
    setQuestions((prev) => {
      const copy = JSON.parse(JSON.stringify(prev[idx]));
      const arr = [...prev.slice(0, idx + 1), copy, ...prev.slice(idx + 1)];
      return renumber(arr);
    });
  };

  const moveQuestion = (from, to) => {
    if (to < 0 || to >= questions.length) return;
    markDirty();
    setQuestions((prev) => {
      const arr = [...prev];
      const [moved] = arr.splice(from, 1);
      arr.splice(to, 0, moved);
      return renumber(arr);
    });
  };

  // ✅ IMPORTANT FIX: when filtered, we must map "visible index" to "real index"
  const handleReorder = (fromVisible, toVisible) => {
    const entries = filteredQuestionEntries;
    const fromReal = entries[fromVisible]?.i;
    const toReal = entries[toVisible]?.i;
    if (fromReal === undefined || toReal === undefined) return;
    moveQuestion(fromReal, toReal);
  };

  // Upload handlers (STANDARD only)
  const handleUploadImage = async (idx, file) => {
    try {
      const media = await uploadQuizImage(file);
      setQuestions((prev) => {
        const arr = [...prev];
        const q = { ...arr[idx] };
        q.images = [...(q.images || []), media];
        arr[idx] = q;
        return arr;
      });
      markDirty();
    } catch (e) {
      toast({
        title: "Upload failed",
        description: e?.message || "Could not upload image.",
        variant: "destructive",
      });
    }
  };

  const handleUploadFile = async (idx, file) => {
    try {
      const media = await uploadQuizFile(file);
      setQuestions((prev) => {
        const arr = [...prev];
        const q = { ...arr[idx] };
        q.files = [...(q.files || []), media];
        arr[idx] = q;
        return arr;
      });
      markDirty();
    } catch (e) {
      toast({
        title: "Upload failed",
        description: e?.message || "Could not upload file.",
        variant: "destructive",
      });
    }
  };

  /* ---------------- NCAE mutators ---------------- */

  const ncaeAdd = () => {
    markDirty();
    setNcaeItems((prev) => [
      ...prev,
      normalizeNcaeItem({
        text: "",
        options: ["", "", "", ""],
        category: "GENERAL",
        correct_index: 0,
      }),
    ]);
  };

  const ncaeUpdateAt = (idx, patch) => {
    markDirty();
    setNcaeItems((prev) => {
      const arr = [...prev];
      const cur = arr[idx] || normalizeNcaeItem({});
      const next = normalizeNcaeItem({ ...cur, ...patch });
      arr[idx] = next;
      return arr;
    });
  };

  const ncaeMove = (from, to) => {
    if (to < 0 || to >= ncaeItems.length) return;
    markDirty();
    setNcaeItems((prev) => {
      const arr = [...prev];
      const [m] = arr.splice(from, 1);
      arr.splice(to, 0, m);
      return arr;
    });
  };

  const ncaeDuplicate = (idx) => {
    markDirty();
    setNcaeItems((prev) => {
      const copy = JSON.parse(JSON.stringify(prev[idx]));
      const arr = [...prev.slice(0, idx + 1), copy, ...prev.slice(idx + 1)];
      return arr.map(normalizeNcaeItem);
    });
  };

  const ncaeRemove = (idx) => {
    markDirty();
    setNcaeItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const ncaeSetOption = (qIdx, optIdx, val) => {
    const item = ncaeItems[qIdx] || normalizeNcaeItem({});
    const options = Array.isArray(item.options) ? [...item.options] : [];
    options[optIdx] = val;
    ncaeUpdateAt(qIdx, { options });
  };

  const ncaeAddOption = (qIdx) => {
    const item = ncaeItems[qIdx] || normalizeNcaeItem({});
    const options = Array.isArray(item.options) ? [...item.options] : ["", ""];
    options.push("");
    ncaeUpdateAt(qIdx, { options });
  };

  const ncaeRemoveOption = (qIdx, optIdx) => {
    const item = ncaeItems[qIdx] || normalizeNcaeItem({});
    const options = Array.isArray(item.options) ? [...item.options] : ["", ""];
    if (options.length <= 2) return;

    options.splice(optIdx, 1);

    let correct_index = Number(item.correct_index) || 0;
    if (correct_index === optIdx) correct_index = 0;
    if (correct_index > options.length - 1) correct_index = options.length - 1;

    ncaeUpdateAt(qIdx, { options, correct_index });
  };

  /* ---------------- RIASEC mutators ---------------- */

  const riasecAdd = () => {
    markDirty();
    setRiasecItems((prev) => {
      const next = [...prev, { id: prev.length + 1, text: "", code: "R", reverse: false }];
      return next.map((it, idx) => ({ ...it, id: idx + 1 }));
    });
  };

  const riasecUpdateAt = (idx, patch) => {
    markDirty();
    setRiasecItems((prev) => {
      const arr = [...prev];
      const cur = arr[idx] || { id: idx + 1, text: "", code: "R", reverse: false };
      arr[idx] = { ...cur, ...patch, id: idx + 1 };
      return arr;
    });
  };

  const riasecMove = (from, to) => {
    if (to < 0 || to >= riasecItems.length) return;
    markDirty();
    setRiasecItems((prev) => {
      const arr = [...prev];
      const [m] = arr.splice(from, 1);
      arr.splice(to, 0, m);
      return arr.map((it, idx) => ({ ...it, id: idx + 1 }));
    });
  };

  const riasecDuplicate = (idx) => {
    markDirty();
    setRiasecItems((prev) => {
      const copy = JSON.parse(JSON.stringify(prev[idx]));
      const arr = [...prev.slice(0, idx + 1), copy, ...prev.slice(idx + 1)];
      return arr.map((it, i) => ({ ...it, id: i + 1 }));
    });
  };

  const riasecRemove = (idx) => {
    markDirty();
    setRiasecItems((prev) => prev.filter((_, i) => i !== idx).map((it, i) => ({ ...it, id: i + 1 })));
  };

  const riasecSetLikertLabel = (i, v) => {
    markDirty();
    setRiasecMeta((prev) => {
      const labels = Array.isArray(prev.likert_labels) ? [...prev.likert_labels] : [];
      labels[i] = v;
      return { ...prev, likert_labels: labels };
    });
  };

  const riasecAddLikertLabel = () => {
    markDirty();
    setRiasecMeta((prev) => {
      const labels = Array.isArray(prev.likert_labels) ? [...prev.likert_labels] : [];
      labels.push("");
      return { ...prev, likert_labels: labels };
    });
  };

  const riasecRemoveLikertLabel = (i) => {
    markDirty();
    setRiasecMeta((prev) => {
      const labels = Array.isArray(prev.likert_labels) ? [...prev.likert_labels] : [];
      if (labels.length <= 2) return prev;
      labels.splice(i, 1);
      return { ...prev, likert_labels: labels };
    });
  };

  /* ------------------------------ label maps ------------------------------ */

  const trackLabelMap = useMemo(() => {
    const m = new Map();
    for (const t of allTracks) {
      const id = safeStr(t?.track_id ?? t?.code ?? t?.id);
      if (!id) continue;
      const name = safeStr(t?.track_name ?? t?.name);
      const label = name ? `${id} — ${name}` : id;
      m.set(id, label);
    }
    return m;
  }, [allTracks]);

  const subjectIndex = useMemo(() => {
    const m = new Map();
    for (const s of allSubjects) {
      const id = safeStr(s?.subject_id);
      if (id) m.set(id, s);
    }
    for (const s of subjectsForTrack) {
      const id = safeStr(s?.subject_id);
      if (id) m.set(id, s);
    }
    return m;
  }, [allSubjects, subjectsForTrack]);

  /* -------------------------- SUBJECTS DEPENDENT FETCH -------------------------- */

  useEffect(() => {
    let alive = true;

    async function loadSubjects() {
      if (quizLevel !== "SHS" || !quizTrack) {
        if (alive) setSubjectsForTrack([]);
        return;
      }

      setSubjectsLoading(true);
      try {
        const byTrack = await fetchSubjectsByTrack(quizTrack);

        let finalList = Array.isArray(byTrack) && byTrack.length ? byTrack : null;

        if (!finalList) {
          const all = await fetchSubjectsAll();
          if (!alive) return;
          setAllSubjects(Array.isArray(all) ? all : []);
          finalList = all.filter((s) => safeStr(s?.track_id) === safeStr(quizTrack));
        }

        if (!alive) return;

        finalList = finalList.filter((s) => safeStr(s?.level) === "SHS" || !s?.level);

        setSubjectsForTrack(Array.isArray(finalList) ? finalList : []);
      } finally {
        if (alive) setSubjectsLoading(false);
      }
    }

    loadSubjects();
    return () => {
      alive = false;
    };
  }, [quizLevel, quizTrack]);

  const initialTrackRef = useRef(null);
  useEffect(() => {
    if (!didHydrateRef.current) return;
    if (initialTrackRef.current === null) {
      initialTrackRef.current = quizTrack;
      return;
    }
    setQuizSubject("");
  }, [quizTrack]);

  useEffect(() => {
    if (!didHydrateRef.current) return;
    if (quizLevel !== "SHS") {
      setQuizTrack("");
      setQuizSubject("");
      setSubjectsForTrack([]);
    }
  }, [quizLevel]);

  const subjectsForMeta = useMemo(() => {
    if (quizLevel === "SHS") return subjectsForTrack;

    if (quizLevel === "JHS") {
      return allSubjects.filter((s) => !safeStr(s?.track_id));
    }

    return allSubjects;
  }, [allSubjects, quizLevel, subjectsForTrack]);

  const subjectsForMetaWithSelected = useMemo(() => {
    let list = Array.isArray(subjectsForMeta) ? subjectsForMeta : [];
    const sid = safeStr(quizSubject);

    if (sid && !list.some((s) => safeStr(s?.subject_id) === sid)) {
      const row = subjectIndex.get(sid);
      if (row) list = [row, ...list];
      else list = [{ subject_id: sid, subject_name: `Unknown subject (${sid})` }, ...list];
    }

    const seen = new Set();
    return list.filter((s) => {
      const id = safeStr(s?.subject_id);
      if (!id || seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  }, [subjectsForMeta, quizSubject, subjectIndex]);

  /* -------------------- filtered view must preserve real index -------------------- */

  const filteredQuestionEntries = useMemo(() => {
    const entries = questions.map((q, i) => ({ q, i }));
    if (difficultyFilter === "all") return entries;
    return entries.filter(({ q }) => normalizeDifficulty(q.difficulty) === difficultyFilter);
  }, [questions, difficultyFilter]);

  const authoredCounts = useMemo(() => {
    let e = 0,
      m = 0,
      h = 0;
    for (const q of questions) {
      const d = normalizeDifficulty(q.difficulty);
      if (d === "easy") e++;
      else if (d === "medium") m++;
      else if (d === "difficult") h++;
    }
    return { e, m, h, all: questions.length };
  }, [questions]);

  const totalCount = useMemo(() => {
    if (mode === "NCAE") return ncaeItems.length;
    if (mode === "RIASEC") return riasecItems.length;
    return questions.length;
  }, [mode, ncaeItems.length, riasecItems.length, questions.length]);

  const handleSave = useCallback(async () => {
    // ✅ Templates: no quiz title validation (not a quiz)
    if (!isTemplate && mode === "STANDARD" && !quizTitle.trim()) {
      toast({
        title: "Missing Title",
        description: "Enter a title.",
        variant: "destructive",
      });
      return;
    }

    if (!isTemplate && mode === "STANDARD" && quizLevel === "SHS" && !quizTrack) {
      toast({
        title: "Missing Track",
        description: "Select a track for SHS.",
        variant: "destructive",
      });
      return;
    }

    const nowIso = new Date().toISOString();
    const stableId = safeStr(originalRef.current.quiz_id) || quizIdParam;
    const stablePath = safeStr(originalRef.current.storage_path);

    const statusNormalized =
      safeStr(status).toLowerCase() === "published"
        ? "published"
        : safeStr(status).toLowerCase() === "archived"
        ? "archived"
        : "draft";

    setSaving(true);

    try {
      // ✅ Templates: save to bucket only
      if (mode === "NCAE" || templateKind === "NCAE") {
        const cleaned = (Array.isArray(ncaeItems) ? ncaeItems : [])
          .map((it) => normalizeNcaeItem(it))
          .map((it) => ({
            text: it.text,
            options: it.options,
            category: safeStr(it.category) || "GENERAL",
            correct_index: Number.isFinite(Number(it.correct_index)) ? Number(it.correct_index) : 0,
          }));

        await saveNcaeToBucket(cleaned);
        clearDirty();
        toast({ title: "Saved", description: "NCAE saved successfully." });
        router.push("/admin/assessments");
        return;
      }

      if (mode === "RIASEC" || templateKind === "RIASEC") {
        const validCodes = new Set(["R", "I", "A", "S", "E", "C"]);
        const items = (Array.isArray(riasecItems) ? riasecItems : [])
          .map((it, idx) => ({
            id: idx + 1,
            text: safeStr(it?.text),
            code: validCodes.has(safeStr(it?.code).toUpperCase()) ? safeStr(it?.code).toUpperCase() : "R",
            ...(it?.reverse === true ? { reverse: true } : {}),
          }))
          .filter((it) => it.text);

        const likert_labels = Array.isArray(riasecMeta?.likert_labels)
          ? riasecMeta.likert_labels.map((x) => safeStr(x)).filter(Boolean)
          : ["Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"];

        const out = {
          version: Number(riasecMeta?.version) || 1,
          scale_min: Number(riasecMeta?.scale_min) || 1,
          scale_max: Number(riasecMeta?.scale_max) || 5,
          likert_labels,
          items,
        };

        await saveRiasecToBucket(out);
        clearDirty();
        toast({ title: "Saved", description: "RIASEC saved successfully." });
        router.push("/admin/assessments");
        return;
      }

      // ✅ STANDARD quiz save
      const questionsOut = questions.map((q) => {
        const out = {
          ...q,
          difficulty: normalizeDifficulty(q.difficulty),
          images: Array.isArray(q.images) ? q.images : [],
          files: Array.isArray(q.files) ? q.files : [],
        };

        if (out.question_type === "choice") {
          const ch = Array.isArray(out.choices) ? out.choices : [];
          const idxs = Array.isArray(out.correct_answers) ? out.correct_answers : [];

          const correct_answers_as_text = idxs
            .map((x) => Number(x))
            .filter((n) => Number.isFinite(n) && n >= 0 && n < ch.length)
            .map((i) => ch[i])
            .filter((s) => String(s).trim());

          return { ...out, correct_answers: correct_answers_as_text };
        }

        if (out.question_type === "text") {
          const ans = safeStr((out.choices || [])[0]);
          return { ...out, choices: [ans] };
        }

        return out;
      });

      const payload = {
        quiz_id: stableId,
        id: stableId,
        assessment_id: stableId,
        storage_path: stablePath || undefined,

        quiz_title: quizTitle.trim(),
        quiz_description: quizDescription,

        type: quizType,
        status: statusNormalized,

        track_id: quizTrack || null,
        subject_id: quizSubject || null,
        school_level: quizLevel || null,

        visibility: visibility || "private",
        due_date: dueDate ? new Date(dueDate).toISOString() : null,

        questions: questionsOut,

        created_at: safeStr(originalRef.current.created_at) || undefined,
        updated_at: nowIso,
        mode: "update",
      };

      await saveQuiz(payload);

      clearDirty();
      toast({ title: "Saved", description: "Changes saved successfully." });
      router.push("/admin/assessments");
    } catch (e) {
      toast({
        title: "Save failed",
        description: e?.message || "Something went wrong.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }, [
    isTemplate,
    templateKind,
    mode,
    quizIdParam,
    quizTitle,
    quizDescription,
    quizType,
    status,
    quizLevel,
    quizTrack,
    quizSubject,
    visibility,
    dueDate,
    questions,
    ncaeItems,
    riasecItems,
    riasecMeta,
    router,
    toast,
    clearDirty,
  ]);

  if (loading) {
    return (
      <div className="p-8">
        <Card className="rounded-4xl p-8 text-center text-muted-foreground font-semibold">
          Loading…
        </Card>
      </div>
    );
  }

  const modeBadge =
    mode === "RIASEC" ? "RIASEC format" : mode === "NCAE" ? "NCAE format" : "Standard format";

  // ✅ If you ever load a quiz where questions are RIASEC/NCAE stored inside quiz json, lock meta edits to prevent accidental changes.
  const lockMeta = mode === "RIASEC" || mode === "NCAE";

  return (
    <div className="space-y-8">
      {/* ===== HERO ===== */}
      <section className="relative overflow-hidden rounded-4xl border border-border bg-gradient-to-b from-background via-background to-background">
        {heroBg()}

        <div className="relative p-6 sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-black mb-5">
                <Sparkles className="h-4 w-4" />
                Admin • {isTemplate ? "Edit Template" : "Edit Assessment"}
              </div>

              <h1 className="text-4xl sm:text-5xl font-black tracking-tight leading-tight">
                Edit{" "}
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent bg-[length:200%] animate-gradient-x">
                  {isTemplate ? "Template" : "Assessment"}
                </span>
              </h1>

              <p className="mt-4 text-muted-foreground text-lg font-semibold leading-relaxed">
                Editing: <span className="font-black text-foreground">{quizIdParam}</span>
              </p>

              <div className="mt-6 flex flex-wrap gap-2">
                <Badge variant="secondary" className="rounded-full border font-black">
                  Ctrl/Cmd + S to save
                </Badge>

                <Badge variant="outline" className="rounded-full font-black">
                  {modeBadge}
                </Badge>

                <AnimatePresence>
                  {dirty ? (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 6 }}
                    >
                      <Badge className="rounded-full font-black border-0 bg-amber-500/15 text-amber-700">
                        Unsaved changes
                      </Badge>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>

              {isTemplate ? (
                <div className="mt-4 text-sm text-muted-foreground font-semibold">
                  Storage path:{" "}
                  <span className="font-black text-foreground">
                    {originalRef.current.storage_path || "(unknown)"}
                  </span>
                </div>
              ) : null}
            </div>

            <div className="flex items-center gap-3">
              <Button variant="outline" className="rounded-2xl font-black" onClick={handleBack}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>

              <Button className="rounded-2xl font-black" onClick={handleSave} disabled={saving}>
                <Save className="mr-2 h-4 w-4" />
                {saving ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Ctrl/Cmd+S */}
      <KeySave onSave={handleSave} />

      {/* ===== META (STANDARD only) ===== */}
      {!isTemplate && mode === "STANDARD" ? (
        <section className="rounded-4xl bg-card border border-border shadow-sm overflow-hidden">
          <div className="p-6 sm:p-7 border-b border-border">
            <h2 className="text-2xl font-black tracking-tight">Assessment Details</h2>
            <p className="mt-2 text-muted-foreground font-semibold">Update metadata and questions, then save.</p>
          </div>

          <div className="p-6 sm:p-7 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="space-y-2">
                <div className="text-sm font-black">Type</div>
                <Select
                  value={quizType}
                  onValueChange={(v) => {
                    if (lockMeta) return;
                    setQuizType(v);
                    markDirty();
                  }}
                  disabled={lockMeta}
                >
                  <SelectTrigger className="rounded-2xl font-semibold">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {quizTypes.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="text-sm font-black">Status</div>
                <Select
                  value={status}
                  onValueChange={(v) => {
                    if (lockMeta) return;
                    setStatus(v);
                    markDirty();
                  }}
                  disabled={lockMeta}
                >
                  <SelectTrigger className="rounded-2xl font-semibold">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Draft">Draft</SelectItem>
                    <SelectItem value="Published">Published</SelectItem>
                    <SelectItem value="Archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="text-sm font-black">Visibility</div>
                <Select
                  value={visibility}
                  onValueChange={(v) => {
                    if (lockMeta) return;
                    setVisibility(v);
                    markDirty();
                  }}
                  disabled={lockMeta}
                >
                  <SelectTrigger className="rounded-2xl font-semibold">
                    <SelectValue placeholder="Visibility" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="private">Private</SelectItem>
                    <SelectItem value="public">Public</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="text-sm font-black">Due Date</div>
                <Input
                  type="datetime-local"
                  value={dueDate}
                  onChange={(e) => {
                    if (lockMeta) return;
                    setDueDate(e.target.value);
                    markDirty();
                  }}
                  className="rounded-2xl font-semibold"
                  disabled={lockMeta}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="space-y-2">
                <div className="text-sm font-black">School Level</div>
                <Select
                  value={quizLevel || "NONE"}
                  onValueChange={(v) => {
                    const next = v === "NONE" ? "" : v;
                    setQuizLevel(next);
                    markDirty();
                  }}
                >
                  <SelectTrigger className="rounded-2xl font-semibold">
                    <SelectValue placeholder="Select level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">—</SelectItem>
                    <SelectItem value="JHS">Junior High</SelectItem>
                    <SelectItem value="SHS">Senior High</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="text-sm font-black">Track (SHS)</div>
                <Select
                  value={quizTrack || "NONE"}
                  onValueChange={(v) => {
                    const next = v === "NONE" ? "" : v;
                    setQuizTrack(next);
                    setQuizSubject("");
                    markDirty();
                  }}
                  disabled={quizLevel !== "SHS"}
                >
                  <SelectTrigger className="rounded-2xl font-semibold">
                    <SelectValue placeholder="Select track" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">—</SelectItem>
                    {allTracks.map((t) => {
                      const id = safeStr(t?.track_id ?? t?.code ?? t?.id);
                      if (!id) return null;
                      const label = trackLabelMap.get(id) || id;
                      return (
                        <SelectItem key={id} value={id}>
                          {label}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <div className="text-sm font-black">Subject (optional)</div>
                <Select
                  value={quizSubject || "NONE"}
                  onValueChange={(v) => {
                    setQuizSubject(v === "NONE" ? "" : v);
                    markDirty();
                  }}
                  disabled={(quizLevel === "SHS" && !quizTrack) || subjectsLoading}
                >
                  <SelectTrigger className="rounded-2xl font-semibold">
                    <SelectValue
                      placeholder={
                        quizLevel === "SHS" && !quizTrack
                          ? "Select track first"
                          : subjectsLoading
                          ? "Loading subjects..."
                          : "Select subject"
                      }
                    />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="NONE">—</SelectItem>
                    {subjectsForMetaWithSelected.map((s) => {
                      const sid = safeStr(s?.subject_id);
                      if (!sid) return null;
                      return (
                        <SelectItem key={sid} value={sid}>
                          {safeStr(s?.subject_name) || sid}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <div className="text-sm font-black">Title</div>
                <Input
                  value={quizTitle}
                  onChange={(e) => {
                    if (lockMeta) return;
                    setQuizTitle(e.target.value);
                    markDirty();
                  }}
                  placeholder="Untitled assessment"
                  className="rounded-2xl font-semibold"
                  disabled={lockMeta}
                />
              </div>

              <div className="space-y-2">
                <div className="text-sm font-black">Description</div>
                <Textarea
                  value={quizDescription}
                  onChange={(e) => {
                    if (lockMeta) return;
                    setQuizDescription(e.target.value);
                    markDirty();
                  }}
                  placeholder="Add a short description…"
                  className="rounded-2xl font-semibold min-h-[90px]"
                  disabled={lockMeta}
                />
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {/* ===== RIASEC META (only when editing RIASEC) ===== */}
      {mode === "RIASEC" ? (
        <section className="rounded-4xl bg-card border border-border shadow-sm overflow-hidden">
          <div className="p-6 sm:p-7 border-b border-border">
            <h2 className="text-2xl font-black tracking-tight">RIASEC Settings</h2>
            <p className="mt-2 text-muted-foreground font-semibold">
              Configure scale and likert labels saved to storage.
            </p>
          </div>

          <div className="p-6 sm:p-7 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="space-y-2">
                <div className="text-sm font-black">Version</div>
                <Input
                  type="number"
                  value={String(riasecMeta.version ?? 1)}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setRiasecMeta((p) => ({ ...p, version: Number.isFinite(v) ? v : 1 }));
                    markDirty();
                  }}
                  className="rounded-2xl font-semibold"
                />
              </div>

              <div className="space-y-2">
                <div className="text-sm font-black">Scale Min</div>
                <Input
                  type="number"
                  value={String(riasecMeta.scale_min ?? 1)}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setRiasecMeta((p) => ({ ...p, scale_min: Number.isFinite(v) ? v : 1 }));
                    markDirty();
                  }}
                  className="rounded-2xl font-semibold"
                />
              </div>

              <div className="space-y-2">
                <div className="text-sm font-black">Scale Max</div>
                <Input
                  type="number"
                  value={String(riasecMeta.scale_max ?? 5)}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setRiasecMeta((p) => ({ ...p, scale_max: Number.isFinite(v) ? v : 5 }));
                    markDirty();
                  }}
                  className="rounded-2xl font-semibold"
                />
              </div>

              <div className="space-y-2">
                <div className="text-sm font-black">Labels count</div>
                <div className="rounded-2xl border px-4 py-3 text-sm font-black text-muted-foreground">
                  {(riasecMeta.likert_labels || []).length}
                </div>
              </div>
            </div>

            <div className="rounded-4xl border p-5 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-black">Likert Labels</div>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-2xl font-black"
                  onClick={riasecAddLikertLabel}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add label
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {(riasecMeta.likert_labels || []).map((lab, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input
                      value={safeStr(lab)}
                      onChange={(e) => riasecSetLikertLabel(i, e.target.value)}
                      className="rounded-2xl font-semibold"
                      placeholder={`Label ${i + 1}`}
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      className="rounded-2xl"
                      onClick={() => riasecRemoveLikertLabel(i)}
                      disabled={(riasecMeta.likert_labels || []).length <= 2}
                      title="Remove label"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="text-xs text-muted-foreground font-semibold">
                Saved as <b>likert_labels[]</b>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {/* ===== QUESTIONS / ITEMS ===== */}
      {mode === "STANDARD" ? (
        <section className="rounded-4xl bg-card border border-border shadow-sm overflow-hidden">
          <div className="p-6 sm:p-7 border-b border-border">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <h2 className="text-2xl font-black tracking-tight">Questions</h2>
                <p className="mt-2 text-muted-foreground font-semibold">
                  {authoredCounts.all} total •{" "}
                  <span className="text-emerald-700 font-black">{authoredCounts.e}</span> easy •{" "}
                  <span className="text-amber-700 font-black">{authoredCounts.m}</span> medium •{" "}
                  <span className="text-rose-700 font-black">{authoredCounts.h}</span> hard
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="rounded-full border font-black">
                  Filter difficulty
                </Badge>
                <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
                  <SelectTrigger className="rounded-2xl font-semibold w-[180px]">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="difficult">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-7 space-y-5">
            <div className="space-y-5">
              {filteredQuestionEntries.map(({ q, i }, visibleIndex) => (
                <QuizQuestionCard
                  key={q.question_id || i}
                  index={i}
                  question={q}
                  onChange={(next) => updateQuestionAt(i, next)}
                  onRemove={() => removeQuestionAt(i)}
                  onDuplicate={() => duplicateQuestionAt(i)}
                  onMoveUp={() => moveQuestion(i, i - 1)}
                  onMoveDown={() => moveQuestion(i, i + 1)}
                  onReorder={(from, to) => handleReorder(from, to)}
                  onUploadImage={(file) => handleUploadImage(i, file)}
                  onUploadFile={(file) => handleUploadFile(i, file)}
                  // ✅ if your card supports "visibleIndex", you can pass it; otherwise safe to ignore
                  visibleIndex={visibleIndex}
                />
              ))}

              {filteredQuestionEntries.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground font-semibold">
                  No questions match this filter.
                </div>
              ) : null}
            </div>

            <div className="rounded-4xl border p-6">
              <div className="text-base font-black mb-3 flex items-center gap-2">
                <Plus className="h-4 w-4 text-primary" />
                Add new question
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <button
                  type="button"
                  onClick={() => addQuestion("choice")}
                  className="rounded-3xl border p-4 text-left hover:bg-primary/5 transition"
                >
                  <div className="font-black">Choice</div>
                  <div className="text-xs text-muted-foreground font-semibold">
                    Single or multiple answer
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => addQuestion("text")}
                  className="rounded-3xl border p-4 text-left hover:bg-primary/5 transition"
                >
                  <div className="font-black">Text</div>
                  <div className="text-xs text-muted-foreground font-semibold">
                    Short/long response
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => addQuestion("rating")}
                  className="rounded-3xl border p-4 text-left hover:bg-primary/5 transition"
                >
                  <div className="font-black">Rating</div>
                  <div className="text-xs text-muted-foreground font-semibold">
                    5 or 10 levels
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => addQuestion("likert")}
                  className="rounded-3xl border p-4 text-left hover:bg-primary/5 transition"
                >
                  <div className="font-black">Likert</div>
                  <div className="text-xs text-muted-foreground font-semibold">
                    Matrix scale
                  </div>
                </button>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {mode === "NCAE" ? (
        <section className="rounded-4xl bg-card border border-border shadow-sm overflow-hidden">
          <div className="p-6 sm:p-7 border-b border-border">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <h2 className="text-2xl font-black tracking-tight">NCAE Questions</h2>
                <p className="mt-2 text-muted-foreground font-semibold">
                  Format: <b>{`[{ text, options[], category, correct_index }]`}</b>
                </p>
              </div>

              <Button className="rounded-2xl font-black" onClick={ncaeAdd}>
                <Plus className="mr-2 h-4 w-4" />
                Add Question
              </Button>
            </div>
          </div>

          <div className="p-6 sm:p-7 space-y-5">
            {ncaeItems.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground font-semibold">
                No NCAE questions yet. Click <b>Add Question</b>.
              </div>
            ) : null}

            <div className="space-y-5">
              {ncaeItems.map((it, idx) => {
                const item = normalizeNcaeItem(it);
                const correctIndex = Number(item.correct_index) || 0;

                return (
                  <Card key={idx} className="rounded-4xl border shadow-sm overflow-hidden">
                    <CardHeader className="pb-4">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                        <div className="min-w-0">
                          <CardTitle className="font-black">Question {idx + 1}</CardTitle>
                          <CardDescription className="font-semibold">
                            Category + options + correct index
                          </CardDescription>
                        </div>

                        <div className="flex flex-wrap gap-2 justify-end">
                          <Badge variant="outline" className="rounded-full font-black">
                            {safeStr(item.category) || "GENERAL"}
                          </Badge>

                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-2xl font-black"
                            onClick={() => ncaeMove(idx, idx - 1)}
                            disabled={idx === 0}
                            title="Move up"
                          >
                            <ArrowUp className="h-4 w-4" />
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-2xl font-black"
                            onClick={() => ncaeMove(idx, idx + 1)}
                            disabled={idx === ncaeItems.length - 1}
                            title="Move down"
                          >
                            <ArrowDown className="h-4 w-4" />
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-2xl font-black"
                            onClick={() => ncaeDuplicate(idx)}
                            title="Duplicate"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>

                          <Button
                            variant="destructive"
                            size="sm"
                            className="rounded-2xl font-black"
                            onClick={() => ncaeRemove(idx)}
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="md:col-span-2 space-y-2">
                          <div className="text-sm font-black">Text</div>
                          <Textarea
                            value={item.text}
                            onChange={(e) => ncaeUpdateAt(idx, { text: e.target.value })}
                            className="rounded-2xl font-semibold min-h-[90px]"
                            placeholder="Enter the question text..."
                          />
                        </div>

                        <div className="space-y-2">
                          <div className="text-sm font-black">Category</div>
                          <Input
                            value={item.category}
                            onChange={(e) => ncaeUpdateAt(idx, { category: e.target.value })}
                            className="rounded-2xl font-semibold"
                            placeholder="SCIENCE / ENGLISH / MATH / ..."
                          />

                          <div className="text-sm font-black mt-4">Correct option</div>
                          <Select
                            value={String(correctIndex)}
                            onValueChange={(v) => ncaeUpdateAt(idx, { correct_index: Number(v) })}
                          >
                            <SelectTrigger className="rounded-2xl font-semibold">
                              <SelectValue placeholder="Select correct option" />
                            </SelectTrigger>
                            <SelectContent>
                              {(item.options || []).map((opt, oi) => (
                                <SelectItem key={oi} value={String(oi)}>
                                  {String.fromCharCode(65 + oi)}. {opt || "(empty)"}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-sm font-black">Options</div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-2xl font-black"
                            onClick={() => ncaeAddOption(idx)}
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            Add option
                          </Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {(item.options || []).map((opt, oi) => (
                            <div key={oi} className="flex items-center gap-2">
                              <Input
                                value={opt}
                                onChange={(e) => ncaeSetOption(idx, oi, e.target.value)}
                                className="rounded-2xl font-semibold"
                                placeholder={`Option ${String.fromCharCode(65 + oi)}`}
                              />
                              <Button
                                variant="outline"
                                size="icon"
                                className="rounded-2xl"
                                onClick={() => ncaeRemoveOption(idx, oi)}
                                disabled={(item.options || []).length <= 2}
                                title="Remove option"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>

                        <div className="text-xs text-muted-foreground font-semibold">
                          Saved as: <b>{`options[]`}</b> + <b>{`correct_index`}</b>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>
      ) : null}

      {mode === "RIASEC" ? (
        <section className="rounded-4xl bg-card border border-border shadow-sm overflow-hidden">
          <div className="p-6 sm:p-7 border-b border-border">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <h2 className="text-2xl font-black tracking-tight">RIASEC Items</h2>
                <p className="mt-2 text-muted-foreground font-semibold">
                  Saved as <b>{`{ version, scale_min, scale_max, likert_labels, items[] }`}</b>
                </p>
              </div>

              <Button className="rounded-2xl font-black" onClick={riasecAdd}>
                <Plus className="mr-2 h-4 w-4" />
                Add Item
              </Button>
            </div>
          </div>

          <div className="p-6 sm:p-7 space-y-4">
            {riasecItems.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground font-semibold">
                No items yet. Click <b>Add Item</b>.
              </div>
            ) : null}

            <div className="space-y-3">
              {riasecItems.map((it, idx) => {
                const code = safeStr(it.code).toUpperCase() || "R";
                const reverse = it.reverse === true;

                return (
                  <div
                    key={idx}
                    className="rounded-4xl border p-4 bg-muted/10 flex flex-col gap-3"
                  >
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="rounded-full border font-black">
                          #{idx + 1}
                        </Badge>

                        <Select value={code} onValueChange={(v) => riasecUpdateAt(idx, { code: v })}>
                          <SelectTrigger className="rounded-2xl font-semibold w-[150px]">
                            <SelectValue placeholder="Code" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="R">R (Realistic)</SelectItem>
                            <SelectItem value="I">I (Investigative)</SelectItem>
                            <SelectItem value="A">A (Artistic)</SelectItem>
                            <SelectItem value="S">S (Social)</SelectItem>
                            <SelectItem value="E">E (Enterprising)</SelectItem>
                            <SelectItem value="C">C (Conventional)</SelectItem>
                          </SelectContent>
                        </Select>

                        <label className="flex items-center gap-2 text-sm font-black ml-1">
                          <Checkbox
                            checked={reverse}
                            onCheckedChange={(v) => riasecUpdateAt(idx, { reverse: !!v })}
                          />
                          Reverse
                        </label>
                      </div>

                      <div className="flex flex-wrap gap-2 justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-2xl font-black"
                          onClick={() => riasecMove(idx, idx - 1)}
                          disabled={idx === 0}
                          title="Move up"
                        >
                          <ArrowUp className="h-4 w-4" />
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-2xl font-black"
                          onClick={() => riasecMove(idx, idx + 1)}
                          disabled={idx === riasecItems.length - 1}
                          title="Move down"
                        >
                          <ArrowDown className="h-4 w-4" />
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-2xl font-black"
                          onClick={() => riasecDuplicate(idx)}
                          title="Duplicate"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>

                        <Button
                          variant="destructive"
                          size="sm"
                          className="rounded-2xl font-black"
                          onClick={() => riasecRemove(idx)}
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="text-sm font-black">Text</div>
                      <Input
                        value={safeStr(it.text)}
                        onChange={(e) => riasecUpdateAt(idx, { text: e.target.value })}
                        className="rounded-2xl font-semibold"
                        placeholder="I enjoy fixing or building things with my hands."
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="text-xs text-muted-foreground font-semibold">
              Note: Items are re-numbered on save to keep IDs sequential.
            </div>
          </div>
        </section>
      ) : null}

      {/* ===== Sticky footer actions ===== */}
      <div className="sticky bottom-0 z-20">
        <div className="rounded-4xl border border-border bg-background/80 backdrop-blur shadow-sm p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="rounded-full border font-black">
              <ListChecks className="mr-2 h-4 w-4" />
              {totalCount} item{totalCount === 1 ? "" : "s"}
            </Badge>

            <AnimatePresence>
              {dirty ? (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                >
                  <Badge className="rounded-full font-black border-0 bg-amber-500/15 text-amber-700">
                    Unsaved changes
                  </Badge>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" className="rounded-2xl font-black" onClick={handleBack}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>

            <Button className="rounded-2xl font-black" onClick={handleSave} disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* small helper component: keyboard shortcut */
function KeySave({ onSave }) {
  useEffect(() => {
    const onKey = (e) => {
      const mac = navigator.platform.toUpperCase().includes("MAC");
      const mod = mac ? e.metaKey : e.ctrlKey;
      if (mod && e.key.toLowerCase() === "s") {
        e.preventDefault();
        onSave?.();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onSave]);

  return null;
}
