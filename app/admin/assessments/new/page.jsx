// @app/admin/assessments/new/page.jsx
"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Save, Plus, Sparkles, ListChecks } from "lucide-react";

import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import QuizQuestionCard from "@/components/quizzes/quiz-question-card";

import { saveQuiz, uploadQuizImage, uploadQuizFile } from "@/lib/quizzes";

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

const safeStr = (v) => String(v ?? "").trim();

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
    return { ...base, allow_multiple: false, choices: ["", ""], correct_answers: [] };
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
      likert_cols: ["Strongly disagree", "Disagree", "Neutral", "Agree", "Strongly agree"],
    };
  }
  return base;
}

const renumber = (arr) => arr.map((q, i) => ({ ...q, question_id: `q${i + 1}` }));

/* -------------------------- API helpers (track_id only) -------------------------- */

// ✅ unwrap arrays from API responses like {tracks: []} or {subjects: []}
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

/* -------------------------------- UI helpers -------------------------------- */

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

/* -------------------------------- Page -------------------------------- */

export default function NewAssessmentPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const { toast } = useToast();

  // IMPORTANT: ref for beforeunload, state for UI updates
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

  // Prefill from query string
  const preTitle = sp?.get("title") || "";

  // Meta state
  const [quizTitle, setQuizTitle] = useState(preTitle);
  const [quizDescription, setQuizDescription] = useState("");
  const [quizType, setQuizType] = useState("Career Interest");
  const [status, setStatus] = useState("Draft");

  const [quizLevel, setQuizLevel] = useState(""); // JHS | SHS
  const [quizTrack, setQuizTrack] = useState(""); // ✅ track_id only
  const [quizSubject, setQuizSubject] = useState(""); // ✅ subject_id only

  const [visibility, setVisibility] = useState("private");
  const [dueDate, setDueDate] = useState("");

  // Questions
  const [questions, setQuestions] = useState(() => [makeBlankQuestion("choice", 0)]);
  const [difficultyFilter, setDifficultyFilter] = useState("all");

  // Dropdown data
  const [allTracks, setAllTracks] = useState([]);
  const [allSubjects, setAllSubjects] = useState([]); // used for JHS / fallback
  const [subjectsForTrack, setSubjectsForTrack] = useState([]); // used for SHS
  const [subjectsLoading, setSubjectsLoading] = useState(false);

  // Busy
  const [saving, setSaving] = useState(false);

  // shadcn confirm dialog for unsaved changes
  const [confirmOpen, setConfirmOpen] = useState(false);
  const pendingNavRef = useRef(null);

  // initial loads
  useEffect(() => {
    fetchTracks().then((t) => setAllTracks(Array.isArray(t) ? t : []));
    fetchSubjectsAll().then((s) => setAllSubjects(Array.isArray(s) ? s : []));
  }, []);

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

  const requestNavigate = useCallback(
    (path) => {
      if (isDirtyRef.current) {
        pendingNavRef.current = path;
        setConfirmOpen(true);
        return;
      }
      router.push(path);
    },
    [router]
  );

  const handleBack = useCallback(() => {
    requestNavigate("/admin/assessments");
  }, [requestNavigate]);

  const confirmDiscardAndNavigate = useCallback(() => {
    const path = pendingNavRef.current || "/admin/assessments";
    pendingNavRef.current = null;
    setConfirmOpen(false);
    clearDirty();
    router.push(path);
  }, [router, clearDirty]);

  /* ------------------------------ Label maps ------------------------------ */

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

  // Map subject_id -> subject row so Select always shows correct subject name
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

  /* -------------------------- Subjects dependent fetch -------------------------- */

  useEffect(() => {
    let alive = true;

    async function loadSubjectsForTrack() {
      if (quizLevel !== "SHS" || !quizTrack) {
        if (alive) setSubjectsForTrack([]);
        return;
      }

      setSubjectsLoading(true);
      try {
        const byTrack = await fetchSubjectsByTrack(quizTrack);

        // fallback if API doesn't support filter yet
        let finalList = Array.isArray(byTrack) && byTrack.length ? byTrack : null;

        if (!finalList) {
          const all = await fetchSubjectsAll();
          if (!alive) return;
          setAllSubjects(Array.isArray(all) ? all : []);
          finalList = all.filter((s) => safeStr(s?.track_id) === safeStr(quizTrack));
        }

        if (!alive) return;

        // optional: enforce SHS level if your rows store it
        finalList = finalList.filter((s) => safeStr(s?.level) === "SHS" || !s?.level);

        setSubjectsForTrack(Array.isArray(finalList) ? finalList : []);
      } finally {
        if (alive) setSubjectsLoading(false);
      }
    }

    loadSubjectsForTrack();
    return () => {
      alive = false;
    };
  }, [quizLevel, quizTrack]);

  // reset subject when track changes (user-driven)
  useEffect(() => {
    if (!quizTrack) return;
    setQuizSubject("");
  }, [quizTrack]);

  // if level changes away from SHS, clear track + subject + track subjects
  useEffect(() => {
    if (quizLevel !== "SHS") {
      setQuizTrack("");
      setQuizSubject("");
      setSubjectsForTrack([]);
    }
  }, [quizLevel]);

  const subjectsForMeta = useMemo(() => {
    if (quizLevel === "SHS") return subjectsForTrack;

    // JHS: show subjects not tied to any track
    if (quizLevel === "JHS") {
      return allSubjects.filter((s) => !safeStr(s?.track_id));
    }

    return allSubjects;
  }, [allSubjects, quizLevel, subjectsForTrack]);

  // ✅ Ensure selected subject_id exists in list so Select shows subject_name
  const subjectsForMetaWithSelected = useMemo(() => {
    let list = Array.isArray(subjectsForMeta) ? subjectsForMeta : [];
    const sid = safeStr(quizSubject);

    if (sid && !list.some((s) => safeStr(s?.subject_id) === sid)) {
      const row = subjectIndex.get(sid);
      if (row) list = [row, ...list];
      else list = [{ subject_id: sid, subject_name: `Unknown subject (${sid})` }, ...list];
    }

    // de-dupe by subject_id
    const seen = new Set();
    return list.filter((s) => {
      const id = safeStr(s?.subject_id);
      if (!id || seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  }, [subjectsForMeta, quizSubject, subjectIndex]);

  /* -------------------- ✅ FIX: filtered view must preserve real index -------------------- */

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

  // Question mutators
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

  const handleReorder = (from, to) => moveQuestion(from, to);

  // Upload handlers
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

  // Save
  const handleSave = useCallback(async () => {
    if (!quizTitle.trim()) {
      toast({ title: "Missing Title", description: "Enter a title.", variant: "destructive" });
      return;
    }

    // ✅ SHS requires track_id
    if (quizLevel === "SHS" && !quizTrack) {
      toast({
        title: "Missing Track",
        description: "Select a track for SHS.",
        variant: "destructive",
      });
      return;
    }

    const nowIso = new Date().toISOString();

    const statusNormalized =
      safeStr(status).toLowerCase() === "published"
        ? "published"
        : safeStr(status).toLowerCase() === "archived"
        ? "archived"
        : "draft";

    const payload = {
      quiz_title: quizTitle.trim(),
      quiz_description: quizDescription,
      type: quizType,
      status: statusNormalized,

      // ✅ track_id only
      track_id: quizTrack || null,

      // ✅ store subject_id (UI displays subject_name)
      subject_id: quizSubject || null,
      school_level: quizLevel || null,

      visibility: visibility || "private",
      due_date: dueDate ? new Date(dueDate).toISOString() : null,

      questions: questions.map((q) => ({
        ...q,
        difficulty: normalizeDifficulty(q.difficulty),
        images: Array.isArray(q.images) ? q.images : [],
        files: Array.isArray(q.files) ? q.files : [],
      })),

      created_at: nowIso,
      updated_at: nowIso,
    };

    setSaving(true);
    try {
      await saveQuiz(payload);

      clearDirty();
      toast({ title: "Created", description: "Saved successfully." });

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
    router,
    toast,
    clearDirty,
  ]);

  // Keyboard shortcut: Ctrl/Cmd+S
  useEffect(() => {
    const onKey = (e) => {
      const mac = navigator.platform.toUpperCase().includes("MAC");
      const mod = mac ? e.metaKey : e.ctrlKey;
      if (mod && e.key.toLowerCase() === "s") {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleSave]);

  return (
    <div className="space-y-8">
      {/* Unsaved changes dialog */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-black">Discard changes?</AlertDialogTitle>
            <AlertDialogDescription className="font-semibold">
              You have unsaved changes. If you continue, they will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-2xl font-black">Stay</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-2xl font-black"
              onClick={confirmDiscardAndNavigate}
            >
              Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ===== HERO ===== */}
      <section className="relative overflow-hidden rounded-4xl border border-border bg-gradient-to-b from-background via-background to-background">
        {heroBg()}

        <div className="relative p-6 sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-black mb-5">
                <Sparkles className="h-4 w-4" />
                Admin • Create Assessment
              </div>

              <h1 className="text-4xl sm:text-5xl font-black tracking-tight leading-tight">
                New{" "}
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent bg-[length:200%] animate-gradient-x">
                  Assessment
                </span>
              </h1>

              <p className="mt-4 text-muted-foreground text-lg font-semibold leading-relaxed">
                Assessments are saved as Quizzes. Build metadata + questions, then save.
              </p>

              <div className="mt-6 flex flex-wrap gap-2">
                <Badge variant="secondary" className="rounded-full border font-black">
                  Ctrl/Cmd + S to save
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

      {/* ===== META ===== */}
      <section className="rounded-4xl bg-card border border-border shadow-sm overflow-hidden">
        <div className="p-6 sm:p-7 border-b border-border">
          <h2 className="text-2xl font-black tracking-tight">Assessment Details</h2>
          <p className="mt-2 text-muted-foreground font-semibold">
            Metadata used for filtering, reporting, and assignment.
          </p>
        </div>

        <div className="p-6 sm:p-7 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="space-y-2">
              <div className="text-sm font-black">Type</div>
              <Select
                value={quizType}
                onValueChange={(v) => {
                  setQuizType(v);
                  markDirty();
                }}
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
                  setStatus(v);
                  markDirty();
                }}
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
                  setVisibility(v);
                  markDirty();
                }}
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
                  setDueDate(e.target.value);
                  markDirty();
                }}
                className="rounded-2xl font-semibold"
              />
            </div>
          </div>

          {/* Level + Track + Subject */}
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
                  setQuizTitle(e.target.value);
                  markDirty();
                }}
                placeholder="Untitled assessment"
                className="rounded-2xl font-semibold"
              />
            </div>

            <div className="space-y-2">
              <div className="text-sm font-black">Description</div>
              <Textarea
                value={quizDescription}
                onChange={(e) => {
                  setQuizDescription(e.target.value);
                  markDirty();
                }}
                placeholder="Add a short description…"
                className="rounded-2xl font-semibold min-h-[90px]"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ===== QUESTIONS ===== */}
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
            {filteredQuestionEntries.map(({ q, i }) => (
              <QuizQuestionCard
                key={q.question_id || i}
                index={i}
                question={q}
                onChange={(next) => updateQuestionAt(i, next)}
                onRemove={() => removeQuestionAt(i)}
                onDuplicate={() => duplicateQuestionAt(i)}
                onMoveUp={() => moveQuestion(i, i - 1)}
                onMoveDown={() => moveQuestion(i, i + 1)}
                onReorder={handleReorder}
                onUploadImage={(file) => handleUploadImage(i, file)}
                onUploadFile={(file) => handleUploadFile(i, file)}
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

      {/* ===== Sticky footer actions ===== */}
      <div className="sticky bottom-0 z-20">
        <div className="rounded-4xl border border-border bg-background/80 backdrop-blur shadow-sm p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="rounded-full border font-black">
              <ListChecks className="mr-2 h-4 w-4" />
              {questions.length} question{questions.length === 1 ? "" : "s"}
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
