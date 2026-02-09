// app/admin/resources/page.jsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Plus,
  Search,
  X,
  ArrowUpDown,
  LayoutGrid,
  List,
  RefreshCcw,
  ChevronDown,
  ChevronRight,
  Folder,
  FolderOpen,
  Eye,
  Download,
  Link as LinkIcon,
  MoreHorizontal,
  Pencil,
  Trash2,
  FileText,
  Presentation,
  Image as ImageIcon,
  File,
  BookOpen,
  Tag,
  Hash,
  Calendar,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

/* ───────────────────────────────── Elective “folders” ───────────────────────────────── */
export const ACADEMIC_ELECTIVES = [
  "ARTS, SOCIAL SCIENCE, AND HUMANITIES",
  "BUSINESS AND ENTREPRENEURSHIP",
  "SCIENCE, TECHNOLOGY, ENGINEERING, AND MATHEMATICS",
  "SPORTS, HEALTH, AND WELLNESS",
];

export const TECH_PROF_ELECTIVES = [
  "AESTHETIC, WELLNESS, AND HUMAN CARE",
  "AGRI-FISHERY BUSINESS AND FOOD INNOVATION",
  "ARTISANRY AND CREATIVE ENTERPRISE",
  "AUTOMOTIVE AND SMALL ENGINE TECHNOLOGIES",
  "CONSTRUCTION AND BUILDING TECHNOLOGY",
  "CREATIVE ARTS AND DESIGN TECHNOLOGY",
  "HOSPITALITY AND TOURISM",
  "ICT SUPPORT AND COMPUTER PROGRAMMING TECHNOLOGIES",
  "INDUSTRIAL TECHNOLOGIES",
  "MARITIME",
];

/* ───────────────────────────────── constants ───────────────────────────────── */
const PER_PAGE = 12;
const MAX_FILE_MB = 25;
const ALL = "__ALL__";

/* ───────────────────────────────── helpers ───────────────────────────────── */
const toStr = (v) => String(v ?? "").trim();

const slugify = (s) =>
  (s || "")
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 64);

const fmtDateTime = (d) => {
  if (!d) return "—";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "—";
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(dt);
};

function getUrlLike(row) {
  return row?._url || row?.file_url || row?.url || row?.signedUrl || "";
}

function fileKindFrom(urlOrKey = "") {
  const lower = String(urlOrKey || "").toLowerCase();
  const isPDF = lower.endsWith(".pdf");
  const isPPT =
    lower.endsWith(".ppt") || lower.endsWith(".pptx") || lower.endsWith(".key");
  const isImg = [
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".webp",
    ".bmp",
    ".svg",
    ".tif",
    ".tiff",
    ".avif",
  ].some((x) => lower.endsWith(x));

  if (isPDF)
    return {
      label: "PDF",
      Icon: FileText,
      badge: "bg-rose-50 text-rose-800 border-rose-200",
    };
  if (isPPT)
    return {
      label: "Presentation",
      Icon: Presentation,
      badge: "bg-violet-50 text-violet-800 border-violet-200",
    };
  if (isImg)
    return {
      label: "Image",
      Icon: ImageIcon,
      badge: "bg-emerald-50 text-emerald-800 border-emerald-200",
    };
  return {
    label: "Document",
    Icon: File,
    badge: "bg-zinc-50 text-zinc-800 border-zinc-200",
  };
}

/**
 * One request helper for JSON + FormData, and also catches `{ success:false }`.
 */
async function request(url, options = {}) {
  const hasBody = options.body !== undefined && options.body !== null;
  const isFormData = hasBody && options.body instanceof FormData;

  const headers = { ...(options.headers || {}) };

  // Only set JSON content-type if NOT FormData
  if (!isFormData && hasBody && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(url, {
    ...options,
    headers,
    cache: "no-store",
  });

  const text = await res.text().catch(() => "");
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = {};
  }

  if (!res.ok || data?.success === false) {
    throw new Error(
      data?.error || data?.message || `Request failed (${res.status})`
    );
  }
  return data;
}

/** Normalize subject rows across different API shapes */
function normalizeSubjectRow(s) {
  const subject_id = toStr(
    s?.subject_id ??
      s?.id ??
      s?.subjectId ??
      s?.subject_code ??
      s?.code ??
      s?.slug ??
      ""
  );

  const subject_name = toStr(
    s?.subject_name ?? s?.name ?? s?.subjectName ?? s?.title ?? ""
  );

  const subject_category = toStr(
    s?.subject_category ?? s?.category ?? s?.subjectCategory ?? s?.elective ?? ""
  );

  return { ...s, subject_id, subject_name, subject_category };
}

/**
 * Tries a few common subject endpoints so you don't need to rewrite this file
 * when your subjects API shape differs.
 */
async function fetchSubjectsForElective(elective) {
  const e = toStr(elective);
  if (!e) return [];

  const candidates = [
    `/api/subjects?elective=${encodeURIComponent(e)}`,
    `/api/subjects?category=${encodeURIComponent(e)}`,
    `/api/subjects?subject_category=${encodeURIComponent(e)}`,
    `/api/subjects?filterCategory=${encodeURIComponent(e)}`,
  ];

  for (const url of candidates) {
    try {
      const data = await request(url, { method: "GET" });

      const arr = Array.isArray(data)
        ? data
        : Array.isArray(data?.subjects)
        ? data.subjects
        : Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data?.rows)
        ? data.rows
        : [];

      const normalized = arr
        .map(normalizeSubjectRow)
        .filter((s) => Boolean(toStr(s.subject_id)));

      if (normalized.length) return normalized;
    } catch {
      // try next
    }
  }

  return [];
}

async function fetchResourcesList({ subjectId = "", search = "" } = {}) {
  const params = new URLSearchParams();
  if (toStr(subjectId)) params.set("subject_id", toStr(subjectId));
  if (toStr(search)) params.set("search", toStr(search));
  params.set("limit", "2000");

  const data = await request(`/api/resources?${params.toString()}`, {
    method: "GET",
  });

  const arr = Array.isArray(data)
    ? data
    : Array.isArray(data?.resources)
    ? data.resources
    : Array.isArray(data?.data)
    ? data.data
    : Array.isArray(data?.rows)
    ? data.rows
    : [];

  return arr;
}

async function createResourceClient(payload) {
  return request(`/api/resources`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

async function updateResourceClient(id, payload) {
  const rid = encodeURIComponent(toStr(id));
  return request(`/api/resources/${rid}`, {
    method: "PUT", // if your route uses PATCH, change to PATCH
    body: JSON.stringify(payload),
  });
}

async function deleteResourceClient(id) {
  const rid = encodeURIComponent(toStr(id));
  return request(`/api/resources/${rid}`, { method: "DELETE" });
}

/**
 * Upload endpoint:
 * expects response like: { success: true, key, url }
 */
async function uploadResourceFileClient(file) {
  const fd = new FormData();
  fd.append("file", file);

  const data = await request(`/api/resources/upload`, { method: "POST", body: fd });

  const key =
    data?.key ||
    data?.file_key ||
    data?.data?.key ||
    data?.data?.file_key ||
    "";

  const url =
    data?.url ||
    data?.signedUrl ||
    data?.data?.url ||
    data?.data?.signedUrl ||
    "";

  if (!key) throw new Error("Upload succeeded but no file key was returned.");
  return { key, url };
}

function Chip({ icon: Icon, children, onClear, title }) {
  return (
    <span
      title={title}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold",
        "bg-card/70 backdrop-blur"
      )}
    >
      {Icon ? <Icon className="h-3.5 w-3.5 text-muted-foreground" /> : null}
      <span className="truncate max-w-[260px]">{children}</span>
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

function LoadingCard() {
  return (
    <div className="h-full rounded-3xl bg-card border border-border p-5">
      <div className="h-3 w-1/3 bg-muted rounded animate-pulse" />
      <div className="mt-4 h-5 w-3/4 bg-muted rounded animate-pulse" />
      <div className="mt-2 h-3 w-full bg-muted rounded animate-pulse" />
      <div className="mt-1 h-3 w-5/6 bg-muted rounded animate-pulse" />
      <div className="mt-5 flex gap-2">
        <div className="h-8 w-24 bg-muted rounded-xl animate-pulse" />
        <div className="h-8 w-20 bg-muted rounded-xl animate-pulse" />
      </div>
    </div>
  );
}

function ElectiveGroup({
  title,
  items = [],
  open,
  onToggle,
  currentElective,
  onSelect,
}) {
  return (
    <div className="rounded-3xl border border-border bg-card overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 bg-muted/30 hover:bg-muted/40 transition-colors"
      >
        <span className="font-black tracking-tight">{title}</span>
        {open ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="p-3"
          >
            <div className="grid grid-cols-1 gap-2">
              {items.map((e) => {
                const active = currentElective === e;
                return (
                  <button
                    key={e}
                    type="button"
                    onClick={() => onSelect(active ? "" : e)}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-2xl border font-semibold flex items-center gap-2",
                      active
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background hover:bg-muted/30 border-border"
                    )}
                    title={e}
                  >
                    {active ? (
                      <FolderOpen className="h-4 w-4" />
                    ) : (
                      <Folder className="h-4 w-4" />
                    )}
                    <span className="truncate">{e}</span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function ResourceViewerDialog({ open, onOpenChange, resource }) {
  const url = getUrlLike(resource);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="xl" className="max-w-5xl p-0 overflow-hidden">
        <div className="border-b bg-muted/20">
          <div className="p-5">
            <DialogHeader>
              <DialogTitle className="text-xl font-black">
                {resource?.resource_title || resource?.title || "Resource"}
              </DialogTitle>
              <DialogDescription className="font-semibold">
                {resource?.resource_category ? `${resource.resource_category} • ` : ""}
                {resource?.subject_id
                  ? `Subject: ${resource.subject_id}`
                  : "Preview"}
              </DialogDescription>
            </DialogHeader>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              {url ? (
                <>
                  <Button asChild variant="outline" className="rounded-2xl font-semibold">
                    <a href={url} target="_blank" rel="noreferrer">
                      <Eye className="mr-2 h-4 w-4" />
                      Open
                    </a>
                  </Button>
                  <Button asChild variant="outline" className="rounded-2xl font-semibold">
                    <a href={url} download>
                      <Download className="mr-2 h-4 w-4" />
                      Download
                    </a>
                  </Button>
                </>
              ) : (
                <Badge variant="outline" className="rounded-full font-semibold">
                  No file attached
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="bg-background">
          {url ? (
            <iframe
              src={url}
              title="Resource Preview"
              className="w-full h-[72vh] border-0"
            />
          ) : (
            <div className="p-10 text-center text-muted-foreground font-semibold">
              No preview available.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ResourceFormDialog({
  open,
  onOpenChange,
  mode, // "new" | "edit"
  initial,
  electiveOptions,
  subjectsForElective,
  selectedElective,
  selectedSubjectId,
  onSubmit,

  // allow the form to drive sidebar selection (so subjects load)
  onElectivePicked,
  onSubjectPicked,
}) {
  const { toast } = useToast();
  const dropRef = useRef(null);

  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [resource_category, setResourceCategory] = useState("");
  const [resource_id, setResourceId] = useState("");
  const [resource_title, setResourceTitle] = useState("");
  const [resource_description, setResourceDescription] = useState("");
  const [subject_id, setSubjectId] = useState("");
  const [strand_id, setStrandId] = useState("");
  const [file_key, setFileKey] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");

  const isEdit = mode === "edit";

  useEffect(() => {
    if (!open) return;

    setDirty(false);
    setSaving(false);
    setUploading(false);
    setErrorMsg("");

    if (isEdit && initial) {
      setResourceCategory(toStr(initial.resource_category));
      setResourceTitle(toStr(initial.resource_title));
      setResourceId(toStr(initial.resource_id || initial.id));
      setResourceDescription(toStr(initial.resource_description));
      setSubjectId(toStr(initial.subject_id));
      setStrandId(toStr(initial.strand_id));
      setFileKey(toStr(initial.file_key));
      setPreviewUrl(getUrlLike(initial));
      return;
    }

    // new
    const cat = toStr(selectedElective) || "";
    setResourceCategory(cat);
    setResourceTitle("");
    setResourceId("");
    setResourceDescription("");
    setSubjectId(toStr(selectedSubjectId));
    setStrandId("");
    setFileKey("");
    setPreviewUrl("");
  }, [open, isEdit, initial, selectedElective, selectedSubjectId]);

  const markDirty = () => setDirty(true);

  const attemptClose = (nextOpen) => {
    if (open && !nextOpen && dirty) {
      const yes = confirm("Discard changes? You have unsaved changes.");
      if (!yes) return;
    }
    onOpenChange(nextOpen);
  };

  const performUpload = async (file) => {
    if (!file) return;
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      toast({
        title: "File too large",
        description: `Max allowed size is ${MAX_FILE_MB}MB.`,
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      const { key, url } = await uploadResourceFileClient(file);
      setFileKey(key);
      setPreviewUrl(url);
      markDirty();
      toast({ title: "Uploaded", description: "File is ready." });
    } catch (e) {
      toast({
        title: "Upload failed",
        description:
          e?.message ||
          "Upload endpoint not found. Create /api/resources/upload or paste an existing file_key.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    const el = dropRef.current;
    if (!el) return;

    const prevent = (e) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const onDrop = (e) => {
      prevent(e);
      const f = e.dataTransfer?.files?.[0];
      if (f) performUpload(f);
    };

    ["dragenter", "dragover", "dragleave", "drop"].forEach((ev) =>
      el.addEventListener(ev, prevent)
    );
    el.addEventListener("drop", onDrop);

    return () => {
      ["dragenter", "dragover", "dragleave", "drop"].forEach((ev) =>
        el.removeEventListener(ev, prevent)
      );
      el.removeEventListener("drop", onDrop);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const onSave = async () => {
    setErrorMsg("");

    const cat = toStr(resource_category);
    const title = toStr(resource_title);
    const rid = toStr(resource_id) || slugify(title);
    const subj = toStr(subject_id);

    if (!cat) return setErrorMsg("Elective (folder) is required.");
    if (!title) return setErrorMsg("Title is required.");
    if (!rid) return setErrorMsg("Resource ID is required.");
    if (!subj) return setErrorMsg("Subject is required.");

    const payload = {
      resource_category: cat,
      resource_id: rid,
      resource_title: title,
      resource_description: toStr(resource_description),
      subject_id: subj,
      strand_id: toStr(strand_id) || null,
      file_key: toStr(file_key) || "",
      updated_at: new Date().toISOString(),
      ...(isEdit ? {} : { created_at: new Date().toISOString() }),
    };

    setSaving(true);
    try {
      await onSubmit(payload);
      setDirty(false);
      onOpenChange(false);
    } catch (e) {
      setErrorMsg(e?.message || "Failed to save resource.");
    } finally {
      setSaving(false);
    }
  };

  const effectiveFile = fileKindFrom(previewUrl || file_key);

  return (
    <Dialog open={open} onOpenChange={attemptClose}>
      <DialogContent size="xl" className="max-w-3xl p-0 overflow-hidden">
        <div className="relative border-b">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-violet-50 dark:from-blue-950/30 dark:via-indigo-950/25 dark:to-violet-950/30" />
          <div className="relative p-6">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black">
                {isEdit ? "Edit Resource" : "New Resource"}
              </DialogTitle>
              <DialogDescription className="font-semibold">
                Upload a file, link it to a subject, then save.
              </DialogDescription>
            </DialogHeader>
          </div>
        </div>

        <div className="p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Elective */}
            <div className="space-y-2">
              <Label className="font-semibold">Elective (Folder) *</Label>
              <Select
                value={resource_category || ""}
                onValueChange={(v) => {
                  setResourceCategory(v);

                  // Update the page selection so subjects load
                  onElectivePicked?.(v);

                  // If changing elective in "new", clear subject selection
                  if (!isEdit) {
                    setSubjectId("");
                    onSubjectPicked?.("");
                  }

                  markDirty();
                }}
              >
                <SelectTrigger className="rounded-2xl font-semibold">
                  <Tag className="mr-2 h-4 w-4 text-muted-foreground" />
                  <SelectValue placeholder="Select elective…" />
                </SelectTrigger>
                <SelectContent>
                  {electiveOptions.map((e) => (
                    <SelectItem key={e} value={e}>
                      {e}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground font-semibold">
                Used as the folder/category name.
              </p>
            </div>

            {/* Subject */}
            <div className="space-y-2">
              <Label className="font-semibold">Subject *</Label>
              <Select
                value={subject_id || ""}
                onValueChange={(v) => {
                  setSubjectId(v);
                  onSubjectPicked?.(v);
                  markDirty();
                }}
                disabled={!toStr(resource_category)}
              >
                <SelectTrigger className="rounded-2xl font-semibold">
                  <BookOpen className="mr-2 h-4 w-4 text-muted-foreground" />
                  <SelectValue
                    placeholder={
                      toStr(resource_category)
                        ? "Select subject…"
                        : "Pick an elective first…"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {Array.isArray(subjectsForElective) && subjectsForElective.length ? (
                    subjectsForElective.map((sRaw) => {
                      const s = normalizeSubjectRow(sRaw);
                      return (
                        <SelectItem key={s.subject_id} value={s.subject_id}>
                          {s.subject_name || s.subject_id}
                        </SelectItem>
                      );
                    })
                  ) : (
                    <SelectItem value={ALL} disabled>
                      No subjects found
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground font-semibold">
                This resource will be linked to the selected subject.
              </p>
            </div>

            {/* Title */}
            <div className="space-y-2 md:col-span-2">
              <Label className="font-semibold">Title *</Label>
              <Input
                className="rounded-2xl font-semibold"
                value={resource_title}
                onChange={(e) => {
                  const v = e.target.value;
                  setResourceTitle(v);
                  if (!isEdit) setResourceId(slugify(v));
                  markDirty();
                }}
                placeholder="e.g. STEM Career Guide"
              />
            </div>

            {/* Resource ID */}
            <div className="space-y-2">
              <Label className="font-semibold">Resource ID *</Label>
              <Input
                className="rounded-2xl font-semibold font-mono"
                value={resource_id}
                onChange={(e) => {
                  if (isEdit) return;
                  setResourceId(slugify(e.target.value));
                  markDirty();
                }}
                placeholder="auto-from-title"
                readOnly={isEdit}
              />
              <p className="text-xs text-muted-foreground font-semibold">
                {isEdit ? "ID is locked for edits." : "Auto-generated from title (editable)."}
              </p>
            </div>

            {/* Strand (optional) */}
            <div className="space-y-2">
              <Label className="font-semibold">Strand ID (optional)</Label>
              <Input
                className="rounded-2xl font-semibold"
                value={strand_id}
                onChange={(e) => {
                  setStrandId(e.target.value);
                  markDirty();
                }}
                placeholder="e.g. STEM"
              />
            </div>

            {/* Description */}
            <div className="space-y-2 md:col-span-2">
              <Label className="font-semibold">Description</Label>
              <Textarea
                className="rounded-2xl font-semibold min-h-[110px]"
                value={resource_description}
                onChange={(e) => {
                  setResourceDescription(e.target.value);
                  markDirty();
                }}
                placeholder="Short description..."
              />
            </div>

            {/* Upload */}
            <div className="space-y-2 md:col-span-2">
              <Label className="font-semibold">File (optional)</Label>

              <div
                ref={dropRef}
                className={cn(
                  "rounded-3xl border border-dashed p-5",
                  uploading ? "opacity-70" : "hover:bg-muted/20",
                  "transition-colors"
                )}
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold">Drag & drop a file here, or browse</p>
                    <p className="text-xs text-muted-foreground font-semibold">
                      PDF / PPT / Image • up to {MAX_FILE_MB}MB
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-2xl font-semibold"
                      disabled={uploading}
                      onClick={() =>
                        document.getElementById("resource-file-input")?.click()
                      }
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Browse
                    </Button>

                    <input
                      id="resource-file-input"
                      type="file"
                      className="hidden"
                      accept=".pdf,application/pdf,.ppt,.pptx,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,image/*"
                      disabled={uploading}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) performUpload(f);
                        e.target.value = "";
                      }}
                    />
                  </div>
                </div>

                {/* current file */}
                {file_key || previewUrl ? (
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <Badge className={cn("border rounded-full font-semibold", effectiveFile.badge)}>
                      <effectiveFile.Icon className="mr-2 h-4 w-4" />
                      {effectiveFile.label}
                    </Badge>

                    {file_key ? (
                      <Badge
                        variant="outline"
                        className="rounded-full font-semibold font-mono max-w-full truncate"
                      >
                        {file_key}
                      </Badge>
                    ) : null}

                    {previewUrl ? (
                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="rounded-2xl font-semibold"
                      >
                        <a href={previewUrl} target="_blank" rel="noreferrer">
                          <Eye className="mr-2 h-4 w-4" />
                          Preview
                        </a>
                      </Button>
                    ) : null}

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="rounded-2xl font-semibold"
                      onClick={() => {
                        setFileKey("");
                        setPreviewUrl("");
                        markDirty();
                      }}
                    >
                      <X className="mr-2 h-4 w-4" />
                      Remove
                    </Button>
                  </div>
                ) : null}

                {/* manual file_key fallback */}
                <div className="mt-4">
                  <Label className="text-xs text-muted-foreground font-semibold">
                    Or paste an existing <span className="font-black">file_key</span>
                  </Label>
                  <Input
                    className="mt-1 rounded-2xl font-semibold font-mono"
                    value={file_key}
                    onChange={(e) => {
                      setFileKey(e.target.value);
                      markDirty();
                    }}
                    placeholder="pdf/your-file.pdf"
                  />
                </div>
              </div>

              {uploading ? (
                <p className="text-xs text-muted-foreground font-semibold">Uploading…</p>
              ) : null}
            </div>

            <AnimatePresence>
              {errorMsg ? (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  className="md:col-span-2 rounded-2xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive font-semibold"
                >
                  {errorMsg}
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              className="rounded-2xl font-semibold"
              onClick={() => attemptClose(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              className="rounded-2xl font-semibold"
              onClick={onSave}
              disabled={saving || uploading}
            >
              {saving ? "Saving…" : isEdit ? "Save Changes" : "Create Resource"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ───────────────────────────────── page ───────────────────────────────── */
export default function ResourcesPage() {
  const { toast } = useToast();

  // left rail
  const [openAcad, setOpenAcad] = useState(true);
  const [openTech, setOpenTech] = useState(true);
  const [selectedElective, setSelectedElective] = useState("");
  const [selectedSubjectId, setSelectedSubjectId] = useState("");

  // top controls
  const [q, setQ] = useState("");
  const [debQ, setDebQ] = useState("");
  const [sortKey, setSortKey] = useState("updated_desc");
  const [viewMode, setViewMode] = useState(
    typeof window !== "undefined"
      ? localStorage.getItem("res_view_mode") || "grid"
      : "grid"
  );

  // paging
  const [page, setPage] = useState(1);

  // dialogs
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState("new"); // new|edit
  const [editing, setEditing] = useState(null);

  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewing, setViewing] = useState(null);

  // debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebQ(q.trim().toLowerCase()), 250);
    return () => clearTimeout(t);
  }, [q]);

  // subjects for elective
  const subjectsKey = useMemo(
    () => (selectedElective ? ["subjects-by-elective", selectedElective] : null),
    [selectedElective]
  );

  const {
    data: subjectsData,
    isLoading: subjectsLoading,
    mutate: mutateSubjects,
  } = useSWR(subjectsKey, async () => fetchSubjectsForElective(selectedElective), {
    revalidateOnFocus: false,
  });

  const subjectsForElective = Array.isArray(subjectsData)
    ? subjectsData.map(normalizeSubjectRow)
    : [];

  const selectedSubject = selectedSubjectId
    ? subjectsForElective.find(
        (s) => toStr(s.subject_id) === toStr(selectedSubjectId)
      ) || null
    : null;

  // resources
  const resourcesKey = useMemo(
    () => ["resources", selectedSubjectId || "", debQ || ""],
    [selectedSubjectId, debQ]
  );

  const {
    data: resourcesData,
    isLoading: resourcesLoading,
    mutate: mutateResources,
  } = useSWR(
    resourcesKey,
    async () =>
      fetchResourcesList({
        subjectId: selectedSubjectId || "",
        search: debQ || "",
      }),
    { revalidateOnFocus: false }
  );

  const resources = Array.isArray(resourcesData) ? resourcesData : [];

  // keep view mode persisted
  const setView = (m) => {
    setViewMode(m);
    try {
      localStorage.setItem("res_view_mode", m);
    } catch {}
  };

  // reset page on filter changes
  useEffect(() => {
    setPage(1);
  }, [debQ, sortKey, viewMode, selectedElective, selectedSubjectId]);

  // elective options for dropdown in form
  const electiveOptions = useMemo(
    () => [...ACADEMIC_ELECTIVES, ...TECH_PROF_ELECTIVES],
    []
  );

  // filter + sort
  const filtered = useMemo(() => {
    let arr = resources.slice();

    // elective filter (folder)
    if (selectedElective) {
      arr = arr.filter(
        (r) => toStr(r.resource_category) === toStr(selectedElective)
      );
    }

    // search fallback client-side too (in case API ignores "search")
    if (debQ) {
      arr = arr.filter((r) => {
        const hay = `${r.resource_title} ${r.resource_description} ${r.resource_id} ${r.resource_category} ${r.subject_id}`.toLowerCase();
        return hay.includes(debQ);
      });
    }

    if (sortKey === "updated_desc") {
      arr.sort(
        (a, b) =>
          new Date(b.updated_at || b.created_at || 0) -
          new Date(a.updated_at || a.created_at || 0)
      );
    } else if (sortKey === "created_desc") {
      arr.sort(
        (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)
      );
    } else if (sortKey === "title_asc") {
      arr.sort((a, b) =>
        (a.resource_title || "").localeCompare(b.resource_title || "")
      );
    }

    return arr;
  }, [resources, selectedElective, debQ, sortKey]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));

  useEffect(() => {
    if (page > totalPages) setPage(1);
  }, [page, totalPages]);

  const pageItems = useMemo(
    () => filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE),
    [filtered, page]
  );

  // stats
  const stats = useMemo(() => {
    const total = filtered.length;
    const categories = new Set(
      filtered.map((r) => toStr(r.resource_category)).filter(Boolean)
    ).size;

    const last =
      filtered.length > 0
        ? new Date(
            Math.max(
              ...filtered.map((r) =>
                new Date(r.updated_at || r.created_at || 0).getTime()
              )
            )
          )
        : null;

    return { total, categories, lastText: last ? fmtDateTime(last) : "—" };
  }, [filtered]);

  const hasFilters = Boolean(selectedElective || selectedSubjectId || debQ);

  const openNew = () => {
    setFormMode("new");
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (row) => {
    setFormMode("edit");
    setEditing(row);
    setFormOpen(true);
  };

  const openViewer = (row) => {
    setViewing(row);
    setViewerOpen(true);
  };

  const rowId = (r) => toStr(r?.resource_id || r?.id);

  const copyLink = async (url) => {
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: "Copied", description: "Link copied to clipboard." });
    } catch {
      toast({
        title: "Copy failed",
        description: "Could not copy link.",
        variant: "destructive",
      });
    }
  };

  const onDelete = async (row) => {
    const yes = confirm(
      `Delete “${row?.resource_title || "this resource"}”? This cannot be undone.`
    );
    if (!yes) return;

    try {
      await deleteResourceClient(rowId(row));
      toast({ title: "Deleted", description: "Resource removed." });
      await mutateResources();
    } catch (e) {
      toast({
        title: "Delete failed",
        description: e?.message || "Failed to delete.",
        variant: "destructive",
      });
    }
  };

  const resetAll = () => {
    setQ("");
    setSelectedElective("");
    setSelectedSubjectId("");
    setSortKey("updated_desc");
  };

  return (
    <div className="space-y-6">
      {/* ===== Hero Header ===== */}
      <section className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-b from-background via-background to-background">
        <motion.div
          aria-hidden
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7 }}
          className="pointer-events-none absolute -left-36 -top-28 w-[440px] h-[440px] rounded-full bg-gradient-to-tr from-primary/20 to-secondary/20 blur-3xl mix-blend-screen"
        />
        <motion.div
          aria-hidden
          className="pointer-events-none absolute -right-28 bottom-10 w-72 h-72 rounded-full bg-gradient-to-br from-accent/15 to-primary/10 blur-3xl mix-blend-screen"
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1.03, opacity: 1 }}
          transition={{
            duration: 1.1,
            repeat: Infinity,
            repeatType: "mirror",
            ease: "easeInOut",
          }}
        />

        <div className="relative p-5 sm:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-black">
                <Sparkles className="h-3.5 w-3.5" />
                Resources
              </div>

              <h1 className="mt-3 text-3xl sm:text-4xl font-black tracking-tight">
                Resource Library
              </h1>

              <p className="mt-2 text-sm text-muted-foreground font-semibold">
                Organize resources by elective folders, then attach them to specific
                subjects.
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                <Badge variant="secondary" className="rounded-full font-semibold">
                  Total: {stats.total}
                </Badge>
                <Badge variant="outline" className="rounded-full font-semibold">
                  Categories: {stats.categories}
                </Badge>
                <Badge variant="outline" className="rounded-full font-semibold">
                  Last Update: {stats.lastText}
                </Badge>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                className="rounded-2xl font-semibold"
                onClick={() => {
                  if (selectedElective) mutateSubjects();
                  mutateResources();
                }}
                disabled={resourcesLoading}
              >
                <RefreshCcw className="mr-2 h-4 w-4" />
                Refresh
              </Button>

              {/* ✅ Always clickable now */}
              <Button
                className="rounded-2xl font-semibold"
                onClick={openNew}
                title="Create a new resource (choose elective + subject inside the form)"
              >
                <Plus className="mr-2 h-4 w-4" />
                New Resource
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Controls ===== */}
      <div className="rounded-3xl bg-card border border-border shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
            {/* Search */}
            <div className="lg:col-span-6 relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search title, description, ID…"
                className="pl-9 pr-10 rounded-2xl font-semibold"
              />
              {q ? (
                <button
                  type="button"
                  onClick={() => setQ("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  title="Clear search"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </div>

            {/* Sort */}
            <div className="lg:col-span-3">
              <Select value={sortKey} onValueChange={setSortKey}>
                <SelectTrigger className="rounded-2xl font-semibold">
                  <ArrowUpDown className="mr-2 h-4 w-4 text-muted-foreground" />
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="updated_desc">Recently updated</SelectItem>
                  <SelectItem value="created_desc">Newest created</SelectItem>
                  <SelectItem value="title_asc">Title (A–Z)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* View toggle + Reset */}
            <div className="lg:col-span-3 flex items-center justify-between lg:justify-end gap-2">
              <div className="inline-flex rounded-2xl border overflow-hidden bg-muted/20">
                <Button
                  type="button"
                  variant={viewMode === "grid" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setView("grid")}
                  className="rounded-none font-semibold"
                >
                  <LayoutGrid className="h-4 w-4 mr-2" />
                  Grid
                </Button>
                <Button
                  type="button"
                  variant={viewMode === "list" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setView("list")}
                  className="rounded-none font-semibold"
                >
                  <List className="h-4 w-4 mr-2" />
                  List
                </Button>
              </div>

              {hasFilters ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-2xl font-semibold"
                  onClick={resetAll}
                >
                  <X className="h-4 w-4 mr-2" />
                  Reset
                </Button>
              ) : (
                <Badge variant="outline" className="rounded-full font-semibold">
                  {filtered.length} items
                </Badge>
              )}
            </div>
          </div>

          {/* Active chips */}
          {hasFilters ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {selectedElective ? (
                <Chip icon={Tag} title="Elective" onClear={() => setSelectedElective("")}>
                  {selectedElective}
                </Chip>
              ) : null}
              {selectedSubject ? (
                <Chip
                  icon={BookOpen}
                  title="Subject"
                  onClear={() => setSelectedSubjectId("")}
                >
                  {selectedSubject.subject_name || selectedSubject.subject_id}
                </Chip>
              ) : null}
              {debQ ? (
                <Chip icon={Search} title="Search" onClear={() => setQ("")}>
                  {q}
                </Chip>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      {/* ===== Main Layout (Left Rail + Results) ===== */}
      <div className="grid grid-cols-1 lg:[grid-template-columns:22rem_1fr] gap-6">
        {/* LEFT */}
        <aside className="space-y-4">
          <ElectiveGroup
            title="Academic Electives"
            items={ACADEMIC_ELECTIVES}
            open={openAcad}
            onToggle={() => setOpenAcad((o) => !o)}
            currentElective={selectedElective}
            onSelect={(v) => {
              setSelectedElective(v);
              setSelectedSubjectId("");
            }}
          />

          <ElectiveGroup
            title="Tech-Voc/Prof Electives"
            items={TECH_PROF_ELECTIVES}
            open={openTech}
            onToggle={() => setOpenTech((o) => !o)}
            currentElective={selectedElective}
            onSelect={(v) => {
              setSelectedElective(v);
              setSelectedSubjectId("");
            }}
          />

          <div className="rounded-3xl border border-border bg-card overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="font-black tracking-tight">
                  {selectedElective ? "Subjects" : "Pick an elective"}
                </p>
                <p className="text-xs text-muted-foreground font-semibold">
                  {selectedElective
                    ? "Select a subject (optional). You can also choose inside the form."
                    : "Folders are on top."}
                </p>
              </div>
              {selectedElective ? (
                <Badge variant="outline" className="rounded-full font-semibold">
                  {subjectsLoading ? "…" : subjectsForElective.length}
                </Badge>
              ) : null}
            </div>

            <div className="p-3 space-y-2">
              {!selectedElective ? (
                <div className="py-6 text-center text-muted-foreground font-semibold">
                  Choose an elective folder first.
                </div>
              ) : subjectsLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="h-10 rounded-2xl bg-muted animate-pulse" />
                  ))}
                </div>
              ) : subjectsForElective.length === 0 ? (
                <div className="py-6 text-center text-muted-foreground font-semibold">
                  No subjects found for this elective.
                </div>
              ) : (
                subjectsForElective.map((sRaw) => {
                  const s = normalizeSubjectRow(sRaw);
                  const sid = toStr(s.subject_id);
                  const name = toStr(s.subject_name) || sid || "Untitled subject";
                  const active = toStr(selectedSubjectId) === sid;

                  return (
                    <button
                      key={sid}
                      type="button"
                      onClick={() => setSelectedSubjectId(active ? "" : sid)}
                      className={cn(
                        "w-full text-left px-3 py-2 rounded-2xl border font-semibold transition-colors",
                        active
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background hover:bg-muted/30 border-border"
                      )}
                      title={name}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate">{name}</span>
                        <Badge
                          variant={active ? "secondary" : "outline"}
                          className={cn(
                            "rounded-full font-semibold",
                            active ? "bg-white/15 border-white/20" : ""
                          )}
                        >
                          <span className="font-mono text-[11px]">{sid}</span>
                        </Badge>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {selectedSubject ? (
              <div className="px-4 py-3 border-t border-border text-xs text-muted-foreground font-semibold">
                Selected subject ID:{" "}
                <span className="font-mono text-foreground">
                  {selectedSubject.subject_id}
                </span>
              </div>
            ) : null}
          </div>
        </aside>

        {/* RIGHT */}
        <section className="rounded-3xl bg-card border border-border shadow-sm overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-lg sm:text-xl font-black tracking-tight">
                Results
              </h2>
              <p className="text-sm text-muted-foreground font-semibold">
                {resourcesLoading
                  ? "Loading…"
                  : `${pageItems.length} shown • ${filtered.length} total`}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="rounded-full font-semibold">
                Page {page} / {totalPages}
              </Badge>
              <Badge variant="outline" className="rounded-full font-semibold">
                {PER_PAGE}/page
              </Badge>
            </div>
          </div>

          <div className="p-5 sm:p-6">
            {resourcesLoading ? (
              viewMode === "grid" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="h-[260px]">
                      <LoadingCard />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center text-muted-foreground font-semibold">
                  Loading…
                </div>
              )
            ) : filtered.length === 0 ? (
              <div className="py-14 text-center">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-semibold">
                  <Sparkles className="h-4 w-4" />
                  No resources found
                </div>
                <p className="mt-4 text-muted-foreground font-semibold">
                  Click{" "}
                  <span className="font-black text-foreground">New Resource</span>{" "}
                  to add one.
                </p>
              </div>
            ) : viewMode === "list" ? (
              <div className="rounded-3xl border overflow-hidden">
                <div className="w-full overflow-x-auto">
                  <Table className="min-w-[1050px]">
                    <TableHeader>
                      <TableRow className="bg-muted/40">
                        <TableHead className="w-[260px]">Title</TableHead>
                        <TableHead className="w-[180px]">Resource ID</TableHead>
                        <TableHead className="w-[220px]">Elective</TableHead>
                        <TableHead className="w-[160px]">Subject</TableHead>
                        <TableHead className="w-[160px]">File</TableHead>
                        <TableHead className="w-[180px]">Updated</TableHead>
                        <TableHead className="w-[90px] text-right">
                          Actions
                        </TableHead>
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      {pageItems.map((r) => {
                        const url = getUrlLike(r);
                        const kind = fileKindFrom(url || r.file_key);
                        return (
                          <TableRow
                            key={rowId(r)}
                            className="hover:bg-primary/5 cursor-pointer"
                            onClick={() => openViewer(r)}
                          >
                            <TableCell className="font-semibold">
                              <div className="min-w-0">
                                <p className="truncate font-black">
                                  {r.resource_title || "Untitled"}
                                </p>
                                <p className="text-xs text-muted-foreground line-clamp-1 font-semibold">
                                  {r.resource_description || "No description."}
                                </p>
                              </div>
                            </TableCell>

                            <TableCell className="font-mono text-xs">
                              {r.resource_id || "—"}
                            </TableCell>

                            <TableCell>
                              <Badge
                                variant="outline"
                                className="rounded-full font-semibold max-w-[200px] truncate"
                              >
                                {r.resource_category || "—"}
                              </Badge>
                            </TableCell>

                            <TableCell>
                              <Badge variant="secondary" className="rounded-full font-semibold">
                                {r.subject_id || "—"}
                              </Badge>
                            </TableCell>

                            <TableCell>
                              <Badge
                                className={cn("border rounded-full font-semibold", kind.badge)}
                              >
                                <kind.Icon className="mr-2 h-4 w-4" />
                                {r.file_key ? kind.label : "—"}
                              </Badge>
                            </TableCell>

                            <TableCell className="text-muted-foreground font-semibold">
                              {fmtDateTime(r.updated_at || r.created_at)}
                            </TableCell>

                            <TableCell
                              className="text-right"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="rounded-xl">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => openViewer(r)}>
                                    <Eye className="mr-2 h-4 w-4" />
                                    View
                                  </DropdownMenuItem>
                                  {url ? (
                                    <>
                                      <DropdownMenuItem asChild>
                                        <a href={url} download>
                                          <Download className="mr-2 h-4 w-4" />
                                          Download
                                        </a>
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => copyLink(url)}>
                                        <LinkIcon className="mr-2 h-4 w-4" />
                                        Copy link
                                      </DropdownMenuItem>
                                    </>
                                  ) : null}
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => openEdit(r)}>
                                    <Pencil className="mr-2 h-4 w-4" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="text-destructive focus:text-destructive"
                                    onClick={() => onDelete(r)}
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {pageItems.map((r) => {
                  const url = getUrlLike(r);
                  const kind = fileKindFrom(url || r.file_key);
                  return (
                    <motion.div
                      key={rowId(r)}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                      className="h-[270px]"
                    >
                      <div className="h-full rounded-3xl border border-border bg-card overflow-hidden hover:shadow-md transition-shadow">
                        <button
                          type="button"
                          onClick={() => openViewer(r)}
                          className="w-full text-left"
                        >
                          <div className="p-5">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-xs text-muted-foreground font-semibold flex items-center gap-2">
                                  <Tag className="h-3.5 w-3.5" />
                                  <span className="truncate">
                                    {r.resource_category || "Uncategorized"}
                                  </span>
                                </p>
                                <h3 className="mt-2 font-black tracking-tight line-clamp-2">
                                  {r.resource_title || "Untitled"}
                                </h3>
                              </div>

                              <Badge className={cn("border rounded-full font-semibold", kind.badge)}>
                                <kind.Icon className="mr-2 h-4 w-4" />
                                {r.file_key ? kind.label : "—"}
                              </Badge>
                            </div>

                            <p className="mt-2 text-sm text-muted-foreground font-semibold line-clamp-2">
                              {r.resource_description || "No description."}
                            </p>

                            <div className="mt-4 flex flex-wrap gap-2">
                              <Badge variant="secondary" className="rounded-full font-semibold">
                                <BookOpen className="mr-2 h-3.5 w-3.5" />
                                {r.subject_id || "—"}
                              </Badge>
                              <Badge variant="outline" className="rounded-full font-semibold">
                                <Hash className="mr-2 h-3.5 w-3.5" />
                                <span className="font-mono text-[11px]">
                                  {r.resource_id || "—"}
                                </span>
                              </Badge>
                            </div>

                            <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground font-semibold">
                              <span className="inline-flex items-center gap-2">
                                <Calendar className="h-3.5 w-3.5" />
                                {fmtDateTime(r.updated_at || r.created_at)}
                              </span>
                              {url ? (
                                <span className="inline-flex items-center gap-2">
                                  <Eye className="h-3.5 w-3.5" />
                                  Preview
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-2">
                                  <File className="h-3.5 w-3.5" />
                                  No file
                                </span>
                              )}
                            </div>
                          </div>
                        </button>

                        <div className="px-5 pb-5 pt-0">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              {url ? (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="rounded-2xl font-semibold"
                                    onClick={() => copyLink(url)}
                                  >
                                    <LinkIcon className="mr-2 h-4 w-4" />
                                    Copy
                                  </Button>
                                  <Button
                                    asChild
                                    variant="outline"
                                    size="sm"
                                    className="rounded-2xl font-semibold"
                                  >
                                    <a href={url} download onClick={(e) => e.stopPropagation()}>
                                      <Download className="mr-2 h-4 w-4" />
                                      Download
                                    </a>
                                  </Button>
                                </>
                              ) : (
                                <Badge variant="outline" className="rounded-full font-semibold">
                                  Attach a file in edit
                                </Badge>
                              )}
                            </div>

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="rounded-xl">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => openViewer(r)}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  View
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openEdit(r)}>
                                  <Pencil className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => onDelete(r)}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}

            {/* Pagination */}
            {filtered.length > PER_PAGE ? (
              <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <p className="text-sm text-muted-foreground font-semibold">
                  Page <span className="font-black text-foreground">{page}</span> of{" "}
                  <span className="font-black text-foreground">{totalPages}</span>
                </p>

                <div className="flex items-center justify-end gap-2">
                  <Button
                    variant="outline"
                    className="rounded-2xl font-semibold"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Prev
                  </Button>
                  <Button
                    variant="outline"
                    className="rounded-2xl font-semibold"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  >
                    Next
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        </section>
      </div>

      {/* Viewer */}
      <ResourceViewerDialog
        open={viewerOpen}
        onOpenChange={(v) => {
          setViewerOpen(v);
          if (!v) setViewing(null);
        }}
        resource={viewing}
      />

      {/* Create/Edit */}
      <ResourceFormDialog
        open={formOpen}
        onOpenChange={(v) => {
          setFormOpen(v);
          if (!v) setEditing(null);
        }}
        mode={formMode}
        initial={editing}
        electiveOptions={electiveOptions}
        subjectsForElective={subjectsForElective}
        selectedElective={selectedElective}
        selectedSubjectId={selectedSubjectId}
        onElectivePicked={(v) => setSelectedElective(v)}
        onSubjectPicked={(v) => setSelectedSubjectId(v)}
        onSubmit={async (payload) => {
          try {
            if (formMode === "edit") {
              const id = rowId(editing);
              await updateResourceClient(id, payload);
              toast({ title: "Updated", description: "Resource saved." });
            } else {
              await createResourceClient(payload);
              toast({ title: "Created", description: "Resource added." });
            }
            await mutateResources();
          } catch (e) {
            toast({
              title: "Save failed",
              description: e?.message || "Could not save resource.",
              variant: "destructive",
            });
            throw e;
          }
        }}
      />
    </div>
  );
}
