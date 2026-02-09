// // app/admin/assessments/view/[id]/page.jsx
// "use client";

// import { useCallback, useEffect, useMemo, useState } from "react";
// import Link from "next/link";
// import { useRouter, useParams } from "next/navigation";
// import {
//   ArrowLeft,
//   ClipboardList,
//   Users,
//   CheckCircle2,
//   BarChart3,
//   Search,
//   Eye,
//   EyeOff,
//   Calculator,
//   Hash,
//   ArrowUpRight,
//   CornerUpLeft,
// } from "lucide-react";

// import { cn } from "@/lib/utils";
// import { getQuiz } from "@/lib/quizzes"; // ✅ GET /api/quizzes/[id]

// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Badge } from "@/components/ui/badge";
// import {
//   Dialog,
//   DialogContent,
//   DialogHeader,
//   DialogTitle,
//   DialogDescription,
//   DialogFooter,
// } from "@/components/ui/dialog";
// import { Separator } from "@/components/ui/separator";
// import { ScrollArea } from "@/components/ui/scroll-area";
// import { Checkbox } from "@/components/ui/checkbox";

// /* -------------------------- helpers -------------------------- */

// const toStr = (v) => String(v ?? "").trim();

// function getPoints(q) {
//   const candidates = [q?.points, q?.point, q?.score, q?.max_points, q?.max];
//   for (const v of candidates) {
//     const n = Number(v);
//     if (Number.isFinite(n) && n > 0) return n;
//   }
//   return 1;
// }

// function calcMaxScore(quiz) {
//   if (!quiz?.questions) return 0;
//   return quiz.questions.reduce((sum, q) => sum + getPoints(q), 0);
// }

// function letterToIndex(s) {
//   if (typeof s !== "string" || !s.trim()) return null;
//   const ch = s.trim().toUpperCase();
//   const code = ch.charCodeAt(0);
//   return code >= 65 && code <= 90 ? code - 65 : null; // A->0
// }

// function parseIndexList(val) {
//   if (Array.isArray(val)) {
//     const out = [];
//     for (const v of val) {
//       if (typeof v === "number" && Number.isInteger(v)) out.push(v);
//       else if (typeof v === "string") {
//         const li = letterToIndex(v);
//         if (li != null) out.push(li);
//         else {
//           const n = Number(v);
//           if (Number.isInteger(n)) out.push(n);
//         }
//       }
//     }
//     return Array.from(new Set(out));
//   }
//   if (typeof val === "number" && Number.isInteger(val)) return [val];
//   if (typeof val === "string" && val.trim()) {
//     const parts = val.split(/[,\s]+/).filter(Boolean);
//     const out = [];
//     for (const p of parts) {
//       const li = letterToIndex(p);
//       if (li != null) out.push(li);
//       else {
//         const n = Number(p);
//         if (Number.isInteger(n)) out.push(n);
//       }
//     }
//     return Array.from(new Set(out));
//   }
//   return [];
// }

// function getCorrectIndices(q) {
//   const tryFields = [
//     q?.correct_answers,
//     q?.correct_answer,
//     q?.correct,
//     q?.answer_indices,
//     q?.answer_index,
//     q?.answer,
//     q?.answer_key,
//   ];
//   for (const f of tryFields) {
//     const parsed = parseIndexList(f);
//     if (parsed.length) return parsed;
//   }
//   if (Array.isArray(q?.choices)) {
//     const idxs = [];
//     q.choices.forEach((opt, i) => {
//       if (opt && (opt.isCorrect === true || opt.correct === true)) idxs.push(i);
//     });
//     if (idxs.length) return idxs;
//   }
//   return [];
// }

// function getExpectedTextList(q) {
//   const pool = [];

//   const singles = [
//     q?.answer_text,
//     q?.correct_text,
//     q?.expected,
//     q?.expected_answer,
//     q?.expected_text,
//   ].filter((x) => typeof x === "string" && x.trim().length);

//   if (singles.length) pool.push(singles[0]);

//   if (Array.isArray(q?.choices)) {
//     q.choices.forEach((c) => {
//       if (typeof c === "string" && c.trim().length) pool.push(c);
//     });
//   }

//   const seen = new Set();
//   const out = [];
//   for (const s of pool) {
//     const t = String(s).trim();
//     if (t && !seen.has(t)) {
//       seen.add(t);
//       out.push(t);
//     }
//   }
//   return out;
// }

// function AttachmentBlock({ images = [], files = [] }) {
//   const hasImgs = Array.isArray(images) && images.length > 0;
//   const hasFiles = Array.isArray(files) && files.length > 0;
//   if (!hasImgs && !hasFiles) return null;

//   return (
//     <div className="mt-3 space-y-3">
//       {hasImgs && (
//         <div className="space-y-2">
//           <div className="text-xs text-muted-foreground flex items-center gap-2">
//             <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-indigo-50 text-indigo-700">
//               🖼️
//             </span>
//             Images
//           </div>
//           <div className="flex flex-wrap gap-2">
//             {images.map((img, i) => {
//               const src = img?.public_url || img?.url || img?.path;
//               return (
//                 <a
//                   key={i}
//                   href={src || "#"}
//                   target="_blank"
//                   rel="noreferrer"
//                   className={cn(
//                     "block h-20 w-28 overflow-hidden rounded-lg border bg-muted",
//                     src ? "hover:ring-2 hover:ring-primary/30" : "pointer-events-none opacity-70"
//                   )}
//                   title={img?.name || "image"}
//                 >
//                   {src ? (
//                     // eslint-disable-next-line @next/next/no-img-element
//                     <img
//                       src={src}
//                       alt={img?.name || `image-${i}`}
//                       className="h-full w-full object-cover"
//                       onError={(e) => {
//                         e.currentTarget.style.display = "none";
//                       }}
//                     />
//                   ) : (
//                     <div className="flex h-full w-full items-center justify-center text-[10px] text-muted-foreground">
//                       (no preview)
//                     </div>
//                   )}
//                 </a>
//               );
//             })}
//           </div>
//         </div>
//       )}

//       {hasFiles && (
//         <div className="space-y-2">
//           <div className="text-xs text-muted-foreground flex items-center gap-2">
//             <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-slate-50 text-slate-700">
//               📎
//             </span>
//             Files
//           </div>
//           <ul className="space-y-2">
//             {files.map((f, i) => {
//               const href = f?.public_url || f?.url;
//               const label = f?.name || f?.path || `file-${i}`;
//               const meta = [f?.mime, f?.size ? `${Math.round((f.size / 1024) * 10) / 10} KB` : null]
//                 .filter(Boolean)
//                 .join(" • ");
//               return (
//                 <li key={i}>
//                   {href ? (
//                     <a
//                       href={href}
//                       target="_blank"
//                       rel="noreferrer"
//                       className="inline-flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm hover:bg-muted"
//                       title={label}
//                     >
//                       <span>📎</span>
//                       <span className="max-w-[280px] truncate">{label}</span>
//                       {meta ? <span className="text-xs text-muted-foreground">{meta}</span> : null}
//                     </a>
//                   ) : (
//                     <span className="inline-flex items-center gap-2 rounded-md border bg-muted px-3 py-2 text-sm">
//                       <span>📎</span>
//                       <span className="max-w-[280px] truncate">{label}</span>
//                       {meta ? <span className="text-xs text-muted-foreground">{meta}</span> : null}
//                     </span>
//                   )}
//                 </li>
//               );
//             })}
//           </ul>
//         </div>
//       )}
//     </div>
//   );
// }

// /* -------------------------------- page -------------------------------- */

// export default function AssessmentViewPage() {
//   const router = useRouter();
//   const params = useParams();

//   // ✅ /admin/assessments/view/<id>
//   const quizId = toStr(params?.id);

//   // Access control (client-only due to localStorage)
//   const currentUser = useMemo(() => {
//     try {
//       return JSON.parse(localStorage.getItem("currentUser") || "{}");
//     } catch {
//       return {};
//     }
//   }, []);
//   const adminLevel = currentUser?.admin_level || "";
//   const adminRole = String(currentUser?.admin_role || "").toLowerCase();
//   const adminAccess = currentUser?.admin_access || {};
//   const isSuperAdmin = adminLevel === "Super Admin";
//   const isFaculty = adminRole === "faculty";
//   const canEditQuiz = isSuperAdmin || (isFaculty && adminAccess?.quizzes_edit === true);

//   const [quiz, setQuiz] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState("");

//   const [activeTab, setActiveTab] = useState("quiz"); // quiz | submissions

//   const [q, setQ] = useState("");
//   const [debQ, setDebQ] = useState("");

//   const [previewOpen, setPreviewOpen] = useState(false);

//   useEffect(() => {
//     const t = setTimeout(() => setDebQ(q.trim().toLowerCase()), 250);
//     return () => clearTimeout(t);
//   }, [q]);

//   useEffect(() => {
//     (async () => {
//       setLoading(true);
//       setError("");
//       try {
//         if (!quizId) throw new Error("Missing assessment id in URL.");
//         const qz = await getQuiz(quizId);
//         setQuiz(qz);
//       } catch (e) {
//         console.error(e);
//         setError(e?.message || "Failed to load assessment.");
//       } finally {
//         setLoading(false);
//       }
//     })();
//   }, [quizId]);

//   const maxScore = useMemo(() => calcMaxScore(quiz), [quiz]);
//   const visibility = useMemo(() => {
//     return String(quiz?.visibility || "").toLowerCase() === "public" ? "public" : "private";
//   }, [quiz]);

//   // ✅ Requirement: Link to submissions page
//   // <Link href={canNavigate ? `/admin/assessments/${hrefId}` : "#"}>View Submissions</Link>
//   const hrefId = quiz?.quiz_id || quizId;
//   const canNavigate = !!toStr(hrefId);

//   const onKeyDown = useCallback((e) => {
//     if (e.key === "Escape") setPreviewOpen(false);
//   }, []);
//   useEffect(() => {
//     if (previewOpen) window.addEventListener("keydown", onKeyDown);
//     return () => window.removeEventListener("keydown", onKeyDown);
//   }, [previewOpen, onKeyDown]);

//   return (
//     <div className="min-h-screen bg-muted/30">
//       <div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-6 md:py-8">
//         {/* Top bar */}
//         <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
//           <div className="flex items-center gap-3">
//             <Button variant="ghost" className="gap-2" onClick={() => router.back()}>
//               <ArrowLeft className="h-4 w-4" />
//               Back
//             </Button>

//             <div className="min-w-0">
//               <div className="text-sm text-muted-foreground">Assessment</div>
//               <h1 className="truncate text-xl font-semibold">
//                 {loading ? "Loading…" : quiz?.quiz_title || "Untitled Assessment"}
//               </h1>
//             </div>
//           </div>

//           <div className="flex flex-wrap items-center gap-2">
//             {/* ✅ required link */}
//             <Link href={canNavigate ? `/admin/assessments/${hrefId}` : "#"} aria-disabled={!canNavigate}>
//               <Button variant="secondary" className="gap-2" disabled={!canNavigate}>
//                 <ClipboardList className="h-4 w-4" />
//                 View Submissions
//               </Button>
//             </Link>

//             {canEditQuiz ? (
//               <Link href={canNavigate ? `/admin/quizzes/${hrefId}/edit` : "#"}>
//                 <Button disabled={!canNavigate}>Edit Assessment</Button>
//               </Link>
//             ) : null}

//             <Button variant="outline" onClick={() => setPreviewOpen(true)} disabled={!quiz} className="gap-2">
//               Preview
//             </Button>
//           </div>
//         </div>

//         {/* Tabs */}
//         <div className="mb-6 flex gap-2">
//           <Button
//             variant={activeTab === "quiz" ? "default" : "secondary"}
//             className="gap-2"
//             onClick={() => setActiveTab("quiz")}
//           >
//             <Hash className="h-4 w-4" />
//             Quiz
//           </Button>
//           <Button
//             variant={activeTab === "submissions" ? "default" : "secondary"}
//             className="gap-2"
//             onClick={() => setActiveTab("submissions")}
//           >
//             <Users className="h-4 w-4" />
//             Submissions
//           </Button>
//         </div>

//         {/* Content */}
//         {activeTab === "quiz" ? (
//           <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
//             {/* Meta */}
//             <Card className="xl:col-span-2">
//               <CardHeader>
//                 <CardTitle>Assessment Details</CardTitle>
//                 <CardDescription>Loaded via @/lib/quizzes.js → /api/quizzes/[id].</CardDescription>
//               </CardHeader>
//               <CardContent>
//                 {loading ? (
//                   <div className="space-y-3">
//                     <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
//                     <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
//                     <div className="h-24 w-full animate-pulse rounded bg-muted" />
//                   </div>
//                 ) : error ? (
//                   <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-destructive">
//                     {error}
//                   </div>
//                 ) : (
//                   <>
//                     {quiz?.quiz_description ? (
//                       <p className="mb-4 text-sm leading-relaxed text-foreground">{quiz.quiz_description}</p>
//                     ) : (
//                       <p className="mb-4 text-sm text-muted-foreground">(No description)</p>
//                     )}

//                     <div className="flex flex-wrap gap-2">
//                       <span
//                         className={cn(
//                           "inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs",
//                           visibility === "public"
//                             ? "bg-emerald-50 text-emerald-700"
//                             : "bg-muted text-muted-foreground"
//                         )}
//                       >
//                         {visibility === "public" ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
//                         {visibility}
//                       </span>

//                       {quiz?.status ? (
//                         <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-xs text-amber-700 capitalize">
//                           <Hash className="h-3.5 w-3.5" />
//                           {quiz.status}
//                         </span>
//                       ) : null}

//                       {quiz?.created_at ? (
//                         <Badge variant="outline">Created {new Date(quiz.created_at).toLocaleDateString()}</Badge>
//                       ) : null}
//                       {quiz?.updated_at ? (
//                         <Badge variant="outline">Updated {new Date(quiz.updated_at).toLocaleDateString()}</Badge>
//                       ) : null}

//                       {quiz?.track_id ? <Badge variant="secondary">track_id: {quiz.track_id}</Badge> : null}
//                       {quiz?.subject_id ? <Badge variant="secondary">subject_id: {quiz.subject_id}</Badge> : null}
//                       {quiz?.course_id ? <Badge variant="secondary">course_id: {quiz.course_id}</Badge> : null}
//                     </div>

//                     <Separator className="my-5" />

//                     <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
//                       <Card className="border-dashed">
//                         <CardHeader className="pb-2">
//                           <CardTitle className="flex items-center gap-2 text-base">
//                             <Users className="h-4 w-4 text-primary" /> Submissions
//                           </CardTitle>
//                         </CardHeader>
//                         <CardContent className="text-2xl font-semibold">—</CardContent>
//                       </Card>

//                       <Card className="border-dashed">
//                         <CardHeader className="pb-2">
//                           <CardTitle className="flex items-center gap-2 text-base">
//                             <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Max Score
//                           </CardTitle>
//                         </CardHeader>
//                         <CardContent className="text-2xl font-semibold">{maxScore}</CardContent>
//                       </Card>

//                       <Card className="border-dashed">
//                         <CardHeader className="pb-2">
//                           <CardTitle className="flex items-center gap-2 text-base">
//                             <BarChart3 className="h-4 w-4 text-amber-600" /> Avg Score
//                           </CardTitle>
//                         </CardHeader>
//                         <CardContent className="text-2xl font-semibold">—</CardContent>
//                       </Card>
//                     </div>
//                   </>
//                 )}
//               </CardContent>
//             </Card>

//             {/* Answer key nav */}
//             <Card>
//               <CardHeader>
//                 <CardTitle>Answer Key</CardTitle>
//                 <CardDescription>Jump to any question.</CardDescription>
//               </CardHeader>
//               <CardContent>
//                 {!quiz?.questions?.length ? (
//                   <div className="text-sm text-muted-foreground">No questions.</div>
//                 ) : (
//                   <div className="space-y-2">
//                     {quiz.questions.map((qq, idx) => (
//                       <a
//                         key={qq.question_id || idx}
//                         href={`#q-${idx + 1}`}
//                         className="flex items-center justify-between rounded-lg border bg-background px-3 py-2 text-sm hover:bg-muted"
//                       >
//                         <span className="truncate">
//                           {idx + 1}. {qq.question_text || "(Untitled)"}
//                         </span>
//                         <span className="ml-3 shrink-0 text-xs text-muted-foreground">{getPoints(qq)} pt</span>
//                       </a>
//                     ))}
//                   </div>
//                 )}
//               </CardContent>
//             </Card>

//             {/* Full answer key */}
//             <div className="xl:col-span-3">
//               <Card>
//                 <CardHeader>
//                   <CardTitle>Answer Key</CardTitle>
//                   <CardDescription>Correct answers are highlighted. Attachments included.</CardDescription>
//                 </CardHeader>
//                 <CardContent>
//                   {!quiz?.questions?.length ? (
//                     <div className="text-sm text-muted-foreground">No questions.</div>
//                   ) : (
//                     <div className="space-y-4">
//                       {quiz.questions.map((qq, i) => {
//                         const pts = getPoints(qq);
//                         const enableMath = !!qq.enable_math;
//                         const allowMultiple = qq.question_type === "choice" ? !!qq.allow_multiple : false;
//                         const anyCase = qq.question_type === "text" ? !!qq.text_any_case : false;

//                         return (
//                           <div
//                             key={qq.question_id || i}
//                             id={`q-${i + 1}`}
//                             className="rounded-xl border bg-background p-4"
//                           >
//                             <div className="mb-2 flex items-start justify-between gap-3">
//                               <div className="flex items-start gap-3">
//                                 <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
//                                   {i + 1}
//                                 </div>
//                                 <div>
//                                   <div className="font-medium">{qq.question_text || "(Untitled Question)"}</div>

//                                   <div className="mt-1 flex flex-wrap gap-2">
//                                     <Badge variant="secondary" className="capitalize">
//                                       {qq.question_type || "unknown"}
//                                     </Badge>

//                                     <Badge variant={enableMath ? "default" : "outline"} className="gap-1">
//                                       <Calculator className="h-3.5 w-3.5" />
//                                       Math {enableMath ? "on" : "off"}
//                                     </Badge>

//                                     {qq.question_type === "choice" ? (
//                                       <Badge variant={allowMultiple ? "default" : "outline"}>
//                                         {allowMultiple ? "Multiple answers" : "Single answer"}
//                                       </Badge>
//                                     ) : null}

//                                     {qq.question_type === "text" ? (
//                                       <Badge variant={anyCase ? "default" : "outline"}>
//                                         Any case {anyCase ? "✓" : "✗"}
//                                       </Badge>
//                                     ) : null}

//                                     {qq.difficulty ? (
//                                       <Badge variant="outline" className="capitalize">
//                                         {qq.difficulty}
//                                       </Badge>
//                                     ) : null}
//                                   </div>
//                                 </div>
//                               </div>

//                               <div className="text-xs text-muted-foreground">
//                                 {pts} pt{pts > 1 ? "s" : ""}
//                               </div>
//                             </div>

//                             {qq.question_type === "choice" ? (
//                               <ul className="space-y-2">
//                                 {(qq.choices || []).map((opt, idx) => {
//                                   const isCorrect = getCorrectIndices(qq).includes(idx);
//                                   return (
//                                     <li
//                                       key={idx}
//                                       className={cn(
//                                         "flex items-center gap-2 rounded-lg border px-3 py-2",
//                                         isCorrect
//                                           ? "border-emerald-200 bg-emerald-50 text-emerald-800"
//                                           : "border-muted bg-muted/40"
//                                       )}
//                                     >
//                                       <span className="text-sm">{isCorrect ? "✅" : "⬜"}</span>
//                                       <span className="text-sm">
//                                         {opt || <i className="text-muted-foreground">Empty option</i>}
//                                       </span>
//                                     </li>
//                                   );
//                                 })}
//                               </ul>
//                             ) : qq.question_type === "text" ? (
//                               <div className="space-y-2">
//                                 <div className="text-xs text-muted-foreground">Acceptable Answers</div>
//                                 <div className="rounded-lg border bg-muted/40 p-3 text-sm">
//                                   {getExpectedTextList(qq).length ? (
//                                     <div className="space-y-1">
//                                       {getExpectedTextList(qq).map((t, k) => (
//                                         <div key={k}>{t}</div>
//                                       ))}
//                                     </div>
//                                   ) : (
//                                     <i className="text-muted-foreground">(none)</i>
//                                   )}
//                                 </div>
//                               </div>
//                             ) : qq.question_type === "rating" ? (
//                               <div className="text-sm">
//                                 Rating scale: <b>1</b> – <b>{qq.rating_max || 5}</b>
//                               </div>
//                             ) : qq.question_type === "likert" ? (
//                               <div className="text-sm">
//                                 <div>Rows: {(qq.likert_rows || []).join(", ") || "—"}</div>
//                                 <div>Columns: {(qq.likert_cols || []).join(", ") || "—"}</div>
//                               </div>
//                             ) : (
//                               <div className="text-sm text-muted-foreground">Unsupported question type.</div>
//                             )}

//                             <AttachmentBlock images={qq.images} files={qq.files} />
//                           </div>
//                         );
//                       })}
//                     </div>
//                   )}
//                 </CardContent>
//               </Card>
//             </div>
//           </div>
//         ) : (
//           /* Submissions tab */
//           <Card>
//             <CardHeader>
//               <CardTitle className="flex items-center gap-2">
//                 <Users className="h-5 w-5 text-primary" />
//                 Submissions
//               </CardTitle>
//               <CardDescription>
//                 This view page is for the assessment + answer key. For grading/submissions, open the submissions route.
//               </CardDescription>
//             </CardHeader>
//             <CardContent>
//               <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
//                 <div className="relative w-full max-w-md">
//                   <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
//                   <Input
//                     value={q}
//                     onChange={(e) => setQ(e.target.value)}
//                     placeholder="Search student (placeholder)"
//                     className="pl-9"
//                   />
//                 </div>

//                 <Link href={canNavigate ? `/admin/assessments/${hrefId}` : "#"}>
//                   <Button className="gap-2" disabled={!canNavigate}>
//                     <ArrowUpRight className="h-4 w-4" />
//                     Open Submissions Page
//                   </Button>
//                 </Link>
//               </div>

//               <Separator className="my-6" />

//               <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
//                 Submissions/grading UI should live in <span className="font-medium">/admin/assessments/[id]</span>.
//                 <br />
//                 Filter text here: {debQ ? <b>"{debQ}"</b> : "—"}
//               </div>
//             </CardContent>
//           </Card>
//         )}

//         {/* Preview dialog */}
//         <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
//           <DialogContent className="max-w-4xl">
//             <DialogHeader>
//               <DialogTitle>Preview</DialogTitle>
//               <DialogDescription>Read-only preview.</DialogDescription>
//             </DialogHeader>

//             <ScrollArea className="max-h-[70vh] pr-4">
//               {!quiz?.questions?.length ? (
//                 <div className="text-sm text-muted-foreground">No questions.</div>
//               ) : (
//                 <div className="space-y-4">
//                   {quiz.questions.map((qq, i) => {
//                     const pts = getPoints(qq);
//                     const correctIdx = getCorrectIndices(qq);

//                     return (
//                       <div key={qq.question_id || i} className="rounded-xl border p-4">
//                         <div className="mb-2 flex items-start justify-between">
//                           <div className="flex items-center gap-3">
//                             <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
//                               {i + 1}
//                             </div>
//                             <div className="font-medium">{qq.question_text || "(Untitled)"}</div>
//                           </div>
//                           <div className="text-xs text-muted-foreground">
//                             {pts} pt{pts > 1 ? "s" : ""}
//                           </div>
//                         </div>

//                         {qq.question_type === "choice" ? (
//                           <ul className="space-y-2">
//                             {(qq.choices || []).map((opt, idx) => {
//                               const isCorrect = correctIdx.includes(idx);
//                               return (
//                                 <li
//                                   key={idx}
//                                   className={cn(
//                                     "flex items-center gap-2 rounded-lg border px-3 py-2",
//                                     isCorrect ? "bg-emerald-50 border-emerald-200" : "bg-muted/30"
//                                   )}
//                                 >
//                                   <span>{isCorrect ? "✅" : "⬜"}</span>
//                                   <span className="text-sm">{opt || "(empty)"}</span>
//                                 </li>
//                               );
//                             })}
//                           </ul>
//                         ) : qq.question_type === "text" ? (
//                           <div className="space-y-2">
//                             <div className="text-xs text-muted-foreground">Expected</div>
//                             <div className="rounded-lg border bg-muted/30 p-3 text-sm">
//                               {getExpectedTextList(qq).length ? (
//                                 getExpectedTextList(qq).join(", ")
//                               ) : (
//                                 <i className="text-muted-foreground">(none)</i>
//                               )}
//                             </div>
//                           </div>
//                         ) : (
//                           <div className="text-sm text-muted-foreground">Preview not supported.</div>
//                         )}

//                         <AttachmentBlock images={qq.images} files={qq.files} />
//                       </div>
//                     );
//                   })}
//                 </div>
//               )}
//             </ScrollArea>

//             <DialogFooter className="gap-2 sm:gap-0">
//               <div className="mr-auto flex items-center gap-2">
//                 <Checkbox id="dummy" checked={false} onCheckedChange={() => {}} disabled />
//                 <label htmlFor="dummy" className="text-xs text-muted-foreground">
//                   (Preview only)
//                 </label>
//               </div>

//               <Button variant="secondary" onClick={() => setPreviewOpen(false)} className="gap-2">
//                 <CornerUpLeft className="h-4 w-4" />
//                 Close
//               </Button>
//             </DialogFooter>
//           </DialogContent>
//         </Dialog>
//       </div>
//     </div>
//   );
// }

// {2}

// "use client";

// import { useCallback, useEffect, useMemo, useState } from "react";
// import Link from "next/link";
// import { useRouter, useParams } from "next/navigation";
// import {
//   ArrowLeft,
//   ClipboardList,
//   Users,
//   CheckCircle2,
//   BarChart3,
//   Search,
//   Eye,
//   EyeOff,
//   Calculator,
//   Hash,
//   ArrowUpRight,
//   CornerUpLeft,
// } from "lucide-react";

// import { cn } from "@/lib/utils";
// import { getQuiz } from "@/lib/quizzes";

// // ✅ NEW: submissions service
// import {
//   listQuizSubmissions,
//   getQuizSubmission,
//   upsertQuizSubmission,
//   returnSubmission,
//   unreturnSubmission,
//   saveGrade,
// } from "@/lib/quizSubmissions";

// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Badge } from "@/components/ui/badge";
// import {
//   Dialog,
//   DialogContent,
//   DialogHeader,
//   DialogTitle,
//   DialogDescription,
//   DialogFooter,
// } from "@/components/ui/dialog";
// import { Separator } from "@/components/ui/separator";
// import { ScrollArea } from "@/components/ui/scroll-area";
// import { Checkbox } from "@/components/ui/checkbox";

// /* -------------------------- helpers -------------------------- */

// const toStr = (v) => String(v ?? "").trim();

// function getPoints(q) {
//   const candidates = [q?.points, q?.point, q?.score, q?.max_points, q?.max];
//   for (const v of candidates) {
//     const n = Number(v);
//     if (Number.isFinite(n) && n > 0) return n;
//   }
//   return 1;
// }

// function calcMaxScore(quiz) {
//   if (!quiz?.questions) return 0;
//   return quiz.questions.reduce((sum, q) => sum + getPoints(q), 0);
// }

// function letterToIndex(s) {
//   if (typeof s !== "string" || !s.trim()) return null;
//   const ch = s.trim().toUpperCase();
//   const code = ch.charCodeAt(0);
//   return code >= 65 && code <= 90 ? code - 65 : null; // A->0
// }

// function parseIndexList(val) {
//   if (Array.isArray(val)) {
//     const out = [];
//     for (const v of val) {
//       if (typeof v === "number" && Number.isInteger(v)) out.push(v);
//       else if (typeof v === "string") {
//         const li = letterToIndex(v);
//         if (li != null) out.push(li);
//         else {
//           const n = Number(v);
//           if (Number.isInteger(n)) out.push(n);
//         }
//       }
//     }
//     return Array.from(new Set(out));
//   }
//   if (typeof val === "number" && Number.isInteger(val)) return [val];
//   if (typeof val === "string" && val.trim()) {
//     const parts = val.split(/[,\s]+/).filter(Boolean);
//     const out = [];
//     for (const p of parts) {
//       const li = letterToIndex(p);
//       if (li != null) out.push(li);
//       else {
//         const n = Number(p);
//         if (Number.isInteger(n)) out.push(n);
//       }
//     }
//     return Array.from(new Set(out));
//   }
//   return [];
// }

// function getCorrectIndices(q) {
//   const tryFields = [
//     q?.correct_answers,
//     q?.correct_answer,
//     q?.correct,
//     q?.answer_indices,
//     q?.answer_index,
//     q?.answer,
//     q?.answer_key,
//   ];
//   for (const f of tryFields) {
//     const parsed = parseIndexList(f);
//     if (parsed.length) return parsed;
//   }
//   if (Array.isArray(q?.choices)) {
//     const idxs = [];
//     q.choices.forEach((opt, i) => {
//       if (opt && (opt.isCorrect === true || opt.correct === true)) idxs.push(i);
//     });
//     if (idxs.length) return idxs;
//   }
//   return [];
// }

// function getExpectedTextList(q) {
//   const pool = [];

//   const singles = [
//     q?.answer_text,
//     q?.correct_text,
//     q?.expected,
//     q?.expected_answer,
//     q?.expected_text,
//   ].filter((x) => typeof x === "string" && x.trim().length);

//   if (singles.length) pool.push(singles[0]);

//   if (Array.isArray(q?.choices)) {
//     q.choices.forEach((c) => {
//       if (typeof c === "string" && c.trim().length) pool.push(c);
//     });
//   }

//   const seen = new Set();
//   const out = [];
//   for (const s of pool) {
//     const t = String(s).trim();
//     if (t && !seen.has(t)) {
//       seen.add(t);
//       out.push(t);
//     }
//   }
//   return out;
// }

// function initialsFromName(name = "") {
//   const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
//   const first = parts[0]?.[0] || "";
//   const last = parts.length > 1 ? parts[parts.length - 1]?.[0] || "" : "";
//   return (first + last).toUpperCase();
// }

// /* ----- Mappers: quiz_attempts.answers -> { [question_id]: value } ---- */

// function normalizeAnswerForQuestion(q, raw) {
//   if (!q) return raw;

//   if (q.question_type === "choice") {
//     const choices = Array.isArray(q.choices) ? q.choices : [];

//     const toIndex = (v) => {
//       if (typeof v === "number" && Number.isInteger(v)) return v;

//       if (typeof v === "string") {
//         const li = letterToIndex(v);
//         if (li != null) return li;

//         let i = choices.indexOf(v);
//         if (i >= 0) return i;

//         const lower = v.toLowerCase();
//         i = choices.findIndex((c) => String(c).toLowerCase() === lower);
//         if (i >= 0) return i;

//         const n = Number(v);
//         if (Number.isInteger(n)) return n;
//       }

//       return null;
//     };

//     let picked = [];
//     if (Array.isArray(raw)) picked = raw.map(toIndex).filter((x) => x != null);
//     else if (raw === 0 || Number.isInteger(raw)) picked = [raw];
//     else {
//       const idx = toIndex(raw);
//       if (idx != null) picked = [idx];
//     }

//     return Array.from(new Set(picked));
//   }

//   return raw;
// }

// function answersFromAttemptAnswers(attemptAnswers, quiz) {
//   if (!attemptAnswers || !quiz?.questions?.length) return {};
//   const out = {};
//   const qs = quiz.questions;

//   for (let i = 0; i < qs.length; i++) {
//     const q = qs[i];
//     const key = `q${i + 1}`;
//     if (!(key in attemptAnswers)) continue;
//     out[q.question_id] = normalizeAnswerForQuestion(q, attemptAnswers[key]);
//   }

//   return out;
// }

// /* ---------- grading (same logic as your old page) ---------- */

// function gradeQuestion(q, ans) {
//   const max = getPoints(q);

//   if (q?.question_type === "choice") {
//     const toIndex = (v) => {
//       if (typeof v === "number" && Number.isInteger(v)) return v;

//       if (typeof v === "string") {
//         const li = letterToIndex(v);
//         if (li != null) return li;

//         const i = Array.isArray(q.choices) ? q.choices.indexOf(v) : -1;
//         if (i >= 0) return i;

//         const lower = v.toLowerCase();
//         const j = Array.isArray(q.choices)
//           ? q.choices.findIndex((c) => String(c).toLowerCase() === lower)
//           : -1;
//         if (j >= 0) return j;

//         const n = Number(v);
//         if (Number.isInteger(n)) return n;
//       }

//       return null;
//     };

//     let picked = [];
//     if (Array.isArray(ans)) picked = ans.map(toIndex).filter((x) => x != null);
//     else if (ans === 0 || Number.isInteger(ans)) picked = [ans];
//     else {
//       const idx = toIndex(ans);
//       if (idx != null) picked = [idx];
//     }
//     picked = Array.from(new Set(picked));

//     const correct = getCorrectIndices(q);
//     const isExactlySame =
//       correct.length === picked.length && correct.every((i) => picked.includes(i));

//     return { earned: isExactlySame ? max : 0, max, picked, correct };
//   }

//   if (q?.question_type === "text") {
//     const expectedList = getExpectedTextList(q);
//     const anyCase = !!q.text_any_case;
//     const norm = (s) =>
//       anyCase ? String(s ?? "").trim().toLowerCase() : String(s ?? "").trim();

//     const a = norm(ans);
//     let ok = false;

//     for (const exp of expectedList) {
//       const e = norm(exp);

//       const an = Number(a);
//       const en = Number(e);
//       if (Number.isFinite(an) && Number.isFinite(en)) {
//         if (Math.abs(an - en) <= 1e-6) {
//           ok = true;
//           break;
//         }
//       }
//       if (a === e) {
//         ok = true;
//         break;
//       }
//     }

//     return { earned: ok ? max : 0, max, picked: ans, correct: expectedList };
//   }

//   return { earned: 0, max, picked: ans, correct: null };
// }

// function autoGrade(quiz, answers) {
//   if (!quiz?.questions) return { score: 0, breakdown: [] };
//   const breakdown = quiz.questions.map((q) => {
//     const a = answers?.[q.question_id];
//     const { earned, max } = gradeQuestion(q, a);
//     return { question_id: q.question_id, earned, max };
//   });
//   const score = breakdown.reduce((s, b) => s + b.earned, 0);
//   return { score, breakdown };
// }

// /* ---------- attachments UI (kept from your current page) ---------- */

// function AttachmentBlock({ images = [], files = [] }) {
//   const hasImgs = Array.isArray(images) && images.length > 0;
//   const hasFiles = Array.isArray(files) && files.length > 0;
//   if (!hasImgs && !hasFiles) return null;

//   return (
//     <div className="mt-3 space-y-3">
//       {hasImgs && (
//         <div className="space-y-2">
//           <div className="text-xs text-muted-foreground flex items-center gap-2">
//             <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-indigo-50 text-indigo-700">
//               🖼️
//             </span>
//             Images
//           </div>
//           <div className="flex flex-wrap gap-2">
//             {images.map((img, i) => {
//               const src = img?.public_url || img?.url || img?.path;
//               return (
//                 <a
//                   key={i}
//                   href={src || "#"}
//                   target="_blank"
//                   rel="noreferrer"
//                   className={cn(
//                     "block h-20 w-28 overflow-hidden rounded-lg border bg-muted",
//                     src ? "hover:ring-2 hover:ring-primary/30" : "pointer-events-none opacity-70"
//                   )}
//                   title={img?.name || "image"}
//                 >
//                   {src ? (
//                     // eslint-disable-next-line @next/next/no-img-element
//                     <img
//                       src={src}
//                       alt={img?.name || `image-${i}`}
//                       className="h-full w-full object-cover"
//                       onError={(e) => {
//                         e.currentTarget.style.display = "none";
//                       }}
//                     />
//                   ) : (
//                     <div className="flex h-full w-full items-center justify-center text-[10px] text-muted-foreground">
//                       (no preview)
//                     </div>
//                   )}
//                 </a>
//               );
//             })}
//           </div>
//         </div>
//       )}

//       {hasFiles && (
//         <div className="space-y-2">
//           <div className="text-xs text-muted-foreground flex items-center gap-2">
//             <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-slate-50 text-slate-700">
//               📎
//             </span>
//             Files
//           </div>
//           <ul className="space-y-2">
//             {files.map((f, i) => {
//               const href = f?.public_url || f?.url;
//               const label = f?.name || f?.path || `file-${i}`;
//               const meta = [f?.mime, f?.size ? `${Math.round((f.size / 1024) * 10) / 10} KB` : null]
//                 .filter(Boolean)
//                 .join(" • ");
//               return (
//                 <li key={i}>
//                   {href ? (
//                     <a
//                       href={href}
//                       target="_blank"
//                       rel="noreferrer"
//                       className="inline-flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm hover:bg-muted"
//                       title={label}
//                     >
//                       <span>📎</span>
//                       <span className="max-w-[280px] truncate">{label}</span>
//                       {meta ? <span className="text-xs text-muted-foreground">{meta}</span> : null}
//                     </a>
//                   ) : (
//                     <span className="inline-flex items-center gap-2 rounded-md border bg-muted px-3 py-2 text-sm">
//                       <span>📎</span>
//                       <span className="max-w-[280px] truncate">{label}</span>
//                       {meta ? <span className="text-xs text-muted-foreground">{meta}</span> : null}
//                     </span>
//                   )}
//                 </li>
//               );
//             })}
//           </ul>
//         </div>
//       )}
//     </div>
//   );
// }

// /* -------------------------------- page -------------------------------- */

// export default function AssessmentViewPage() {
//   const router = useRouter();
//   const params = useParams();

//   const quizId = toStr(params?.id);

//   // Access control (client-only due to localStorage)
//   const currentUser = useMemo(() => {
//     try {
//       return JSON.parse(localStorage.getItem("currentUser") || "{}");
//     } catch {
//       return {};
//     }
//   }, []);
//   const adminLevel = currentUser?.admin_level || "";
//   const adminRole = String(currentUser?.admin_role || "").toLowerCase();
//   const adminAccess = currentUser?.admin_access || {};
//   const isSuperAdmin = adminLevel === "Super Admin";
//   const isFaculty = adminRole === "faculty";
//   const canEditQuiz = isSuperAdmin || (isFaculty && adminAccess?.quizzes_edit === true);

//   const [quiz, setQuiz] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState("");

//   const [activeTab, setActiveTab] = useState("quiz"); // quiz | submissions

//   const [q, setQ] = useState("");
//   const [debQ, setDebQ] = useState("");

//   const [previewOpen, setPreviewOpen] = useState(false);

//   // ✅ submissions state
//   const [subs, setSubs] = useState([]);
//   const [loadingSubs, setLoadingSubs] = useState(true);
//   const [activeSub, setActiveSub] = useState(null);

//   // modal tab: summary | answers | grade
//   const [modalTab, setModalTab] = useState("summary");

//   // grading states
//   const [gradingAll, setGradingAll] = useState(false);
//   const [manualScore, setManualScore] = useState(0);
//   const [perQEarned, setPerQEarned] = useState({});
//   const [feedbackText, setFeedbackText] = useState("");
//   const [markReviewed, setMarkReviewed] = useState(false);

//   useEffect(() => {
//     const t = setTimeout(() => setDebQ(q.trim().toLowerCase()), 250);
//     return () => clearTimeout(t);
//   }, [q]);

//   useEffect(() => {
//     (async () => {
//       setLoading(true);
//       setError("");
//       try {
//         if (!quizId) throw new Error("Missing assessment id in URL.");
//         const qz = await getQuiz(quizId);
//         setQuiz(qz);
//       } catch (e) {
//         console.error(e);
//         setError(e?.message || "Failed to load assessment.");
//       } finally {
//         setLoading(false);
//       }
//     })();
//   }, [quizId]);

//   const maxScore = useMemo(() => calcMaxScore(quiz), [quiz]);
//   const visibility = useMemo(() => {
//     return String(quiz?.visibility || "").toLowerCase() === "public" ? "public" : "private";
//   }, [quiz]);

//   const hrefId = quiz?.quiz_id || quizId;
//   const canNavigate = !!toStr(hrefId);

//   // ✅ load submissions list (attempts)
//   useEffect(() => {
//     (async () => {
//       if (!quizId) return;
//       setLoadingSubs(true);
//       try {
//         const items = await listQuizSubmissions((quizId || "").toLowerCase());

//         const normalized = (items || []).map((r) => {
//           const answers =
//             r.answers && Object.keys(r.answers).length
//               ? answersFromAttemptAnswers(r.answers, quiz)
//               : {};

//           const display_name = r.user?.display_name || "—";
//           const computed = quiz ? autoGrade(quiz, answers).score : 0;

//           return {
//             ...r,
//             id: r.id,
//             display_name,
//             answers,
//             score:
//               Number.isFinite(Number(r.score ?? r.correct))
//                 ? Number(r.score ?? r.correct)
//                 : computed,
//             max_score: Number(r.total ?? calcMaxScore(quiz)),
//             submitted_at: r.finished_at || null,
//             feedback: r.feedback || "",
//             status: r.status || "pending_review",
//             is_returned: !!r.is_returned,
//             returned_at: r.returned_at || null,
//           };
//         });

//         setSubs(normalized);
//       } catch (e) {
//         console.error(e);
//       } finally {
//         setLoadingSubs(false);
//       }
//     })();
//   }, [quizId, quiz]);

//   const displayedSubs = useMemo(() => {
//     let arr = subs.slice();
//     if (debQ) {
//       arr = arr.filter((s) => String(s.display_name || "").toLowerCase().includes(debQ));
//     }
//     arr.sort((a, b) => new Date(b.submitted_at || 0) - new Date(a.submitted_at || 0));
//     return arr;
//   }, [subs, debQ]);

//   const avgScore = useMemo(() => {
//     if (!displayedSubs.length) return 0;
//     const sum = displayedSubs.reduce((s, x) => s + (Number(x.score) || 0), 0);
//     return Math.round((sum / displayedSubs.length) * 100) / 100;
//   }, [displayedSubs]);

//   const openSubmission = async (attempt_id) => {
//     try {
//       const sRaw = await getQuizSubmission(attempt_id);
//       if (!sRaw) return;

//       const display_name = sRaw?.user?.display_name || "—";

//       const fromAttempt =
//         sRaw?.answers && Object.keys(sRaw.answers).length
//           ? answersFromAttemptAnswers(sRaw.answers, quiz)
//           : {};

//       const computed = quiz ? autoGrade(quiz, fromAttempt).score : 0;

//       const s = {
//         ...sRaw,
//         id: sRaw.id,
//         display_name,
//         answers: fromAttempt,
//         score:
//           Number.isFinite(Number(sRaw.score ?? sRaw.correct))
//             ? Number(sRaw.score ?? sRaw.correct)
//             : computed,
//         max_score: Number(sRaw.total ?? maxScore),
//         submitted_at: sRaw.finished_at || null,
//         feedback: sRaw.feedback || "",
//         reviewed: (sRaw.status || "").toLowerCase() === "reviewed",
//         status: sRaw.status || "pending_review",
//         is_returned: !!sRaw.is_returned,
//         returned_at: sRaw.returned_at || null,
//       };

//       setActiveSub(s);
//       setModalTab("summary");
//       setManualScore(s.score ?? 0);
//       setFeedbackText(s.feedback ?? "");
//       setMarkReviewed(!!s.reviewed);

//       const breakdown = quiz ? autoGrade(quiz, s.answers || {}).breakdown : [];
//       const dict = {};
//       breakdown.forEach((b) => (dict[b.question_id] = b.earned));
//       setPerQEarned(dict);
//     } catch (e) {
//       console.error(e);
//     }
//   };

//   const onKeyDown = useCallback((e) => {
//     if (e.key === "Escape") {
//       setPreviewOpen(false);
//       setActiveSub(null);
//     }
//   }, []);

//   useEffect(() => {
//     window.addEventListener("keydown", onKeyDown);
//     return () => window.removeEventListener("keydown", onKeyDown);
//   }, [onKeyDown]);

//   // auto grade one + persist score
//   const autoGradeOne = async (submission) => {
//     if (!quiz) return;
//     try {
//       const { score } = autoGrade(quiz, submission.answers || {});
//       const patch = {
//         id: submission.id,
//         quiz_id: (quizId || "").toLowerCase(),
//         user_id: submission.user_id,
//         answers: submission.answers || {},
//         score,
//         max_score: submission.max_score ?? maxScore,
//         feedback: submission.feedback ?? null,
//       };
//       const saved = await upsertQuizSubmission(patch);

//       const normalized = {
//         ...submission,
//         score: patch.score,
//         max_score: patch.max_score,
//         id: saved.id,
//       };

//       setSubs((prev) => prev.map((x) => (x.id === normalized.id ? normalized : x)));
//       if (activeSub?.id === normalized.id) setActiveSub((p) => ({ ...p, ...normalized }));
//     } catch (e) {
//       console.error(e);
//       alert("Failed to auto grade this submission.");
//     }
//   };

//   // bulk auto grade currently listed
//   const autoGradeAll = async () => {
//     if (!quiz || displayedSubs.length === 0) return;
//     setGradingAll(true);
//     try {
//       for (const s of displayedSubs) {
//         const { score } = autoGrade(quiz, s.answers || {});
//         const patch = {
//           id: s.id,
//           quiz_id: (quizId || "").toLowerCase(),
//           user_id: s.user_id,
//           answers: s.answers || {},
//           score,
//           max_score: s.max_score ?? maxScore,
//           feedback: s.feedback ?? null,
//         };
//         const saved = await upsertQuizSubmission(patch);
//         const normalized = { ...s, score: patch.score, max_score: patch.max_score, id: saved.id };

//         setSubs((prev) => prev.map((x) => (x.id === normalized.id ? normalized : x)));
//         if (activeSub?.id === normalized.id) setActiveSub((p) => ({ ...p, ...normalized }));
//       }
//     } catch (e) {
//       console.error(e);
//       alert("Auto grading (bulk) encountered an error.");
//     } finally {
//       setGradingAll(false);
//     }
//   };

//   // computed total from per-question inputs
//   const computedManualTotal = useMemo(() => {
//     if (!quiz?.questions?.length) return 0;
//     return quiz.questions.reduce((sum, qx) => {
//       const val = Number(perQEarned[qx.question_id] ?? 0);
//       const capped = Math.max(0, Math.min(val, getPoints(qx)));
//       return sum + capped;
//     }, 0);
//   }, [perQEarned, quiz]);

//   const saveManualGrade = async () => {
//     if (!activeSub) return;

//     const finalScore = modalTab === "grade" ? computedManualTotal : Number(manualScore || 0);
//     const bounded = Math.max(0, Math.min(finalScore, activeSub.max_score ?? maxScore));

//     try {
//       const saved = await saveGrade(activeSub.id, {
//         score: bounded,
//         feedback: feedbackText || "",
//         reviewed: !!markReviewed,
//       });

//       const normalized = {
//         ...activeSub,
//         score: bounded,
//         feedback: feedbackText || "",
//         status: saved?.status ?? (markReviewed ? "reviewed" : activeSub.status),
//         reviewed: !!markReviewed,
//       };

//       setSubs((prev) => prev.map((x) => (x.id === normalized.id ? normalized : x)));
//       setActiveSub(normalized);
//     } catch (e) {
//       console.error(e);
//       alert("Failed to save grade.");
//     }
//   };

//   const handleReturn = async (attempt_id) => {
//     try {
//       const saved = await returnSubmission(attempt_id, { feedback: feedbackText });

//       setSubs((prev) =>
//         prev.map((x) =>
//           x.id === attempt_id
//             ? {
//                 ...x,
//                 is_returned: true,
//                 returned_at: saved.returned_at,
//                 feedback: saved.feedback,
//                 status: "returned",
//               }
//             : x
//         )
//       );

//       if (activeSub?.id === attempt_id) {
//         setActiveSub((p) => ({
//           ...p,
//           is_returned: true,
//           returned_at: saved.returned_at,
//           feedback: saved.feedback,
//           status: "returned",
//         }));
//       }
//     } catch (e) {
//       console.error(e);
//       alert("Failed to return submission.");
//     }
//   };

//   const handleUnreturn = async (attempt_id) => {
//     try {
//       await unreturnSubmission(attempt_id);

//       setSubs((prev) =>
//         prev.map((x) =>
//           x.id === attempt_id
//             ? { ...x, is_returned: false, returned_at: null, status: "pending_review" }
//             : x
//         )
//       );

//       if (activeSub?.id === attempt_id) {
//         setActiveSub((p) => ({
//           ...p,
//           is_returned: false,
//           returned_at: null,
//           status: "pending_review",
//         }));
//       }
//     } catch (e) {
//       console.error(e);
//       alert("Failed to unreturn submission.");
//     }
//   };

//   return (
//     <div className="min-h-screen bg-muted/30">
//       <div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-6 md:py-8">
//         {/* Top bar */}
//         <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
//           <div className="flex items-center gap-3">
//             <Button variant="ghost" className="gap-2" onClick={() => router.back()}>
//               <ArrowLeft className="h-4 w-4" />
//               Back
//             </Button>

//             <div className="min-w-0">
//               <div className="text-sm text-muted-foreground">Assessment</div>
//               <h1 className="truncate text-xl font-semibold">
//                 {loading ? "Loading…" : quiz?.quiz_title || "Untitled Assessment"}
//               </h1>
//             </div>
//           </div>

//           <div className="flex flex-wrap items-center gap-2">
//             {/* required link */}
//             <Link href={canNavigate ? `/admin/assessments/${hrefId}` : "#"} aria-disabled={!canNavigate}>
//               <Button variant="secondary" className="gap-2" disabled={!canNavigate}>
//                 <ClipboardList className="h-4 w-4" />
//                 View Submissions
//               </Button>
//             </Link>

//             {canEditQuiz ? (
//               <Link href={canNavigate ? `/admin/quizzes/${hrefId}/edit` : "#"}>
//                 <Button disabled={!canNavigate}>Edit Assessment</Button>
//               </Link>
//             ) : null}

//             <Button variant="outline" onClick={() => setPreviewOpen(true)} disabled={!quiz} className="gap-2">
//               Preview
//             </Button>
//           </div>
//         </div>

//         {/* Tabs */}
//         <div className="mb-6 flex gap-2">
//           <Button
//             variant={activeTab === "quiz" ? "default" : "secondary"}
//             className="gap-2"
//             onClick={() => setActiveTab("quiz")}
//           >
//             <Hash className="h-4 w-4" />
//             Quiz
//           </Button>

//           <Button
//             variant={activeTab === "submissions" ? "default" : "secondary"}
//             className="gap-2"
//             onClick={() => setActiveTab("submissions")}
//           >
//             <Users className="h-4 w-4" />
//             Submissions
//             <Badge variant="outline" className="ml-1">
//               {loadingSubs ? "…" : displayedSubs.length}
//             </Badge>
//           </Button>
//         </div>

//         {/* Content */}
//         {activeTab === "quiz" ? (
//           <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
//             {/* Meta */}
//             <Card className="xl:col-span-2">
//               <CardHeader>
//                 <CardTitle>Assessment Details</CardTitle>
//                 <CardDescription>Loaded via @/lib/quizzes.js → /api/quizzes/[id].</CardDescription>
//               </CardHeader>
//               <CardContent>
//                 {loading ? (
//                   <div className="space-y-3">
//                     <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
//                     <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
//                     <div className="h-24 w-full animate-pulse rounded bg-muted" />
//                   </div>
//                 ) : error ? (
//                   <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-destructive">
//                     {error}
//                   </div>
//                 ) : (
//                   <>
//                     {quiz?.quiz_description ? (
//                       <p className="mb-4 text-sm leading-relaxed text-foreground">{quiz.quiz_description}</p>
//                     ) : (
//                       <p className="mb-4 text-sm text-muted-foreground">(No description)</p>
//                     )}

//                     <div className="flex flex-wrap gap-2">
//                       <span
//                         className={cn(
//                           "inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs",
//                           visibility === "public"
//                             ? "bg-emerald-50 text-emerald-700"
//                             : "bg-muted text-muted-foreground"
//                         )}
//                       >
//                         {visibility === "public" ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
//                         {visibility}
//                       </span>

//                       {quiz?.status ? (
//                         <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-xs text-amber-700 capitalize">
//                           <Hash className="h-3.5 w-3.5" />
//                           {quiz.status}
//                         </span>
//                       ) : null}

//                       {quiz?.created_at ? (
//                         <Badge variant="outline">Created {new Date(quiz.created_at).toLocaleDateString()}</Badge>
//                       ) : null}
//                       {quiz?.updated_at ? (
//                         <Badge variant="outline">Updated {new Date(quiz.updated_at).toLocaleDateString()}</Badge>
//                       ) : null}

//                       {quiz?.track_id ? <Badge variant="secondary">track_id: {quiz.track_id}</Badge> : null}
//                       {quiz?.subject_id ? <Badge variant="secondary">subject_id: {quiz.subject_id}</Badge> : null}
//                       {quiz?.course_id ? <Badge variant="secondary">course_id: {quiz.course_id}</Badge> : null}
//                     </div>

//                     <Separator className="my-5" />

//                     <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
//                       <Card className="border-dashed">
//                         <CardHeader className="pb-2">
//                           <CardTitle className="flex items-center gap-2 text-base">
//                             <Users className="h-4 w-4 text-primary" /> Submissions
//                           </CardTitle>
//                         </CardHeader>
//                         <CardContent className="text-2xl font-semibold">
//                           {loadingSubs ? "…" : displayedSubs.length}
//                         </CardContent>
//                       </Card>

//                       <Card className="border-dashed">
//                         <CardHeader className="pb-2">
//                           <CardTitle className="flex items-center gap-2 text-base">
//                             <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Max Score
//                           </CardTitle>
//                         </CardHeader>
//                         <CardContent className="text-2xl font-semibold">{maxScore}</CardContent>
//                       </Card>

//                       <Card className="border-dashed">
//                         <CardHeader className="pb-2">
//                           <CardTitle className="flex items-center gap-2 text-base">
//                             <BarChart3 className="h-4 w-4 text-amber-600" /> Avg Score
//                           </CardTitle>
//                         </CardHeader>
//                         <CardContent className="text-2xl font-semibold">
//                           {loadingSubs ? "…" : avgScore}
//                         </CardContent>
//                       </Card>
//                     </div>
//                   </>
//                 )}
//               </CardContent>
//             </Card>

//             {/* Answer key nav */}
//             <Card>
//               <CardHeader>
//                 <CardTitle>Answer Key</CardTitle>
//                 <CardDescription>Jump to any question.</CardDescription>
//               </CardHeader>
//               <CardContent>
//                 {!quiz?.questions?.length ? (
//                   <div className="text-sm text-muted-foreground">No questions.</div>
//                 ) : (
//                   <div className="space-y-2">
//                     {quiz.questions.map((qq, idx) => (
//                       <a
//                         key={qq.question_id || idx}
//                         href={`#q-${idx + 1}`}
//                         className="flex items-center justify-between rounded-lg border bg-background px-3 py-2 text-sm hover:bg-muted"
//                       >
//                         <span className="truncate">
//                           {idx + 1}. {qq.question_text || "(Untitled)"}
//                         </span>
//                         <span className="ml-3 shrink-0 text-xs text-muted-foreground">{getPoints(qq)} pt</span>
//                       </a>
//                     ))}
//                   </div>
//                 )}
//               </CardContent>
//             </Card>

//             {/* Full answer key */}
//             <div className="xl:col-span-3">
//               <Card>
//                 <CardHeader>
//                   <CardTitle>Answer Key</CardTitle>
//                   <CardDescription>Correct answers are highlighted. Attachments included.</CardDescription>
//                 </CardHeader>
//                 <CardContent>
//                   {!quiz?.questions?.length ? (
//                     <div className="text-sm text-muted-foreground">No questions.</div>
//                   ) : (
//                     <div className="space-y-4">
//                       {quiz.questions.map((qq, i) => {
//                         const pts = getPoints(qq);
//                         const enableMath = !!qq.enable_math;
//                         const allowMultiple = qq.question_type === "choice" ? !!qq.allow_multiple : false;
//                         const anyCase = qq.question_type === "text" ? !!qq.text_any_case : false;

//                         return (
//                           <div
//                             key={qq.question_id || i}
//                             id={`q-${i + 1}`}
//                             className="rounded-xl border bg-background p-4"
//                           >
//                             <div className="mb-2 flex items-start justify-between gap-3">
//                               <div className="flex items-start gap-3">
//                                 <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
//                                   {i + 1}
//                                 </div>
//                                 <div>
//                                   <div className="font-medium">{qq.question_text || "(Untitled Question)"}</div>

//                                   <div className="mt-1 flex flex-wrap gap-2">
//                                     <Badge variant="secondary" className="capitalize">
//                                       {qq.question_type || "unknown"}
//                                     </Badge>

//                                     <Badge variant={enableMath ? "default" : "outline"} className="gap-1">
//                                       <Calculator className="h-3.5 w-3.5" />
//                                       Math {enableMath ? "on" : "off"}
//                                     </Badge>

//                                     {qq.question_type === "choice" ? (
//                                       <Badge variant={allowMultiple ? "default" : "outline"}>
//                                         {allowMultiple ? "Multiple answers" : "Single answer"}
//                                       </Badge>
//                                     ) : null}

//                                     {qq.question_type === "text" ? (
//                                       <Badge variant={anyCase ? "default" : "outline"}>
//                                         Any case {anyCase ? "✓" : "✗"}
//                                       </Badge>
//                                     ) : null}

//                                     {qq.difficulty ? (
//                                       <Badge variant="outline" className="capitalize">
//                                         {qq.difficulty}
//                                       </Badge>
//                                     ) : null}
//                                   </div>
//                                 </div>
//                               </div>

//                               <div className="text-xs text-muted-foreground">
//                                 {pts} pt{pts > 1 ? "s" : ""}
//                               </div>
//                             </div>

//                             {qq.question_type === "choice" ? (
//                               <ul className="space-y-2">
//                                 {(qq.choices || []).map((opt, idx) => {
//                                   const isCorrect = getCorrectIndices(qq).includes(idx);
//                                   return (
//                                     <li
//                                       key={idx}
//                                       className={cn(
//                                         "flex items-center gap-2 rounded-lg border px-3 py-2",
//                                         isCorrect
//                                           ? "border-emerald-200 bg-emerald-50 text-emerald-800"
//                                           : "border-muted bg-muted/40"
//                                       )}
//                                     >
//                                       <span className="text-sm">{isCorrect ? "✅" : "⬜"}</span>
//                                       <span className="text-sm">
//                                         {opt || <i className="text-muted-foreground">Empty option</i>}
//                                       </span>
//                                     </li>
//                                   );
//                                 })}
//                               </ul>
//                             ) : qq.question_type === "text" ? (
//                               <div className="space-y-2">
//                                 <div className="text-xs text-muted-foreground">Acceptable Answers</div>
//                                 <div className="rounded-lg border bg-muted/40 p-3 text-sm">
//                                   {getExpectedTextList(qq).length ? (
//                                     <div className="space-y-1">
//                                       {getExpectedTextList(qq).map((t, k) => (
//                                         <div key={k}>{t}</div>
//                                       ))}
//                                     </div>
//                                   ) : (
//                                     <i className="text-muted-foreground">(none)</i>
//                                   )}
//                                 </div>
//                               </div>
//                             ) : qq.question_type === "rating" ? (
//                               <div className="text-sm">
//                                 Rating scale: <b>1</b> – <b>{qq.rating_max || 5}</b>
//                               </div>
//                             ) : qq.question_type === "likert" ? (
//                               <div className="text-sm">
//                                 <div>Rows: {(qq.likert_rows || []).join(", ") || "—"}</div>
//                                 <div>Columns: {(qq.likert_cols || []).join(", ") || "—"}</div>
//                               </div>
//                             ) : (
//                               <div className="text-sm text-muted-foreground">Unsupported question type.</div>
//                             )}

//                             <AttachmentBlock images={qq.images} files={qq.files} />
//                           </div>
//                         );
//                       })}
//                     </div>
//                   )}
//                 </CardContent>
//               </Card>
//             </div>
//           </div>
//         ) : (
//           /* Submissions tab */
//           <Card>
//             <CardHeader>
//               <CardTitle className="flex items-center gap-2">
//                 <Users className="h-5 w-5 text-primary" />
//                 Submissions
//               </CardTitle>
//               <CardDescription>
//                 List quiz_attempts for this assessment. Open a submission to grade/return/unreturn.
//               </CardDescription>
//             </CardHeader>

//             <CardContent>
//               <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
//                 <div className="relative w-full max-w-md">
//                   <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
//                   <Input
//                     value={q}
//                     onChange={(e) => setQ(e.target.value)}
//                     placeholder="Search student"
//                     className="pl-9"
//                   />
//                 </div>

//                 <div className="flex flex-wrap gap-2">
//                   <Button
//                     variant="outline"
//                     onClick={autoGradeAll}
//                     disabled={gradingAll || loadingSubs || !quiz || displayedSubs.length === 0}
//                     title="Auto grade all currently listed submissions using the answer key"
//                   >
//                     {gradingAll ? "Auto Grading…" : "Auto Grade All (filtered)"}
//                   </Button>

//                   <Link href={canNavigate ? `/admin/assessments/${hrefId}` : "#"}>
//                     <Button className="gap-2" disabled={!canNavigate}>
//                       <ArrowUpRight className="h-4 w-4" />
//                       Open Submissions Page
//                     </Button>
//                   </Link>
//                 </div>
//               </div>

//               <Separator className="my-6" />

//               <div className="overflow-auto rounded-lg border bg-background">
//                 <table className="min-w-full text-sm">
//                   <thead className="bg-muted/40">
//                     <tr className="text-left text-muted-foreground">
//                       <th className="px-4 py-3">Student</th>
//                       <th className="px-4 py-3">Submitted</th>
//                       <th className="px-4 py-3">Score</th>
//                       <th className="px-4 py-3">Returned</th>
//                       <th className="px-4 py-3 text-right">Actions</th>
//                     </tr>
//                   </thead>
//                   <tbody>
//                     {loadingSubs ? (
//                       <tr>
//                         <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
//                           Loading…
//                         </td>
//                       </tr>
//                     ) : displayedSubs.length === 0 ? (
//                       <tr>
//                         <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
//                           No submissions yet.
//                         </td>
//                       </tr>
//                     ) : (
//                       displayedSubs.map((s) => (
//                         <tr key={s.id} className="border-t">
//                           <td className="px-4 py-3">
//                             <div className="flex items-center gap-2">
//                               <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold">
//                                 {initialsFromName(s.display_name)}
//                               </div>
//                               <div className="max-w-[260px] truncate font-medium">{s.display_name || "—"}</div>
//                             </div>
//                           </td>
//                           <td className="px-4 py-3 text-muted-foreground">
//                             {s.submitted_at ? new Date(s.submitted_at).toLocaleString() : "—"}
//                           </td>
//                           <td className="px-4 py-3">
//                             <span className="inline-flex items-center gap-1 rounded-md border bg-emerald-50 px-2 py-1 text-emerald-700">
//                               {Number(s.score ?? 0)}/{Number(s.max_score ?? maxScore)}
//                             </span>
//                           </td>
//                           <td className="px-4 py-3">
//                             {s.is_returned ? (
//                               <span className="inline-flex items-center gap-1 text-emerald-700">
//                                 <Eye className="h-4 w-4" /> Visible
//                               </span>
//                             ) : (
//                               <span className="inline-flex items-center gap-1 text-muted-foreground">
//                                 <EyeOff className="h-4 w-4" /> Hidden
//                               </span>
//                             )}
//                           </td>
//                           <td className="px-4 py-3">
//                             <div className="flex flex-wrap justify-end gap-2">
//                               <Button size="sm" onClick={() => openSubmission(s.id)}>
//                                 View
//                               </Button>

//                               {!s.is_returned ? (
//                                 <Button
//                                   size="sm"
//                                   variant="outline"
//                                   onClick={() => handleReturn(s.id)}
//                                   title="Return to student (scores visible)"
//                                 >
//                                   Return
//                                 </Button>
//                               ) : (
//                                 <Button
//                                   size="sm"
//                                   variant="outline"
//                                   onClick={() => handleUnreturn(s.id)}
//                                   title="Hide scores from student"
//                                 >
//                                   Unreturn
//                                 </Button>
//                               )}

//                               <Button
//                                 size="sm"
//                                 variant="secondary"
//                                 onClick={() => autoGradeOne(s)}
//                                 title="Auto grade using the answer key and points"
//                               >
//                                 Auto Grade
//                               </Button>
//                             </div>
//                           </td>
//                         </tr>
//                       ))
//                     )}
//                   </tbody>
//                 </table>
//               </div>

//               <div className="mt-4 text-xs text-muted-foreground">
//                 Filter: {debQ ? <b>"{debQ}"</b> : "—"}
//               </div>
//             </CardContent>
//           </Card>
//         )}

//         {/* Preview dialog (your existing) */}
//         <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
//           <DialogContent className="max-w-4xl">
//             <DialogHeader>
//               <DialogTitle>Preview</DialogTitle>
//               <DialogDescription>Read-only preview.</DialogDescription>
//             </DialogHeader>

//             <ScrollArea className="max-h-[70vh] pr-4">
//               {!quiz?.questions?.length ? (
//                 <div className="text-sm text-muted-foreground">No questions.</div>
//               ) : (
//                 <div className="space-y-4">
//                   {quiz.questions.map((qq, i) => {
//                     const pts = getPoints(qq);
//                     const correctIdx = getCorrectIndices(qq);

//                     return (
//                       <div key={qq.question_id || i} className="rounded-xl border p-4">
//                         <div className="mb-2 flex items-start justify-between">
//                           <div className="flex items-center gap-3">
//                             <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
//                               {i + 1}
//                             </div>
//                             <div className="font-medium">{qq.question_text || "(Untitled)"}</div>
//                           </div>
//                           <div className="text-xs text-muted-foreground">
//                             {pts} pt{pts > 1 ? "s" : ""}
//                           </div>
//                         </div>

//                         {qq.question_type === "choice" ? (
//                           <ul className="space-y-2">
//                             {(qq.choices || []).map((opt, idx) => {
//                               const isCorrect = correctIdx.includes(idx);
//                               return (
//                                 <li
//                                   key={idx}
//                                   className={cn(
//                                     "flex items-center gap-2 rounded-lg border px-3 py-2",
//                                     isCorrect ? "bg-emerald-50 border-emerald-200" : "bg-muted/30"
//                                   )}
//                                 >
//                                   <span>{isCorrect ? "✅" : "⬜"}</span>
//                                   <span className="text-sm">{opt || "(empty)"}</span>
//                                 </li>
//                               );
//                             })}
//                           </ul>
//                         ) : qq.question_type === "text" ? (
//                           <div className="space-y-2">
//                             <div className="text-xs text-muted-foreground">Expected</div>
//                             <div className="rounded-lg border bg-muted/30 p-3 text-sm">
//                               {getExpectedTextList(qq).length ? (
//                                 getExpectedTextList(qq).join(", ")
//                               ) : (
//                                 <i className="text-muted-foreground">(none)</i>
//                               )}
//                             </div>
//                           </div>
//                         ) : (
//                           <div className="text-sm text-muted-foreground">Preview not supported.</div>
//                         )}

//                         <AttachmentBlock images={qq.images} files={qq.files} />
//                       </div>
//                     );
//                   })}
//                 </div>
//               )}
//             </ScrollArea>

//             <DialogFooter className="gap-2 sm:gap-0">
//               <div className="mr-auto flex items-center gap-2">
//                 <Checkbox id="dummy" checked={false} onCheckedChange={() => {}} disabled />
//                 <label htmlFor="dummy" className="text-xs text-muted-foreground">
//                   (Preview only)
//                 </label>
//               </div>

//               <Button variant="secondary" onClick={() => setPreviewOpen(false)} className="gap-2">
//                 <CornerUpLeft className="h-4 w-4" />
//                 Close
//               </Button>
//             </DialogFooter>
//           </DialogContent>
//         </Dialog>

//         {/* ✅ Submission modal */}
//         <Dialog open={!!activeSub} onOpenChange={(open) => (!open ? setActiveSub(null) : null)}>
//           <DialogContent className="max-w-5xl">
//             <DialogHeader>
//               <DialogTitle className="flex items-center justify-between gap-3">
//                 <span className="truncate">
//                   {activeSub?.display_name || "Submission"}
//                 </span>
//                 <span
//                   className={cn(
//                     "inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs",
//                     activeSub?.is_returned ? "bg-emerald-50 text-emerald-700" : "bg-muted text-muted-foreground"
//                   )}
//                 >
//                   {activeSub?.is_returned ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
//                   {activeSub?.is_returned ? "Returned" : "Hidden"}
//                 </span>
//               </DialogTitle>
//               <DialogDescription>
//                 Review answers, adjust points, save grade, and return/unreturn.
//               </DialogDescription>
//             </DialogHeader>

//             <div className="flex flex-wrap gap-2">
//               {["summary", "answers", "grade"].map((t) => (
//                 <Button
//                   key={t}
//                   size="sm"
//                   variant={modalTab === t ? "default" : "secondary"}
//                   onClick={() => setModalTab(t)}
//                   className="capitalize"
//                 >
//                   {t}
//                 </Button>
//               ))}
//             </div>

//             <Separator />

//             <ScrollArea className="max-h-[65vh] pr-4">
//               {/* SUMMARY */}
//               {modalTab === "summary" && (
//                 <div className="space-y-4">
//                   <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
//                     <Card className="border-dashed">
//                       <CardHeader className="pb-2">
//                         <CardTitle className="text-sm">Submitted</CardTitle>
//                       </CardHeader>
//                       <CardContent className="text-sm">
//                         {activeSub?.submitted_at ? new Date(activeSub.submitted_at).toLocaleString() : "—"}
//                       </CardContent>
//                     </Card>

//                     <Card className="border-dashed">
//                       <CardHeader className="pb-2">
//                         <CardTitle className="text-sm">Score</CardTitle>
//                       </CardHeader>
//                       <CardContent className="text-lg font-semibold">
//                         {Number(activeSub?.score ?? 0)}/{Number(activeSub?.max_score ?? maxScore)}
//                       </CardContent>
//                     </Card>

//                     <Card className="border-dashed">
//                       <CardHeader className="pb-2">
//                         <CardTitle className="text-sm">Reviewed</CardTitle>
//                       </CardHeader>
//                       <CardContent className="text-sm">{markReviewed ? "Yes" : "No"}</CardContent>
//                     </Card>
//                   </div>

//                   <div className="space-y-2">
//                     <div className="text-xs text-muted-foreground">Feedback</div>
//                     <Input
//                       value={feedbackText}
//                       onChange={(e) => setFeedbackText(e.target.value)}
//                       placeholder="Feedback to student (optional)"
//                     />
//                     <div className="flex items-center gap-2 pt-1">
//                       <Checkbox
//                         id="reviewed"
//                         checked={markReviewed}
//                         onCheckedChange={(v) => setMarkReviewed(!!v)}
//                       />
//                       <label htmlFor="reviewed" className="text-sm text-muted-foreground">
//                         Mark as reviewed
//                       </label>
//                     </div>
//                   </div>
//                 </div>
//               )}

//               {/* ANSWERS */}
//               {modalTab === "answers" && (
//                 <div className="space-y-4">
//                   {!quiz?.questions?.length ? (
//                     <div className="text-sm text-muted-foreground">No questions found.</div>
//                   ) : (
//                     quiz.questions.map((qx, idx) => {
//                       const ans = activeSub?.answers?.[qx.question_id];
//                       const g = gradeQuestion(qx, ans);
//                       const isChoice = qx.question_type === "choice";

//                       return (
//                         <div key={qx.question_id || idx} className="rounded-xl border bg-background p-4">
//                           <div className="mb-2 flex items-start justify-between gap-3">
//                             <div className="flex items-center gap-2">
//                               <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
//                                 {idx + 1}
//                               </div>
//                               <div className="font-medium">{qx.question_text || "(Untitled Question)"}</div>
//                             </div>
//                             <div className="text-xs text-muted-foreground">
//                               Points: {g.earned}/{g.max}
//                             </div>
//                           </div>

//                           {isChoice ? (
//                             <ul className="space-y-2">
//                               {(qx.choices || []).map((opt, i) => {
//                                 const isCorrect = (g.correct || []).includes(i);
//                                 const isSelected = (g.picked || []).includes(i);

//                                 let cls = "bg-muted/30 border-muted";
//                                 let icon = "⬜";

//                                 if (isSelected && isCorrect) {
//                                   cls = "bg-emerald-50 border-emerald-200";
//                                   icon = "✅";
//                                 } else if (isSelected && !isCorrect) {
//                                   cls = "bg-rose-50 border-rose-200";
//                                   icon = "❌";
//                                 } else if (!isSelected && isCorrect) {
//                                   cls = "bg-emerald-50/40 border-emerald-200";
//                                   icon = "✅";
//                                 }

//                                 return (
//                                   <li key={i} className={cn("flex items-center gap-2 rounded-lg border px-3 py-2", cls)}>
//                                     <span className="text-sm">{icon}</span>
//                                     <span className={cn("text-sm", isCorrect ? "text-emerald-800" : "text-foreground")}>
//                                       {opt || <i className="text-muted-foreground">Empty option</i>}
//                                     </span>
//                                   </li>
//                                 );
//                               })}
//                             </ul>
//                           ) : qx.question_type === "text" ? (
//                             <div className="space-y-2">
//                               <div className="text-xs text-muted-foreground">Student Answer</div>
//                               <div className="rounded-lg border bg-muted/30 p-3 text-sm">
//                                 {typeof ans === "string" && ans.trim() ? ans : <i className="text-muted-foreground">(no answer)</i>}
//                               </div>
//                               {getExpectedTextList(qx).length > 0 ? (
//                                 <div className="text-xs text-muted-foreground">
//                                   Acceptable: <span className="font-medium">{getExpectedTextList(qx).join(", ")}</span>
//                                 </div>
//                               ) : null}
//                             </div>
//                           ) : qx.question_type === "rating" ? (
//                             <div className="text-sm">
//                               Rating: <b>{ans ?? "—"}</b> / {qx.rating_max || 5}
//                             </div>
//                           ) : qx.question_type === "likert" ? (
//                             <pre className="rounded-lg border bg-muted/30 p-3 text-xs overflow-auto">
//                               {JSON.stringify(ans ?? {}, null, 2)}
//                             </pre>
//                           ) : (
//                             <div className="text-sm text-muted-foreground">Unsupported question type.</div>
//                           )}

//                           <AttachmentBlock images={qx.images} files={qx.files} />
//                         </div>
//                       );
//                     })
//                   )}
//                 </div>
//               )}

//               {/* GRADE */}
//               {modalTab === "grade" && (
//                 <div className="space-y-4">
//                   {!quiz?.questions?.length ? (
//                     <div className="text-sm text-muted-foreground">No questions found.</div>
//                   ) : (
//                     <>
//                       {quiz.questions.map((qx, idx) => {
//                         const ans = activeSub?.answers?.[qx.question_id];
//                         const g = gradeQuestion(qx, ans);
//                         const max = getPoints(qx);
//                         const currentEarned = perQEarned[qx.question_id] ?? Math.min(g.earned, max);

//                         return (
//                           <div key={qx.question_id || idx} className="rounded-xl border bg-background p-4">
//                             <div className="mb-2 flex items-start justify-between gap-3">
//                               <div className="flex items-center gap-2">
//                                 <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
//                                   {idx + 1}
//                                 </div>
//                                 <div className="font-medium">{qx.question_text || "(Untitled Question)"}</div>
//                               </div>

//                               <div className="flex items-center gap-2 text-xs text-muted-foreground">
//                                 <span>Points</span>
//                                 <Input
//                                   type="number"
//                                   className="h-8 w-20"
//                                   min={0}
//                                   max={max}
//                                   value={Number(currentEarned)}
//                                   onChange={(e) =>
//                                     setPerQEarned((prev) => ({
//                                       ...prev,
//                                       [qx.question_id]: Number(e.target.value),
//                                     }))
//                                   }
//                                 />
//                                 <span>/ {max}</span>
//                               </div>
//                             </div>

//                             <div className="text-xs text-muted-foreground">
//                               Tip: this overrides auto-grade per question.
//                             </div>
//                           </div>
//                         );
//                       })}

//                       <Separator />

//                       <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 items-end">
//                         <Card className="border-dashed">
//                           <CardHeader className="pb-2">
//                             <CardTitle className="text-sm">Computed total</CardTitle>
//                           </CardHeader>
//                           <CardContent className="text-lg font-semibold">
//                             {computedManualTotal}/{activeSub?.max_score ?? maxScore}
//                           </CardContent>
//                         </Card>

//                         <div className="sm:col-span-2 space-y-2">
//                           <div className="text-xs text-muted-foreground">Feedback</div>
//                           <Input
//                             value={feedbackText}
//                             onChange={(e) => setFeedbackText(e.target.value)}
//                             placeholder="Feedback to student (optional)"
//                           />
//                           <div className="flex items-center gap-2">
//                             <Checkbox
//                               id="reviewed2"
//                               checked={markReviewed}
//                               onCheckedChange={(v) => setMarkReviewed(!!v)}
//                             />
//                             <label htmlFor="reviewed2" className="text-sm text-muted-foreground">
//                               Mark as reviewed
//                             </label>
//                           </div>
//                         </div>
//                       </div>
//                     </>
//                   )}
//                 </div>
//               )}
//             </ScrollArea>

//             <DialogFooter className="gap-2 sm:gap-0">
//               <div className="mr-auto flex flex-wrap items-center gap-2">
//                 {!activeSub?.is_returned ? (
//                   <Button
//                     variant="outline"
//                     onClick={() => handleReturn(activeSub?.id)}
//                     disabled={!activeSub?.id}
//                   >
//                     Return
//                   </Button>
//                 ) : (
//                   <Button
//                     variant="outline"
//                     onClick={() => handleUnreturn(activeSub?.id)}
//                     disabled={!activeSub?.id}
//                   >
//                     Unreturn
//                   </Button>
//                 )}

//                 {modalTab !== "grade" ? (
//                   <div className="flex items-center gap-2">
//                     <span className="text-xs text-muted-foreground">Set Score</span>
//                     <Input
//                       type="number"
//                       className="h-9 w-24"
//                       min={0}
//                       max={activeSub?.max_score ?? maxScore}
//                       value={Number(manualScore)}
//                       onChange={(e) => setManualScore(Number(e.target.value))}
//                     />
//                   </div>
//                 ) : null}
//               </div>

//               <Button onClick={saveManualGrade} disabled={!activeSub?.id}>
//                 Save Grade
//               </Button>
//             </DialogFooter>
//           </DialogContent>
//         </Dialog>
//       </div>
//     </div>
//   );
// }

// {3}

// "use client";

// import { useCallback, useEffect, useMemo, useState } from "react";
// import Link from "next/link";
// import { useRouter, useParams } from "next/navigation";
// import { motion, AnimatePresence } from "framer-motion";
// import {
//   ArrowLeft,
//   ClipboardList,
//   Users,
//   CheckCircle2,
//   BarChart3,
//   Search,
//   Eye,
//   EyeOff,
//   Calculator,
//   Hash,
//   ArrowUpRight,
//   CornerUpLeft,
//   RefreshCcw,
//   Sparkles,
//   X,
//   MoreHorizontal,
//   Image as ImageIcon,
//   Paperclip,
//   Circle,
//   XCircle,
//   FileText,
// } from "lucide-react";

// import { cn } from "@/lib/utils";
// import { getQuiz } from "@/lib/quizzes";

// // ✅ submissions service
// import {
//   listQuizSubmissions,
//   getQuizSubmission,
//   upsertQuizSubmission,
//   returnSubmission,
//   unreturnSubmission,
//   saveGrade,
// } from "@/lib/quizSubmissions";

// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Badge } from "@/components/ui/badge";
// import {
//   Dialog,
//   DialogContent,
//   DialogHeader,
//   DialogTitle,
//   DialogDescription,
//   DialogFooter,
// } from "@/components/ui/dialog";
// import { Separator } from "@/components/ui/separator";
// import { ScrollArea } from "@/components/ui/scroll-area";
// import { Checkbox } from "@/components/ui/checkbox";
// import { Textarea } from "@/components/ui/textarea";

// import {
//   Table,
//   TableBody,
//   TableCell,
//   TableHead,
//   TableHeader,
//   TableRow,
// } from "@/components/ui/table";

// import {
//   DropdownMenu,
//   DropdownMenuContent,
//   DropdownMenuItem,
//   DropdownMenuLabel,
//   DropdownMenuSeparator,
//   DropdownMenuTrigger,
// } from "@/components/ui/dropdown-menu";

// /* -------------------------- helpers -------------------------- */

// const toStr = (v) => String(v ?? "").trim();

// function getPoints(q) {
//   const candidates = [q?.points, q?.point, q?.score, q?.max_points, q?.max];
//   for (const v of candidates) {
//     const n = Number(v);
//     if (Number.isFinite(n) && n > 0) return n;
//   }
//   return 1;
// }

// function calcMaxScore(quiz) {
//   if (!quiz?.questions) return 0;
//   return quiz.questions.reduce((sum, q) => sum + getPoints(q), 0);
// }

// function letterToIndex(s) {
//   if (typeof s !== "string" || !s.trim()) return null;
//   const ch = s.trim().toUpperCase();
//   const code = ch.charCodeAt(0);
//   return code >= 65 && code <= 90 ? code - 65 : null; // A->0
// }

// function parseIndexList(val) {
//   if (Array.isArray(val)) {
//     const out = [];
//     for (const v of val) {
//       if (typeof v === "number" && Number.isInteger(v)) out.push(v);
//       else if (typeof v === "string") {
//         const li = letterToIndex(v);
//         if (li != null) out.push(li);
//         else {
//           const n = Number(v);
//           if (Number.isInteger(n)) out.push(n);
//         }
//       }
//     }
//     return Array.from(new Set(out));
//   }
//   if (typeof val === "number" && Number.isInteger(val)) return [val];
//   if (typeof val === "string" && val.trim()) {
//     const parts = val.split(/[,\s]+/).filter(Boolean);
//     const out = [];
//     for (const p of parts) {
//       const li = letterToIndex(p);
//       if (li != null) out.push(li);
//       else {
//         const n = Number(p);
//         if (Number.isInteger(n)) out.push(n);
//       }
//     }
//     return Array.from(new Set(out));
//   }
//   return [];
// }

// function getCorrectIndices(q) {
//   const tryFields = [
//     q?.correct_answers,
//     q?.correct_answer,
//     q?.correct,
//     q?.answer_indices,
//     q?.answer_index,
//     q?.answer,
//     q?.answer_key,
//   ];
//   for (const f of tryFields) {
//     const parsed = parseIndexList(f);
//     if (parsed.length) return parsed;
//   }
//   if (Array.isArray(q?.choices)) {
//     const idxs = [];
//     q.choices.forEach((opt, i) => {
//       if (opt && (opt.isCorrect === true || opt.correct === true)) idxs.push(i);
//     });
//     if (idxs.length) return idxs;
//   }
//   return [];
// }

// function getExpectedTextList(q) {
//   const pool = [];

//   const singles = [
//     q?.answer_text,
//     q?.correct_text,
//     q?.expected,
//     q?.expected_answer,
//     q?.expected_text,
//   ].filter((x) => typeof x === "string" && x.trim().length);

//   if (singles.length) pool.push(singles[0]);

//   if (Array.isArray(q?.choices)) {
//     q.choices.forEach((c) => {
//       if (typeof c === "string" && c.trim().length) pool.push(c);
//     });
//   }

//   const seen = new Set();
//   const out = [];
//   for (const s of pool) {
//     const t = String(s).trim();
//     if (t && !seen.has(t)) {
//       seen.add(t);
//       out.push(t);
//     }
//   }
//   return out;
// }

// function initialsFromName(name = "") {
//   const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
//   const first = parts[0]?.[0] || "";
//   const last = parts.length > 1 ? parts[parts.length - 1]?.[0] || "" : "";
//   return (first + last).toUpperCase();
// }

// /* ----- Mappers: quiz_attempts.answers -> { [question_id]: value } ---- */

// function normalizeAnswerForQuestion(q, raw) {
//   if (!q) return raw;

//   if (q.question_type === "choice") {
//     const choices = Array.isArray(q.choices) ? q.choices : [];

//     const toIndex = (v) => {
//       if (typeof v === "number" && Number.isInteger(v)) return v;

//       if (typeof v === "string") {
//         const li = letterToIndex(v);
//         if (li != null) return li;

//         let i = choices.indexOf(v);
//         if (i >= 0) return i;

//         const lower = v.toLowerCase();
//         i = choices.findIndex((c) => String(c).toLowerCase() === lower);
//         if (i >= 0) return i;

//         const n = Number(v);
//         if (Number.isInteger(n)) return n;
//       }

//       return null;
//     };

//     let picked = [];
//     if (Array.isArray(raw)) picked = raw.map(toIndex).filter((x) => x != null);
//     else if (raw === 0 || Number.isInteger(raw)) picked = [raw];
//     else {
//       const idx = toIndex(raw);
//       if (idx != null) picked = [idx];
//     }

//     return Array.from(new Set(picked));
//   }

//   return raw;
// }

// function answersFromAttemptAnswers(attemptAnswers, quiz) {
//   if (!attemptAnswers || !quiz?.questions?.length) return {};
//   const out = {};
//   const qs = quiz.questions;

//   for (let i = 0; i < qs.length; i++) {
//     const q = qs[i];
//     const key = `q${i + 1}`;
//     if (!(key in attemptAnswers)) continue;
//     out[q.question_id] = normalizeAnswerForQuestion(q, attemptAnswers[key]);
//   }

//   return out;
// }

// /* ---------- grading ---------- */

// function gradeQuestion(q, ans) {
//   const max = getPoints(q);

//   if (q?.question_type === "choice") {
//     const toIndex = (v) => {
//       if (typeof v === "number" && Number.isInteger(v)) return v;

//       if (typeof v === "string") {
//         const li = letterToIndex(v);
//         if (li != null) return li;

//         const i = Array.isArray(q.choices) ? q.choices.indexOf(v) : -1;
//         if (i >= 0) return i;

//         const lower = v.toLowerCase();
//         const j = Array.isArray(q.choices)
//           ? q.choices.findIndex((c) => String(c).toLowerCase() === lower)
//           : -1;
//         if (j >= 0) return j;

//         const n = Number(v);
//         if (Number.isInteger(n)) return n;
//       }

//       return null;
//     };

//     let picked = [];
//     if (Array.isArray(ans)) picked = ans.map(toIndex).filter((x) => x != null);
//     else if (ans === 0 || Number.isInteger(ans)) picked = [ans];
//     else {
//       const idx = toIndex(ans);
//       if (idx != null) picked = [idx];
//     }
//     picked = Array.from(new Set(picked));

//     const correct = getCorrectIndices(q);
//     const isExactlySame =
//       correct.length === picked.length && correct.every((i) => picked.includes(i));

//     return { earned: isExactlySame ? max : 0, max, picked, correct };
//   }

//   if (q?.question_type === "text") {
//     const expectedList = getExpectedTextList(q);
//     const anyCase = !!q.text_any_case;
//     const norm = (s) =>
//       anyCase ? String(s ?? "").trim().toLowerCase() : String(s ?? "").trim();

//     const a = norm(ans);
//     let ok = false;

//     for (const exp of expectedList) {
//       const e = norm(exp);

//       const an = Number(a);
//       const en = Number(e);
//       if (Number.isFinite(an) && Number.isFinite(en)) {
//         if (Math.abs(an - en) <= 1e-6) {
//           ok = true;
//           break;
//         }
//       }
//       if (a === e) {
//         ok = true;
//         break;
//       }
//     }

//     return { earned: ok ? max : 0, max, picked: ans, correct: expectedList };
//   }

//   return { earned: 0, max, picked: ans, correct: null };
// }

// function autoGrade(quiz, answers) {
//   if (!quiz?.questions) return { score: 0, breakdown: [] };
//   const breakdown = quiz.questions.map((q) => {
//     const a = answers?.[q.question_id];
//     const { earned, max } = gradeQuestion(q, a);
//     return { question_id: q.question_id, earned, max };
//   });
//   const score = breakdown.reduce((s, b) => s + b.earned, 0);
//   return { score, breakdown };
// }

// /* ---------- UI atoms ---------- */

// function Chip({ icon: Icon, children, onClear, title }) {
//   return (
//     <span
//       title={title}
//       className={cn(
//         "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-black",
//         "bg-card/70 backdrop-blur shadow-sm"
//       )}
//     >
//       {Icon ? <Icon className="h-3.5 w-3.5 text-muted-foreground" /> : null}
//       <span className="truncate max-w-[240px]">{children}</span>
//       {onClear ? (
//         <button
//           type="button"
//           onClick={onClear}
//           className="ml-1 rounded-full p-0.5 text-muted-foreground hover:text-foreground"
//           aria-label="Clear"
//           title="Clear"
//         >
//           <X className="h-3.5 w-3.5" />
//         </button>
//       ) : null}
//     </span>
//   );
// }

// function StatCard({ label, value, icon: Icon, hint }) {
//   return (
//     <motion.div
//       whileHover={{ y: -4, scale: 1.01 }}
//       className="rounded-4xl bg-card border border-border shadow-sm p-6 transition-all"
//     >
//       <div className="flex items-start justify-between gap-4">
//         <div className="min-w-0">
//           <div className="text-sm text-muted-foreground font-semibold">{label}</div>
//           <div className="mt-2 text-3xl font-black tracking-tight truncate">{value}</div>
//           {hint ? (
//             <div className="mt-1 text-xs text-muted-foreground font-semibold">{hint}</div>
//           ) : null}
//         </div>
//         <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
//           <Icon className="h-5 w-5 text-primary" />
//         </div>
//       </div>
//     </motion.div>
//   );
// }

// function LoadingRow() {
//   return (
//     <TableRow>
//       <TableCell>
//         <div className="flex items-center gap-2">
//           <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
//           <div>
//             <div className="h-4 w-40 bg-muted rounded animate-pulse" />
//             <div className="mt-2 h-3 w-24 bg-muted rounded animate-pulse" />
//           </div>
//         </div>
//       </TableCell>
//       <TableCell className="hidden md:table-cell">
//         <div className="h-4 w-36 bg-muted rounded animate-pulse" />
//       </TableCell>
//       <TableCell>
//         <div className="h-6 w-24 bg-muted rounded animate-pulse" />
//       </TableCell>
//       <TableCell className="hidden lg:table-cell">
//         <div className="h-6 w-20 bg-muted rounded animate-pulse" />
//       </TableCell>
//       <TableCell className="text-right">
//         <div className="ml-auto h-9 w-9 rounded-2xl bg-muted animate-pulse" />
//       </TableCell>
//     </TableRow>
//   );
// }

// /* ---------- attachments UI (no emoji) ---------- */

// function AttachmentBlock({ images = [], files = [] }) {
//   const hasImgs = Array.isArray(images) && images.length > 0;
//   const hasFiles = Array.isArray(files) && files.length > 0;
//   if (!hasImgs && !hasFiles) return null;

//   return (
//     <div className="mt-4 space-y-4">
//       {hasImgs ? (
//         <div className="space-y-2">
//           <div className="text-xs text-muted-foreground flex items-center gap-2 font-semibold">
//             <span className="inline-flex h-8 w-8 items-center justify-center rounded-2xl bg-primary/10 text-primary">
//               <ImageIcon className="h-4 w-4" />
//             </span>
//             Images
//           </div>

//           <div className="flex flex-wrap gap-2">
//             {images.map((img, i) => {
//               const src = img?.public_url || img?.url || img?.path;
//               return (
//                 <a
//                   key={i}
//                   href={src || "#"}
//                   target="_blank"
//                   rel="noreferrer"
//                   className={cn(
//                     "block h-24 w-32 overflow-hidden rounded-2xl border bg-muted/30 shadow-sm transition",
//                     src ? "hover:ring-2 hover:ring-primary/25 hover:bg-muted/40" : "pointer-events-none opacity-70"
//                   )}
//                   title={img?.name || "Image"}
//                 >
//                   {src ? (
//                     // eslint-disable-next-line @next/next/no-img-element
//                     <img
//                       src={src}
//                       alt={img?.name || `image-${i}`}
//                       className="h-full w-full object-cover"
//                       onError={(e) => {
//                         e.currentTarget.style.display = "none";
//                       }}
//                     />
//                   ) : (
//                     <div className="flex h-full w-full items-center justify-center text-[11px] text-muted-foreground">
//                       No preview
//                     </div>
//                   )}
//                 </a>
//               );
//             })}
//           </div>
//         </div>
//       ) : null}

//       {hasFiles ? (
//         <div className="space-y-2">
//           <div className="text-xs text-muted-foreground flex items-center gap-2 font-semibold">
//             <span className="inline-flex h-8 w-8 items-center justify-center rounded-2xl bg-muted text-foreground">
//               <Paperclip className="h-4 w-4" />
//             </span>
//             Files
//           </div>

//           <ul className="space-y-2">
//             {files.map((f, i) => {
//               const href = f?.public_url || f?.url;
//               const label = f?.name || f?.path || `file-${i}`;
//               const meta = [f?.mime, f?.size ? `${Math.round((f.size / 1024) * 10) / 10} KB` : null]
//                 .filter(Boolean)
//                 .join(" • ");

//               return (
//                 <li key={i}>
//                   {href ? (
//                     <a
//                       href={href}
//                       target="_blank"
//                       rel="noreferrer"
//                       className="inline-flex w-full items-center justify-between gap-3 rounded-2xl border bg-background px-3 py-2 text-sm hover:bg-muted/40 transition"
//                       title={label}
//                     >
//                       <span className="inline-flex items-center gap-2 min-w-0">
//                         <FileText className="h-4 w-4 text-muted-foreground" />
//                         <span className="truncate">{label}</span>
//                       </span>
//                       {meta ? <span className="text-xs text-muted-foreground shrink-0">{meta}</span> : null}
//                     </a>
//                   ) : (
//                     <span className="inline-flex w-full items-center justify-between gap-3 rounded-2xl border bg-muted/30 px-3 py-2 text-sm">
//                       <span className="inline-flex items-center gap-2 min-w-0">
//                         <FileText className="h-4 w-4 text-muted-foreground" />
//                         <span className="truncate">{label}</span>
//                       </span>
//                       {meta ? <span className="text-xs text-muted-foreground shrink-0">{meta}</span> : null}
//                     </span>
//                   )}
//                 </li>
//               );
//             })}
//           </ul>
//         </div>
//       ) : null}
//     </div>
//   );
// }

// /* -------------------------------- page -------------------------------- */

// export default function AssessmentViewPage() {
//   const router = useRouter();
//   const params = useParams();
//   const quizId = toStr(params?.id);

//   // Access control (client-only due to localStorage)
//   const currentUser = useMemo(() => {
//     try {
//       return JSON.parse(localStorage.getItem("currentUser") || "{}");
//     } catch {
//       return {};
//     }
//   }, []);
//   const adminLevel = currentUser?.admin_level || "";
//   const adminRole = String(currentUser?.admin_role || "").toLowerCase();
//   const adminAccess = currentUser?.admin_access || {};
//   const isSuperAdmin = adminLevel === "Super Admin";
//   const isFaculty = adminRole === "faculty";
//   const canEditQuiz = isSuperAdmin || (isFaculty && adminAccess?.quizzes_edit === true);

//   const [quiz, setQuiz] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState("");

//   const [activeTab, setActiveTab] = useState("quiz"); // quiz | submissions

//   const [q, setQ] = useState("");
//   const [debQ, setDebQ] = useState("");

//   const [previewOpen, setPreviewOpen] = useState(false);

//   // ✅ submissions state
//   const [subs, setSubs] = useState([]);
//   const [loadingSubs, setLoadingSubs] = useState(true);
//   const [activeSub, setActiveSub] = useState(null);

//   // modal tab: summary | answers | grade
//   const [modalTab, setModalTab] = useState("summary");

//   // grading states
//   const [gradingAll, setGradingAll] = useState(false);
//   const [manualScore, setManualScore] = useState(0);
//   const [perQEarned, setPerQEarned] = useState({});
//   const [feedbackText, setFeedbackText] = useState("");
//   const [markReviewed, setMarkReviewed] = useState(false);

//   useEffect(() => {
//     const t = setTimeout(() => setDebQ(q.trim().toLowerCase()), 250);
//     return () => clearTimeout(t);
//   }, [q]);

//   useEffect(() => {
//     (async () => {
//       setLoading(true);
//       setError("");
//       try {
//         if (!quizId) throw new Error("Missing assessment id in URL.");
//         const qz = await getQuiz(quizId);
//         setQuiz(qz);
//       } catch (e) {
//         console.error(e);
//         setError(e?.message || "Failed to load assessment.");
//       } finally {
//         setLoading(false);
//       }
//     })();
//   }, [quizId]);

//   const maxScore = useMemo(() => calcMaxScore(quiz), [quiz]);
//   const visibility = useMemo(() => {
//     return String(quiz?.visibility || "").toLowerCase() === "public" ? "public" : "private";
//   }, [quiz]);

//   const hrefId = quiz?.quiz_id || quizId;
//   const canNavigate = !!toStr(hrefId);

//   // ✅ load submissions list (attempts)
//   useEffect(() => {
//     (async () => {
//       if (!quizId) return;
//       setLoadingSubs(true);
//       try {
//         const items = await listQuizSubmissions(quizId);

//         const normalized = (items || []).map((r) => {
//           const answers =
//             r.answers && Object.keys(r.answers).length
//               ? answersFromAttemptAnswers(r.answers, quiz)
//               : {};

//           const display_name = r.user?.display_name || "—";
//           const computed = quiz ? autoGrade(quiz, answers).score : 0;

//           return {
//             ...r,
//             id: r.id,
//             display_name,
//             answers,
//             score:
//               Number.isFinite(Number(r.score ?? r.correct))
//                 ? Number(r.score ?? r.correct)
//                 : computed,
//             max_score: Number(r.total ?? calcMaxScore(quiz)),
//             submitted_at: r.finished_at || null,
//             feedback: r.feedback || "",
//             status: r.status || "pending_review",
//             is_returned: !!r.is_returned,
//             returned_at: r.returned_at || null,
//           };
//         });

//         setSubs(normalized);
//       } catch (e) {
//         console.error(e);
//       } finally {
//         setLoadingSubs(false);
//       }
//     })();
//   }, [quizId, quiz]);

//   const displayedSubs = useMemo(() => {
//     let arr = subs.slice();
//     if (debQ) {
//       arr = arr.filter((s) => String(s.display_name || "").toLowerCase().includes(debQ));
//     }
//     arr.sort((a, b) => new Date(b.submitted_at || 0) - new Date(a.submitted_at || 0));
//     return arr;
//   }, [subs, debQ]);

//   const avgScore = useMemo(() => {
//     if (!displayedSubs.length) return 0;
//     const sum = displayedSubs.reduce((s, x) => s + (Number(x.score) || 0), 0);
//     return Math.round((sum / displayedSubs.length) * 100) / 100;
//   }, [displayedSubs]);

//   const returnedCount = useMemo(() => {
//     return displayedSubs.reduce((acc, s) => acc + (s.is_returned ? 1 : 0), 0);
//   }, [displayedSubs]);

//   const openSubmission = async (attempt_id) => {
//     try {
//       const sRaw = await getQuizSubmission(attempt_id);
//       if (!sRaw) return;

//       const display_name = sRaw?.user?.display_name || "—";

//       const fromAttempt =
//         sRaw?.answers && Object.keys(sRaw.answers).length
//           ? answersFromAttemptAnswers(sRaw.answers, quiz)
//           : {};

//       const computed = quiz ? autoGrade(quiz, fromAttempt).score : 0;

//       const s = {
//         ...sRaw,
//         id: sRaw.id,
//         display_name,
//         answers: fromAttempt,
//         score:
//           Number.isFinite(Number(sRaw.score ?? sRaw.correct))
//             ? Number(sRaw.score ?? sRaw.correct)
//             : computed,
//         max_score: Number(sRaw.total ?? maxScore),
//         submitted_at: sRaw.finished_at || null,
//         feedback: sRaw.feedback || "",
//         reviewed: (sRaw.status || "").toLowerCase() === "reviewed",
//         status: sRaw.status || "pending_review",
//         is_returned: !!sRaw.is_returned,
//         returned_at: sRaw.returned_at || null,
//       };

//       setActiveSub(s);
//       setModalTab("summary");
//       setManualScore(s.score ?? 0);
//       setFeedbackText(s.feedback ?? "");
//       setMarkReviewed(!!s.reviewed);

//       const breakdown = quiz ? autoGrade(quiz, s.answers || {}).breakdown : [];
//       const dict = {};
//       breakdown.forEach((b) => (dict[b.question_id] = b.earned));
//       setPerQEarned(dict);
//     } catch (e) {
//       console.error(e);
//     }
//   };

//   const onKeyDown = useCallback((e) => {
//     if (e.key === "Escape") {
//       setPreviewOpen(false);
//       setActiveSub(null);
//     }
//   }, []);

//   useEffect(() => {
//     window.addEventListener("keydown", onKeyDown);
//     return () => window.removeEventListener("keydown", onKeyDown);
//   }, [onKeyDown]);

//   // auto grade one + persist score
//   const autoGradeOne = async (submission) => {
//     if (!quiz) return;
//     try {
//       const { score } = autoGrade(quiz, submission.answers || {});
//       const patch = {
//         id: submission.id,
//         quiz_id: quizId,
//         user_id: submission.user_id,
//         answers: submission.answers || {},
//         score,
//         max_score: submission.max_score ?? maxScore,
//         feedback: submission.feedback ?? null,
//       };
//       const saved = await upsertQuizSubmission(patch);

//       const normalized = {
//         ...submission,
//         score: patch.score,
//         max_score: patch.max_score,
//         id: saved.id,
//       };

//       setSubs((prev) => prev.map((x) => (x.id === normalized.id ? normalized : x)));
//       if (activeSub?.id === normalized.id) setActiveSub((p) => ({ ...p, ...normalized }));
//     } catch (e) {
//       console.error(e);
//       alert("Failed to auto grade this submission.");
//     }
//   };

//   // bulk auto grade currently listed
//   const autoGradeAll = async () => {
//     if (!quiz || displayedSubs.length === 0) return;
//     setGradingAll(true);
//     try {
//       for (const s of displayedSubs) {
//         const { score } = autoGrade(quiz, s.answers || {});
//         const patch = {
//           id: s.id,
//           quiz_id: (quizId || "").toLowerCase(),
//           user_id: s.user_id,
//           answers: s.answers || {},
//           score,
//           max_score: s.max_score ?? maxScore,
//           feedback: s.feedback ?? null,
//         };
//         const saved = await upsertQuizSubmission(patch);
//         const normalized = { ...s, score: patch.score, max_score: patch.max_score, id: saved.id };

//         setSubs((prev) => prev.map((x) => (x.id === normalized.id ? normalized : x)));
//         if (activeSub?.id === normalized.id) setActiveSub((p) => ({ ...p, ...normalized }));
//       }
//     } catch (e) {
//       console.error(e);
//       alert("Auto grading (bulk) encountered an error.");
//     } finally {
//       setGradingAll(false);
//     }
//   };

//   // computed total from per-question inputs
//   const computedManualTotal = useMemo(() => {
//     if (!quiz?.questions?.length) return 0;
//     return quiz.questions.reduce((sum, qx) => {
//       const val = Number(perQEarned[qx.question_id] ?? 0);
//       const capped = Math.max(0, Math.min(val, getPoints(qx)));
//       return sum + capped;
//     }, 0);
//   }, [perQEarned, quiz]);

//   const saveManualGrade = async () => {
//     if (!activeSub) return;

//     const finalScore = modalTab === "grade" ? computedManualTotal : Number(manualScore || 0);
//     const bounded = Math.max(0, Math.min(finalScore, activeSub.max_score ?? maxScore));

//     try {
//       const saved = await saveGrade(activeSub.id, {
//         score: bounded,
//         feedback: feedbackText || "",
//         reviewed: !!markReviewed,
//       });

//       const normalized = {
//         ...activeSub,
//         score: bounded,
//         feedback: feedbackText || "",
//         status: saved?.status ?? (markReviewed ? "reviewed" : activeSub.status),
//         reviewed: !!markReviewed,
//       };

//       setSubs((prev) => prev.map((x) => (x.id === normalized.id ? normalized : x)));
//       setActiveSub(normalized);
//     } catch (e) {
//       console.error(e);
//       alert("Failed to save grade.");
//     }
//   };

//   const handleReturn = async (attempt_id) => {
//     try {
//       const saved = await returnSubmission(attempt_id, { feedback: feedbackText });

//       setSubs((prev) =>
//         prev.map((x) =>
//           x.id === attempt_id
//             ? {
//                 ...x,
//                 is_returned: true,
//                 returned_at: saved.returned_at,
//                 feedback: saved.feedback,
//                 status: "returned",
//               }
//             : x
//         )
//       );

//       if (activeSub?.id === attempt_id) {
//         setActiveSub((p) => ({
//           ...p,
//           is_returned: true,
//           returned_at: saved.returned_at,
//           feedback: saved.feedback,
//           status: "returned",
//         }));
//       }
//     } catch (e) {
//       console.error(e);
//       alert("Failed to return submission.");
//     }
//   };

//   const handleUnreturn = async (attempt_id) => {
//     try {
//       await unreturnSubmission(attempt_id);

//       setSubs((prev) =>
//         prev.map((x) =>
//           x.id === attempt_id
//             ? { ...x, is_returned: false, returned_at: null, status: "pending_review" }
//             : x
//         )
//       );

//       if (activeSub?.id === attempt_id) {
//         setActiveSub((p) => ({
//           ...p,
//           is_returned: false,
//           returned_at: null,
//           status: "pending_review",
//         }));
//       }
//     } catch (e) {
//       console.error(e);
//       alert("Failed to unreturn submission.");
//     }
//   };

//   const clearSearch = () => setQ("");

//   const pageSubtitle = useMemo(() => {
//     const status = String(quiz?.status || "").trim();
//     return status ? `Status: ${status}` : "Assessment overview and grading";
//   }, [quiz]);

//   return (
//     <div className="min-h-screen bg-muted/30">
//       <div className="w-full px-4 py-6 md:px-8 md:py-8 space-y-8">
//         {/* ===== HERO ===== */}
//         <section className="relative overflow-hidden rounded-4xl border border-border bg-gradient-to-b from-background via-background to-background">
//           <motion.div
//             aria-hidden
//             initial={{ opacity: 0 }}
//             animate={{ opacity: 1 }}
//             transition={{ duration: 0.8 }}
//             className="pointer-events-none absolute -left-44 -top-32 w-[520px] h-[520px] rounded-full bg-gradient-to-tr from-primary/25 to-secondary/25 blur-3xl mix-blend-screen"
//           />
//           <motion.div
//             aria-hidden
//             className="pointer-events-none absolute -right-32 bottom-8 w-80 h-80 rounded-full bg-gradient-to-br from-accent/20 to-primary/10 blur-3xl mix-blend-screen"
//             initial={{ scale: 0.9, opacity: 0 }}
//             animate={{ scale: 1.05, opacity: 1 }}
//             transition={{
//               duration: 1.2,
//               repeat: Infinity,
//               repeatType: "mirror",
//               ease: "easeInOut",
//             }}
//           />

//           <div className="relative p-6 sm:p-8">
//             <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
//               <div className="max-w-4xl">
//                 <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-black mb-5">
//                   <Sparkles className="h-4 w-4" />
//                   Admin • Assessment View
//                 </div>

//                 <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
//                   {loading ? (
//                     <span className="inline-block h-10 w-[320px] bg-muted rounded-2xl animate-pulse" />
//                   ) : (
//                     <span className="truncate block">
//                       {quiz?.quiz_title || "Untitled Assessment"}
//                     </span>
//                   )}
//                 </h1>

//                 <p className="mt-4 text-muted-foreground text-lg font-semibold leading-relaxed">
//                   {loading ? (
//                     <span className="inline-block h-5 w-[520px] bg-muted rounded-2xl animate-pulse" />
//                   ) : (
//                     quiz?.quiz_description || pageSubtitle
//                   )}
//                 </p>

//                 <div className="mt-6 flex flex-wrap gap-2">
//                   <Chip icon={visibility === "public" ? Eye : EyeOff} title="Visibility">
//                     {visibility}
//                   </Chip>

//                   {quiz?.status ? (
//                     <Chip icon={Hash} title="Status">
//                       {String(quiz.status)}
//                     </Chip>
//                   ) : null}

//                   {debQ ? (
//                     <Chip icon={Search} title="Submission filter" onClear={clearSearch}>
//                       {debQ}
//                     </Chip>
//                   ) : (
//                     <Chip icon={Search} title="Tip">
//                       Search submissions by student name
//                     </Chip>
//                   )}

//                   {quiz?.track_id ? (
//                     <Chip icon={Hash} title="Track">
//                       track_id: {quiz.track_id}
//                     </Chip>
//                   ) : null}

//                   {quiz?.subject_id ? (
//                     <Chip icon={Hash} title="Subject">
//                       subject_id: {quiz.subject_id}
//                     </Chip>
//                   ) : null}

//                   {quiz?.course_id ? (
//                     <Chip icon={Hash} title="Course">
//                       course_id: {quiz.course_id}
//                     </Chip>
//                   ) : null}
//                 </div>
//               </div>

//               <div className="flex flex-wrap items-center gap-3">
//                 <Button variant="outline" className="rounded-2xl font-black" onClick={() => router.back()}>
//                   <ArrowLeft className="mr-2 h-4 w-4" />
//                   Back
//                 </Button>

//                 <Link href={canNavigate ? `/admin/assessments/${hrefId}` : "#"} aria-disabled={!canNavigate}>
//                   <Button variant="secondary" className="rounded-2xl font-black" disabled={!canNavigate}>
//                     <ClipboardList className="mr-2 h-4 w-4" />
//                     Submissions Page
//                   </Button>
//                 </Link>

//                 <Button
//                   variant="outline"
//                   className="rounded-2xl font-black"
//                   onClick={() => setPreviewOpen(true)}
//                   disabled={!quiz}
//                 >
//                   Preview
//                 </Button>

//                 {canEditQuiz ? (
//                   <Link href={canNavigate ? `/admin/quizzes/${hrefId}/edit` : "#"}>
//                     <Button className="rounded-2xl font-black" disabled={!canNavigate}>
//                       Edit Assessment
//                     </Button>
//                   </Link>
//                 ) : null}
//               </div>
//             </div>

//             {/* stat tiles */}
//             <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
//               <StatCard
//                 label="Submissions"
//                 value={loadingSubs ? "…" : displayedSubs.length}
//                 icon={Users}
//                 hint="Filtered"
//               />
//               <StatCard label="Max Score" value={maxScore} icon={CheckCircle2} />
//               <StatCard label="Average Score" value={loadingSubs ? "…" : avgScore} icon={BarChart3} />
//               <StatCard
//                 label="Returned"
//                 value={loadingSubs ? "…" : returnedCount}
//                 icon={visibility === "public" ? Eye : EyeOff}
//                 hint="Visible to students"
//               />
//             </div>
//           </div>
//         </section>

//         {/* ===== TABS ===== */}
//         <div className="flex flex-wrap gap-2">
//           <Button
//             variant={activeTab === "quiz" ? "default" : "secondary"}
//             className="rounded-2xl font-black gap-2"
//             onClick={() => setActiveTab("quiz")}
//           >
//             <Hash className="h-4 w-4" />
//             Quiz
//           </Button>

//           <Button
//             variant={activeTab === "submissions" ? "default" : "secondary"}
//             className="rounded-2xl font-black gap-2"
//             onClick={() => setActiveTab("submissions")}
//           >
//             <Users className="h-4 w-4" />
//             Submissions
//             <Badge variant="outline" className="ml-1 rounded-full">
//               {loadingSubs ? "…" : displayedSubs.length}
//             </Badge>
//           </Button>
//         </div>

//         {/* ===== CONTENT ===== */}
//         {activeTab === "quiz" ? (
//           <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
//             {/* Details */}
//             <div className="xl:col-span-2 space-y-6">
//               <Card className="rounded-4xl border-border shadow-sm overflow-hidden">
//                 <CardHeader className="border-b bg-muted/20">
//                   <CardTitle className="text-2xl font-black tracking-tight">Assessment Details</CardTitle>
//                   <CardDescription className="font-semibold">
//                     Loaded via @/lib/quizzes.js → /api/quizzes/[id]
//                   </CardDescription>
//                 </CardHeader>

//                 <CardContent className="p-6 sm:p-7">
//                   {loading ? (
//                     <div className="space-y-3">
//                       <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
//                       <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
//                       <div className="h-24 w-full animate-pulse rounded bg-muted" />
//                     </div>
//                   ) : error ? (
//                     <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-destructive font-semibold">
//                       {error}
//                     </div>
//                   ) : (
//                     <div className="space-y-5">
//                       <div className="flex flex-wrap gap-2">
//                         <Badge
//                           className={cn(
//                             "rounded-full font-black",
//                             visibility === "public"
//                               ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-50"
//                               : "bg-muted text-muted-foreground hover:bg-muted"
//                           )}
//                         >
//                           {visibility === "public" ? <Eye className="mr-1 h-3.5 w-3.5" /> : <EyeOff className="mr-1 h-3.5 w-3.5" />}
//                           {visibility}
//                         </Badge>

//                         {quiz?.created_at ? (
//                           <Badge variant="outline" className="rounded-full font-semibold">
//                             Created {new Date(quiz.created_at).toLocaleDateString()}
//                           </Badge>
//                         ) : null}
//                         {quiz?.updated_at ? (
//                           <Badge variant="outline" className="rounded-full font-semibold">
//                             Updated {new Date(quiz.updated_at).toLocaleDateString()}
//                           </Badge>
//                         ) : null}
//                       </div>

//                       <Separator />

//                       <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
//                         <Card className="rounded-4xl border-dashed shadow-sm">
//                           <CardHeader className="pb-2">
//                             <CardTitle className="flex items-center gap-2 text-base font-black">
//                               <Users className="h-4 w-4 text-primary" /> Submissions
//                             </CardTitle>
//                           </CardHeader>
//                           <CardContent className="text-2xl font-black">
//                             {loadingSubs ? "…" : displayedSubs.length}
//                           </CardContent>
//                         </Card>

//                         <Card className="rounded-4xl border-dashed shadow-sm">
//                           <CardHeader className="pb-2">
//                             <CardTitle className="flex items-center gap-2 text-base font-black">
//                               <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Max Score
//                             </CardTitle>
//                           </CardHeader>
//                           <CardContent className="text-2xl font-black">{maxScore}</CardContent>
//                         </Card>

//                         <Card className="rounded-4xl border-dashed shadow-sm">
//                           <CardHeader className="pb-2">
//                             <CardTitle className="flex items-center gap-2 text-base font-black">
//                               <BarChart3 className="h-4 w-4 text-amber-600" /> Avg Score
//                             </CardTitle>
//                           </CardHeader>
//                           <CardContent className="text-2xl font-black">{loadingSubs ? "…" : avgScore}</CardContent>
//                         </Card>
//                       </div>

//                       <div className="rounded-4xl border bg-muted/20 p-4">
//                         <div className="text-sm font-black">Notes</div>
//                         <div className="mt-2 text-sm text-muted-foreground font-semibold leading-relaxed">
//                           Use <span className="font-black text-foreground">Submissions</span> to grade, return/unreturn, and
//                           save feedback. The answer key below is always based on the current quiz questions.
//                         </div>
//                       </div>
//                     </div>
//                   )}
//                 </CardContent>
//               </Card>

//               {/* Full Answer Key */}
//               <Card className="rounded-4xl border-border shadow-sm overflow-hidden">
//                 <CardHeader className="border-b bg-muted/20">
//                   <CardTitle className="text-2xl font-black tracking-tight">Answer Key</CardTitle>
//                   <CardDescription className="font-semibold">
//                     Correct answers are highlighted. Attachments included.
//                   </CardDescription>
//                 </CardHeader>

//                 <CardContent className="p-6 sm:p-7">
//                   {!quiz?.questions?.length ? (
//                     <div className="py-10 text-center">
//                       <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-black">
//                         <Sparkles className="h-4 w-4" />
//                         No questions
//                       </div>
//                       <p className="mt-4 text-muted-foreground font-semibold">Add questions to show an answer key.</p>
//                     </div>
//                   ) : (
//                     <div className="space-y-4">
//                       {quiz.questions.map((qq, i) => {
//                         const pts = getPoints(qq);
//                         const enableMath = !!qq.enable_math;
//                         const allowMultiple = qq.question_type === "choice" ? !!qq.allow_multiple : false;
//                         const anyCase = qq.question_type === "text" ? !!qq.text_any_case : false;
//                         const correctIdx = getCorrectIndices(qq);

//                         return (
//                           <div
//                             key={qq.question_id || i}
//                             id={`q-${i + 1}`}
//                             className="rounded-4xl border bg-background p-5 shadow-sm"
//                           >
//                             <div className="mb-3 flex items-start justify-between gap-3">
//                               <div className="flex items-start gap-3 min-w-0">
//                                 <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-2xl bg-primary text-primary-foreground text-sm font-black shrink-0">
//                                   {i + 1}
//                                 </div>

//                                 <div className="min-w-0">
//                                   <div className="font-black truncate">
//                                     {qq.question_text || "(Untitled Question)"}
//                                   </div>

//                                   <div className="mt-2 flex flex-wrap gap-2">
//                                     <Badge variant="secondary" className="rounded-full font-black capitalize">
//                                       {qq.question_type || "unknown"}
//                                     </Badge>

//                                     <Badge variant={enableMath ? "default" : "outline"} className="rounded-full font-black gap-1">
//                                       <Calculator className="h-3.5 w-3.5" />
//                                       Math {enableMath ? "On" : "Off"}
//                                     </Badge>

//                                     {qq.question_type === "choice" ? (
//                                       <Badge variant={allowMultiple ? "default" : "outline"} className="rounded-full font-black">
//                                         {allowMultiple ? "Multiple answers" : "Single answer"}
//                                       </Badge>
//                                     ) : null}

//                                     {qq.question_type === "text" ? (
//                                       <Badge variant={anyCase ? "default" : "outline"} className="rounded-full font-black">
//                                         Any case {anyCase ? "On" : "Off"}
//                                       </Badge>
//                                     ) : null}

//                                     {qq.difficulty ? (
//                                       <Badge variant="outline" className="rounded-full font-semibold capitalize">
//                                         {qq.difficulty}
//                                       </Badge>
//                                     ) : null}
//                                   </div>
//                                 </div>
//                               </div>

//                               <div className="text-xs text-muted-foreground font-semibold shrink-0">
//                                 {pts} pt{pts > 1 ? "s" : ""}
//                               </div>
//                             </div>

//                             {qq.question_type === "choice" ? (
//                               <ul className="space-y-2">
//                                 {(qq.choices || []).map((opt, idx) => {
//                                   const isCorrect = correctIdx.includes(idx);

//                                   return (
//                                     <li
//                                       key={idx}
//                                       className={cn(
//                                         "flex items-center gap-2 rounded-2xl border px-3 py-2.5",
//                                         isCorrect
//                                           ? "border-emerald-200 bg-emerald-50 text-emerald-800"
//                                           : "border-muted bg-muted/30"
//                                       )}
//                                     >
//                                       {isCorrect ? (
//                                         <CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0" />
//                                       ) : (
//                                         <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
//                                       )}
//                                       <span className="text-sm font-semibold">
//                                         {opt || <i className="text-muted-foreground font-semibold">Empty option</i>}
//                                       </span>
//                                     </li>
//                                   );
//                                 })}
//                               </ul>
//                             ) : qq.question_type === "text" ? (
//                               <div className="space-y-2">
//                                 <div className="text-xs text-muted-foreground font-semibold">Acceptable Answers</div>
//                                 <div className="rounded-3xl border bg-muted/20 p-4 text-sm font-semibold">
//                                   {getExpectedTextList(qq).length ? (
//                                     <div className="space-y-1">
//                                       {getExpectedTextList(qq).map((t, k) => (
//                                         <div key={k}>{t}</div>
//                                       ))}
//                                     </div>
//                                   ) : (
//                                     <i className="text-muted-foreground font-semibold">(none)</i>
//                                   )}
//                                 </div>
//                               </div>
//                             ) : qq.question_type === "rating" ? (
//                               <div className="text-sm font-semibold">
//                                 Rating scale: <span className="font-black">1</span> –{" "}
//                                 <span className="font-black">{qq.rating_max || 5}</span>
//                               </div>
//                             ) : qq.question_type === "likert" ? (
//                               <div className="text-sm font-semibold">
//                                 <div>Rows: {(qq.likert_rows || []).join(", ") || "—"}</div>
//                                 <div>Columns: {(qq.likert_cols || []).join(", ") || "—"}</div>
//                               </div>
//                             ) : (
//                               <div className="text-sm text-muted-foreground font-semibold">Unsupported question type.</div>
//                             )}

//                             <AttachmentBlock images={qq.images} files={qq.files} />
//                           </div>
//                         );
//                       })}
//                     </div>
//                   )}
//                 </CardContent>
//               </Card>
//             </div>

//             {/* Right column: jump + quick actions */}
//             <div className="space-y-6">
//               <Card className="rounded-4xl border-border shadow-sm overflow-hidden">
//                 <CardHeader className="border-b bg-muted/20">
//                   <CardTitle className="text-xl font-black">Jump to Question</CardTitle>
//                   <CardDescription className="font-semibold">Quick navigation.</CardDescription>
//                 </CardHeader>

//                 <CardContent className="p-4">
//                   {!quiz?.questions?.length ? (
//                     <div className="text-sm text-muted-foreground font-semibold">No questions.</div>
//                   ) : (
//                     <div className="space-y-2">
//                       {quiz.questions.map((qq, idx) => (
//                         <a
//                           key={qq.question_id || idx}
//                           href={`#q-${idx + 1}`}
//                           className="flex items-center justify-between rounded-3xl border bg-background px-3 py-2 text-sm hover:bg-muted/30 transition"
//                         >
//                           <span className="truncate font-semibold">
//                             {idx + 1}. {qq.question_text || "(Untitled)"}
//                           </span>
//                           <span className="ml-3 shrink-0 text-xs text-muted-foreground font-semibold">
//                             {getPoints(qq)} pt
//                           </span>
//                         </a>
//                       ))}
//                     </div>
//                   )}
//                 </CardContent>
//               </Card>

//               <Card className="rounded-4xl border-border shadow-sm overflow-hidden">
//                 <CardHeader className="border-b bg-muted/20">
//                   <CardTitle className="text-xl font-black">Quick Actions</CardTitle>
//                   <CardDescription className="font-semibold">Common admin tasks.</CardDescription>
//                 </CardHeader>
//                 <CardContent className="p-5 space-y-3">
//                   <Button
//                     variant="outline"
//                     className="w-full rounded-2xl font-black justify-start"
//                     onClick={() => setActiveTab("submissions")}
//                   >
//                     <Users className="mr-2 h-4 w-4" />
//                     Go to Submissions
//                   </Button>

//                   <Link href={canNavigate ? `/admin/assessments/view/${hrefId}` : "#"} aria-disabled={!canNavigate}>
//                     <Button
//                       variant="secondary"
//                       className="w-full rounded-2xl font-black justify-start"
//                       disabled={!canNavigate}
//                     >
//                       <ArrowUpRight className="mr-2 h-4 w-4" />
//                       Open Submissions Page
//                     </Button>
//                   </Link>

//                   <Button
//                     className="w-full rounded-2xl font-black justify-start"
//                     onClick={() => setPreviewOpen(true)}
//                     disabled={!quiz}
//                   >
//                     Preview Assessment
//                   </Button>
//                 </CardContent>
//               </Card>
//             </div>
//           </div>
//         ) : (
//           /* ===== SUBMISSIONS TAB ===== */
//           <div className="rounded-4xl bg-card border border-border shadow-sm overflow-hidden">
//             <div className="p-6 sm:p-7 border-b border-border">
//               <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
//                 <div>
//                   <h2 className="text-2xl font-black tracking-tight">Submissions</h2>
//                   <p className="mt-2 text-muted-foreground font-semibold">
//                     Review answers, auto-grade, and return/unreturn submissions.
//                   </p>
//                 </div>

//                 <div className="flex flex-wrap items-center gap-2">
//                   <Button
//                     variant="outline"
//                     className="rounded-2xl font-black"
//                     onClick={autoGradeAll}
//                     disabled={gradingAll || loadingSubs || !quiz || displayedSubs.length === 0}
//                     title="Auto grade all currently listed submissions using the answer key"
//                   >
//                     {gradingAll ? (
//                       <>
//                         <RefreshCcw className="mr-2 h-4 w-4 animate-spin" />
//                         Auto Grading…
//                       </>
//                     ) : (
//                       <>
//                         <CheckCircle2 className="mr-2 h-4 w-4" />
//                         Auto Grade (filtered)
//                       </>
//                     )}
//                   </Button>

//                   <Link href={canNavigate ? `/admin/assessments/view/${hrefId}` : "#"}>
//                     <Button className="rounded-2xl font-black" disabled={!canNavigate}>
//                       <ArrowUpRight className="mr-2 h-4 w-4" />
//                       Open Submissions Page
//                     </Button>
//                   </Link>
//                 </div>
//               </div>

//               <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
//                 <div className="relative w-full lg:max-w-md">
//                   <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
//                   <Input
//                     value={q}
//                     onChange={(e) => setQ(e.target.value)}
//                     placeholder="Search student..."
//                     className="pl-9 pr-10 rounded-2xl font-semibold"
//                   />
//                   {q ? (
//                     <button
//                       type="button"
//                       onClick={clearSearch}
//                       className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
//                       aria-label="Clear search"
//                       title="Clear search"
//                     >
//                       <X className="h-4 w-4" />
//                     </button>
//                   ) : null}
//                 </div>

//                 <div className="flex flex-wrap items-center gap-2">
//                   <Chip icon={Search} title="Filter">
//                     {debQ ? `"${debQ}"` : "No filter"}
//                   </Chip>
//                   <Chip icon={Eye} title="Returned count">
//                     Returned: {loadingSubs ? "…" : returnedCount}
//                   </Chip>
//                 </div>
//               </div>
//             </div>

//             <div className="p-6 sm:p-7">
//               <div className="rounded-3xl border overflow-hidden">
//                 <Table>
//                   <TableHeader>
//                     <TableRow className="bg-muted/40">
//                       <TableHead>Student</TableHead>
//                       <TableHead className="hidden md:table-cell">Submitted</TableHead>
//                       <TableHead>Score</TableHead>
//                       <TableHead className="hidden lg:table-cell">Visibility</TableHead>
//                       <TableHead className="text-right">Actions</TableHead>
//                     </TableRow>
//                   </TableHeader>

//                   <TableBody>
//                     {loadingSubs ? (
//                       Array.from({ length: 7 }).map((_, i) => <LoadingRow key={i} />)
//                     ) : displayedSubs.length === 0 ? (
//                       <TableRow>
//                         <TableCell colSpan={5} className="py-14 text-center">
//                           <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-black">
//                             <Sparkles className="h-4 w-4" />
//                             No submissions found
//                           </div>
//                           <div className="mt-4 text-muted-foreground font-semibold">
//                             Submissions will appear here when students finish the assessment.
//                           </div>
//                         </TableCell>
//                       </TableRow>
//                     ) : (
//                       displayedSubs.map((s) => {
//                         const score = Number(s.score ?? 0);
//                         const outOf = Number(s.max_score ?? maxScore);
//                         const isReturned = !!s.is_returned;

//                         return (
//                           <TableRow key={s.id} className="hover:bg-primary/5">
//                             <TableCell>
//                               <div className="flex items-center gap-3">
//                                 <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary/10 text-primary text-xs font-black">
//                                   {initialsFromName(s.display_name)}
//                                 </div>

//                                 <div className="min-w-0">
//                                   <div className="font-black truncate max-w-[320px]">
//                                     {s.display_name || "—"}
//                                   </div>
//                                   <div className="text-xs text-muted-foreground font-semibold">
//                                     {String(s.status || "pending_review").replace(/_/g, " ")}
//                                   </div>
//                                 </div>
//                               </div>
//                             </TableCell>

//                             <TableCell className="hidden md:table-cell text-muted-foreground font-semibold">
//                               {s.submitted_at ? new Date(s.submitted_at).toLocaleString() : "—"}
//                             </TableCell>

//                             <TableCell>
//                               <span className="inline-flex items-center gap-2 rounded-2xl border bg-emerald-50 px-3 py-1.5 text-emerald-700 font-black">
//                                 {score}/{outOf}
//                               </span>
//                             </TableCell>

//                             <TableCell className="hidden lg:table-cell">
//                               {isReturned ? (
//                                 <span className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-black bg-emerald-50 text-emerald-700 border-emerald-200">
//                                   <Eye className="h-3.5 w-3.5" />
//                                   Returned
//                                 </span>
//                               ) : (
//                                 <span className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-black bg-muted text-muted-foreground">
//                                   <EyeOff className="h-3.5 w-3.5" />
//                                   Hidden
//                                 </span>
//                               )}
//                             </TableCell>

//                             <TableCell className="text-right">
//                               <DropdownMenu>
//                                 <DropdownMenuTrigger asChild>
//                                   <Button variant="ghost" size="icon" className="rounded-2xl">
//                                     <MoreHorizontal className="h-4 w-4" />
//                                   </Button>
//                                 </DropdownMenuTrigger>

//                                 <DropdownMenuContent align="end">
//                                   <DropdownMenuLabel>Actions</DropdownMenuLabel>
//                                   <DropdownMenuSeparator />

//                                   <DropdownMenuItem onClick={() => openSubmission(s.id)}>
//                                     <ClipboardList className="mr-2 h-4 w-4" />
//                                     View & Grade
//                                   </DropdownMenuItem>

//                                   <DropdownMenuItem onClick={() => autoGradeOne(s)}>
//                                     <CheckCircle2 className="mr-2 h-4 w-4" />
//                                     Auto Grade
//                                   </DropdownMenuItem>

//                                   <DropdownMenuSeparator />

//                                   {!isReturned ? (
//                                     <DropdownMenuItem onClick={() => handleReturn(s.id)}>
//                                       <Eye className="mr-2 h-4 w-4" />
//                                       Return to student
//                                     </DropdownMenuItem>
//                                   ) : (
//                                     <DropdownMenuItem onClick={() => handleUnreturn(s.id)}>
//                                       <EyeOff className="mr-2 h-4 w-4" />
//                                       Unreturn (hide)
//                                     </DropdownMenuItem>
//                                   )}
//                                 </DropdownMenuContent>
//                               </DropdownMenu>
//                             </TableCell>
//                           </TableRow>
//                         );
//                       })
//                     )}
//                   </TableBody>
//                 </Table>
//               </div>
//             </div>
//           </div>
//         )}

//         {/* ===== PREVIEW DIALOG ===== */}
//         <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
//           <DialogContent className="max-w-5xl p-0 overflow-hidden">
//             <div className="relative border-b">
//               <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-violet-50 dark:from-blue-950/30 dark:via-indigo-950/25 dark:to-violet-950/30" />
//               <div className="relative p-6">
//                 <DialogHeader>
//                   <DialogTitle className="text-2xl font-black">Preview</DialogTitle>
//                   <DialogDescription className="font-semibold">Read-only preview.</DialogDescription>
//                 </DialogHeader>

//                 <div className="mt-4 flex items-center gap-2">
//                   <Badge variant="secondary" className="rounded-full font-black">
//                     {quiz?.questions?.length || 0} questions
//                   </Badge>
//                   <Badge variant="outline" className="rounded-full font-semibold">
//                     Max score: {maxScore}
//                   </Badge>
//                 </div>
//               </div>
//             </div>

//             <div className="p-6">
//               <ScrollArea className="max-h-[70vh] pr-4">
//                 {!quiz?.questions?.length ? (
//                   <div className="py-10 text-center text-muted-foreground font-semibold">No questions.</div>
//                 ) : (
//                   <div className="space-y-4">
//                     {quiz.questions.map((qq, i) => {
//                       const pts = getPoints(qq);
//                       const correctIdx = getCorrectIndices(qq);

//                       return (
//                         <div key={qq.question_id || i} className="rounded-4xl border bg-background p-5 shadow-sm">
//                           <div className="mb-3 flex items-start justify-between gap-3">
//                             <div className="flex items-center gap-3 min-w-0">
//                               <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary text-primary-foreground text-sm font-black shrink-0">
//                                 {i + 1}
//                               </div>
//                               <div className="font-black truncate">{qq.question_text || "(Untitled)"}</div>
//                             </div>
//                             <div className="text-xs text-muted-foreground font-semibold shrink-0">
//                               {pts} pt{pts > 1 ? "s" : ""}
//                             </div>
//                           </div>

//                           {qq.question_type === "choice" ? (
//                             <ul className="space-y-2">
//                               {(qq.choices || []).map((opt, idx) => {
//                                 const isCorrect = correctIdx.includes(idx);
//                                 return (
//                                   <li
//                                     key={idx}
//                                     className={cn(
//                                       "flex items-center gap-2 rounded-2xl border px-3 py-2.5",
//                                       isCorrect ? "bg-emerald-50 border-emerald-200" : "bg-muted/20"
//                                     )}
//                                   >
//                                     {isCorrect ? (
//                                       <CheckCircle2 className="h-4 w-4 text-emerald-700" />
//                                     ) : (
//                                       <Circle className="h-4 w-4 text-muted-foreground" />
//                                     )}
//                                     <span className="text-sm font-semibold">{opt || "(empty)"}</span>
//                                   </li>
//                                 );
//                               })}
//                             </ul>
//                           ) : qq.question_type === "text" ? (
//                             <div className="space-y-2">
//                               <div className="text-xs text-muted-foreground font-semibold">Expected</div>
//                               <div className="rounded-3xl border bg-muted/20 p-4 text-sm font-semibold">
//                                 {getExpectedTextList(qq).length ? (
//                                   getExpectedTextList(qq).join(", ")
//                                 ) : (
//                                   <i className="text-muted-foreground font-semibold">(none)</i>
//                                 )}
//                               </div>
//                             </div>
//                           ) : (
//                             <div className="text-sm text-muted-foreground font-semibold">Preview not supported.</div>
//                           )}

//                           <AttachmentBlock images={qq.images} files={qq.files} />
//                         </div>
//                       );
//                     })}
//                   </div>
//                 )}
//               </ScrollArea>
//             </div>

//             <DialogFooter className="p-6 pt-0 gap-2 sm:gap-0">
//               <div className="mr-auto flex items-center gap-2">
//                 <Checkbox id="dummy" checked={false} onCheckedChange={() => {}} disabled />
//                 <label htmlFor="dummy" className="text-xs text-muted-foreground font-semibold">
//                   Preview only
//                 </label>
//               </div>

//               <Button variant="secondary" onClick={() => setPreviewOpen(false)} className="rounded-2xl font-black gap-2">
//                 <CornerUpLeft className="h-4 w-4" />
//                 Close
//               </Button>
//             </DialogFooter>
//           </DialogContent>
//         </Dialog>

//         {/* ===== SUBMISSION MODAL ===== */}
//         <Dialog open={!!activeSub} onOpenChange={(open) => (!open ? setActiveSub(null) : null)}>
//           <DialogContent size="xl" className="max-w-6xl p-0 overflow-hidden">
//             <div className="relative border-b">
//               <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-violet-50 dark:from-blue-950/30 dark:via-indigo-950/25 dark:to-violet-950/30" />
//               <div className="relative p-6">
//                 <DialogHeader>
//                   <DialogTitle className="flex flex-col gap-2">
//                     <div className="flex items-center justify-between gap-3">
//                       <span className="truncate text-2xl font-black">
//                         {activeSub?.display_name || "Submission"}
//                       </span>

//                       <span
//                         className={cn(
//                           "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-black border",
//                           activeSub?.is_returned
//                             ? "bg-emerald-50 text-emerald-700 border-emerald-200"
//                             : "bg-muted text-muted-foreground border-border"
//                         )}
//                       >
//                         {activeSub?.is_returned ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
//                         {activeSub?.is_returned ? "Returned" : "Hidden"}
//                       </span>
//                     </div>

//                     <DialogDescription className="font-semibold">
//                       Review answers, adjust points, save grade, and return/unreturn.
//                     </DialogDescription>
//                   </DialogTitle>
//                 </DialogHeader>

//                 <div className="mt-5 flex flex-wrap gap-2">
//                   {["summary", "answers", "grade"].map((t) => (
//                     <Button
//                       key={t}
//                       size="sm"
//                       variant={modalTab === t ? "default" : "secondary"}
//                       onClick={() => setModalTab(t)}
//                       className="capitalize rounded-2xl font-black"
//                     >
//                       {t}
//                     </Button>
//                   ))}
//                 </div>
//               </div>
//             </div>

//             <div className="p-6">
//               <ScrollArea className="max-h-[65vh] pr-4">
//                 {/* SUMMARY */}
//                 {modalTab === "summary" && (
//                   <div className="space-y-5">
//                     <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
//                       <Card className="rounded-4xl border-dashed shadow-sm">
//                         <CardHeader className="pb-2">
//                           <CardTitle className="text-sm font-black">Submitted</CardTitle>
//                         </CardHeader>
//                         <CardContent className="text-sm font-semibold">
//                           {activeSub?.submitted_at ? new Date(activeSub.submitted_at).toLocaleString() : "—"}
//                         </CardContent>
//                       </Card>

//                       <Card className="rounded-4xl border-dashed shadow-sm">
//                         <CardHeader className="pb-2">
//                           <CardTitle className="text-sm font-black">Score</CardTitle>
//                         </CardHeader>
//                         <CardContent className="text-lg font-black">
//                           {Number(activeSub?.score ?? 0)}/{Number(activeSub?.max_score ?? maxScore)}
//                         </CardContent>
//                       </Card>

//                       <Card className="rounded-4xl border-dashed shadow-sm">
//                         <CardHeader className="pb-2">
//                           <CardTitle className="text-sm font-black">Reviewed</CardTitle>
//                         </CardHeader>
//                         <CardContent className="text-sm font-semibold">{markReviewed ? "Yes" : "No"}</CardContent>
//                       </Card>
//                     </div>

//                     <div className="rounded-4xl border bg-background p-5 space-y-3 shadow-sm">
//                       <div className="text-sm font-black">Feedback</div>

//                       <Textarea
//                         value={feedbackText}
//                         onChange={(e) => setFeedbackText(e.target.value)}
//                         placeholder="Feedback to student (optional)"
//                         className="rounded-2xl font-semibold min-h-[110px]"
//                       />

//                       <div className="flex items-center gap-2">
//                         <Checkbox
//                           id="reviewed"
//                           checked={markReviewed}
//                           onCheckedChange={(v) => setMarkReviewed(!!v)}
//                         />
//                         <label htmlFor="reviewed" className="text-sm text-muted-foreground font-semibold">
//                           Mark as reviewed
//                         </label>
//                       </div>
//                     </div>
//                   </div>
//                 )}

//                 {/* ANSWERS */}
//                 {modalTab === "answers" && (
//                   <div className="space-y-4">
//                     {!quiz?.questions?.length ? (
//                       <div className="text-sm text-muted-foreground font-semibold">No questions found.</div>
//                     ) : (
//                       quiz.questions.map((qx, idx) => {
//                         const ans = activeSub?.answers?.[qx.question_id];
//                         const g = gradeQuestion(qx, ans);
//                         const isChoice = qx.question_type === "choice";

//                         return (
//                           <div key={qx.question_id || idx} className="rounded-4xl border bg-background p-5 shadow-sm">
//                             <div className="mb-3 flex items-start justify-between gap-3">
//                               <div className="flex items-center gap-3 min-w-0">
//                                 <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary text-primary-foreground text-sm font-black shrink-0">
//                                   {idx + 1}
//                                 </div>
//                                 <div className="min-w-0">
//                                   <div className="font-black truncate">{qx.question_text || "(Untitled Question)"}</div>
//                                   <div className="mt-1 text-xs text-muted-foreground font-semibold">
//                                     Earned: {g.earned}/{g.max}
//                                   </div>
//                                 </div>
//                               </div>

//                               <Badge variant="outline" className="rounded-full font-semibold shrink-0">
//                                 {getPoints(qx)} pts
//                               </Badge>
//                             </div>

//                             {isChoice ? (
//                               <ul className="space-y-2">
//                                 {(qx.choices || []).map((opt, i) => {
//                                   const isCorrect = (g.correct || []).includes(i);
//                                   const isSelected = (g.picked || []).includes(i);

//                                   let cls = "bg-muted/20 border-muted";
//                                   let Icon = Circle;
//                                   let iconCls = "text-muted-foreground";

//                                   if (isSelected && isCorrect) {
//                                     cls = "bg-emerald-50 border-emerald-200";
//                                     Icon = CheckCircle2;
//                                     iconCls = "text-emerald-700";
//                                   } else if (isSelected && !isCorrect) {
//                                     cls = "bg-rose-50 border-rose-200";
//                                     Icon = XCircle;
//                                     iconCls = "text-rose-700";
//                                   } else if (!isSelected && isCorrect) {
//                                     cls = "bg-emerald-50/40 border-emerald-200";
//                                     Icon = CheckCircle2;
//                                     iconCls = "text-emerald-700";
//                                   }

//                                   return (
//                                     <li key={i} className={cn("flex items-center gap-2 rounded-2xl border px-3 py-2.5", cls)}>
//                                       <Icon className={cn("h-4 w-4 shrink-0", iconCls)} />
//                                       <span className={cn("text-sm font-semibold", isCorrect ? "text-emerald-800" : "text-foreground")}>
//                                         {opt || <i className="text-muted-foreground font-semibold">Empty option</i>}
//                                       </span>
//                                     </li>
//                                   );
//                                 })}
//                               </ul>
//                             ) : qx.question_type === "text" ? (
//                               <div className="space-y-3">
//                                 <div>
//                                   <div className="text-xs text-muted-foreground font-semibold mb-2">Student Answer</div>
//                                   <div className="rounded-3xl border bg-muted/20 p-4 text-sm font-semibold">
//                                     {typeof ans === "string" && ans.trim() ? (
//                                       ans
//                                     ) : (
//                                       <i className="text-muted-foreground font-semibold">(no answer)</i>
//                                     )}
//                                   </div>
//                                 </div>

//                                 {getExpectedTextList(qx).length > 0 ? (
//                                   <div className="text-xs text-muted-foreground font-semibold">
//                                     Acceptable:{" "}
//                                     <span className="font-black text-foreground">
//                                       {getExpectedTextList(qx).join(", ")}
//                                     </span>
//                                   </div>
//                                 ) : null}
//                               </div>
//                             ) : qx.question_type === "rating" ? (
//                               <div className="text-sm font-semibold">
//                                 Rating: <span className="font-black">{ans ?? "—"}</span> / {qx.rating_max || 5}
//                               </div>
//                             ) : qx.question_type === "likert" ? (
//                               <pre className="rounded-3xl border bg-muted/20 p-4 text-xs overflow-auto">
//                                 {JSON.stringify(ans ?? {}, null, 2)}
//                               </pre>
//                             ) : (
//                               <div className="text-sm text-muted-foreground font-semibold">Unsupported question type.</div>
//                             )}

//                             <AttachmentBlock images={qx.images} files={qx.files} />
//                           </div>
//                         );
//                       })
//                     )}
//                   </div>
//                 )}

//                 {/* GRADE */}
//                 {modalTab === "grade" && (
//                   <div className="space-y-4">
//                     {!quiz?.questions?.length ? (
//                       <div className="text-sm text-muted-foreground font-semibold">No questions found.</div>
//                     ) : (
//                       <>
//                         {quiz.questions.map((qx, idx) => {
//                           const ans = activeSub?.answers?.[qx.question_id];
//                           const g = gradeQuestion(qx, ans);
//                           const max = getPoints(qx);
//                           const currentEarned = perQEarned[qx.question_id] ?? Math.min(g.earned, max);

//                           return (
//                             <div key={qx.question_id || idx} className="rounded-4xl border bg-background p-5 shadow-sm">
//                               <div className="mb-3 flex items-start justify-between gap-3">
//                                 <div className="flex items-center gap-3 min-w-0">
//                                   <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary text-primary-foreground text-sm font-black shrink-0">
//                                     {idx + 1}
//                                   </div>
//                                   <div className="font-black truncate">{qx.question_text || "(Untitled Question)"}</div>
//                                 </div>

//                                 <div className="flex items-center gap-2 text-xs text-muted-foreground font-semibold shrink-0">
//                                   <span>Points</span>
//                                   <Input
//                                     type="number"
//                                     className="h-9 w-24 rounded-2xl font-semibold"
//                                     min={0}
//                                     max={max}
//                                     value={Number(currentEarned)}
//                                     onChange={(e) =>
//                                       setPerQEarned((prev) => ({
//                                         ...prev,
//                                         [qx.question_id]: Number(e.target.value),
//                                       }))
//                                     }
//                                   />
//                                   <span>/ {max}</span>
//                                 </div>
//                               </div>

//                               <div className="text-xs text-muted-foreground font-semibold">
//                                 This overrides auto-grade per question.
//                               </div>
//                             </div>
//                           );
//                         })}

//                         <Separator />

//                         <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 items-end">
//                           <Card className="rounded-4xl border-dashed shadow-sm">
//                             <CardHeader className="pb-2">
//                               <CardTitle className="text-sm font-black">Computed total</CardTitle>
//                             </CardHeader>
//                             <CardContent className="text-lg font-black">
//                               {computedManualTotal}/{activeSub?.max_score ?? maxScore}
//                             </CardContent>
//                           </Card>

//                           <div className="sm:col-span-2 space-y-2">
//                             <div className="text-sm font-black">Feedback</div>
//                             <Textarea
//                               value={feedbackText}
//                               onChange={(e) => setFeedbackText(e.target.value)}
//                               placeholder="Feedback to student (optional)"
//                               className="rounded-2xl font-semibold min-h-[110px]"
//                             />
//                             <div className="flex items-center gap-2">
//                               <Checkbox
//                                 id="reviewed2"
//                                 checked={markReviewed}
//                                 onCheckedChange={(v) => setMarkReviewed(!!v)}
//                               />
//                               <label htmlFor="reviewed2" className="text-sm text-muted-foreground font-semibold">
//                                 Mark as reviewed
//                               </label>
//                             </div>
//                           </div>
//                         </div>
//                       </>
//                     )}
//                   </div>
//                 )}
//               </ScrollArea>
//             </div>

//             <DialogFooter className="p-6 pt-0 gap-2 sm:gap-0">
//               <div className="mr-auto flex flex-wrap items-center gap-2">
//                 {!activeSub?.is_returned ? (
//                   <Button
//                     variant="outline"
//                     className="rounded-2xl font-black"
//                     onClick={() => handleReturn(activeSub?.id)}
//                     disabled={!activeSub?.id}
//                   >
//                     <Eye className="mr-2 h-4 w-4" />
//                     Return
//                   </Button>
//                 ) : (
//                   <Button
//                     variant="outline"
//                     className="rounded-2xl font-black"
//                     onClick={() => handleUnreturn(activeSub?.id)}
//                     disabled={!activeSub?.id}
//                   >
//                     <EyeOff className="mr-2 h-4 w-4" />
//                     Unreturn
//                   </Button>
//                 )}

//                 {modalTab !== "grade" ? (
//                   <div className="flex items-center gap-2">
//                     <span className="text-xs text-muted-foreground font-semibold">Set Score</span>
//                     <Input
//                       type="number"
//                       className="h-10 w-28 rounded-2xl font-semibold"
//                       min={0}
//                       max={activeSub?.max_score ?? maxScore}
//                       value={Number(manualScore)}
//                       onChange={(e) => setManualScore(Number(e.target.value))}
//                     />
//                   </div>
//                 ) : null}
//               </div>

//               <Button onClick={saveManualGrade} disabled={!activeSub?.id} className="rounded-2xl font-black">
//                 Save Grade
//               </Button>
//             </DialogFooter>
//           </DialogContent>
//         </Dialog>
//       </div>
//     </div>
//   );
// }

// {4}

// app/admin/assessments/view/[id]/page.jsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ClipboardList,
  Users,
  CheckCircle2,
  BarChart3,
  Search,
  Eye,
  EyeOff,
  Calculator,
  Hash,
  ArrowUpRight,
  CornerUpLeft,
  RefreshCcw,
  Sparkles,
  X,
  MoreHorizontal,
  Image as ImageIcon,
  Paperclip,
  Circle,
  XCircle,
  FileText,
  AlertTriangle,
  BadgeCheck,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { getQuiz } from "@/lib/quizzes";

// ✅ submissions service
import {
  listQuizSubmissions,
  getQuizSubmission,
  upsertQuizSubmission,
  returnSubmission,
  unreturnSubmission,
  saveGrade,
} from "@/lib/quizSubmissions";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// ✅ shadcn alert-dialog + toast
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter as AlertDialogFooterUI,
  AlertDialogHeader,
  AlertDialogTitle as AlertDialogTitleUI,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

/* -------------------------- helpers -------------------------- */

function errToString(e) {
  try {
    if (!e) return "Unknown error";
    if (typeof e === "string") return e;

    const code = e?.code || e?.status || e?.statusCode;
    const msg =
      e?.message ||
      e?.error_description ||
      e?.error ||
      (typeof e?.toString === "function" ? e.toString() : "");

    const details = e?.details || e?.hint;

    return [code ? `[${code}]` : null, msg, details].filter(Boolean).join(" ");
  } catch {
    return "Unknown error";
  }
}

function logErr(where, e) {
  console.error(`[${where}]`, {
    message: e?.message,
    code: e?.code,
    details: e?.details,
    hint: e?.hint,
    status: e?.status,
    stack: e?.stack,
    raw: e,
  });
}

const toStr = (v) => String(v ?? "").trim();

function getErrorMessage(e) {
  const s = errToString(e);
  if (s && s !== "Unknown error") return s;

  try {
    const keys = e ? Object.getOwnPropertyNames(e) : [];
    const parts = [];
    for (const k of keys) {
      const v = e[k];
      if (v == null) continue;
      if (typeof v === "string" && !v.trim()) continue;
      parts.push(`${k}: ${typeof v === "string" ? v : JSON.stringify(v)}`);
    }
    return parts.join(" | ");
  } catch {
    return "";
  }
}

function getPoints(q) {
  const candidates = [q?.points, q?.point, q?.score, q?.max_points, q?.max];
  for (const v of candidates) {
    const n = Number(v);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 1;
}

function calcMaxScore(quiz) {
  if (!quiz?.questions) return 0;
  return quiz.questions.reduce((sum, q) => sum + getPoints(q), 0);
}

function clamp(n, min, max) {
  const x = Number(n);
  if (!Number.isFinite(x)) return min;
  return Math.max(min, Math.min(x, max));
}

function pct(score, max) {
  const s = Number(score) || 0;
  const m = Number(max) || 0;
  if (!m) return 0;
  return (s / m) * 100;
}

function letterGrade(percent) {
  const p = Number(percent) || 0;
  if (p >= 97) return "A+";
  if (p >= 93) return "A";
  if (p >= 90) return "A-";
  if (p >= 87) return "B+";
  if (p >= 83) return "B";
  if (p >= 80) return "B-";
  if (p >= 77) return "C+";
  if (p >= 73) return "C";
  if (p >= 70) return "C-";
  if (p >= 67) return "D+";
  if (p >= 63) return "D";
  if (p >= 60) return "D-";
  return "F";
}

function letterToIndex(s) {
  if (typeof s !== "string" || !s.trim()) return null;
  const ch = s.trim().toUpperCase();
  const code = ch.charCodeAt(0);
  return code >= 65 && code <= 90 ? code - 65 : null; // A->0
}

function parseIndexList(val) {
  if (Array.isArray(val)) {
    const out = [];
    for (const v of val) {
      if (typeof v === "number" && Number.isInteger(v)) out.push(v);
      else if (typeof v === "string") {
        const li = letterToIndex(v);
        if (li != null) out.push(li);
        else {
          const n = Number(v);
          if (Number.isInteger(n)) out.push(n);
        }
      }
    }
    return Array.from(new Set(out));
  }
  if (typeof val === "number" && Number.isInteger(val)) return [val];
  if (typeof val === "string" && val.trim()) {
    const parts = val.split(/[,\s]+/).filter(Boolean);
    const out = [];
    for (const p of parts) {
      const li = letterToIndex(p);
      if (li != null) out.push(li);
      else {
        const n = Number(p);
        if (Number.isInteger(n)) out.push(n);
      }
    }
    return Array.from(new Set(out));
  }
  return [];
}

function getCorrectIndices(q) {
  const tryFields = [
    q?.correct_answers,
    q?.correct_answer,
    q?.correct,
    q?.answer_indices,
    q?.answer_index,
    q?.answer,
    q?.answer_key,
  ];
  for (const f of tryFields) {
    const parsed = parseIndexList(f);
    if (parsed.length) return parsed;
  }
  if (Array.isArray(q?.choices)) {
    const idxs = [];
    q.choices.forEach((opt, i) => {
      if (opt && (opt.isCorrect === true || opt.correct === true)) idxs.push(i);
    });
    if (idxs.length) return idxs;
  }
  return [];
}

function getExpectedTextList(q) {
  const pool = [];

  const singles = [
    q?.answer_text,
    q?.correct_text,
    q?.expected,
    q?.expected_answer,
    q?.expected_text,
  ].filter((x) => typeof x === "string" && x.trim().length);

  if (singles.length) pool.push(singles[0]);

  if (Array.isArray(q?.acceptable_answers)) {
    q.acceptable_answers.forEach((x) => {
      if (typeof x === "string" && x.trim()) pool.push(x);
    });
  }

  const qt = String(q?.question_text || "");
  const m = qt.match(/acceptable\s*:\s*([^\n\r]+)/i);
  if (m && m[1]) pool.push(m[1]);

  if (Array.isArray(q?.choices)) {
    q.choices.forEach((c) => {
      if (typeof c === "string" && c.trim().length) pool.push(c);
    });
  }

  const expanded = [];
  for (const item of pool) {
    const s = String(item).trim();
    if (!s) continue;
    if (/[,\n;|]/.test(s)) {
      s.split(/[,;\n|]+/).forEach((p) => {
        const t = String(p).trim();
        if (t) expanded.push(t);
      });
    } else {
      expanded.push(s);
    }
  }

  const seen = new Set();
  const out = [];
  for (const s of expanded) {
    const t = String(s).trim();
    if (t && !seen.has(t)) {
      seen.add(t);
      out.push(t);
    }
  }
  return out;
}

function initialsFromName(name = "") {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] || "";
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] || "" : "";
  return (first + last).toUpperCase();
}

/* ------------------- answer normalization (attempt -> map) ------------------- */

function normalizeAnswerForQuestion(q, raw) {
  if (!q) return raw;

  if (q.question_type === "choice") {
    const choices = Array.isArray(q.choices) ? q.choices : [];

    const toIndex = (v) => {
      if (typeof v === "number" && Number.isInteger(v)) return v;

      if (typeof v === "string") {
        const li = letterToIndex(v);
        if (li != null) return li;

        let i = choices.indexOf(v);
        if (i >= 0) return i;

        const lower = v.toLowerCase();
        i = choices.findIndex((c) => String(c).toLowerCase() === lower);
        if (i >= 0) return i;

        const n = Number(v);
        if (Number.isInteger(n)) return n;
      }

      return null;
    };

    let picked = [];
    if (Array.isArray(raw)) picked = raw.map(toIndex).filter((x) => x != null);
    else if (raw === 0 || Number.isInteger(raw)) picked = [raw];
    else {
      const idx = toIndex(raw);
      if (idx != null) picked = [idx];
    }

    picked = Array.from(new Set(picked));

    if (!q?.allow_multiple && picked.length > 1) picked = picked.slice(0, 1);

    return picked;
  }

  return raw;
}

function answersFromAttemptAnswers(attemptAnswers, quiz) {
  if (!attemptAnswers || !quiz?.questions?.length) return {};
  const out = {};
  const qs = quiz.questions;

  for (let i = 0; i < qs.length; i++) {
    const q = qs[i];
    const key = `q${i + 1}`;
    if (!(key in attemptAnswers)) continue;
    out[q.question_id] = normalizeAnswerForQuestion(q, attemptAnswers[key]);
  }

  return out;
}

/**
 * ✅ Supports BOTH shapes:
 * 1) { q1: ..., q2: ... } (legacy attempt format)
 * 2) { [question_id]: ... } (normalized format)
 */
function normalizeAnswersPayload(rawAnswers, quiz) {
  if (!rawAnswers || typeof rawAnswers !== "object" || !quiz?.questions?.length)
    return {};
  const qs = quiz.questions;

  const qidSet = new Set(qs.map((x) => x?.question_id).filter(Boolean));
  const keys = Object.keys(rawAnswers || {});
  const looksLikeQuestionIds = keys.some((k) => qidSet.has(k));

  if (looksLikeQuestionIds) {
    const out = {};
    for (const q of qs) {
      const id = q?.question_id;
      if (!id) continue;
      if (rawAnswers[id] !== undefined)
        out[id] = normalizeAnswerForQuestion(q, rawAnswers[id]);
    }
    return out;
  }

  return answersFromAttemptAnswers(rawAnswers, quiz);
}

/* -------------------------- grading -------------------------- */

function normalizeTextToken(s) {
  return String(s ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[“”]/g, '"')
    .replace(/[’]/g, "'")
    .replace(/\u00A0/g, " ");
}

function textToNumberIfNumeric(s) {
  const t = normalizeTextToken(s);
  if (!t) return { kind: "empty", val: "" };
  const n = Number(t);
  if (Number.isFinite(n)) return { kind: "number", val: n };
  return { kind: "text", val: t };
}

function canonicalizeTextAnswer(q, studentAnswer) {
  const expectedList = getExpectedTextList(q);
  const aRaw = String(studentAnswer ?? "").trim();
  if (!aRaw) return { ok: false, canonical: aRaw, matched: null };

  const a = textToNumberIfNumeric(aRaw);

  for (const exp of expectedList) {
    const eRaw = String(exp ?? "").trim();
    if (!eRaw) continue;
    const e = textToNumberIfNumeric(eRaw);

    if (a.kind === "number" && e.kind === "number") {
      if (Math.abs(a.val - e.val) <= 1e-6) {
        return { ok: true, canonical: eRaw, matched: eRaw };
      }
    }

    if (a.kind === "text" && e.kind === "text") {
      if (a.val === e.val) {
        return { ok: true, canonical: eRaw, matched: eRaw };
      }
    }

    if (a.kind === "text" && e.kind === "number") {
      const an = Number(a.val);
      if (Number.isFinite(an) && Math.abs(an - e.val) <= 1e-6) {
        return { ok: true, canonical: eRaw, matched: eRaw };
      }
    }
  }

  return { ok: false, canonical: aRaw, matched: null };
}

function arraysEqualAsSet(a = [], b = []) {
  if (a.length !== b.length) return false;
  const sa = new Set(a);
  if (sa.size !== a.length) return false;
  for (const x of b) if (!sa.has(x)) return false;
  return true;
}

function gradeQuestion(q, ans) {
  const max = getPoints(q);

  if (q?.question_type === "choice") {
    const picked = Array.isArray(ans) ? ans : normalizeAnswerForQuestion(q, ans);
    const correct = getCorrectIndices(q);
    const matched = arraysEqualAsSet(picked || [], correct || []);

    return {
      earned: matched ? max : 0,
      max,
      picked: picked || [],
      correct,
      canonicalAnswer: null,
      matched,
    };
  }

  if (q?.question_type === "text") {
    const { ok, canonical } = canonicalizeTextAnswer(q, ans);
    return {
      earned: ok ? max : 0,
      max,
      picked: ans,
      correct: getExpectedTextList(q),
      canonicalAnswer: ok ? canonical : null,
      matched: ok,
    };
  }

  return {
    earned: 0,
    max,
    picked: ans,
    correct: null,
    canonicalAnswer: null,
    matched: false,
  };
}

/**
 * ✅ Points-based auto-grade
 * Returns:
 * - score (sum earned points)
 * - breakdown (per question)
 * - correctedAnswers (canonical text)
 * - maps: question_points, earned_by_question, correct_by_question
 */
function autoGrade(quiz, answers) {
  if (!quiz?.questions)
    return {
      score: 0,
      breakdown: [],
      correctedAnswers: {},
      question_points: {},
      earned_by_question: {},
      correct_by_question: {},
    };

  const correctedAnswers = { ...(answers || {}) };

  const question_points = {};
  const earned_by_question = {};
  const correct_by_question = {};

  const breakdown = quiz.questions.map((q) => {
    const a = correctedAnswers?.[q.question_id];
    const res = gradeQuestion(q, a);

    if (q.question_type === "text" && res.canonicalAnswer) {
      correctedAnswers[q.question_id] = res.canonicalAnswer;
    }

    question_points[q.question_id] = Number(res.max) || 0;
    earned_by_question[q.question_id] = Number(res.earned) || 0;
    correct_by_question[q.question_id] = !!res.matched;

    return {
      question_id: q.question_id,
      earned: res.earned,
      max: res.max,
      matched: !!res.matched,
    };
  });

  const score = breakdown.reduce((s, b) => s + (Number(b.earned) || 0), 0);

  return {
    score,
    breakdown,
    correctedAnswers,
    question_points,
    earned_by_question,
    correct_by_question,
  };
}

/* -------------------------- UI atoms -------------------------- */

function Chip({ icon: Icon, children, onClear, title }) {
  return (
    <span
      title={title}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-black",
        "bg-card/70 backdrop-blur shadow-sm"
      )}
    >
      {Icon ? <Icon className="h-3.5 w-3.5 text-muted-foreground" /> : null}
      <span className="truncate max-w-[240px]">{children}</span>
      {onClear ? (
        <button
          type="button"
          onClick={onClear}
          className="ml-1 rounded-full p-0.5 text-muted-foreground hover:text-foreground"
          aria-label="Clear"
          title="Clear"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </span>
  );
}

function StatCard({ label, value, icon: Icon, hint }) {
  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.01 }}
      className="rounded-4xl bg-card border border-border shadow-sm p-6 transition-all"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-sm text-muted-foreground font-semibold">
            {label}
          </div>
          <div className="mt-2 text-3xl font-black tracking-tight truncate">
            {value}
          </div>
          {hint ? (
            <div className="mt-1 text-xs text-muted-foreground font-semibold">
              {hint}
            </div>
          ) : null}
        </div>
        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
          <Icon className="h-5 w-5 text-primary" />
        </div>
      </div>
    </motion.div>
  );
}

function LoadingRow() {
  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
          <div>
            <div className="h-4 w-40 bg-muted rounded animate-pulse" />
            <div className="mt-2 h-3 w-24 bg-muted rounded animate-pulse" />
          </div>
        </div>
      </TableCell>
      <TableCell className="hidden md:table-cell">
        <div className="h-4 w-36 bg-muted rounded animate-pulse" />
      </TableCell>
      <TableCell>
        <div className="h-6 w-24 bg-muted rounded animate-pulse" />
      </TableCell>
      <TableCell className="hidden lg:table-cell">
        <div className="h-6 w-20 bg-muted rounded animate-pulse" />
      </TableCell>
      <TableCell className="text-right">
        <div className="ml-auto h-9 w-9 rounded-2xl bg-muted animate-pulse" />
      </TableCell>
    </TableRow>
  );
}

/* -------------------------- attachments UI -------------------------- */

function AttachmentBlock({ images = [], files = [] }) {
  const hasImgs = Array.isArray(images) && images.length > 0;
  const hasFiles = Array.isArray(files) && files.length > 0;
  if (!hasImgs && !hasFiles) return null;

  return (
    <div className="mt-4 space-y-4">
      {hasImgs ? (
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground flex items-center gap-2 font-semibold">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <ImageIcon className="h-4 w-4" />
            </span>
            Images
          </div>

          <div className="flex flex-wrap gap-2">
            {images.map((img, i) => {
              const src = img?.public_url || img?.url || img?.path;
              return (
                <a
                  key={i}
                  href={src || "#"}
                  target="_blank"
                  rel="noreferrer"
                  className={cn(
                    "block h-24 w-32 overflow-hidden rounded-2xl border bg-muted/30 shadow-sm transition",
                    src
                      ? "hover:ring-2 hover:ring-primary/25 hover:bg-muted/40"
                      : "pointer-events-none opacity-70"
                  )}
                  title={img?.name || "Image"}
                >
                  {src ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={src}
                      alt={img?.name || `image-${i}`}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[11px] text-muted-foreground">
                      No preview
                    </div>
                  )}
                </a>
              );
            })}
          </div>
        </div>
      ) : null}

      {hasFiles ? (
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground flex items-center gap-2 font-semibold">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-2xl bg-muted text-foreground">
              <Paperclip className="h-4 w-4" />
            </span>
            Files
          </div>

          <ul className="space-y-2">
            {files.map((f, i) => {
              const href = f?.public_url || f?.url;
              const label = f?.name || f?.path || `file-${i}`;
              const meta = [
                f?.mime,
                f?.size ? `${Math.round((f.size / 1024) * 10) / 10} KB` : null,
              ]
                .filter(Boolean)
                .join(" • ");

              return (
                <li key={i}>
                  {href ? (
                    <a
                      href={href}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex w-full items-center justify-between gap-3 rounded-2xl border bg-background px-3 py-2 text-sm hover:bg-muted/40 transition"
                      title={label}
                    >
                      <span className="inline-flex items-center gap-2 min-w-0">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="truncate">{label}</span>
                      </span>
                      {meta ? (
                        <span className="text-xs text-muted-foreground shrink-0">
                          {meta}
                        </span>
                      ) : null}
                    </a>
                  ) : (
                    <span className="inline-flex w-full items-center justify-between gap-3 rounded-2xl border bg-muted/30 px-3 py-2 text-sm">
                      <span className="inline-flex items-center gap-2 min-w-0">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="truncate">{label}</span>
                      </span>
                      {meta ? (
                        <span className="text-xs text-muted-foreground shrink-0">
                          {meta}
                        </span>
                      ) : null}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

/* -------------------------- status display -------------------------- */

function prettyStatus(sub) {
  const base = String(sub?.status || "pending_review").toLowerCase();
  const hasFeedback = !!toStr(sub?.feedback);
  const isReturned = !!sub?.is_returned;

  if (isReturned && hasFeedback) return "reviewed and returned";
  if (isReturned) return "returned";

  if (base === "reviewed") return "reviewed";
  if (base === "pending_review") return "pending review";
  return base.replace(/_/g, " ");
}

/* -------------------------------- page -------------------------------- */

export default function AssessmentViewPage() {
  const { toast } = useToast();
  const router = useRouter();
  const params = useParams();
  const quizId = toStr(params?.id);

  // Access control (client-only due to localStorage)
  const currentUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("currentUser") || "{}");
    } catch {
      return {};
    }
  }, []);
  const adminLevel = currentUser?.admin_level || "";
  const adminRole = String(currentUser?.admin_role || "").toLowerCase();
  const adminAccess = currentUser?.admin_access || {};
  const isSuperAdmin = adminLevel === "Super Admin";
  const isFaculty = adminRole === "faculty";
  const canEditQuiz =
    isSuperAdmin || (isFaculty && adminAccess?.quizzes_edit === true);

  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [activeTab, setActiveTab] = useState("quiz"); // quiz | submissions

  const [q, setQ] = useState("");
  const [debQ, setDebQ] = useState("");

  const [previewOpen, setPreviewOpen] = useState(false);

  // ✅ submissions state
  const [subs, setSubs] = useState([]);
  const [loadingSubs, setLoadingSubs] = useState(true);
  const [activeSub, setActiveSub] = useState(null);

  // modal tab: summary | answers | grade
  const [modalTab, setModalTab] = useState("summary");

  // grading states
  const [gradingAll, setGradingAll] = useState(false);
  const [manualScore, setManualScore] = useState(0);
  const [perQEarned, setPerQEarned] = useState({});
  const [feedbackText, setFeedbackText] = useState("");
  const [markReviewed, setMarkReviewed] = useState(false);

  // confirm save grade alert
  const [saveConfirmOpen, setSaveConfirmOpen] = useState(false);
  const [savingGrade, setSavingGrade] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebQ(q.trim().toLowerCase()), 250);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError("");
      try {
        if (!quizId) throw new Error("Missing assessment id in URL.");
        const qz = await getQuiz(quizId);
        setQuiz(qz);
      } catch (e) {
        console.error(e);
        setError(e?.message || "Failed to load assessment.");
      } finally {
        setLoading(false);
      }
    })();
  }, [quizId]);

  const maxScore = useMemo(() => calcMaxScore(quiz), [quiz]);
  const quizQuestionCount = quiz?.questions?.length || 0;

  const visibility = useMemo(() => {
    return String(quiz?.visibility || "").toLowerCase() === "public"
      ? "public"
      : "private";
  }, [quiz]);

  const hrefId = quiz?.quiz_id || quizId;
  const canNavigate = !!toStr(hrefId);

  // ✅ load submissions list (attempts)
  useEffect(() => {
    (async () => {
      if (!quizId) return;
      setLoadingSubs(true);
      try {
        const items = await listQuizSubmissions(quizId);
        const totalPoints = Number(calcMaxScore(quiz)) || 0;

        const normalized = (items || []).map((r) => {
          const display_name = r.user?.display_name || "—";

          const baseAnswers = quiz
            ? normalizeAnswersPayload(r.answers || {}, quiz)
            : {};

          // compute points-based if needed
          const ag = quiz
            ? autoGrade(quiz, baseAnswers)
            : {
                score: 0,
                correctedAnswers: baseAnswers,
                breakdown: [],
                question_points: {},
                earned_by_question: {},
                correct_by_question: {},
              };

          const storedScore = Number(r.score ?? r.correct);
          const storedTotal = Number(r.total);

          const finalMax = Number.isFinite(totalPoints) ? totalPoints : 0;

          // If DB missing score/total, fallback to computed
          const finalScore = Number.isFinite(storedScore)
            ? clamp(storedScore, 0, finalMax)
            : clamp(ag.score, 0, finalMax);

          const finalTotal = Number.isFinite(storedTotal)
            ? clamp(storedTotal, 0, finalMax || storedTotal)
            : finalMax;

          return {
            ...r,
            id: r.id,
            display_name,
            answers: ag.correctedAnswers || baseAnswers,
            score: finalScore,
            total: finalTotal,
            max_score: finalMax, // UI-only
            submitted_at: r.finished_at || null,
            feedback: r.feedback || "",
            status: r.status || "pending_review",
            is_returned: !!r.is_returned,
            returned_at: r.returned_at || null,
          };
        });

        setSubs(normalized);
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingSubs(false);
      }
    })();
  }, [quizId, quiz, quizQuestionCount]);

  const displayedSubs = useMemo(() => {
    let arr = subs.slice();
    if (debQ) {
      arr = arr.filter((s) =>
        String(s.display_name || "").toLowerCase().includes(debQ)
      );
    }
    arr.sort(
      (a, b) => new Date(b.submitted_at || 0) - new Date(a.submitted_at || 0)
    );
    return arr;
  }, [subs, debQ]);

  const avgScore = useMemo(() => {
    if (!displayedSubs.length) return 0;
    const sum = displayedSubs.reduce((s, x) => s + (Number(x.score) || 0), 0);
    return Math.round((sum / displayedSubs.length) * 100) / 100;
  }, [displayedSubs]);

  const returnedCount = useMemo(() => {
    return displayedSubs.reduce((acc, s) => acc + (s.is_returned ? 1 : 0), 0);
  }, [displayedSubs]);

  const openSubmission = async (attempt_id) => {
    try {
      const sRaw = await getQuizSubmission(attempt_id);
      if (!sRaw) return;

      const display_name = sRaw?.user?.display_name || "—";
      const totalPoints = Number(calcMaxScore(quiz)) || 0;

      const baseAnswers = quiz
        ? normalizeAnswersPayload(sRaw.answers || {}, quiz)
        : {};

      const ag = quiz
        ? autoGrade(quiz, baseAnswers)
        : {
            score: 0,
            breakdown: [],
            correctedAnswers: baseAnswers,
            question_points: {},
            earned_by_question: {},
            correct_by_question: {},
          };

      const storedScore = Number(sRaw.score ?? sRaw.correct);
      const storedTotal = Number(sRaw.total);

      const finalMax = Number.isFinite(totalPoints) ? totalPoints : 0;

      const finalScore = Number.isFinite(storedScore)
        ? clamp(storedScore, 0, finalMax)
        : clamp(ag.score, 0, finalMax);

      const finalTotal = Number.isFinite(storedTotal)
        ? clamp(storedTotal, 0, finalMax || storedTotal)
        : finalMax;

      const s = {
        ...sRaw,
        id: sRaw.id,
        display_name,
        answers: ag.correctedAnswers || baseAnswers,
        score: finalScore,
        total: finalTotal,
        max_score: finalMax, // UI-only
        submitted_at: sRaw.finished_at || null,
        feedback: sRaw.feedback || "",
        reviewed: (sRaw.status || "").toLowerCase() === "reviewed",
        status: sRaw.status || "pending_review",
        is_returned: !!sRaw.is_returned,
        returned_at: sRaw.returned_at || null,
      };

      setActiveSub(s);
      setModalTab("summary");

      setManualScore(s.score ?? 0);
      setFeedbackText(s.feedback ?? "");
      setMarkReviewed(!!s.reviewed);

      const dict = {};
      (ag.breakdown || []).forEach((b) => (dict[b.question_id] = b.earned));
      setPerQEarned(dict);
    } catch (e) {
      console.error(e);
    }
  };

  const onKeyDown = useCallback((e) => {
    if (e.key === "Escape") {
      setPreviewOpen(false);
      setActiveSub(null);
    }
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onKeyDown]);

  // ✅ Always points-based max score
  const computedMaxScore = useMemo(() => calcMaxScore(quiz), [quiz]);

  // ✅ helper: build a safe meta merge
  const mergeMeta = (base, extra) => {
    const b = base && typeof base === "object" && !Array.isArray(base) ? base : {};
    const e = extra && typeof extra === "object" && !Array.isArray(extra) ? extra : {};
    return { ...b, ...e };
  };

  // ✅ auto grade one + persist score (with corrected text answers + per-question points maps)
  const autoGradeOne = async (submission) => {
    if (!quiz || !submission?.id) return;

    const userId =
      submission?.user_id ||
      submission?.user?.id ||
      submission?.student_id ||
      null;

    if (!userId) {
      toast({
        title: "Auto grade failed",
        description: "This submission is missing user_id.",
        variant: "destructive",
      });
      return;
    }

    try {
      const baseAnswers = normalizeAnswersPayload(submission.answers || {}, quiz);

      const {
        score,
        correctedAnswers,
        breakdown,
        question_points,
        earned_by_question,
        correct_by_question,
      } = autoGrade(quiz, baseAnswers);

      const totalPoints = Number(calcMaxScore(quiz)) || 0;

      const patch = {
        id: submission.id,
        quiz_id: quizId,
        user_id: userId,

        answers: correctedAnswers || baseAnswers || {},

        // ✅ points-based DB fields
        score: clamp(score, 0, totalPoints),
        total: totalPoints,

        // ✅ per-question maps (input-only supported by your lib; stored in meta by caller if desired)
        question_points,
        earned_by_question,
        correct_by_question,

        // keep feedback
        feedback: submission.feedback ?? null,

        // ✅ store audit in meta (optional but very useful)
        meta: mergeMeta(submission.meta, {
          graded: true,
          graded_at: new Date().toISOString(),
          points_total: totalPoints,
          points_earned: clamp(score, 0, totalPoints),
          earned_by_question,
          correct_by_question,
          grade_breakdown: (breakdown || []).reduce((acc, b) => {
            acc[b.question_id] = { earned: b.earned, max: b.max, matched: !!b.matched };
            return acc;
          }, {}),
        }),
      };

      const saved = await upsertQuizSubmission(patch);

      const normalized = {
        ...submission,
        answers: patch.answers,
        score: patch.score,
        total: patch.total,
        max_score: totalPoints,
        meta: patch.meta,
        id: saved?.id || submission.id,
      };

      setSubs((prev) => prev.map((x) => (x.id === normalized.id ? normalized : x)));

      if (activeSub?.id === normalized.id) {
        setActiveSub((p) => ({ ...p, ...normalized }));
        setManualScore(patch.score);

        const dict = {};
        (breakdown || []).forEach((b) => (dict[b.question_id] = b.earned));
        setPerQEarned(dict);
      }

      toast({
        title: "Auto-graded",
        description: `Score updated to ${patch.score}/${totalPoints}.`,
      });
    } catch (e) {
      logErr("autoGradeOne", e);
      toast({
        title: "Auto grade failed",
        description: errToString(e) || "Failed to auto-grade this submission.",
        variant: "destructive",
      });
    }
  };

  // ✅ bulk auto grade currently listed
  const autoGradeAll = async () => {
    if (!quiz || displayedSubs.length === 0) return;

    const totalPoints = Number(calcMaxScore(quiz)) || 0;
    if (totalPoints <= 0) {
      toast({
        title: "Auto grading blocked",
        description: "This assessment has 0 max points. Add question points first.",
        variant: "destructive",
      });
      return;
    }

    setGradingAll(true);

    const failures = [];
    let successCount = 0;

    try {
      for (const s of displayedSubs) {
        const attemptId = s?.id;
        const userId = s?.user_id || s?.user?.id || s?.student_id || null;

        if (!attemptId) {
          failures.push({
            id: "—",
            name: s?.display_name || "—",
            reason: "Missing attempt id",
          });
          continue;
        }

        if (!userId) {
          failures.push({
            id: String(attemptId),
            name: s?.display_name || "—",
            reason: "Missing user_id",
          });
          continue;
        }

        const baseAnswers = normalizeAnswersPayload(s.answers || {}, quiz);
        const {
          score,
          correctedAnswers,
          breakdown,
          question_points,
          earned_by_question,
          correct_by_question,
        } = autoGrade(quiz, baseAnswers);

        const patch = {
          id: attemptId,
          quiz_id: quizId,
          user_id: userId,

          answers: correctedAnswers || baseAnswers || {},

          // ✅ points-based DB fields
          score: clamp(score, 0, totalPoints),
          total: totalPoints,

          // ✅ per-question maps
          question_points,
          earned_by_question,
          correct_by_question,

          feedback: s.feedback ?? null,

          // ✅ store audit in meta
          meta: mergeMeta(s.meta, {
            graded: true,
            graded_at: new Date().toISOString(),
            points_total: totalPoints,
            points_earned: clamp(score, 0, totalPoints),
            earned_by_question,
            correct_by_question,
            grade_breakdown: (breakdown || []).reduce((acc, b) => {
              acc[b.question_id] = { earned: b.earned, max: b.max, matched: !!b.matched };
              return acc;
            }, {}),
          }),
        };

        try {
          const saved = await upsertQuizSubmission(patch);

          const normalized = {
            ...s,
            answers: patch.answers,
            score: patch.score,
            total: patch.total,
            max_score: totalPoints, // UI only
            meta: patch.meta,
            id: saved?.id || attemptId,
          };

          setSubs((prev) => prev.map((x) => (x.id === normalized.id ? normalized : x)));
          if (activeSub?.id === normalized.id)
            setActiveSub((p) => ({ ...p, ...normalized }));

          successCount++;
        } catch (e) {
          logErr(`autoGradeAll upsert attempt=${attemptId}`, e);
          failures.push({
            id: String(attemptId),
            name: s?.display_name || "—",
            reason: errToString(e) || "Unknown error",
          });
        }
      }

      if (failures.length) {
        toast({
          title: "Auto grade finished with errors",
          description: `${successCount} succeeded • ${failures.length} failed. Open console to see details.`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Auto-graded (filtered)",
          description: "All currently listed submissions were auto-graded.",
        });
      }
    } catch (e) {
      logErr("autoGradeAll", e);
      toast({
        title: "Auto grading failed",
        description: errToString(e) || "Auto grading (bulk) encountered an error.",
        variant: "destructive",
      });
    } finally {
      setGradingAll(false);
    }
  };

  // computed total from per-question inputs
  const computedManualTotal = useMemo(() => {
    if (!quiz?.questions?.length) return 0;
    return quiz.questions.reduce((sum, qx) => {
      const val = Number(perQEarned[qx.question_id] ?? 0);
      const capped = clamp(val, 0, getPoints(qx));
      return sum + capped;
    }, 0);
  }, [perQEarned, quiz]);

  const activeOutOf = computedMaxScore || Number(activeSub?.max_score ?? 0) || 0;

  const activePercent = useMemo(
    () => pct(activeSub?.score ?? 0, activeOutOf),
    [activeSub?.score, activeOutOf]
  );
  const activeLetter = useMemo(() => letterGrade(activePercent), [activePercent]);

  const clearSearch = () => setQ("");

  const pageSubtitle = useMemo(() => {
    const status = String(quiz?.status || "").trim();
    return status ? `Status: ${status}` : "Assessment overview and grading";
  }, [quiz]);

  // --- Save Grade ---
  const performSaveManualGrade = async () => {
    if (!activeSub) return;

    const maxOutOf = activeOutOf || 0;

    const finalScoreRaw =
      modalTab === "grade" ? computedManualTotal : Number(manualScore || 0);

    const bounded = clamp(finalScoreRaw, 0, maxOutOf);

    setSavingGrade(true);
    try {
      // ✅ save DB columns
      const saved = await saveGrade(activeSub.id, {
        score: bounded,
        total: maxOutOf,
        feedback: feedbackText || "",
        reviewed: !!markReviewed,
      });

      // ✅ also store per-question grading in meta when in grade tab
      const qPoints = {};
      const earnedByQ = {};
      if (modalTab === "grade" && quiz?.questions?.length) {
        for (const qx of quiz.questions) {
          qPoints[qx.question_id] = getPoints(qx);
          earnedByQ[qx.question_id] = clamp(
            Number(perQEarned[qx.question_id] ?? 0),
            0,
            getPoints(qx)
          );
        }
      }

      const normalized = {
        ...activeSub,
        score: bounded,
        total: maxOutOf,
        max_score: maxOutOf, // UI-only
        feedback: feedbackText || "",
        status: saved?.status ?? (markReviewed ? "reviewed" : activeSub.status),
        reviewed: !!markReviewed,
        meta:
          modalTab === "grade"
            ? mergeMeta(activeSub.meta, {
                manual_grade: true,
                manual_graded_at: new Date().toISOString(),
                points_total: maxOutOf,
                points_earned: bounded,
                question_points: qPoints,
                earned_by_question: earnedByQ,
              })
            : activeSub.meta,
      };

      setSubs((prev) => prev.map((x) => (x.id === normalized.id ? normalized : x)));
      setActiveSub(normalized);

      toast({
        title: "Grade saved",
        description: `Saved ${bounded}/${maxOutOf} (${Math.round(
          pct(bounded, maxOutOf)
        )}%, ${letterGrade(pct(bounded, maxOutOf))}).`,
      });
    } catch (e) {
      logErr("saveGrade", e);
      toast({
        title: "Failed to save grade",
        description: errToString(e) || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSavingGrade(false);
      setSaveConfirmOpen(false);
    }
  };

  const handleReturn = async (attempt_id, feedbackOverride) => {
    try {
      const fb =
        typeof feedbackOverride === "string" ? feedbackOverride : feedbackText;
      const saved = await returnSubmission(attempt_id, { feedback: fb });

      setSubs((prev) =>
        prev.map((x) =>
          x.id === attempt_id
            ? {
                ...x,
                is_returned: true,
                returned_at: saved?.returned_at ?? x.returned_at,
                feedback: saved?.feedback ?? fb ?? x.feedback,
                status: "returned",
              }
            : x
        )
      );

      if (activeSub?.id === attempt_id) {
        setActiveSub((p) => ({
          ...p,
          is_returned: true,
          returned_at: saved?.returned_at ?? p.returned_at,
          feedback: saved?.feedback ?? fb ?? p.feedback,
          status: "returned",
        }));
      }

      toast({
        title: "Returned to student",
        description: "This submission is now visible to the student.",
      });
    } catch (e) {
      const msg = getErrorMessage(e);
      console.error(e);
      toast({
        title: "Return failed",
        description: msg || "Could not return submission.",
        variant: "destructive",
      });
    }
  };

  const handleUnreturn = async (attempt_id) => {
    try {
      await unreturnSubmission(attempt_id);

      setSubs((prev) =>
        prev.map((x) =>
          x.id === attempt_id
            ? { ...x, is_returned: false, returned_at: null, status: "pending_review" }
            : x
        )
      );

      if (activeSub?.id === attempt_id) {
        setActiveSub((p) => ({
          ...p,
          is_returned: false,
          returned_at: null,
          status: "pending_review",
        }));
      }

      toast({
        title: "Hidden from student",
        description: "This submission is now hidden again.",
      });
    } catch (e) {
      const msg = getErrorMessage(e);
      console.error(e);
      toast({
        title: "Unreturn failed",
        description: msg || "Could not unreturn submission.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen w-full bg-muted/30 overflow-x-hidden">
      <div className="w-full px-4 py-6 md:px-8 md:py-8 space-y-8">
        {/* ===== HERO ===== */}
        <section className="relative overflow-hidden rounded-4xl border border-border bg-gradient-to-b from-background via-background to-background">
          <motion.div
            aria-hidden
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
            className="pointer-events-none absolute -left-44 -top-32 w-[520px] h-[520px] rounded-full bg-gradient-to-tr from-primary/25 to-secondary/25 blur-3xl mix-blend-screen"
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

          <div className="relative p-6 sm:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-4xl">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-black mb-5">
                  <Sparkles className="h-4 w-4" />
                  Admin • Assessment View
                </div>

                <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
                  {loading ? (
                    <span className="inline-block h-10 w-[320px] bg-muted rounded-2xl animate-pulse" />
                  ) : (
                    <span className="truncate block">
                      {quiz?.quiz_title || "Untitled Assessment"}
                    </span>
                  )}
                </h1>

                <p className="mt-4 text-muted-foreground text-lg font-semibold leading-relaxed">
                  {loading ? (
                    <span className="inline-block h-5 w-[520px] bg-muted rounded-2xl animate-pulse" />
                  ) : (
                    quiz?.quiz_description || pageSubtitle
                  )}
                </p>

                <div className="mt-6 flex flex-wrap gap-2">
                  <Chip icon={visibility === "public" ? Eye : EyeOff} title="Visibility">
                    {visibility}
                  </Chip>

                  {quiz?.status ? (
                    <Chip icon={Hash} title="Status">
                      {String(quiz.status)}
                    </Chip>
                  ) : null}

                  {debQ ? (
                    <Chip icon={Search} title="Submission filter" onClear={clearSearch}>
                      {debQ}
                    </Chip>
                  ) : (
                    <Chip icon={Search} title="Tip">
                      Search submissions by student name
                    </Chip>
                  )}

                  {quiz?.track_id ? (
                    <Chip icon={Hash} title="Track">
                      track_id: {quiz.track_id}
                    </Chip>
                  ) : null}

                  {quiz?.subject_id ? (
                    <Chip icon={Hash} title="Subject">
                      subject_id: {quiz.subject_id}
                    </Chip>
                  ) : null}

                  {quiz?.course_id ? (
                    <Chip icon={Hash} title="Course">
                      course_id: {quiz.course_id}
                    </Chip>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button
                  variant="outline"
                  className="rounded-2xl font-black"
                  onClick={() => router.back()}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>

                <Link href={canNavigate ? `/admin/assessments/${hrefId}` : "#"} aria-disabled={!canNavigate}>
                  <Button
                    variant="secondary"
                    className="rounded-2xl font-black"
                    disabled={!canNavigate}
                  >
                    <ClipboardList className="mr-2 h-4 w-4" />
                    Submissions Page
                  </Button>
                </Link>

                <Button
                  variant="outline"
                  className="rounded-2xl font-black"
                  onClick={() => setPreviewOpen(true)}
                  disabled={!quiz}
                >
                  Preview
                </Button>

                {canEditQuiz ? (
                  <Link href={canNavigate ? `/admin/quizzes/${hrefId}/edit` : "#"}>
                    <Button className="rounded-2xl font-black" disabled={!canNavigate}>
                      Edit Assessment
                    </Button>
                  </Link>
                ) : null}
              </div>
            </div>

            {/* stat tiles */}
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                label="Submissions"
                value={loadingSubs ? "…" : displayedSubs.length}
                icon={Users}
                hint="Filtered"
              />
              <StatCard label="Max Score" value={maxScore} icon={CheckCircle2} />
              <StatCard
                label="Average Score"
                value={loadingSubs ? "…" : avgScore}
                icon={BarChart3}
              />
              <StatCard
                label="Returned"
                value={loadingSubs ? "…" : returnedCount}
                icon={visibility === "public" ? Eye : EyeOff}
                hint="Visible to students"
              />
            </div>
          </div>
        </section>

        {/* ===== TABS ===== */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant={activeTab === "quiz" ? "default" : "secondary"}
            className="rounded-2xl font-black gap-2"
            onClick={() => setActiveTab("quiz")}
          >
            <Hash className="h-4 w-4" />
            Quiz
          </Button>

          <Button
            variant={activeTab === "submissions" ? "default" : "secondary"}
            className="rounded-2xl font-black gap-2"
            onClick={() => setActiveTab("submissions")}
          >
            <Users className="h-4 w-4" />
            Submissions
            <Badge variant="outline" className="ml-1 rounded-full">
              {loadingSubs ? "…" : displayedSubs.length}
            </Badge>
          </Button>
        </div>

        {/* ===== CONTENT ===== */}
        {activeTab === "quiz" ? (
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            {/* Details */}
            <div className="xl:col-span-2 space-y-6">
              <Card className="rounded-4xl border-border shadow-sm overflow-hidden">
                <CardHeader className="border-b bg-muted/20">
                  <CardTitle className="text-2xl font-black tracking-tight">
                    Assessment Details
                  </CardTitle>
                  <CardDescription className="font-semibold">
                    Loaded via @/lib/quizzes.js → /api/quizzes/[id]
                  </CardDescription>
                </CardHeader>

                <CardContent className="p-6 sm:p-7">
                  {loading ? (
                    <div className="space-y-3">
                      <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
                      <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
                      <div className="h-24 w-full animate-pulse rounded bg-muted" />
                    </div>
                  ) : error ? (
                    <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-destructive font-semibold">
                      {error}
                    </div>
                  ) : (
                    <div className="space-y-5">
                      <div className="flex flex-wrap gap-2">
                        <Badge
                          className={cn(
                            "rounded-full font-black",
                            visibility === "public"
                              ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-50"
                              : "bg-muted text-muted-foreground hover:bg-muted"
                          )}
                        >
                          {visibility === "public" ? (
                            <Eye className="mr-1 h-3.5 w-3.5" />
                          ) : (
                            <EyeOff className="mr-1 h-3.5 w-3.5" />
                          )}
                          {visibility}
                        </Badge>

                        {quiz?.created_at ? (
                          <Badge variant="outline" className="rounded-full font-semibold">
                            Created {new Date(quiz.created_at).toLocaleDateString()}
                          </Badge>
                        ) : null}
                        {quiz?.updated_at ? (
                          <Badge variant="outline" className="rounded-full font-semibold">
                            Updated {new Date(quiz.updated_at).toLocaleDateString()}
                          </Badge>
                        ) : null}
                      </div>

                      <Separator />

                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <Card className="rounded-4xl border-dashed shadow-sm">
                          <CardHeader className="pb-2">
                            <CardTitle className="flex items-center gap-2 text-base font-black">
                              <Users className="h-4 w-4 text-primary" /> Submissions
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="text-2xl font-black">
                            {loadingSubs ? "…" : displayedSubs.length}
                          </CardContent>
                        </Card>

                        <Card className="rounded-4xl border-dashed shadow-sm">
                          <CardHeader className="pb-2">
                            <CardTitle className="flex items-center gap-2 text-base font-black">
                              <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Max Score
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="text-2xl font-black">{maxScore}</CardContent>
                        </Card>

                        <Card className="rounded-4xl border-dashed shadow-sm">
                          <CardHeader className="pb-2">
                            <CardTitle className="flex items-center gap-2 text-base font-black">
                              <BarChart3 className="h-4 w-4 text-amber-600" /> Avg Score
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="text-2xl font-black">
                            {loadingSubs ? "…" : avgScore}
                          </CardContent>
                        </Card>
                      </div>

                      <div className="rounded-4xl border bg-muted/20 p-4">
                        <div className="text-sm font-black">Notes</div>
                        <div className="mt-2 text-sm text-muted-foreground font-semibold leading-relaxed">
                          ✅ Max score uses the sum of each question’s{" "}
                          <span className="font-black text-foreground">points</span>. Submissions are
                          displayed and saved using the same points-based scoring.
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Answer Key */}
              <Card className="rounded-4xl border-border shadow-sm overflow-hidden">
                <CardHeader className="border-b bg-muted/20">
                  <CardTitle className="text-2xl font-black tracking-tight">
                    Answer Key
                  </CardTitle>
                  <CardDescription className="font-semibold">
                    Correct answers are highlighted. Attachments included.
                  </CardDescription>
                </CardHeader>

                <CardContent className="p-6 sm:p-7">
                  {!quiz?.questions?.length ? (
                    <div className="py-10 text-center">
                      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-black">
                        <Sparkles className="h-4 w-4" />
                        No questions
                      </div>
                      <p className="mt-4 text-muted-foreground font-semibold">
                        Add questions to show an answer key.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {quiz.questions.map((qq, i) => {
                        const pts = getPoints(qq);
                        const enableMath = !!qq.enable_math;
                        const allowMultiple =
                          qq.question_type === "choice" ? !!qq.allow_multiple : false;
                        const anyCase =
                          qq.question_type === "text" ? !!qq.text_any_case : false;
                        const correctIdx = getCorrectIndices(qq);

                        return (
                          <div
                            key={qq.question_id || i}
                            id={`q-${i + 1}`}
                            className="rounded-4xl border bg-background p-5 shadow-sm"
                          >
                            <div className="mb-3 flex items-start justify-between gap-3">
                              <div className="flex items-start gap-3 min-w-0">
                                <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-2xl bg-primary text-primary-foreground text-sm font-black shrink-0">
                                  {i + 1}
                                </div>

                                <div className="min-w-0">
                                  <div className="font-black truncate">
                                    {qq.question_text || "(Untitled Question)"}
                                  </div>

                                  <div className="mt-2 flex flex-wrap gap-2">
                                    <Badge
                                      variant="secondary"
                                      className="rounded-full font-black capitalize"
                                    >
                                      {qq.question_type || "unknown"}
                                    </Badge>

                                    <Badge
                                      variant={enableMath ? "default" : "outline"}
                                      className="rounded-full font-black gap-1"
                                    >
                                      <Calculator className="h-3.5 w-3.5" />
                                      Math {enableMath ? "On" : "Off"}
                                    </Badge>

                                    {qq.question_type === "choice" ? (
                                      <Badge
                                        variant={allowMultiple ? "default" : "outline"}
                                        className="rounded-full font-black"
                                      >
                                        {allowMultiple ? "Multiple answers" : "Single answer"}
                                      </Badge>
                                    ) : null}

                                    {qq.question_type === "text" ? (
                                      <Badge
                                        variant={anyCase ? "default" : "outline"}
                                        className="rounded-full font-black"
                                      >
                                        Any case {anyCase ? "On" : "Off"}
                                      </Badge>
                                    ) : null}

                                    {qq.difficulty ? (
                                      <Badge
                                        variant="outline"
                                        className="rounded-full font-semibold capitalize"
                                      >
                                        {qq.difficulty}
                                      </Badge>
                                    ) : null}
                                  </div>
                                </div>
                              </div>

                              <div className="text-xs text-muted-foreground font-semibold shrink-0">
                                {pts} pt{pts > 1 ? "s" : ""}
                              </div>
                            </div>

                            {qq.question_type === "choice" ? (
                              <ul className="space-y-2">
                                {(qq.choices || []).map((opt, idx) => {
                                  const isCorrect = correctIdx.includes(idx);

                                  return (
                                    <li
                                      key={idx}
                                      className={cn(
                                        "flex items-center gap-2 rounded-2xl border px-3 py-2.5",
                                        isCorrect
                                          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                                          : "border-muted bg-muted/30"
                                      )}
                                    >
                                      {isCorrect ? (
                                        <CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0" />
                                      ) : (
                                        <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
                                      )}
                                      <span className="text-sm font-semibold">
                                        {opt || (
                                          <i className="text-muted-foreground font-semibold">
                                            Empty option
                                          </i>
                                        )}
                                      </span>
                                    </li>
                                  );
                                })}
                              </ul>
                            ) : qq.question_type === "text" ? (
                              <div className="space-y-2">
                                <div className="text-xs text-muted-foreground font-semibold">
                                  Acceptable Answers
                                </div>
                                <div className="rounded-3xl border bg-muted/20 p-4 text-sm font-semibold">
                                  {getExpectedTextList(qq).length ? (
                                    <div className="space-y-1">
                                      {getExpectedTextList(qq).map((t, k) => (
                                        <div key={k}>{t}</div>
                                      ))}
                                    </div>
                                  ) : (
                                    <i className="text-muted-foreground font-semibold">
                                      (none)
                                    </i>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="text-sm text-muted-foreground font-semibold">
                                Unsupported question type.
                              </div>
                            )}

                            <AttachmentBlock images={qq.images} files={qq.files} />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right column */}
            <div className="space-y-6">
              <Card className="rounded-4xl border-border shadow-sm overflow-hidden">
                <CardHeader className="border-b bg-muted/20">
                  <CardTitle className="text-xl font-black">Jump to Question</CardTitle>
                  <CardDescription className="font-semibold">
                    Quick navigation.
                  </CardDescription>
                </CardHeader>

                <CardContent className="p-4">
                  {!quiz?.questions?.length ? (
                    <div className="text-sm text-muted-foreground font-semibold">
                      No questions.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {quiz.questions.map((qq, idx) => (
                        <a
                          key={qq.question_id || idx}
                          href={`#q-${idx + 1}`}
                          className="flex items-center justify-between rounded-3xl border bg-background px-3 py-2 text-sm hover:bg-muted/30 transition"
                        >
                          <span className="truncate font-semibold">
                            {idx + 1}. {qq.question_text || "(Untitled)"}
                          </span>
                          <span className="ml-3 shrink-0 text-xs text-muted-foreground font-semibold">
                            {getPoints(qq)} pt
                          </span>
                        </a>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="rounded-4xl border-border shadow-sm overflow-hidden">
                <CardHeader className="border-b bg-muted/20">
                  <CardTitle className="text-xl font-black">Quick Actions</CardTitle>
                  <CardDescription className="font-semibold">
                    Common admin tasks.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-5 space-y-3">
                  <Button
                    variant="outline"
                    className="w-full rounded-2xl font-black justify-start"
                    onClick={() => setActiveTab("submissions")}
                  >
                    <Users className="mr-2 h-4 w-4" />
                    Go to Submissions
                  </Button>

                  <Link
                    href={canNavigate ? `/admin/assessments/view/${hrefId}` : "#"}
                    aria-disabled={!canNavigate}
                  >
                    <Button
                      variant="secondary"
                      className="w-full rounded-2xl font-black justify-start"
                      disabled={!canNavigate}
                    >
                      <ArrowUpRight className="mr-2 h-4 w-4" />
                      Open Submissions Page
                    </Button>
                  </Link>

                  <Button
                    className="w-full rounded-2xl font-black justify-start"
                    onClick={() => setPreviewOpen(true)}
                    disabled={!quiz}
                  >
                    Preview Assessment
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          /* ===== SUBMISSIONS TAB ===== */
          <div className="rounded-4xl bg-card border border-border shadow-sm overflow-hidden">
            <div className="p-6 sm:p-7 border-b border-border">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <h2 className="text-2xl font-black tracking-tight">Submissions</h2>
                  <p className="mt-2 text-muted-foreground font-semibold">
                    Review answers, auto-grade, and return/unreturn submissions.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    className="rounded-2xl font-black"
                    onClick={autoGradeAll}
                    disabled={gradingAll || loadingSubs || !quiz || displayedSubs.length === 0}
                    title="Auto grade all currently listed submissions using points per question"
                  >
                    {gradingAll ? (
                      <>
                        <RefreshCcw className="mr-2 h-4 w-4 animate-spin" />
                        Auto Grading…
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Auto Grade (filtered)
                      </>
                    )}
                  </Button>

                  <Link href={canNavigate ? `/admin/assessments/view/${hrefId}` : "#"}>
                    <Button className="rounded-2xl font-black" disabled={!canNavigate}>
                      <ArrowUpRight className="mr-2 h-4 w-4" />
                      Open Submissions Page
                    </Button>
                  </Link>
                </div>
              </div>

              <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="relative w-full lg:max-w-md">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search student..."
                    className="pl-9 pr-10 rounded-2xl font-semibold"
                  />
                  {q ? (
                    <button
                      type="button"
                      onClick={clearSearch}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      aria-label="Clear search"
                      title="Clear search"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Chip icon={Search} title="Filter">
                    {debQ ? `"${debQ}"` : "No filter"}
                  </Chip>
                  <Chip icon={Eye} title="Returned count">
                    Returned: {loadingSubs ? "…" : returnedCount}
                  </Chip>
                </div>
              </div>
            </div>

            <div className="p-6 sm:p-7">
              <div className="rounded-3xl border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead>Student</TableHead>
                      <TableHead className="hidden md:table-cell">Submitted</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead className="hidden lg:table-cell">Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {loadingSubs ? (
                      Array.from({ length: 7 }).map((_, i) => <LoadingRow key={i} />)
                    ) : displayedSubs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="py-14 text-center">
                          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-black">
                            <Sparkles className="h-4 w-4" />
                            No submissions found
                          </div>
                          <div className="mt-4 text-muted-foreground font-semibold">
                            Submissions will appear here when students finish the assessment.
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      displayedSubs.map((s) => {
                        const outOf = maxScore; // ✅ always points-based max
                        const score = clamp(Number(s.score ?? 0), 0, outOf);
                        const percent = Math.round(pct(score, outOf));
                        const lg = letterGrade(percent);
                        const isReturned = !!s.is_returned;

                        return (
                          <TableRow key={s.id} className="hover:bg-primary/5">
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary/10 text-primary text-xs font-black">
                                  {initialsFromName(s.display_name)}
                                </div>

                                <div className="min-w-0">
                                  <div className="font-black truncate max-w-[320px]">
                                    {s.display_name || "—"}
                                  </div>
                                  <div className="text-xs text-muted-foreground font-semibold">
                                    {prettyStatus(s)}
                                  </div>
                                </div>
                              </div>
                            </TableCell>

                            <TableCell className="hidden md:table-cell text-muted-foreground font-semibold">
                              {s.submitted_at ? new Date(s.submitted_at).toLocaleString() : "—"}
                            </TableCell>

                            <TableCell>
                              <div className="flex flex-col gap-1">
                                <span className="inline-flex items-center gap-2 rounded-2xl border bg-emerald-50 px-3 py-1.5 text-emerald-700 font-black w-fit">
                                  {score}/{outOf}
                                </span>
                                <div className="text-xs text-muted-foreground font-semibold">
                                  {percent}% • {lg}
                                </div>
                              </div>
                            </TableCell>

                            <TableCell className="hidden lg:table-cell">
                              {isReturned ? (
                                <span className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-black bg-emerald-50 text-emerald-700 border-emerald-200">
                                  <Eye className="h-3.5 w-3.5" />
                                  Visible
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-black bg-muted text-muted-foreground">
                                  <EyeOff className="h-3.5 w-3.5" />
                                  Hidden
                                </span>
                              )}
                            </TableCell>

                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="rounded-2xl">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>

                                <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                  <DropdownMenuSeparator />

                                  <DropdownMenuItem onClick={() => openSubmission(s.id)}>
                                    <ClipboardList className="mr-2 h-4 w-4" />
                                    View & Grade
                                  </DropdownMenuItem>

                                  <DropdownMenuItem onClick={() => autoGradeOne(s)}>
                                    <CheckCircle2 className="mr-2 h-4 w-4" />
                                    Auto Grade
                                  </DropdownMenuItem>

                                  <DropdownMenuSeparator />

                                  {!isReturned ? (
                                    <DropdownMenuItem onClick={() => handleReturn(s.id, s.feedback || "")}>
                                      <Eye className="mr-2 h-4 w-4" />
                                      Return to student
                                    </DropdownMenuItem>
                                  ) : (
                                    <DropdownMenuItem onClick={() => handleUnreturn(s.id)}>
                                      <EyeOff className="mr-2 h-4 w-4" />
                                      Unreturn (hide)
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        )}

        {/* ===== PREVIEW DIALOG ===== */}
        <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
          <DialogContent size="lg" className="max-w-5xl p-0 overflow-hidden">
            <div className="relative border-b">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-violet-50 dark:from-blue-950/30 dark:via-indigo-950/25 dark:to-violet-950/30" />
              <div className="relative p-6">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-black">Preview</DialogTitle>
                  <DialogDescription className="font-semibold">
                    Read-only preview.
                  </DialogDescription>
                </DialogHeader>

                <div className="mt-4 flex items-center gap-2">
                  <Badge variant="secondary" className="rounded-full font-black">
                    {quiz?.questions?.length || 0} questions
                  </Badge>
                  <Badge variant="outline" className="rounded-full font-semibold">
                    Max score: {maxScore}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="p-6 max-h-[70vh] overflow-y-auto">
              {!quiz?.questions?.length ? (
                <div className="py-10 text-center text-muted-foreground font-semibold">
                  No questions.
                </div>
              ) : (
                <div className="space-y-4">
                  {quiz.questions.map((qq, i) => {
                    const pts = getPoints(qq);
                    const correctIdx = getCorrectIndices(qq);

                    return (
                      <div
                        key={qq.question_id || i}
                        className="rounded-4xl border bg-background p-5 shadow-sm"
                      >
                        <div className="mb-3 flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary text-primary-foreground text-sm font-black shrink-0">
                              {i + 1}
                            </div>
                            <div className="font-black truncate">
                              {qq.question_text || "(Untitled)"}
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground font-semibold shrink-0">
                            {pts} pt{pts > 1 ? "s" : ""}
                          </div>
                        </div>

                        {qq.question_type === "choice" ? (
                          <ul className="space-y-2">
                            {(qq.choices || []).map((opt, idx) => {
                              const isCorrect = correctIdx.includes(idx);
                              return (
                                <li
                                  key={idx}
                                  className={cn(
                                    "flex items-center gap-2 rounded-2xl border px-3 py-2.5",
                                    isCorrect
                                      ? "bg-emerald-50 border-emerald-200"
                                      : "bg-muted/20"
                                  )}
                                >
                                  {isCorrect ? (
                                    <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                                  ) : (
                                    <Circle className="h-4 w-4 text-muted-foreground" />
                                  )}
                                  <span className="text-sm font-semibold">
                                    {opt || "(empty)"}
                                  </span>
                                </li>
                              );
                            })}
                          </ul>
                        ) : qq.question_type === "text" ? (
                          <div className="space-y-2">
                            <div className="text-xs text-muted-foreground font-semibold">
                              Acceptable
                            </div>
                            <div className="rounded-3xl border bg-muted/20 p-4 text-sm font-semibold">
                              {getExpectedTextList(qq).length ? (
                                getExpectedTextList(qq).join(", ")
                              ) : (
                                <i className="text-muted-foreground font-semibold">
                                  (none)
                                </i>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="text-sm text-muted-foreground font-semibold">
                            Preview not supported.
                          </div>
                        )}

                        <AttachmentBlock images={qq.images} files={qq.files} />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <DialogFooter className="p-6 pt-0 gap-2 sm:gap-0">
              <div className="mr-auto flex items-center gap-2">
                <Checkbox id="dummy" checked={false} onCheckedChange={() => {}} disabled />
                <label htmlFor="dummy" className="text-xs text-muted-foreground font-semibold">
                  Preview only
                </label>
              </div>

              <Button
                variant="secondary"
                onClick={() => setPreviewOpen(false)}
                className="rounded-2xl font-black gap-2"
              >
                <CornerUpLeft className="h-4 w-4" />
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ===== SUBMISSION MODAL (tabs never disappear) ===== */}
        <Dialog open={!!activeSub} onOpenChange={(open) => (!open ? setActiveSub(null) : null)}>
          <DialogContent
            size="lg"
            className={cn(
              "p-0 overflow-hidden",
              "w-[calc(100%-2rem)] sm:w-[calc(100%-3rem)]",
              "max-w-6xl",
              "max-h-[calc(100vh-2rem)]",
              "flex flex-col"
            )}
          >
            {/* Header (always visible) */}
            <div className="relative border-b shrink-0">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-violet-50 dark:from-blue-950/30 dark:via-indigo-950/25 dark:to-violet-950/30" />
              <div className="relative p-5 sm:p-6 pr-14 sm:pr-16">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-black tracking-tight">
                    {activeSub?.display_name || "Submission"}
                  </DialogTitle>
                  <DialogDescription className="font-semibold">
                    Review answers, adjust points, save grade, and return/unreturn.
                  </DialogDescription>
                </DialogHeader>

                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-black border",
                        activeSub?.is_returned
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-muted text-muted-foreground border-border"
                      )}
                      title="Visibility to student"
                    >
                      {activeSub?.is_returned ? (
                        <Eye className="h-3.5 w-3.5" />
                      ) : (
                        <EyeOff className="h-3.5 w-3.5" />
                      )}
                      {activeSub?.is_returned ? "Visible" : "Hidden"}
                    </span>

                    <span className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-black border bg-background">
                      <BadgeCheck className="h-3.5 w-3.5 text-primary" />
                      {prettyStatus({ ...activeSub, feedback: feedbackText })}
                    </span>

                    <span className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-black border bg-background">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      {Number(activeSub?.score ?? 0)}/{activeOutOf}
                    </span>

                    <span className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-black border bg-background">
                      <BarChart3 className="h-3.5 w-3.5 text-amber-600" />
                      {Math.round(pct(activeSub?.score ?? 0, activeOutOf))}% •{" "}
                      {letterGrade(pct(activeSub?.score ?? 0, activeOutOf))}
                    </span>
                  </div>

                  {/* tabs */}
                  <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap pb-1">
                    {["summary", "answers", "grade"].map((t) => (
                      <Button
                        key={t}
                        size="sm"
                        variant={modalTab === t ? "default" : "secondary"}
                        onClick={() => setModalTab(t)}
                        className="capitalize rounded-2xl font-black"
                      >
                        {t}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6">
              {/* SUMMARY */}
              {modalTab === "summary" && (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                    <Card className="rounded-4xl border-dashed shadow-sm">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-black">Submitted</CardTitle>
                      </CardHeader>
                      <CardContent className="text-sm font-semibold">
                        {activeSub?.submitted_at
                          ? new Date(activeSub.submitted_at).toLocaleString()
                          : "—"}
                      </CardContent>
                    </Card>

                    <Card className="rounded-4xl border-dashed shadow-sm">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-black">Score</CardTitle>
                      </CardHeader>
                      <CardContent className="text-lg font-black">
                        {Number(activeSub?.score ?? 0)}/{activeOutOf}
                      </CardContent>
                    </Card>

                    <Card className="rounded-4xl border-dashed shadow-sm">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-black">Percent</CardTitle>
                      </CardHeader>
                      <CardContent className="text-lg font-black">
                        {Math.round(activePercent)}%{" "}
                        <span className="text-sm font-black text-muted-foreground">
                          ({activeLetter})
                        </span>
                      </CardContent>
                    </Card>

                    <Card className="rounded-4xl border-dashed shadow-sm">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-black">Reviewed</CardTitle>
                      </CardHeader>
                      <CardContent className="text-sm font-semibold">
                        {markReviewed ? "Yes" : "No"}
                      </CardContent>
                    </Card>
                  </div>

                  <div className="rounded-4xl border bg-background p-5 space-y-3 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-black">Feedback</div>
                      <div className="text-xs text-muted-foreground font-semibold">
                        Needed for “reviewed and returned”
                      </div>
                    </div>

                    <Textarea
                      value={feedbackText}
                      onChange={(e) => setFeedbackText(e.target.value)}
                      placeholder="Feedback to student (optional)"
                      className="rounded-2xl font-semibold min-h-[110px]"
                    />

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="reviewed"
                          checked={markReviewed}
                          onCheckedChange={(v) => setMarkReviewed(!!v)}
                        />
                        <label
                          htmlFor="reviewed"
                          className="text-sm text-muted-foreground font-semibold"
                        >
                          Mark as reviewed
                        </label>
                      </div>

                      <div className="text-xs text-muted-foreground font-semibold">
                        Current status:{" "}
                        <span className="font-black text-foreground">
                          {prettyStatus({ ...activeSub, feedback: feedbackText })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ANSWERS */}
              {modalTab === "answers" && (
                <div className="space-y-4">
                  {!quiz?.questions?.length ? (
                    <div className="text-sm text-muted-foreground font-semibold">
                      No questions found.
                    </div>
                  ) : (
                    quiz.questions.map((qx, idx) => {
                      const ans = activeSub?.answers?.[qx.question_id];
                      const res = gradeQuestion(qx, ans);
                      const isChoice = qx.question_type === "choice";
                      const isText = qx.question_type === "text";

                      return (
                        <div
                          key={qx.question_id || idx}
                          className="rounded-4xl border bg-background p-5 shadow-sm"
                        >
                          <div className="mb-3 flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary text-primary-foreground text-sm font-black shrink-0">
                                {idx + 1}
                              </div>
                              <div className="min-w-0">
                                <div className="font-black truncate">
                                  {qx.question_text || "(Untitled Question)"}
                                </div>
                                <div className="mt-1 text-xs text-muted-foreground font-semibold">
                                  Earned: {res.earned}/{res.max}
                                </div>
                              </div>
                            </div>

                            <Badge variant="outline" className="rounded-full font-semibold shrink-0">
                              {getPoints(qx)} pts
                            </Badge>
                          </div>

                          {isChoice ? (
                            <ul className="space-y-2">
                              {(qx.choices || []).map((opt, i) => {
                                const isCorrect = (res.correct || []).includes(i);
                                const isSelected = (res.picked || []).includes(i);

                                let cls = "bg-muted/20 border-muted";
                                let Icon = Circle;
                                let iconCls = "text-muted-foreground";

                                if (isSelected && isCorrect) {
                                  cls = "bg-emerald-50 border-emerald-200";
                                  Icon = CheckCircle2;
                                  iconCls = "text-emerald-700";
                                } else if (isSelected && !isCorrect) {
                                  cls = "bg-rose-50 border-rose-200";
                                  Icon = XCircle;
                                  iconCls = "text-rose-700";
                                } else if (!isSelected && isCorrect) {
                                  cls = "bg-emerald-50/40 border-emerald-200";
                                  Icon = CheckCircle2;
                                  iconCls = "text-emerald-700";
                                }

                                return (
                                  <li
                                    key={i}
                                    className={cn(
                                      "flex items-center gap-2 rounded-2xl border px-3 py-2.5",
                                      cls
                                    )}
                                  >
                                    <Icon className={cn("h-4 w-4 shrink-0", iconCls)} />
                                    <span
                                      className={cn(
                                        "text-sm font-semibold",
                                        isCorrect ? "text-emerald-800" : "text-foreground"
                                      )}
                                    >
                                      {opt || (
                                        <i className="text-muted-foreground font-semibold">
                                          Empty option
                                        </i>
                                      )}
                                    </span>
                                  </li>
                                );
                              })}
                            </ul>
                          ) : isText ? (
                            <div className="space-y-3">
                              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                                <div>
                                  <div className="text-xs text-muted-foreground font-semibold mb-2">
                                    Student Answer
                                  </div>
                                  <div
                                    className={cn(
                                      "rounded-3xl border p-4 text-sm font-semibold",
                                      res.earned > 0
                                        ? "bg-emerald-50 border-emerald-200"
                                        : "bg-muted/20"
                                    )}
                                  >
                                    {typeof ans === "string" && ans.trim() ? (
                                      ans
                                    ) : (
                                      <i className="text-muted-foreground font-semibold">
                                        (no answer)
                                      </i>
                                    )}
                                  </div>
                                </div>

                                <div>
                                  <div className="text-xs text-muted-foreground font-semibold mb-2">
                                    Acceptable
                                  </div>
                                  <div className="rounded-3xl border bg-muted/20 p-4 text-sm font-semibold">
                                    {getExpectedTextList(qx).length ? (
                                      <div className="space-y-1">
                                        {getExpectedTextList(qx).map((t, k) => (
                                          <div key={k}>{t}</div>
                                        ))}
                                      </div>
                                    ) : (
                                      <i className="text-muted-foreground font-semibold">
                                        (none)
                                      </i>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {res.canonicalAnswer ? (
                                <div className="rounded-3xl border bg-emerald-50 border-emerald-200 p-3 text-sm font-semibold text-emerald-800 inline-flex items-center gap-2 w-fit">
                                  <CheckCircle2 className="h-4 w-4" />
                                  Matched acceptable → corrected to:{" "}
                                  <span className="font-black">{res.canonicalAnswer}</span>
                                </div>
                              ) : null}
                            </div>
                          ) : (
                            <div className="rounded-3xl border bg-muted/20 p-4 text-sm text-muted-foreground font-semibold">
                              Unsupported question type for auto grading.
                            </div>
                          )}

                          <AttachmentBlock images={qx.images} files={qx.files} />
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* GRADE */}
              {modalTab === "grade" && (
                <div className="space-y-4">
                  {!quiz?.questions?.length ? (
                    <div className="text-sm text-muted-foreground font-semibold">
                      No questions found.
                    </div>
                  ) : (
                    <>
                      <div className="rounded-4xl border bg-muted/20 p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-2 text-sm font-black">
                          <Hash className="h-4 w-4 text-primary" />
                          Manual per-question grading
                        </div>
                        <div className="text-xs text-muted-foreground font-semibold">
                          Total auto-calculates and caps per question points.
                        </div>
                      </div>

                      {quiz.questions.map((qx, idx) => {
                        const ans = activeSub?.answers?.[qx.question_id];
                        const res = gradeQuestion(qx, ans);
                        const max = getPoints(qx);
                        const currentEarned =
                          perQEarned[qx.question_id] ?? clamp(res.earned, 0, max);

                        return (
                          <div
                            key={qx.question_id || idx}
                            className="rounded-4xl border bg-background p-5 shadow-sm"
                          >
                            <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                              <div className="flex items-start gap-3 min-w-0">
                                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary text-primary-foreground text-sm font-black shrink-0">
                                  {idx + 1}
                                </div>
                                <div className="min-w-0">
                                  <div className="font-black truncate">
                                    {qx.question_text || "(Untitled Question)"}
                                  </div>
                                  <div className="mt-1 text-xs text-muted-foreground font-semibold">
                                    Auto: {res.earned}/{res.max}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 text-xs text-muted-foreground font-semibold shrink-0">
                                <span>Points</span>
                                <Input
                                  type="number"
                                  className="h-9 w-24 rounded-2xl font-semibold"
                                  min={0}
                                  max={max}
                                  value={Number(currentEarned)}
                                  onChange={(e) =>
                                    setPerQEarned((prev) => ({
                                      ...prev,
                                      [qx.question_id]: Number(e.target.value),
                                    }))
                                  }
                                />
                                <span>/ {max}</span>
                              </div>
                            </div>

                            <div className="text-xs text-muted-foreground font-semibold">
                              Tip: use this for partial credit or non-auto-graded question types.
                            </div>
                          </div>
                        );
                      })}

                      <Separator />

                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 items-end">
                        <Card className="rounded-4xl border-dashed shadow-sm">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-black">
                              Computed total
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="text-lg font-black">
                            {computedManualTotal}/{activeOutOf}
                            <div className="mt-1 text-xs text-muted-foreground font-semibold">
                              {Math.round(pct(computedManualTotal, activeOutOf))}% •{" "}
                              {letterGrade(pct(computedManualTotal, activeOutOf))}
                            </div>
                          </CardContent>
                        </Card>

                        <div className="sm:col-span-2 space-y-2">
                          <div className="text-sm font-black">Feedback</div>
                          <Textarea
                            value={feedbackText}
                            onChange={(e) => setFeedbackText(e.target.value)}
                            placeholder="Feedback to student (optional)"
                            className="rounded-2xl font-semibold min-h-[110px]"
                          />
                          <div className="flex items-center gap-2">
                            <Checkbox
                              id="reviewed2"
                              checked={markReviewed}
                              onCheckedChange={(v) => setMarkReviewed(!!v)}
                            />
                            <label
                              htmlFor="reviewed2"
                              className="text-sm text-muted-foreground font-semibold"
                            >
                              Mark as reviewed
                            </label>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <DialogFooter className="p-5 sm:p-6 pt-0 gap-3 sm:gap-2 flex-col sm:flex-row sm:items-center shrink-0 border-t bg-background/80">
              <div className="mr-auto flex flex-wrap items-center gap-2">
                {!activeSub?.is_returned ? (
                  <Button
                    variant="outline"
                    className="rounded-2xl font-black"
                    onClick={() => handleReturn(activeSub?.id)}
                    disabled={!activeSub?.id}
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    Return
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    className="rounded-2xl font-black"
                    onClick={() => handleUnreturn(activeSub?.id)}
                    disabled={!activeSub?.id}
                  >
                    <EyeOff className="mr-2 h-4 w-4" />
                    Unreturn
                  </Button>
                )}

                {modalTab !== "grade" ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground font-semibold">
                      Set Score
                    </span>
                    <Input
                      type="number"
                      className="h-10 w-28 rounded-2xl font-semibold"
                      min={0}
                      max={activeOutOf}
                      value={Number(manualScore)}
                      onChange={(e) => setManualScore(Number(e.target.value))}
                    />
                  </div>
                ) : null}

                <Button
                  variant="secondary"
                  className="rounded-2xl font-black"
                  onClick={() => autoGradeOne(activeSub)}
                  disabled={!activeSub?.id || !quiz}
                  title="Recompute using points per question and acceptable answers"
                >
                  <RefreshCcw className="mr-2 h-4 w-4" />
                  Re-run Auto Grade
                </Button>
              </div>

              <Button
                onClick={() => setSaveConfirmOpen(true)}
                disabled={!activeSub?.id}
                className="rounded-2xl font-black"
              >
                Save Grade
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ✅ Save Grade confirmation alert */}
        <AlertDialog open={saveConfirmOpen} onOpenChange={setSaveConfirmOpen}>
          <AlertDialogContent className="rounded-4xl">
            <AlertDialogHeader>
              <AlertDialogTitleUI className="font-black flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                Save this grade?
              </AlertDialogTitleUI>
              <AlertDialogDescription className="font-semibold">
                This will save the current score, total (max points), feedback, and reviewed flag for this submission.
              </AlertDialogDescription>
            </AlertDialogHeader>

            <div className="mt-2 rounded-3xl border bg-muted/20 p-4 text-sm font-semibold">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs font-black">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  Score:{" "}
                  <span className="font-black">
                    {modalTab === "grade"
                      ? computedManualTotal
                      : clamp(manualScore, 0, activeOutOf)}
                    /{activeOutOf}
                  </span>
                </span>

                <span className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs font-black">
                  <BarChart3 className="h-3.5 w-3.5 text-amber-600" />
                  {Math.round(
                    pct(
                      modalTab === "grade"
                        ? computedManualTotal
                        : clamp(manualScore, 0, activeOutOf),
                      activeOutOf
                    )
                  )}
                  % •{" "}
                  {letterGrade(
                    pct(
                      modalTab === "grade"
                        ? computedManualTotal
                        : clamp(manualScore, 0, activeOutOf),
                      activeOutOf
                    )
                  )}
                </span>

                <span className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs font-black">
                  <BadgeCheck className="h-3.5 w-3.5 text-primary" />
                  Reviewed: {markReviewed ? "Yes" : "No"}
                </span>
              </div>
            </div>

            <AlertDialogFooterUI className="gap-2">
              <AlertDialogCancel className="rounded-2xl font-black">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                className="rounded-2xl font-black"
                onClick={(e) => {
                  e.preventDefault();
                  if (savingGrade) return;
                  performSaveManualGrade();
                }}
              >
                {savingGrade ? "Saving…" : "Confirm Save"}
              </AlertDialogAction>
            </AlertDialogFooterUI>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
