// @/app/admin/assessments/[id]/edit/page.jsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Save, Plus, Sparkles, ListChecks } from "lucide-react";

import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

import { Card } from "@/components/ui/card";
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

import QuizQuestionCard from "@/components/quizzes/quiz-question-card";
import { fetchQuizzes, saveQuiz, uploadQuizImage, uploadQuizFile } from "@/lib/quizzes";

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

// ✅ NEW: tracks instead of strands
async function fetchTracks() {
  try {
    const r = await fetch("/api/tracks", { cache: "no-store" });
    if (!r.ok) return [];
    const data = await r.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

async function fetchSubjects() {
  try {
    const r = await fetch("/api/subjects", { cache: "no-store" });
    if (!r.ok) return [];
    const data = await r.json();
    // handle either raw array or {subjects:[...]}
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.subjects)) return data.subjects;
    return [];
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

/* -------------------------------- Page -------------------------------- */

export default function EditAssessmentPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();

  const quizIdParam = safeStr(params?.id);
  const isDirty = useRef(false);
  const markDirty = () => (isDirty.current = true);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Meta state
  const [quizTitle, setQuizTitle] = useState("");
  const [quizDescription, setQuizDescription] = useState("");
  const [quizType, setQuizType] = useState("Career Interest");
  const [status, setStatus] = useState("Draft");

  const [quizLevel, setQuizLevel] = useState(""); // JHS | SHS

  // ✅ NEW: track_id instead of strand
  const [quizTrackId, setQuizTrackId] = useState("");

  // ✅ NEW: course_id (optional)
  const [quizCourseId, setQuizCourseId] = useState("");

  const [quizSubject, setQuizSubject] = useState("");

  const [visibility, setVisibility] = useState("private");
  const [dueDate, setDueDate] = useState("");

  // Questions
  const [questions, setQuestions] = useState(() => [makeBlankQuestion("choice", 0)]);
  const [difficultyFilter, setDifficultyFilter] = useState("all");

  // Dropdown data
  const [allTracks, setAllTracks] = useState([]);
  const [allSubjects, setAllSubjects] = useState([]);

  // Load tracks/subjects
  useEffect(() => {
    fetchTracks().then(setAllTracks);
    fetchSubjects().then((s) => setAllSubjects(Array.isArray(s) ? s : []));
  }, []);

  // Load quiz
  useEffect(() => {
    let alive = true;

    async function load() {
      if (!quizIdParam) {
        setLoading(false);
        toast({
          title: "Missing ID",
          description: "No quiz id in URL.",
          variant: "destructive",
        });
        return;
      }

      setLoading(true);
      try {
        const list = await fetchQuizzes({ search: quizIdParam, limit: 200 });

        const arr = Array.isArray(list)
          ? list
          : Array.isArray(list?.quizzes)
          ? list.quizzes
          : [];

        const found =
          arr.find((q) => getQuizId(q) === quizIdParam) ||
          arr.find((q) => safeStr(q?.storage_path).includes(quizIdParam)) ||
          arr[0];

        if (!found) throw new Error("Quiz not found.");
        if (!alive) return;

        setQuizTitle(safeStr(found.quiz_title || found.title || ""));
        setQuizDescription(safeStr(found.quiz_description || found.description || ""));
        setQuizType(safeStr(found.type) || "Career Interest");

        const st = safeStr(found.status);
        setStatus(st ? st[0].toUpperCase() + st.slice(1) : "Draft");

        // ✅ track_id (fallback to legacy strand_id if old data exists)
        setQuizTrackId(safeStr(found.track_id ?? found.tracks_id ?? found.strand_id) || "");

        // ✅ course_id optional
        setQuizCourseId(safeStr(found.course_id) || "");

        setQuizSubject(safeStr(found.subject_id) || "");
        setQuizLevel(safeStr(found.school_level) || "");

        setVisibility(safeStr(found.visibility) || "private");

        const dd = found.due_date ? new Date(found.due_date) : null;
        if (dd && !Number.isNaN(dd.getTime())) {
          const pad = (n) => String(n).padStart(2, "0");
          const local = `${dd.getFullYear()}-${pad(dd.getMonth() + 1)}-${pad(dd.getDate())}T${pad(dd.getHours())}:${pad(dd.getMinutes())}`;
          setDueDate(local);
        } else {
          setDueDate("");
        }

        const qs = Array.isArray(found.questions) ? found.questions : [];
        setQuestions(
          qs.length
            ? renumber(qs.map((q) => ({ ...q, difficulty: normalizeDifficulty(q.difficulty) })))
            : [makeBlankQuestion("choice", 0)]
        );

        isDirty.current = false;
      } catch (e) {
        toast({
          title: "Load failed",
          description: e?.message || "Could not load quiz.",
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
  }, [quizIdParam, toast]);

  // Warn on browser close
  useEffect(() => {
    const beforeUnload = (e) => {
      if (!isDirty.current) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, []);

  const handleBack = useCallback(async () => {
    if (isDirty.current) {
      toast({
        title: "Unsaved changes",
        description: "Please save first (or refresh to discard).",
        variant: "destructive",
      });
      return;
    }
    router.push("/admin/assessments");
  }, [router, toast]);

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
    const media = await uploadQuizImage(file);
    setQuestions((prev) => {
      const arr = [...prev];
      const q = { ...arr[idx] };
      q.images = [...(q.images || []), media];
      arr[idx] = q;
      return arr;
    });
    markDirty();
  };

  const handleUploadFile = async (idx, file) => {
    const media = await uploadQuizFile(file);
    setQuestions((prev) => {
      const arr = [...prev];
      const q = { ...arr[idx] };
      q.files = [...(q.files || []), media];
      arr[idx] = q;
      return arr;
    });
    markDirty();
  };

  // ✅ Subject filtering updated:
  // - SHS: show only subjects under selected track_id
  // - JHS: show subjects with level == JHS OR no track_id (general)
  const subjectsForMeta = useMemo(() => {
    if (quizLevel === "SHS") {
      return allSubjects.filter((s) => safeStr(s?.track_id) === safeStr(quizTrackId));
    }
    if (quizLevel === "JHS") {
      return allSubjects.filter((s) => safeStr(s?.level) === "JHS" || !safeStr(s?.track_id));
    }
    return allSubjects;
  }, [allSubjects, quizLevel, quizTrackId]);

  const filteredQuestions = useMemo(() => {
    if (difficultyFilter === "all") return questions;
    return questions.filter((q) => normalizeDifficulty(q.difficulty) === difficultyFilter);
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

  const handleSave = useCallback(async () => {
    if (!quizTitle.trim()) {
      toast({ title: "Missing Title", description: "Enter a title.", variant: "destructive" });
      return;
    }

    // ✅ now track is required for SHS (since it replaces strand)
    if (quizLevel === "SHS" && !quizTrackId) {
      toast({
        title: "Missing Track",
        description: "Select a track for SHS.",
        variant: "destructive",
      });
      return;
    }

    const nowIso = new Date().toISOString();

    const payload = {
      quiz_id: quizIdParam,
      id: quizIdParam,

      quiz_title: quizTitle.trim(),
      quiz_description: quizDescription,
      type: quizType,
      status:
        status?.toLowerCase?.() === "published"
          ? "published"
          : status?.toLowerCase?.() === "archived"
          ? "archived"
          : "draft",

      // ✅ UPDATED
      track_id: quizTrackId || null,

      // ✅ NEW (optional)
      course_id: quizCourseId?.trim() ? quizCourseId.trim() : null,

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

      updated_at: nowIso,
    };

    setSaving(true);
    try {
      await saveQuiz(payload);
      isDirty.current = false;
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
    quizIdParam,
    quizTitle,
    quizDescription,
    quizType,
    status,
    quizLevel,
    quizTrackId,
    quizCourseId,
    quizSubject,
    visibility,
    dueDate,
    questions,
    router,
    toast,
  ]);

  if (loading) {
    return (
      <div className="p-8">
        <Card className="rounded-4xl p-8 text-center text-muted-foreground font-semibold">
          Loading assessment…
        </Card>
      </div>
    );
  }

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
                Admin • Edit Assessment
              </div>

              <h1 className="text-4xl sm:text-5xl font-black tracking-tight leading-tight">
                Edit{" "}
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent bg-[length:200%] animate-gradient-x">
                  Assessment
                </span>
              </h1>

              <p className="mt-4 text-muted-foreground text-lg font-semibold leading-relaxed">
                Editing quiz: <span className="font-black text-foreground">{quizIdParam}</span>
              </p>

              <div className="mt-6 flex flex-wrap gap-2">
                <Badge variant="secondary" className="rounded-full border font-black">
                  Ctrl/Cmd + S to save
                </Badge>

                <AnimatePresence>
                  {isDirty.current ? (
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

      {/* Ctrl/Cmd+S */}
      <KeySave onSave={handleSave} />

      {/* ===== META ===== */}
      <section className="rounded-4xl bg-card border border-border shadow-sm overflow-hidden">
        <div className="p-6 sm:p-7 border-b border-border">
          <h2 className="text-2xl font-black tracking-tight">Assessment Details</h2>
          <p className="mt-2 text-muted-foreground font-semibold">
            Update metadata and questions, then save.
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

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="space-y-2">
              <div className="text-sm font-black">School Level</div>
              <Select
                value={quizLevel || "NONE"}
                onValueChange={(v) => {
                  const next = v === "NONE" ? "" : v;
                  setQuizLevel(next);
                  if (next !== "SHS") setQuizTrackId("");
                  setQuizSubject("");
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

            {/* ✅ Track (SHS) */}
            <div className="space-y-2">
              <div className="text-sm font-black">Track (SHS)</div>
              <Select
                value={quizTrackId || "NONE"}
                onValueChange={(v) => {
                  const next = v === "NONE" ? "" : v;
                  setQuizTrackId(next);
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
                    const id = safeStr(t?.track_id);
                    if (!id) return null;
                    const label = t?.track_name ? `${id} — ${t.track_name}` : id;
                    return (
                      <SelectItem key={id} value={id}>
                        {label}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* ✅ NEW: course_id optional */}
            <div className="space-y-2">
              <div className="text-sm font-black">Course ID (optional)</div>
              <Input
                value={quizCourseId}
                onChange={(e) => {
                  setQuizCourseId(e.target.value);
                  markDirty();
                }}
                placeholder="e.g. BSIT-1A"
                className="rounded-2xl font-semibold"
              />
            </div>

            <div className="space-y-2">
              <div className="text-sm font-black">Subject (optional)</div>
              <Select
                value={quizSubject || "NONE"}
                onValueChange={(v) => {
                  setQuizSubject(v === "NONE" ? "" : v);
                  markDirty();
                }}
              >
                <SelectTrigger className="rounded-2xl font-semibold">
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">—</SelectItem>
                  {subjectsForMeta.map((s) => (
                    <SelectItem key={s.subject_id} value={s.subject_id}>
                      {s.subject_name || s.subject_id}
                    </SelectItem>
                  ))}
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
            {filteredQuestions.map((q, idx) => (
              <QuizQuestionCard
                key={q.question_id || idx}
                index={idx}
                question={q}
                onChange={(next) => updateQuestionAt(idx, next)}
                onRemove={() => removeQuestionAt(idx)}
                onDuplicate={() => duplicateQuestionAt(idx)}
                onMoveUp={() => moveQuestion(idx, idx - 1)}
                onMoveDown={() => moveQuestion(idx, idx + 1)}
                onReorder={handleReorder}
                onUploadImage={(file) => handleUploadImage(idx, file)}
                onUploadFile={(file) => handleUploadFile(idx, file)}
              />
            ))}

            {filteredQuestions.length === 0 ? (
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
              {isDirty.current ? (
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