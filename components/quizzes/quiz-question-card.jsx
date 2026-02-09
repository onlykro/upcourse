// components/quizzes/quiz-question-card.jsx
"use client";

import { useMemo, useRef, useState } from "react";
import {
  ArrowUp,
  ArrowDown,
  Copy,
  Trash2,
  GripVertical,
  Image as ImageIcon,
  Paperclip,
  X,
  CheckCircle2,
} from "lucide-react";

import { useToast } from "@/hooks/use-toast";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

function normalizeMediaItem(m, fallbackName = "") {
  if (!m) return null;
  if (typeof m === "string") {
    const url = safeStr(m);
    return url ? { url, name: fallbackName } : null;
  }
  const url = safeStr(
    m?.url || m?.public_url || m?.publicUrl || m?.publicURL || m?.href
  );
  if (!url) return null;
  return {
    ...m,
    url,
    name: safeStr(m?.name || m?.filename || m?.file_name || fallbackName),
  };
}

function DifficultyPill({ difficulty }) {
  const d = normalizeDifficulty(difficulty);
  const cls =
    d === "easy"
      ? "bg-emerald-500/10 text-emerald-700"
      : d === "medium"
      ? "bg-amber-500/10 text-amber-700"
      : d === "difficult"
      ? "bg-rose-500/10 text-rose-700"
      : "bg-muted text-muted-foreground";

  const label = d ? (d === "difficult" ? "hard" : d) : "unset";

  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-black ${cls}`}>
      {label}
    </span>
  );
}

function ensureTypeDefaults(question, nextType) {
  const base = { ...question, question_type: nextType };

  if (nextType === "choice") {
    return {
      ...base,
      allow_multiple: !!base.allow_multiple,
      choices:
        Array.isArray(base.choices) && base.choices.length >= 2
          ? base.choices
          : ["", ""],
      correct_answers: Array.isArray(base.correct_answers) ? base.correct_answers : [],
    };
  }

  if (nextType === "text") {
    return {
      ...base,
      choices: Array.isArray(base.choices) ? [base.choices[0] ?? ""] : [""],
      text_any_case: !!base.text_any_case,
    };
  }

  if (nextType === "rating") {
    return { ...base, rating_max: Number(base.rating_max || 5) };
  }

  if (nextType === "likert") {
    return {
      ...base,
      likert_rows:
        Array.isArray(base.likert_rows) && base.likert_rows.length
          ? base.likert_rows
          : ["Statement 1"],
      likert_cols:
        Array.isArray(base.likert_cols) && base.likert_cols.length
          ? base.likert_cols
          : ["Strongly disagree", "Disagree", "Neutral", "Agree", "Strongly agree"],
    };
  }

  return base;
}

export default function QuizQuestionCard({
  index,
  question,
  onChange,
  onRemove,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  onReorder,
  onUploadImage,
  onUploadFile,
}) {
  const { toast } = useToast();

  const setPatch = (patch) => onChange({ ...question, ...patch });

  // Drag & Drop (drag handle only)
  const cardRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleDragStart = (e) => {
    if (typeof onReorder !== "function") return;
    setDragging(true);
    e.dataTransfer.setData("text/plain", String(index));
    e.dataTransfer.effectAllowed = "move";

    if (cardRef.current) {
      const crt = cardRef.current.cloneNode(true);
      crt.style.position = "absolute";
      crt.style.top = "-9999px";
      crt.style.left = "-9999px";
      crt.style.width = `${cardRef.current.getBoundingClientRect().width}px`;
      document.body.appendChild(crt);
      e.dataTransfer.setDragImage(crt, 24, 24);
      setTimeout(() => {
        try {
          document.body.removeChild(crt);
        } catch {}
      }, 0);
    }
  };

  const handleDragOver = (e) => {
    if (typeof onReorder !== "function") return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  const handleDrop = (e) => {
    if (typeof onReorder !== "function") return;
    e.preventDefault();
    setDragging(false);
    setDragOver(false);

    const from = Number(e.dataTransfer.getData("text/plain"));
    const to = index;

    if (!Number.isNaN(from) && from !== to) onReorder(from, to);
  };

  const handleDragEnd = () => {
    setDragging(false);
    setDragOver(false);
  };

  // Upload inputs
  const imgInputRef = useRef(null);
  const fileInputRef = useRef(null);

  const images = useMemo(
    () =>
      (Array.isArray(question.images) ? question.images : [])
        .map((m) => normalizeMediaItem(m))
        .filter(Boolean),
    [question.images]
  );

  const files = useMemo(
    () =>
      (Array.isArray(question.files) ? question.files : [])
        .map((m) => normalizeMediaItem(m))
        .filter(Boolean),
    [question.files]
  );

  const handleAttachImages = async (picked) => {
    const current = images;
    const toAdd = [];

    for (const file of picked) {
      try {
        if (onUploadImage) {
          const media = await onUploadImage(file);
          const norm = normalizeMediaItem(media, file.name);
          if (norm) toAdd.push(norm);
        } else {
          toAdd.push({ url: URL.createObjectURL(file), name: file.name });
        }
      } catch (e) {
        toast({
          title: "Upload failed",
          description: e?.message || "Could not upload image.",
          variant: "destructive",
        });
      }
    }

    if (toAdd.length) setPatch({ images: [...current, ...toAdd] });
  };

  const handleAttachFiles = async (picked) => {
    const current = files;
    const toAdd = [];

    for (const file of picked) {
      try {
        if (onUploadFile) {
          const media = await onUploadFile(file);
          const norm = normalizeMediaItem(media, file.name);
          if (norm) {
            toAdd.push({
              ...norm,
              size: typeof norm.size === "number" ? norm.size : file.size,
            });
          }
        } else {
          toAdd.push({ url: URL.createObjectURL(file), name: file.name, size: file.size });
        }
      } catch (e) {
        toast({
          title: "Upload failed",
          description: e?.message || "Could not upload file.",
          variant: "destructive",
        });
      }
    }

    if (toAdd.length) setPatch({ files: [...current, ...toAdd] });
  };

  const removeImageAt = (i) => {
    const next = images.slice();
    next.splice(i, 1);
    setPatch({ images: next });
  };

  const removeFileAt = (i) => {
    const next = files.slice();
    next.splice(i, 1);
    setPatch({ files: next });
  };

  // Choice: correct answers
  const toggleCorrect = (i) => {
    if (question.question_type !== "choice") return;

    const isMulti = !!question.allow_multiple;
    const current = Array.isArray(question.correct_answers) ? question.correct_answers : [];

    if (isMulti) {
      const next = current.includes(i) ? current.filter((x) => x !== i) : [...current, i];
      setPatch({ correct_answers: next });
    } else {
      setPatch({ correct_answers: current[0] === i ? [] : [i] });
    }
  };

  const isChoice = question.question_type === "choice";
  const isText = question.question_type === "text";
  const isRating = question.question_type === "rating";
  const isLikert = question.question_type === "likert";

  const choiceList = Array.isArray(question.choices) ? question.choices : ["", ""];
  const canRemoveChoice = choiceList.length > 2;

  return (
    <Card
      ref={cardRef}
      className={`rounded-4xl border shadow-sm overflow-hidden transition ${
        dragging || dragOver ? "ring-2 ring-primary/30" : ""
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <CardHeader className="pb-3 border-b">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                draggable={typeof onReorder === "function"}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-2xl border bg-background ${
                  typeof onReorder === "function" ? "cursor-grab active:cursor-grabbing" : "opacity-40"
                }`}
                title={typeof onReorder === "function" ? "Drag to reorder" : "Reorder disabled"}
              >
                <GripVertical className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-black text-muted-foreground">Drag</span>
              </button>

              <Badge variant="secondary" className="rounded-full border font-black">
                {question.question_id || `q${index + 1}`}
              </Badge>

              <Badge variant="outline" className="rounded-full font-black">
                {String(question.question_type || "choice").toUpperCase()}
              </Badge>

              {question.required ? (
                <Badge className="rounded-full font-black border-0 bg-destructive/10 text-destructive">
                  Required
                </Badge>
              ) : null}

              <DifficultyPill difficulty={question.difficulty} />
            </div>

            <CardTitle className="mt-2 text-lg font-black">Question {index + 1}</CardTitle>
            <CardDescription className="font-semibold">
              Prompt, type, scoring, and attachments.
            </CardDescription>
          </div>

          <div className="flex flex-wrap items-center gap-2 justify-end">
            <Button type="button" variant="outline" className="rounded-2xl font-black" onClick={onMoveUp} title="Move up">
              <ArrowUp className="h-4 w-4" />
            </Button>
            <Button type="button" variant="outline" className="rounded-2xl font-black" onClick={onMoveDown} title="Move down">
              <ArrowDown className="h-4 w-4" />
            </Button>
            <Button type="button" variant="outline" className="rounded-2xl font-black" onClick={onDuplicate} title="Duplicate">
              <Copy className="h-4 w-4" />
            </Button>
            <Button type="button" variant="destructive" className="rounded-2xl font-black" onClick={onRemove} title="Delete">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-5">
        {/* Question text */}
        <div className="space-y-2">
          <div className="text-sm font-black">Question Text</div>
          <Textarea
            value={question.question_text || ""}
            onChange={(e) => setPatch({ question_text: e.target.value })}
            className="rounded-3xl font-semibold min-h-[100px]"
            placeholder="Write the question prompt..."
          />
        </div>

        {/* Controls */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="rounded-3xl border p-4 bg-muted/20">
            <div className="flex items-center gap-2">
              <Checkbox checked={!!question.required} onCheckedChange={(v) => setPatch({ required: !!v })} />
              <div className="text-sm font-black">Required</div>
            </div>
            <div className="text-xs text-muted-foreground font-semibold mt-2">
              Students must answer this.
            </div>
          </div>

          <div className="rounded-3xl border p-4 bg-muted/20">
            <div className="flex items-center gap-2">
              <Checkbox checked={!!question.enable_math} onCheckedChange={(v) => setPatch({ enable_math: !!v })} />
              <div className="text-sm font-black">Math</div>
            </div>
            <div className="text-xs text-muted-foreground font-semibold mt-2">
              Enable math formatting.
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-black">Points</div>
            <Input
              type="number"
              min={0}
              value={Number(question.points || 0)}
              onChange={(e) => setPatch({ points: Number(e.target.value || 0) })}
              className="rounded-2xl font-semibold"
            />
          </div>

          <div className="space-y-2">
            <div className="text-sm font-black">Difficulty</div>
            <Select
              value={normalizeDifficulty(question.difficulty) || "none"}
              onValueChange={(v) => setPatch({ difficulty: v === "none" ? "" : v })}
            >
              <SelectTrigger className="rounded-2xl font-semibold">
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                <SelectItem value="easy">Easy</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="difficult">Hard</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Type */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-2 md:col-span-1">
            <div className="text-sm font-black">Question Type</div>
            <Select
              value={question.question_type || "choice"}
              onValueChange={(v) => onChange(ensureTypeDefaults(question, v))}
            >
              <SelectTrigger className="rounded-2xl font-semibold">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="choice">Choice</SelectItem>
                <SelectItem value="text">Text</SelectItem>
                <SelectItem value="rating">Rating</SelectItem>
                <SelectItem value="likert">Likert</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isChoice ? (
            <div className="md:col-span-2 rounded-3xl border p-4 bg-muted/10">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={!!question.allow_multiple}
                  onCheckedChange={(v) => setPatch({ allow_multiple: !!v, correct_answers: [] })}
                />
                <div className="text-sm font-black">Allow multiple answers</div>
              </div>
              <div className="text-xs text-muted-foreground font-semibold mt-2">
                If enabled, multiple correct options can be selected.
              </div>
            </div>
          ) : null}

          {isText ? (
            <div className="md:col-span-2 rounded-3xl border p-4 bg-muted/10">
              <div className="flex items-center gap-2">
                <Checkbox checked={!!question.text_any_case} onCheckedChange={(v) => setPatch({ text_any_case: !!v })} />
                <div className="text-sm font-black">Enable any case</div>
              </div>
              <div className="text-xs text-muted-foreground font-semibold mt-2">
                Treat “Answer”, “answer”, and “ANSWER” as the same.
              </div>
            </div>
          ) : null}
        </div>

        {/* Type-specific editors */}
        {isChoice ? (
          <div className="space-y-3 rounded-4xl border p-5">
            <div>
              <div className="text-sm font-black">Choices</div>
              <div className="text-xs text-muted-foreground font-semibold">
                Select correct answers using the checkbox/radio.
              </div>
            </div>

            <div className="space-y-2">
              {choiceList.map((choice, i) => (
                <div key={i} className="flex items-center gap-2">
                  {question.allow_multiple ? (
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={(question.correct_answers || []).includes(i)}
                      onChange={() => toggleCorrect(i)}
                    />
                  ) : (
                    <input
                      type="radio"
                      name={`correct-${question.question_id || index}`}
                      className="h-4 w-4"
                      checked={(question.correct_answers || []).includes(i)}
                      onChange={() => toggleCorrect(i)}
                    />
                  )}

                  <Input
                    value={choice}
                    onChange={(e) => {
                      const next = [...choiceList];
                      next[i] = e.target.value;
                      setPatch({ choices: next });
                    }}
                    className="rounded-2xl font-semibold"
                    placeholder={`Option ${i + 1}`}
                  />

                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-2xl font-black"
                    disabled={!canRemoveChoice}
                    onClick={() => {
                      if (!canRemoveChoice) return;

                      const nextChoices = [...choiceList];
                      nextChoices.splice(i, 1);

                      const corr = (question.correct_answers || [])
                        .filter((ci) => ci !== i)
                        .map((ci) => (ci > i ? ci - 1 : ci));

                      setPatch({
                        choices: nextChoices.length >= 2 ? nextChoices : ["", ""],
                        correct_answers: corr,
                      });
                    }}
                    title={canRemoveChoice ? "Remove option" : "At least 2 options required"}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}

              <Button
                type="button"
                variant="secondary"
                className="rounded-2xl font-black"
                onClick={() => setPatch({ choices: [...choiceList, ""] })}
              >
                + Add option
              </Button>
            </div>
          </div>
        ) : null}

        {isText ? (
          <div className="rounded-4xl border p-5 space-y-2">
            <div className="text-sm font-black">Correct answer (optional)</div>
            <Input
              value={(Array.isArray(question.choices) && question.choices[0]) || ""}
              onChange={(e) => setPatch({ choices: [e.target.value] })}
              className="rounded-2xl font-semibold"
              placeholder="(Optional) correct answer"
            />
            <div className="text-xs text-muted-foreground font-semibold">
              Leave blank if this is not auto-graded.
            </div>
          </div>
        ) : null}

        {isRating ? (
          <div className="rounded-4xl border p-5 space-y-3">
            <div className="text-sm font-black">Rating Max</div>
            <Select
              value={String(Number(question.rating_max || 5))}
              onValueChange={(v) => setPatch({ rating_max: Number(v) })}
            >
              <SelectTrigger className="rounded-2xl font-semibold w-40">
                <SelectValue placeholder="5" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5</SelectItem>
                <SelectItem value="10">10</SelectItem>
              </SelectContent>
            </Select>

            <div className="text-xs text-muted-foreground font-semibold">
              Typical values: 5 or 10.
            </div>
          </div>
        ) : null}

        {isLikert ? (
          <div className="rounded-4xl border p-5 space-y-4">
            <div>
              <div className="text-sm font-black">Rows (statements)</div>
              <div className="mt-2 space-y-2">
                {(question.likert_rows || []).map((r, i) => (
                  <div key={`r-${i}`} className="flex gap-2">
                    <Input
                      value={r}
                      onChange={(e) => {
                        const rows = [...(question.likert_rows || [])];
                        rows[i] = e.target.value;
                        setPatch({ likert_rows: rows });
                      }}
                      className="rounded-2xl font-semibold"
                      placeholder={`Statement ${i + 1}`}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-2xl font-black"
                      onClick={() => {
                        const rows = (question.likert_rows || []).filter((_, idx) => idx !== i);
                        setPatch({ likert_rows: rows.length ? rows : ["Statement 1"] });
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}

                <Button
                  type="button"
                  variant="secondary"
                  className="rounded-2xl font-black"
                  onClick={() => setPatch({ likert_rows: [...(question.likert_rows || []), ""] })}
                >
                  + Add row
                </Button>
              </div>
            </div>

            <div>
              <div className="text-sm font-black">Columns (scale)</div>
              <div className="mt-2 space-y-2">
                {(question.likert_cols || []).map((c, i) => (
                  <div key={`c-${i}`} className="flex gap-2">
                    <Input
                      value={c}
                      onChange={(e) => {
                        const cols = [...(question.likert_cols || [])];
                        cols[i] = e.target.value;
                        setPatch({ likert_cols: cols });
                      }}
                      className="rounded-2xl font-semibold"
                      placeholder={`Label ${i + 1}`}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-2xl font-black"
                      onClick={() => {
                        const cols = (question.likert_cols || []).filter((_, idx) => idx !== i);
                        setPatch({ likert_cols: cols.length ? cols : ["Option 1"] });
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}

                <Button
                  type="button"
                  variant="secondary"
                  className="rounded-2xl font-black"
                  onClick={() => setPatch({ likert_cols: [...(question.likert_cols || []), ""] })}
                >
                  + Add column
                </Button>
              </div>
            </div>

            <div className="overflow-auto rounded-3xl border">
              <table className="min-w-full text-sm">
                <thead>
                  <tr>
                    <th className="text-left p-2 border bg-muted/40"> </th>
                    {(question.likert_cols || []).map((c, i) => (
                      <th key={i} className="p-2 border bg-muted/40">
                        {c || `C${i + 1}`}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(question.likert_rows || []).map((r, ri) => (
                    <tr key={ri}>
                      <td className="p-2 border font-semibold">{r || `R${ri + 1}`}</td>
                      {(question.likert_cols || []).map((_, ci) => (
                        <td key={ci} className="p-2 border text-center">
                          <CheckCircle2 className="inline h-4 w-4 text-muted-foreground" />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        {/* Attachments */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="rounded-4xl border p-5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-muted-foreground" />
                <div className="text-sm font-black">Images</div>
              </div>

              <div>
                <input
                  ref={imgInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  hidden
                  onChange={(e) => {
                    const picked = Array.from(e.target.files || []);
                    if (picked.length) handleAttachImages(picked);
                    e.target.value = "";
                  }}
                />
                <Button
                  type="button"
                  variant="secondary"
                  className="rounded-2xl font-black"
                  onClick={() => imgInputRef.current?.click()}
                >
                  Add
                </Button>
              </div>
            </div>

            {images.length > 0 ? (
              <div className="flex flex-wrap gap-3">
                {images.map((img, i) => (
                  <div key={i} className="relative group">
                    <img
                      src={img.url}
                      alt={img.name || `image-${i + 1}`}
                      className="h-24 w-24 object-cover rounded-2xl border"
                    />
                    <button
                      type="button"
                      onClick={() => removeImageAt(i)}
                      className="absolute -top-2 -right-2 p-1 rounded-full bg-background border shadow-sm opacity-0 group-hover:opacity-100 transition"
                      title="Remove image"
                    >
                      <X className="h-4 w-4 text-destructive" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-muted-foreground font-semibold">No images yet.</div>
            )}
          </div>

          <div className="rounded-4xl border p-5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Paperclip className="h-4 w-4 text-muted-foreground" />
                <div className="text-sm font-black">Files</div>
              </div>

              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  hidden
                  onChange={(e) => {
                    const picked = Array.from(e.target.files || []);
                    if (picked.length) handleAttachFiles(picked);
                    e.target.value = "";
                  }}
                />
                <Button
                  type="button"
                  variant="secondary"
                  className="rounded-2xl font-black"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Add
                </Button>
              </div>
            </div>

            {files.length > 0 ? (
              <div className="space-y-2">
                {files.map((f, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between gap-2 rounded-2xl border px-3 py-2"
                  >
                    <div className="min-w-0">
                      <a
                        href={f.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-semibold hover:underline truncate block"
                        title={f.name || "file"}
                      >
                        {f.name || `file-${i + 1}`}
                      </a>
                      {typeof f.size === "number" ? (
                        <div className="text-[11px] text-muted-foreground font-semibold">
                          {Math.round(f.size / 1024)} KB
                        </div>
                      ) : null}
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      className="rounded-2xl"
                      onClick={() => removeFileAt(i)}
                      title="Remove file"
                    >
                      <X className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-muted-foreground font-semibold">No files yet.</div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
