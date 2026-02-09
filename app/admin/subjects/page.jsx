// app/admin/subjects/page.jsx
"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { motion } from "framer-motion";
import {
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  Eye,
  LayoutGrid,
  List,
  RefreshCcw,
  X,
  ArrowUpDown,
  BookOpen,
  Tag,
  Activity,
  Sparkles,
  Layers,
  AlertTriangle,
} from "lucide-react";

import { cn } from "@/lib/utils";
import {
  fetchSubjects,
  createSubject,
  updateSubject,
  deleteSubject,
} from "@/lib/subjects";
import { fetchTracks } from "@/lib/tracks";

import SubjectDetailsDialog from "@/components/subjects/subject-details-dialog";
import SubjectFormDialog from "@/components/subjects/subject-form-dialog";
import SubjectCard from "@/components/subjects/subject-card";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

const pageSize = 12;
const ALL = "__ALL__";

// ✅ Elective lists + core categories
const ACADEMIC_ELECTIVES = [
  "ARTS, SOCIAL SCIENCE, AND HUMANITIES",
  "BUSINESS AND ENTREPRENEURSHIP",
  "SCIENCE, TECHNOLOGY, ENGINEERING, AND MATHEMATICS",
  "SPORTS, HEALTH, AND WELLNESS",
];

const TECH_PROF_ELECTIVES = [
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

const CORE_CATEGORIES = ["Core", "Specialized"];

// ✅ Main category filter values (UI)
const CAT_MAIN = {
  CORE: "Core",
  SPEC: "Specialized",
  ACAD: "Academic",
  TECH: "Tech/Prof",
};

const toStr = (v) => String(v ?? "").trim();

const fmtDate = (d1, d2) => {
  const d = d1 || d2;
  if (!d) return "—";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "—";
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(dt);
};

const statusBadge = (status) => {
  const v = String(status || "Active").toLowerCase();
  if (v === "active") return "bg-emerald-50 text-emerald-800 border-emerald-200";
  if (v === "inactive") return "bg-zinc-50 text-zinc-800 border-zinc-200";
  return "bg-amber-50 text-amber-900 border-amber-200";
};

const categoryBadge = (category) => {
  const v = String(category || "").toLowerCase();
  if (v === "core") return "bg-blue-50 text-blue-800 border-blue-200";
  if (v === "specialized") return "bg-violet-50 text-violet-800 border-violet-200";

  if (ACADEMIC_ELECTIVES.map((x) => x.toLowerCase()).includes(v))
    return "bg-sky-50 text-sky-900 border-sky-200";
  if (TECH_PROF_ELECTIVES.map((x) => x.toLowerCase()).includes(v))
    return "bg-orange-50 text-orange-900 border-orange-200";

  return "bg-zinc-50 text-zinc-800 border-zinc-200";
};

const typeBadge = (type) => {
  const v = String(type || "").toLowerCase();
  if (!v) return "bg-zinc-50 text-zinc-800 border-zinc-200";
  if (v.includes("lab")) return "bg-rose-50 text-rose-800 border-rose-200";
  if (v.includes("lec") || v.includes("lecture"))
    return "bg-indigo-50 text-indigo-800 border-indigo-200";
  return "bg-zinc-50 text-zinc-800 border-zinc-200";
};

/* ------------------------------ helpers ------------------------------ */

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
      <span className="truncate max-w-[240px]">{children}</span>
      {onClear ? (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onClear?.();
          }}
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
        <div className="h-8 w-20 bg-muted rounded-xl animate-pulse" />
        <div className="h-8 w-24 bg-muted rounded-xl animate-pulse" />
      </div>
    </div>
  );
}

// ✅ Chip label for the 2-step category filter (clearer "All")
const categoryChipLabel = (main, sub) => {
  if (!main) return "";
  if (main === CAT_MAIN.CORE || main === CAT_MAIN.SPEC) return main;

  if (main === CAT_MAIN.ACAD) return sub ? `Academic — ${sub}` : "Academic — All electives";
  if (main === CAT_MAIN.TECH) return sub ? `Tech/Prof — ${sub}` : "Tech/Prof — All electives";

  return main;
};

/* ------------------------------------------------------------------ */
/* page */
/* ------------------------------------------------------------------ */

export default function SubjectsPage() {
  // UI
  const [viewMode, setViewMode] = useState("grid"); // grid | list
  const [sortBy, setSortBy] = useState("name-asc");

  // ✅ filters (NOW uses track_id, not strand_id)
  const [filterTrackId, setFilterTrackId] = useState(""); // subjects.track_id -> tracks.track_id

  // ✅ 2-step category filter
  const [filterCategoryMain, setFilterCategoryMain] = useState(""); // Core | Specialized | Academic | Tech/Prof
  const [filterCategorySub, setFilterCategorySub] = useState(""); // electives specific option

  const [filterStatus, setFilterStatus] = useState("");
  const [filterType, setFilterType] = useState("");

  const [page, setPage] = useState(1);

  // page-level message
  const [uiError, setUiError] = useState("");

  // search + debounce
  const [search, setSearch] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(search.trim()), 250);
    return () => clearTimeout(t);
  }, [search]);

  // dialogs
  const [formOpen, setFormOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [details, setDetails] = useState(null);
  const [editing, setEditing] = useState(null);

  // delete dialog (two-step confirm)
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteStep, setDeleteStep] = useState(1);
  const [deleteText, setDeleteText] = useState("");
  const [deleteRow, setDeleteRow] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const closeDelete = () => {
    setDeleteOpen(false);
    setDeleteStep(1);
    setDeleteText("");
    setDeleteRow(null);
    setDeleting(false);
  };

  // tracks list
  const { data: tracksData } = useSWR(
    "tracks",
    async () => fetchTracks({ search: "" }),
    { revalidateOnFocus: false }
  );
  const tracks = Array.isArray(tracksData) ? tracksData : [];
  const tracksLoading = tracksData === undefined;

  // ✅ Map by track_id (not id)
  const trackMap = useMemo(() => {
    const m = new Map();
    for (const t of tracks) {
      const id = toStr(t?.track_id ?? t?.code ?? t?.id);
      if (id) m.set(id, t);
    }
    return m;
  }, [tracks]);

  // ✅ If user switches main category, reset subcategory
  useEffect(() => {
    if (!filterCategoryMain) {
      if (filterCategorySub) setFilterCategorySub("");
      return;
    }
    if (filterCategoryMain === CAT_MAIN.CORE || filterCategoryMain === CAT_MAIN.SPEC) {
      if (filterCategorySub) setFilterCategorySub("");
      return;
    }
    if (filterCategoryMain === CAT_MAIN.ACAD) {
      if (filterCategorySub && !ACADEMIC_ELECTIVES.includes(filterCategorySub)) {
        setFilterCategorySub("");
      }
    }
    if (filterCategoryMain === CAT_MAIN.TECH) {
      if (filterCategorySub && !TECH_PROF_ELECTIVES.includes(filterCategorySub)) {
        setFilterCategorySub("");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterCategoryMain]);

  // ✅ Build the category value sent to API
  const apiCategory = useMemo(() => {
    const main = toStr(filterCategoryMain);
    const sub = toStr(filterCategorySub);

    if (!main) return "";
    if (main === CAT_MAIN.CORE || main === CAT_MAIN.SPEC) return main;

    // Note: your API must understand this "A|B|C" pattern or ignore it.
    // If your API only supports single category, keep sub empty and use only sub selection.
    if (main === CAT_MAIN.ACAD) return sub ? sub : ACADEMIC_ELECTIVES.join("|");
    if (main === CAT_MAIN.TECH) return sub ? sub : TECH_PROF_ELECTIVES.join("|");

    return "";
  }, [filterCategoryMain, filterCategorySub]);

  // subjects list
  const swrKey = useMemo(
    () => [
      "subjects",
      debouncedQ,
      filterTrackId,
      filterCategoryMain,
      filterCategorySub,
      filterStatus,
      filterType,
      sortBy,
      page,
    ],
    [
      debouncedQ,
      filterTrackId,
      filterCategoryMain,
      filterCategorySub,
      filterStatus,
      filterType,
      sortBy,
      page,
    ]
  );

  const { data, isLoading, mutate } = useSWR(
    swrKey,
    async () =>
      fetchSubjects({
        search: debouncedQ,
        track_id: filterTrackId, // ✅ CHANGED (was strand_id)
        category: apiCategory,
        status: filterStatus,
        type: filterType,
        sort: sortBy,
        page,
        limit: pageSize,
      }),
    { revalidateOnFocus: false }
  );

  const subjectsRaw = data?.subjects || [];
  const pagination = data?.pagination;

  // normalize rows
  const subjects = useMemo(() => {
    const list = Array.isArray(subjectsRaw) ? subjectsRaw : [];
    return list.map((s) => {
      const subject_id = toStr(s?.subject_id);
      const track_id = toStr(s?.track_id);

      const t = track_id ? trackMap.get(track_id) : null;

      const subject_status =
        String(s?.subject_status || "Active").toLowerCase() === "inactive"
          ? "Inactive"
          : "Active";

      return {
        ...s,
        subject_id,
        track_id, // ✅
        subject_status,
        subject_description: toStr(s?.subject_description) || toStr(s?.description) || "",
        __track: t, // ✅ SubjectCard/Details can use this
      };
    });
  }, [subjectsRaw, trackMap]);

  // reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [
    debouncedQ,
    filterTrackId,
    filterCategoryMain,
    filterCategorySub,
    filterStatus,
    filterType,
    sortBy,
    viewMode,
  ]);

  const rowKey = (row) => toStr(row?.subject_id);

  const getSubjectIdOrThrow = (row) => {
    const code = toStr(row?.subject_id);
    if (!code) {
      throw new Error("Missing subject_id in row. Check your API to always return subject_id.");
    }
    return code;
  };

  const openCreate = () => {
    setUiError("");
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (row) => {
    if (!row) return;

    setUiError("");

    const normalized = {
      ...row,
      subject_id: toStr(row?.subject_id),
      track_id: toStr(row?.track_id),
      subject_description: toStr(row?.subject_description) || toStr(row?.description) || "",
      subject_status:
        String(row?.subject_status || "Active").toLowerCase() === "inactive"
          ? "Inactive"
          : "Active",
    };

    if (!normalized.subject_id) {
      setUiError("This row has no subject_id. Check your GET /api/subjects select() fields.");
      return;
    }

    setEditing(normalized);
    setFormOpen(true);
  };

  const openDetails = (row) => {
    if (!row) return;

    setUiError("");

    const normalized = {
      ...row,
      subject_id: toStr(row?.subject_id),
      track_id: toStr(row?.track_id),
      subject_description: toStr(row?.subject_description) || toStr(row?.description) || "",
      subject_status:
        String(row?.subject_status || "Active").toLowerCase() === "inactive"
          ? "Inactive"
          : "Active",
    };

    setDetails(normalized);
    setDetailsOpen(true);
  };

  const onDeleteClick = (row) => {
    setUiError("");
    setDeleteRow(row);
    setDeleteText("");
    setDeleteStep(1);
    setDeleteOpen(true);
  };

  const doDelete = async () => {
    if (!deleteRow) return;

    setDeleting(true);
    setUiError("");

    try {
      await deleteSubject(getSubjectIdOrThrow(deleteRow));
      await mutate();

      if (detailsOpen && details && rowKey(details) === rowKey(deleteRow)) {
        setDetailsOpen(false);
        setDetails(null);
      }

      closeDelete();
    } catch (e) {
      setUiError(e?.message || "Failed to delete subject.");
      setDeleting(false);
    }
  };

  const resetFilters = () => {
    setUiError("");
    setSearch("");
    setFilterTrackId("");
    setFilterCategoryMain("");
    setFilterCategorySub("");
    setFilterStatus("");
    setFilterType("");
  };

  const hasFilters = Boolean(
    debouncedQ ||
      filterTrackId ||
      filterCategoryMain ||
      filterCategorySub ||
      filterStatus ||
      filterType
  );

  const trackSelectValue = filterTrackId || ALL;
  const categoryMainSelectValue = filterCategoryMain || ALL;

  const showCategorySub =
    filterCategoryMain === CAT_MAIN.ACAD || filterCategoryMain === CAT_MAIN.TECH;

  const categorySubSelectValue = filterCategorySub || ALL;

  const statusSelectValue = filterStatus || ALL;
  const typeSelectValue = filterType || ALL;

  // ✅ dynamic label for "ALL" subcategory option + placeholder
  const subAllLabel = useMemo(() => {
    if (filterCategoryMain === CAT_MAIN.ACAD) return "All Academic electives";
    if (filterCategoryMain === CAT_MAIN.TECH) return "All Tech/Prof electives";
    return "All under selected group";
  }, [filterCategoryMain]);

  const subPlaceholder = useMemo(() => {
    if (filterCategoryMain === CAT_MAIN.ACAD) return "Pick an Academic elective (optional)";
    if (filterCategoryMain === CAT_MAIN.TECH) return "Pick a Tech/Prof elective (optional)";
    return "Select subcategory";
  }, [filterCategoryMain]);

  // stats
  const stats = useMemo(() => {
    const total = pagination?.total ?? subjects.length;
    const active = subjects.filter(
      (s) => String(s.subject_status || "Active").toLowerCase() === "active"
    ).length;
    return { total, active };
  }, [subjects, pagination]);

  const sortLabel =
    sortBy === "name-asc"
      ? "Name A–Z"
      : sortBy === "name-desc"
      ? "Name Z–A"
      : sortBy === "newest"
      ? "Newest"
      : sortBy === "oldest"
      ? "Oldest"
      : sortBy;

  // ✅ track label uses new fields (track_id + track_name)
  const trackChipLabel = useMemo(() => {
    if (!filterTrackId) return "";
    const t = trackMap.get(String(filterTrackId));
    if (!t) return String(filterTrackId);

    const tid = toStr(t?.track_id ?? t?.code ?? "");
    const tname = toStr(t?.track_name ?? t?.name ?? "");
    return tid ? `${tid} — ${tname || "Unnamed"}` : tname || String(filterTrackId);
  }, [filterTrackId, trackMap]);

  const categorySubOptions = useMemo(() => {
    if (filterCategoryMain === CAT_MAIN.ACAD) return ACADEMIC_ELECTIVES;
    if (filterCategoryMain === CAT_MAIN.TECH) return TECH_PROF_ELECTIVES;
    return [];
  }, [filterCategoryMain]);

  const confirmTypedOk = deleteText.trim().toLowerCase() === "confirm";

  return (
    <div className="space-y-6">
      {/* Page-level error */}
      {uiError ? (
        <Alert className="rounded-3xl">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle className="font-black">Something went wrong</AlertTitle>
          <AlertDescription className="font-semibold">{uiError}</AlertDescription>
        </Alert>
      ) : null}

      {/* ===== Compact Header ===== */}
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
                Subjects
              </div>

              <h1 className="mt-3 text-3xl sm:text-4xl font-black tracking-tight">
                Subject Management
              </h1>

              <div className="mt-3 flex flex-wrap gap-2">
                <Badge variant="secondary" className="rounded-full font-semibold">
                  Total: {stats.total ?? "—"}
                </Badge>
                <Badge className="rounded-full border bg-emerald-50 text-emerald-800 border-emerald-200 font-semibold">
                  Active: {stats.active}
                </Badge>
                {pagination ? (
                  <Badge variant="outline" className="rounded-full font-semibold">
                    Page {pagination.page} / {pagination.totalPages}
                  </Badge>
                ) : null}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                className="rounded-2xl font-semibold"
                onClick={() => {
                  setUiError("");
                  mutate();
                }}
                disabled={isLoading}
              >
                <RefreshCcw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
              <Button type="button" className="rounded-2xl font-semibold" onClick={openCreate}>
                <Plus className="mr-2 h-4 w-4" />
                Add
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Compact Search + Controls ===== */}
      <div className="rounded-3xl bg-card border border-border shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
            {/* search */}
            <div className="lg:col-span-6 relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search subject name or code…"
                className="pl-9 pr-10 rounded-2xl font-semibold"
              />
              {search ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    setUiError("");
                    setSearch("");
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  title="Clear search"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </div>

            {/* sort */}
            <div className="lg:col-span-3">
              <Select value={sortBy} onValueChange={(v) => (setUiError(""), setSortBy(v))}>
                <SelectTrigger className="rounded-2xl font-semibold">
                  <ArrowUpDown className="mr-2 h-4 w-4 text-muted-foreground" />
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name-asc">Name (A–Z)</SelectItem>
                  <SelectItem value="name-desc">Name (Z–A)</SelectItem>
                  <SelectItem value="newest">Newest</SelectItem>
                  <SelectItem value="oldest">Oldest</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* view toggle + reset */}
            <div className="lg:col-span-3 flex items-center justify-between lg:justify-end gap-2">
              <div className="inline-flex rounded-2xl border overflow-hidden bg-muted/20">
                <Button
                  type="button"
                  variant={viewMode === "grid" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => (setUiError(""), setViewMode("grid"))}
                  className="rounded-none font-semibold"
                >
                  <LayoutGrid className="h-4 w-4 mr-2" />
                  Grid
                </Button>
                <Button
                  type="button"
                  variant={viewMode === "list" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => (setUiError(""), setViewMode("list"))}
                  className="rounded-none font-semibold"
                >
                  <List className="h-4 w-4 mr-2" />
                  List
                </Button>
              </div>

              {hasFilters ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-2xl font-semibold"
                  onClick={resetFilters}
                >
                  <X className="h-4 w-4 mr-2" />
                  Reset
                </Button>
              ) : (
                <Badge variant="outline" className="rounded-full font-semibold">
                  {sortLabel}
                </Badge>
              )}
            </div>
          </div>

          <Separator className="my-4" />

          {/* filters row */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
            {/* ✅ Track (was Track/Strand) */}
            <div>
              <Label className="text-xs text-muted-foreground font-semibold">Track</Label>
              <Select
                value={trackSelectValue}
                onValueChange={(v) => {
                  setUiError("");
                  setFilterTrackId(v === ALL ? "" : v);
                }}
              >
                <SelectTrigger className="mt-1 rounded-2xl font-semibold h-10">
                  <Layers className="mr-2 h-4 w-4 text-muted-foreground" />
                  <SelectValue placeholder={tracksLoading ? "Loading…" : "All Tracks"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All Tracks</SelectItem>

                  {tracks
                    .map((t) => {
                      const value = toStr(t?.track_id ?? t?.id ?? t?.code);
                      if (!value) return null;

                      const label = t?.track_name
                        ? `${value} — ${t.track_name}`
                        : t?.name
                        ? `${value} — ${t.name}`
                        : value;

                      return (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      );
                    })
                    .filter(Boolean)}
                </SelectContent>
              </Select>
            </div>

            {/* ✅ Category (Main) */}
            <div>
              <Label className="text-xs text-muted-foreground font-semibold">Category</Label>

              <Select
                value={categoryMainSelectValue}
                onValueChange={(v) => {
                  setUiError("");
                  setFilterCategoryMain(v === ALL ? "" : v);
                  setFilterCategorySub("");
                }}
              >
                <SelectTrigger className="mt-1 rounded-2xl font-semibold h-10">
                  <Tag className="mr-2 h-4 w-4 text-muted-foreground" />
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value={ALL}>All Categories</SelectItem>
                  <SelectItem value={CAT_MAIN.CORE}>Core</SelectItem>
                  <SelectItem value={CAT_MAIN.SPEC}>Specialized</SelectItem>
                  <Separator className="my-1" />
                  <SelectItem value={CAT_MAIN.ACAD}>Academic</SelectItem>
                  <SelectItem value={CAT_MAIN.TECH}>Tech/Prof</SelectItem>
                </SelectContent>
              </Select>

              <p className="mt-1 text-[11px] text-muted-foreground font-semibold">
                Choose Academic/Tech to unlock a second filter.
              </p>
            </div>

            {/* ✅ Category (Sub) — only for electives */}
            {showCategorySub ? (
              <div>
                <Label className="text-xs text-muted-foreground font-semibold">
                  {filterCategoryMain === CAT_MAIN.ACAD ? "Academic elective" : "Tech/Prof elective"}
                </Label>

                <Select
                  value={categorySubSelectValue}
                  onValueChange={(v) => {
                    setUiError("");
                    setFilterCategorySub(v === ALL ? "" : v);
                  }}
                >
                  <SelectTrigger className="mt-1 rounded-2xl font-semibold h-10">
                    <Tag className="mr-2 h-4 w-4 text-muted-foreground" />
                    <SelectValue placeholder={subPlaceholder} />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value={ALL}>{subAllLabel}</SelectItem>

                    {categorySubOptions.map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <p className="mt-1 text-[11px] text-muted-foreground font-semibold">
                  Selecting “{subAllLabel}” will show everything under{" "}
                  {filterCategoryMain === CAT_MAIN.ACAD ? "Academic" : "Tech/Prof"}.
                </p>
              </div>
            ) : (
              // keep grid alignment: show Status when sub is hidden
              <div>
                <Label className="text-xs text-muted-foreground font-semibold">Status</Label>
                <Select
                  value={statusSelectValue}
                  onValueChange={(v) => {
                    setUiError("");
                    setFilterStatus(v === ALL ? "" : v);
                  }}
                >
                  <SelectTrigger className="mt-1 rounded-2xl font-semibold h-10">
                    <Activity className="mr-2 h-4 w-4 text-muted-foreground" />
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>All Statuses</SelectItem>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Status (only show here if subcategory is visible) */}
            {showCategorySub ? (
              <div>
                <Label className="text-xs text-muted-foreground font-semibold">Status</Label>
                <Select
                  value={statusSelectValue}
                  onValueChange={(v) => {
                    setUiError("");
                    setFilterStatus(v === ALL ? "" : v);
                  }}
                >
                  <SelectTrigger className="mt-1 rounded-2xl font-semibold h-10">
                    <Activity className="mr-2 h-4 w-4 text-muted-foreground" />
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>All Statuses</SelectItem>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            {/* Type */}
            <div>
              <Label className="text-xs text-muted-foreground font-semibold">Type</Label>
              <Select
                value={typeSelectValue}
                onValueChange={(v) => {
                  setUiError("");
                  setFilterType(v === ALL ? "" : v);
                }}
              >
                <SelectTrigger className="mt-1 rounded-2xl font-semibold h-10">
                  <BookOpen className="mr-2 h-4 w-4 text-muted-foreground" />
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All Types</SelectItem>
                  <SelectItem value="Lecture">Lecture</SelectItem>
                  <SelectItem value="Lab">Lab</SelectItem>
                  <SelectItem value="Lecture + Lab">Lecture + Lab</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* active chips */}
          {hasFilters ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {debouncedQ ? (
                <Chip icon={Search} title="Search" onClear={() => setSearch("")}>
                  {debouncedQ}
                </Chip>
              ) : null}

              {filterTrackId ? (
                <Chip icon={Layers} title="Track" onClear={() => setFilterTrackId("")}>
                  {trackChipLabel}
                </Chip>
              ) : null}

              {filterCategoryMain ? (
                <Chip
                  icon={Tag}
                  title="Category"
                  onClear={() => {
                    setFilterCategoryMain("");
                    setFilterCategorySub("");
                  }}
                >
                  {categoryChipLabel(filterCategoryMain, filterCategorySub)}
                </Chip>
              ) : null}

              {filterStatus ? (
                <Chip icon={Activity} title="Status" onClear={() => setFilterStatus("")}>
                  {filterStatus}
                </Chip>
              ) : null}

              {filterType ? (
                <Chip icon={BookOpen} title="Type" onClear={() => setFilterType("")}>
                  {filterType}
                </Chip>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      {/* ===== RESULTS ===== */}
      <div className="rounded-3xl bg-card border border-border shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg sm:text-xl font-black tracking-tight">Results</h2>
            <p className="text-sm text-muted-foreground font-semibold">
              {isLoading ? "Loading…" : `${subjects.length} on this page`}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="rounded-full font-semibold">
              {pagination ? `Page ${pagination.page}/${pagination.totalPages}` : `Page ${page}`}
            </Badge>
            <Badge variant="outline" className="rounded-full font-semibold">
              {pageSize}/page
            </Badge>
          </div>
        </div>

        <div className="p-5 sm:p-6">
          {isLoading ? (
            viewMode === "grid" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-[250px]">
                    <LoadingCard />
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-muted-foreground font-semibold">Loading…</div>
            )
          ) : subjects.length === 0 ? (
            <div className="py-14 text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-semibold">
                <Sparkles className="h-4 w-4" />
                No subjects found
              </div>
              <p className="mt-4 text-muted-foreground font-semibold">
                Click <span className="font-black text-foreground">Add</span> to create one.
              </p>
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {subjects.map((s) => (
                <motion.div
                  key={toStr(s?.subject_id)}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.22 }}
                  className="h-[260px]"
                >
                  <SubjectCard
                    subject={s}
                    onView={() => openDetails(s)}
                    onEdit={() => openEdit(s)}
                    onDelete={() => onDeleteClick(s)}
                    compact
                    className="h-full rounded-3xl"
                  />
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border overflow-hidden">
              <div className="w-full overflow-x-auto">
                <Table className="min-w-[1120px]">
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead className="w-[180px]">Subject Code</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead className="w-[220px]">Track</TableHead>
                      <TableHead className="w-[190px]">Category</TableHead>
                      <TableHead className="w-[140px]">Status</TableHead>
                      <TableHead className="w-[160px]">Type</TableHead>
                      <TableHead className="w-[140px]">Updated</TableHead>
                      <TableHead className="w-[90px] text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {subjects.map((s) => {
                      const code = toStr(s.subject_id);
                      const category = s.subject_category || "—";
                      const status = s.subject_status || "Active";
                      const type = s.subject_type || "";
                      const updated = fmtDate(s.updated_at, s.created_at);

                      const trackId = toStr(s?.track_id);
                      const track = trackId ? trackMap.get(trackId) : null;

                      const tid = toStr(track?.track_id ?? trackId);
                      const tname = toStr(track?.track_name ?? "");
                      const trackLabel = tid ? `${tid} — ${tname || "Unnamed"}` : tname || "—";

                      return (
                        <TableRow
                          key={toStr(s?.subject_id)}
                          className="hover:bg-primary/5 cursor-pointer"
                          onClick={() => openDetails(s)}
                        >
                          <TableCell className="font-mono text-xs">{code || "—"}</TableCell>

                          <TableCell className="font-semibold">
                            <div className="min-w-0">
                              <p className="truncate font-black">{s.subject_name || "Untitled"}</p>
                              <p className="text-xs text-muted-foreground line-clamp-1 font-semibold">
                                {toStr(s.subject_description) || "No description."}
                              </p>
                            </div>
                          </TableCell>

                          <TableCell>
                            <Badge
                              variant="outline"
                              className="rounded-full max-w-[210px] truncate font-semibold"
                              title={trackLabel}
                            >
                              {trackLabel}
                            </Badge>
                          </TableCell>

                          <TableCell>
                            <Badge
                              className={cn(
                                "border rounded-full max-w-[180px] truncate font-semibold",
                                categoryBadge(category)
                              )}
                            >
                              {category}
                            </Badge>
                          </TableCell>

                          <TableCell>
                            <Badge className={cn("border rounded-full font-semibold", statusBadge(status))}>
                              {status}
                            </Badge>
                          </TableCell>

                          <TableCell>
                            <Badge
                              className={cn(
                                "border rounded-full max-w-[150px] truncate font-semibold",
                                typeBadge(type)
                              )}
                            >
                              {type || "—"}
                            </Badge>
                          </TableCell>

                          <TableCell className="text-muted-foreground font-semibold">{updated}</TableCell>

                          <TableCell
                            className="text-right"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                            }}
                          >
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="rounded-xl"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                  }}
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onSelect={(e) => e.preventDefault()}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    openDetails(s);
                                  }}
                                >
                                  <Eye className="mr-2 h-4 w-4" />
                                  View
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onSelect={(e) => e.preventDefault()}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    openEdit(s);
                                  }}
                                >
                                  <Pencil className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onSelect={(e) => e.preventDefault()}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    onDeleteClick(s);
                                  }}
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
          )}

          {/* Pagination */}
          {pagination?.totalPages > 1 ? (
            <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <p className="text-sm text-muted-foreground font-semibold">
                Page <span className="font-black text-foreground">{pagination.page}</span> of{" "}
                <span className="font-black text-foreground">{pagination.totalPages}</span>
              </p>

              <div className="flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-2xl font-semibold"
                  disabled={!pagination.hasPrev}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Prev
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-2xl font-semibold"
                  disabled={!pagination.hasNext}
                  onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                >
                  Next
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Subject Details Dialog */}
      <SubjectDetailsDialog
        open={detailsOpen}
        onOpenChange={(v) => {
          setDetailsOpen(v);
          if (!v) setDetails(null);
        }}
        subject={details}
        onEdit={() => {
          setDetailsOpen(false);
          const row = details;
          setTimeout(() => openEdit(row), 0);
        }}
      />

      {/* ✅ Create/Edit Form Dialog (NOW uses track_id) */}
      <SubjectFormDialog
        open={formOpen}
        onOpenChange={(v) => {
          setFormOpen(v);
          if (!v) setEditing(null);
        }}
        initial={editing}
        tracks={tracks}
        tracksLoading={tracksLoading}
        defaultTrackId={filterTrackId} // ✅ (was defaultStrandId)
        onSubmit={async (payload) => {
          const raw = payload || {};
          const finalPayload = { ...raw };

          // ✅ Ensure it always uses track_id
          if (!toStr(finalPayload.track_id) && filterTrackId) {
            finalPayload.track_id = filterTrackId;
          }

          // if your form component still sends strand_id, accept it then convert
          if (!toStr(finalPayload.track_id) && toStr(finalPayload.strand_id)) {
            finalPayload.track_id = toStr(finalPayload.strand_id);
          }
          if ("strand_id" in finalPayload) delete finalPayload.strand_id;

          if (!toStr(finalPayload.track_id)) {
            setUiError("Please select a Track.");
            throw new Error("Please select a Track.");
          }
          if (!toStr(finalPayload.subject_id)) {
            setUiError("Subject Code is required.");
            throw new Error("Subject Code is required.");
          }
          if (!toStr(finalPayload.subject_name)) {
            setUiError("Subject Name is required.");
            throw new Error("Subject Name is required.");
          }

          if ("description" in finalPayload && !("subject_description" in finalPayload)) {
            finalPayload.subject_description = toStr(finalPayload.description);
            delete finalPayload.description;
          }

          if ("subject_status" in finalPayload) {
            const s = String(finalPayload.subject_status || "Active").toLowerCase();
            finalPayload.subject_status = s === "inactive" ? "Inactive" : "Active";
          }

          try {
            setUiError("");

            if (editing) {
              const code = getSubjectIdOrThrow(editing);

              // don’t allow changing subject_id
              if ("subject_id" in finalPayload) delete finalPayload.subject_id;

              await updateSubject(code, finalPayload);

              setEditing((prev) => (prev ? { ...prev, ...finalPayload } : prev));
              if (details && rowKey(details) === rowKey(editing)) {
                setDetails((prev) => (prev ? { ...prev, ...finalPayload } : prev));
              }
            } else {
              await createSubject(finalPayload);
            }

            await mutate();
          } catch (e) {
            setUiError(e?.message || "Request failed");
            throw e;
          }
        }}
      />

      {/* Delete AlertDialog (two-step) */}
      <AlertDialog
        open={deleteOpen}
        onOpenChange={(v) => {
          if (!v) closeDelete();
          else setDeleteOpen(true);
        }}
      >
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-black text-xl">
              {deleteStep === 1 ? "Type CONFIRM to delete" : "Are you absolutely sure?"}
            </AlertDialogTitle>
            <AlertDialogDescription className="font-semibold">
              {deleteStep === 1 ? (
                <>
                  This will permanently delete{" "}
                  <span className="font-black text-foreground">
                    {deleteRow?.subject_name || deleteRow?.subject_id || "this subject"}
                  </span>
                  . To continue, type <span className="font-black">CONFIRM</span> below.
                </>
              ) : (
                <>
                  You’re about to delete{" "}
                  <span className="font-black text-foreground">
                    {deleteRow?.subject_name || deleteRow?.subject_id || "this subject"}
                  </span>
                  . This action cannot be undone.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {deleteStep === 1 ? (
            <div className="mt-2 space-y-2">
              <Label className="text-xs text-muted-foreground font-semibold">
                Type CONFIRM to unlock delete
              </Label>
              <Input
                value={deleteText}
                onChange={(e) => setDeleteText(e.target.value)}
                placeholder='Type "CONFIRM"'
                className="rounded-2xl font-semibold"
                autoFocus
              />
              <p className="text-xs text-muted-foreground font-semibold">
                Tip: It’s case-insensitive (confirm / CONFIRM).
              </p>
            </div>
          ) : null}

          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel
              className="rounded-2xl font-bold"
              disabled={deleting}
              onClick={() => closeDelete()}
            >
              Cancel
            </AlertDialogCancel>

            {deleteStep === 1 ? (
              <Button
                type="button"
                className="rounded-2xl font-black"
                disabled={!confirmTypedOk}
                onClick={(e) => {
                  e.preventDefault();
                  setDeleteStep(2);
                }}
              >
                Continue
              </Button>
            ) : (
              <AlertDialogAction
                className={cn(
                  "rounded-2xl font-black",
                  "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                )}
                disabled={deleting}
                onClick={(e) => {
                  e.preventDefault();
                  doDelete();
                }}
              >
                {deleting ? "Deleting…" : "Yes, delete it"}
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
