"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  RefreshCcw,
  Sparkles,
  X,
  LayoutGrid,
  List,
  CheckCircle2,
  Users,
  ClipboardList,
  TrendingUp,
  Settings,
  Filter,
  School,
  ArrowUpDown,
  Layers,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/AuthContext";

import { fetchQuizzes, deleteQuiz } from "@/lib/quizzes";
import { fetchTracks } from "@/lib/tracks";
import { fetchSubjects as fetchSubjectsLib } from "@/lib/subjects";

// ✅ template fetchers (from bucket via /api)
import { fetchNcaeQuestionnaire } from "@/lib/ncae";
import { fetchRiasecItems } from "@/lib/riasec";

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

import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";

/* -------------------------------- helpers -------------------------------- */

const quizTypes = ["All", "Career Interest", "Personality", "Skills", "Academic"];
const statusOptions = ["All", "Published", "Draft", "Archived"];
const sortOptions = [
  { value: "updated_desc", label: "Recently updated" },
  { value: "created_desc", label: "Newest created" },
  { value: "title_asc", label: "Title A–Z" },
];

const typeMeta = {
  "Career Interest": {
    icon: Sparkles,
    badge: "bg-primary/10 text-primary border-primary/20",
  },
  Personality: {
    icon: TrendingUp,
    badge: "bg-chart-4/10 text-chart-4 border-chart-4/20",
  },
  Skills: {
    icon: ArrowUpDown,
    badge: "bg-chart-2/10 text-chart-2 border-chart-2/20",
  },
  Academic: {
    icon: School,
    badge: "bg-chart-3/10 text-chart-3 border-chart-3/20",
  },
};

const statusMeta = {
  Published: "bg-chart-2/10 text-chart-2",
  Draft: "bg-chart-3/10 text-chart-3",
  Archived: "bg-muted text-muted-foreground",
};

function safeStr(v) {
  return String(v ?? "").trim();
}

/**
 * ✅ Count questions/items from template JSON (robust to different shapes)
 */
function countFromTemplateJson(payload) {
  const d = payload?.data ?? payload;

  if (Array.isArray(d)) return d.length;
  if (!d || typeof d !== "object") return 0;

  const directKeys = ["questions", "items", "questionnaire_items", "questionBank", "bank"];
  for (const k of directKeys) {
    if (Array.isArray(d?.[k])) return d[k].length;
  }

  const nested = [d.questionnaire, d.data, d.payload, d.content].filter(Boolean);
  for (const n of nested) {
    if (Array.isArray(n)) return n.length;
    if (n && typeof n === "object") {
      if (Array.isArray(n.questions)) return n.questions.length;
      if (Array.isArray(n.items)) return n.items.length;
    }
  }

  if (Array.isArray(d.sections)) {
    let total = 0;
    for (const s of d.sections) {
      if (Array.isArray(s?.questions)) total += s.questions.length;
      else if (Array.isArray(s?.items)) total += s.items.length;
    }
    if (total) return total;
  }

  const riasecKeys = [
    "R",
    "I",
    "A",
    "S",
    "E",
    "C",
    "realistic",
    "investigative",
    "artistic",
    "social",
    "enterprising",
    "conventional",
  ];
  let found = false;
  let sum = 0;
  for (const k of riasecKeys) {
    if (Array.isArray(d?.[k])) {
      found = true;
      sum += d[k].length;
    }
  }
  if (found) return sum;

  return 0;
}

/**
 * ✅ Resolve a stable quiz id (for routing/view/edit).
 * Supports many shapes + storage_path fallback.
 */
function getQuizId(q) {
  const raw = q?.quiz_id ?? q?.id ?? q?.quizId ?? q?.assessment_id ?? "";
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

/**
 * ✅ Best key to delete in Storage:
 * prefer storage_path (supports folders), else fall back to quiz id
 */
function getDeleteKey(q) {
  const sp = safeStr(q?.storage_path);
  if (sp) return sp;
  return getQuizId(q);
}

function toHrefId(id) {
  const s = safeStr(id);
  return s ? encodeURIComponent(s) : "";
}

function getTitle(q) {
  return safeStr(q?.quiz_title || q?.title || q?.storage_path) || "Untitled Quiz";
}

function getDesc(q) {
  return safeStr(q?.quiz_description || q?.description) || "—";
}

function fmtDate(d) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleString();
  } catch {
    return "—";
  }
}

function guessQuestionCount(q) {
  if (Array.isArray(q?.questions)) return q.questions.length;
  return Number(q?.questionCount || q?.questions_count || 0);
}

function matchesTitle(quiz, needle) {
  const t = safeStr(quiz?.quiz_title || quiz?.title).toLowerCase();
  return t.includes(needle.toLowerCase());
}

/**
 * ✅ If templates are fetched from bucket, try to derive a stable id/path we can route with.
 * Works with many payload shapes:
 * - { id / quiz_id / storage_path / key / path }
 * - { data: { ...same } }
 * - { file: { ...same } }
 */
function getIdFromTemplatePack(pack) {
  const candidates = [
    pack?.quiz_id,
    pack?.id,
    pack?.storage_path,
    pack?.path,
    pack?.key,

    pack?.data?.quiz_id,
    pack?.data?.id,
    pack?.data?.storage_path,
    pack?.data?.path,
    pack?.data?.key,

    pack?.file?.quiz_id,
    pack?.file?.id,
    pack?.file?.storage_path,
    pack?.file?.path,
    pack?.file?.key,
  ]
    .map(safeStr)
    .filter(Boolean);

  if (!candidates.length) return "";

  // If it's a path, getQuizId will handle extracting from storage_path.
  // If it's an id, it will pass through.
  const best = candidates[0];
  const asObj = { quiz_id: best, id: best, storage_path: best };
  return safeStr(getQuizId(asObj)) || safeStr(best);
}

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
      <span className="truncate max-w-[220px]">{children}</span>
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

function StatCard({ label, value, icon: Icon }) {
  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.01 }}
      className="rounded-4xl bg-card border border-border shadow-sm p-6 transition-all"
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-sm text-muted-foreground font-semibold">{label}</div>
          <div className="mt-2 text-3xl font-black tracking-tight">{value}</div>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Icon className="h-5 w-5 text-primary" />
        </div>
      </div>
    </motion.div>
  );
}

/* -------------------------------- Page -------------------------------- */

export default function QuizzesPage() {
  const { toast } = useToast();
  const auth = useAuth?.() || {};
  const isSuperAdminCtx = !!auth?.isSuperAdmin;

  // Permissions
  const [perm, setPerm] = useState({
    canViewPage: true,
    canCreate: isSuperAdminCtx,
    canEdit: isSuperAdminCtx,
    isSuperAdmin: isSuperAdminCtx,
  });

  useEffect(() => {
    try {
      const currentUser = JSON.parse(window.localStorage.getItem("currentUser") || "{}");

      const adminLevel = safeStr(currentUser?.admin_level);
      const roleRaw = safeStr(currentUser?.admin_role).toLowerCase();

      const isFacilitator = /(^|[\s-_.])facilitator([\s-_.]|$)/.test(roleRaw);
      const isFaculty = /(^|[\s-_.])faculty([\s-_.]|$)/.test(roleRaw);
      const isSuperAdminLS = adminLevel === "Super Admin";

      const adminAccess = currentUser?.admin_access || {};
      const canCreate = isSuperAdminLS || (isFaculty && adminAccess?.quizzes_create === true);
      const canEdit = isSuperAdminLS || (isFaculty && adminAccess?.quizzes_edit === true);

      const canViewPage = isSuperAdminLS || isFaculty || isFacilitator;

      setPerm({
        canViewPage: !!(canViewPage || isSuperAdminCtx),
        canCreate: !!(canCreate || isSuperAdminCtx),
        canEdit: !!(canEdit || isSuperAdminCtx),
        isSuperAdmin: !!(isSuperAdminLS || isSuperAdminCtx),
      });
    } catch {
      setPerm({
        canViewPage: true,
        canCreate: isSuperAdminCtx,
        canEdit: isSuperAdminCtx,
        isSuperAdmin: isSuperAdminCtx,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // UI state
  const [viewMode, setViewMode] = useState("list");
  const [selectMode, setSelectMode] = useState(false);

  /**
   * ✅ Selected keys are DELETE keys now:
   * - storage_path if present (supports folders)
   * - else quiz_id
   */
  const [selectedIds, setSelectedIds] = useState(() => new Set());

  const [search, setSearch] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");

  // Filters
  const [typeFilter, setTypeFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  // ✅ Track + Subject filters (track_id)
  const [filterTrackId, setFilterTrackId] = useState("");
  const [filterSubject, setFilterSubject] = useState("");

  const [sortKey, setSortKey] = useState("updated_desc");

  // Delete dialogs
  const [deleteOneOpen, setDeleteOneOpen] = useState(false);
  const [deleteBulkOpen, setDeleteBulkOpen] = useState(false);

  // ✅ single delete confirm typing
  const [confirmOneText, setConfirmOneText] = useState("");

  // ✅ bulk confirm typing
  const [confirmText, setConfirmText] = useState("");

  const [busy, setBusy] = useState(false);

  // ✅ store resolved delete key at open time
  const [deleteTarget, setDeleteTarget] = useState({
    quiz: null,
    id: "", // this is DELETE KEY now
    title: "",
    storage_path: "",
    quiz_id: "",
  });

  // API key modal (super admin)
  const [apiKeyModal, setApiKeyModal] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(search.trim().toLowerCase()), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem("quiz_view_mode");
      if (stored === "grid" || stored === "list") setViewMode(stored);

      const k = window.localStorage.getItem("quiz_api_key") || "";
      setApiKey(k);
    } catch {}
  }, []);

  const setView = (m) => {
    setViewMode(m);
    try {
      window.localStorage.setItem("quiz_view_mode", m);
    } catch {}
  };

  /* ------------------------------ Tracks ------------------------------ */

  const { data: tracksData } = useSWR("tracks", async () => fetchTracks({ search: "" }), {
    revalidateOnFocus: false,
  });
  const tracks = Array.isArray(tracksData) ? tracksData : [];

  const trackLabelMap = useMemo(() => {
    const m = new Map();
    for (const t of tracks) {
      const id = safeStr(t?.track_id ?? t?.code ?? t?.id);
      if (!id) continue;
      const name = safeStr(t?.track_name ?? t?.name);
      const label = name ? `${id} — ${name}` : id;
      m.set(id, label);
    }
    return m;
  }, [tracks]);

  /* ------------------------------ Subjects ------------------------------ */

  const { data: subjectsData } = useSWR(
    "subjects_for_filters",
    async () =>
      fetchSubjectsLib({
        search: "",
        page: 1,
        limit: 1000,
        sort: "name-asc",
      }),
    { revalidateOnFocus: false }
  );

  const subjectsRaw = Array.isArray(subjectsData)
    ? subjectsData
    : Array.isArray(subjectsData?.subjects)
    ? subjectsData.subjects
    : [];

  const subjects = subjectsRaw;

  const subjectNameMap = useMemo(() => {
    const m = new Map();
    for (const s of subjects) {
      const id = safeStr(s?.subject_id);
      if (!id) continue;
      m.set(id, s?.subject_name || id);
    }
    return m;
  }, [subjects]);

  const subjectsForTrack = useMemo(() => {
    if (!filterTrackId) return [];
    return subjects.filter((s) => safeStr(s?.track_id) === safeStr(filterTrackId));
  }, [subjects, filterTrackId]);

  useEffect(() => {
    setFilterSubject("");
  }, [filterTrackId]);

  /* ------------------------------ Fetch quizzes ------------------------------ */

  const swrKey = useMemo(
    () => ["quizzes", debouncedQ, filterTrackId, filterSubject],
    [debouncedQ, filterTrackId, filterSubject]
  );

  const { data, isLoading, mutate } = useSWR(
    swrKey,
    async () =>
      fetchQuizzes({
        search: debouncedQ || undefined,
        track_id: filterTrackId || undefined,
        subject_id: filterSubject || undefined,
        limit: 500,
      }),
    { revalidateOnFocus: false }
  );

  const quizzes = Array.isArray(data) ? data : [];

  const displayed = useMemo(() => {
    let arr = quizzes.slice();

    if (filterTrackId) {
      arr = arr.filter((q) => safeStr(q?.track_id || q?.strand_id) === safeStr(filterTrackId));
    }
    if (filterSubject) arr = arr.filter((q) => safeStr(q?.subject_id) === safeStr(filterSubject));
    if (typeFilter !== "All") arr = arr.filter((q) => safeStr(q?.type) === typeFilter);
    if (statusFilter !== "All") arr = arr.filter((q) => safeStr(q?.status) === statusFilter);

    if (debouncedQ) {
      arr = arr.filter((q) => {
        const hay = `${getTitle(q)} ${getDesc(q)} ${getQuizId(q)} ${safeStr(q?.storage_path)}`
          .toLowerCase()
          .trim();
        return hay.includes(debouncedQ);
      });
    }

    if (sortKey === "updated_desc") {
      arr.sort(
        (a, b) =>
          new Date(b.updated_at || b.created_at || 0) -
          new Date(a.updated_at || a.created_at || 0)
      );
    } else if (sortKey === "created_desc") {
      arr.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    } else if (sortKey === "title_asc") {
      arr.sort((a, b) => getTitle(a).localeCompare(getTitle(b)));
    }

    return arr;
  }, [quizzes, filterTrackId, filterSubject, typeFilter, statusFilter, debouncedQ, sortKey]);

  const stats = useMemo(() => {
    const total = quizzes.length;
    const published = quizzes.filter((q) => safeStr(q.status).toLowerCase() === "published").length;

    const totalResponses = quizzes.reduce((acc, q) => acc + Number(q.responses || 0), 0);
    const avgCompletion =
      total > 0
        ? Math.round(quizzes.reduce((acc, q) => acc + Number(q.completionRate || 0), 0) / total)
        : 0;

    return { total, published, totalResponses, avgCompletion };
  }, [quizzes]);

  // ✅ Templates from bucket (NCAE + RIASEC)
  const {
    data: ncaeTplPack,
    error: ncaeTplErr,
    isLoading: ncaeTplLoading,
  } = useSWR("tpl_ncae_questionnaire", fetchNcaeQuestionnaire, {
    revalidateOnFocus: false,
  });

  const {
    data: riasecTplPack,
    error: riasecTplErr,
    isLoading: riasecTplLoading,
  } = useSWR("tpl_riasec_items", fetchRiasecItems, {
    revalidateOnFocus: false,
  });

  const ncaeTemplateCount = useMemo(
    () => countFromTemplateJson(ncaeTplPack?.data),
    [ncaeTplPack]
  );
  const riasecTemplateCount = useMemo(
    () => countFromTemplateJson(riasecTplPack?.data),
    [riasecTplPack]
  );

  const hasNcaeTemplate = !!ncaeTplPack && !ncaeTplLoading && !ncaeTplErr;
  const hasRiasecTemplate = !!riasecTplPack && !riasecTplLoading && !riasecTplErr;

  const ncaeTemplateId = useMemo(() => getIdFromTemplatePack(ncaeTplPack), [ncaeTplPack]);
  const riasecTemplateId = useMemo(() => getIdFromTemplatePack(riasecTplPack), [riasecTplPack]);

  // Existing quizzes in DB/list (optional)
  const existingNCAE = useMemo(
    () => quizzes.find((q) => matchesTitle(q, "ncae pre-assessment")),
    [quizzes]
  );
  const existingRIASEC = useMemo(() => quizzes.find((q) => matchesTitle(q, "riasec")), [quizzes]);

  const clearSelection = () => setSelectedIds(new Set());
  const isSelected = (key) => selectedIds.has(String(key));

  const toggleSelect = (key) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const k = String(key);
      next.has(k) ? next.delete(k) : next.add(k);
      return next;
    });

  useEffect(() => {
    if (!selectMode) return;
    clearSelection();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQ, typeFilter, statusFilter, filterTrackId, filterSubject, sortKey, viewMode]);

  // ✅ open single delete with resolved delete key + details
  const openDeleteOne = (quiz) => {
    const deleteKey = getDeleteKey(quiz);
    const title = getTitle(quiz);

    const quizId = getQuizId(quiz);
    const sp = safeStr(quiz?.storage_path);

    setConfirmOneText("");

    if (!safeStr(deleteKey)) {
      toast({
        title: "Missing quiz id",
        description:
          "This quiz has no resolvable ID (quiz_id / id / storage_path). Refresh and try again, or re-sync the quiz record.",
        variant: "destructive",
      });
      return;
    }

    setDeleteTarget({
      quiz,
      id: String(deleteKey), // DELETE KEY
      title,
      storage_path: sp,
      quiz_id: quizId,
    });
    setDeleteOneOpen(true);
  };

  const canConfirmDeleteOne = useMemo(() => {
    return safeStr(confirmOneText).toUpperCase() === "DELETE";
  }, [confirmOneText]);

  const handleDeleteOne = async () => {
    const deleteKey = safeStr(deleteTarget?.id);
    if (!deleteKey) {
      toast({
        title: "Missing quiz id",
        description: "Cannot delete because the quiz id is missing.",
        variant: "destructive",
      });
      return;
    }

    setBusy(true);
    try {
      await deleteQuiz(deleteKey);
      toast({ title: "Quiz deleted", description: "Removed successfully." });

      setDeleteOneOpen(false);
      setDeleteTarget({ quiz: null, id: "", title: "", storage_path: "", quiz_id: "" });
      setConfirmOneText("");

      await mutate();
    } catch (e) {
      toast({
        title: "Error",
        description: e?.message || "Failed to delete.",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  const handleBulkDelete = async () => {
    if (!perm.canEdit) {
      toast({
        title: "No permission",
        description: "You can't delete quizzes.",
        variant: "destructive",
      });
      return;
    }

    const typed = safeStr(confirmText).toUpperCase();
    if (typed !== "CONFIRM" && typed !== "DELETE") return;

    const keys = Array.from(selectedIds).map(String).filter(Boolean);
    if (!keys.length) return;

    setBusy(true);
    try {
      const results = await Promise.allSettled(keys.map((k) => deleteQuiz(k)));
      const failed = results.filter((r) => r.status === "rejected").length;
      const succeeded = keys.length - failed;

      if (failed) {
        toast({
          title: "Partial delete",
          description: `${succeeded} deleted, ${failed} failed.`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Deleted",
          description: `${succeeded} quiz${succeeded === 1 ? "" : "zes"} removed.`,
        });
      }

      setDeleteBulkOpen(false);
      setConfirmText("");
      setSelectMode(false);
      clearSelection();
      await mutate();
    } catch (e) {
      toast({
        title: "Error",
        description: e?.message || "Bulk delete failed.",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  const handleSaveApiKey = () => {
    try {
      window.localStorage.setItem("quiz_api_key", apiKey);
      toast({ title: "Saved", description: "API key saved in local storage." });
      setApiKeyModal(false);
    } catch {
      toast({
        title: "Error",
        description: "Failed to save API key.",
        variant: "destructive",
      });
    }
  };

  const resetFilters = () => {
    setSearch("");
    setTypeFilter("All");
    setStatusFilter("All");
    setFilterTrackId("");
    setFilterSubject("");
    setSortKey("updated_desc");
  };

  const activeChips = useMemo(() => {
    const chips = [];

    if (debouncedQ) chips.push({ icon: Search, label: debouncedQ, clear: () => setSearch("") });

    if (typeFilter !== "All")
      chips.push({
        icon: Filter,
        label: `Type: ${typeFilter}`,
        clear: () => setTypeFilter("All"),
      });

    if (statusFilter !== "All")
      chips.push({
        icon: Filter,
        label: `Status: ${statusFilter}`,
        clear: () => setStatusFilter("All"),
      });

    if (filterTrackId)
      chips.push({
        icon: Layers,
        label: `Track: ${trackLabelMap.get(filterTrackId) || filterTrackId}`,
        clear: () => setFilterTrackId(""),
      });

    if (filterSubject)
      chips.push({
        icon: School,
        label: `Subject: ${subjectNameMap.get(filterSubject) || filterSubject}`,
        clear: () => setFilterSubject(""),
      });

    if (sortKey !== "updated_desc") {
      const s = sortOptions.find((x) => x.value === sortKey)?.label || sortKey;
      chips.push({
        icon: ArrowUpDown,
        label: `Sort: ${s}`,
        clear: () => setSortKey("updated_desc"),
      });
    }

    return chips;
  }, [
    debouncedQ,
    typeFilter,
    statusFilter,
    filterTrackId,
    filterSubject,
    sortKey,
    trackLabelMap,
    subjectNameMap,
  ]);

  /**
   * ✅ Featured card rules (per your request):
   * - If template is fetched from bucket => treat as created (no more "Not created")
   * - Buttons should be named specifically:
   *   - View NCAE / Edit NCAE
   *   - View RIASEC / Edit RIASEC
   * - If we can derive an id from the template pack, we route like normal to view/edit.
   *   Otherwise, we show the buttons disabled (but still "Created").
   */
  const FeaturedCard = ({
    title,
    subtitle,
    existing,
    accent = "indigo",
    templateCount,
    templateLoading,
    templateError,
    templateId,
    viewLabel,
    editLabel,
  }) => {
    const accents = {
      indigo: {
        ring: "ring-indigo-300",
        bg: "from-indigo-50 to-blue-50",
        badge: "bg-indigo-100 text-indigo-800",
        badge2: "bg-indigo-50 text-indigo-800 border-indigo-200",
        iconWrap: "bg-indigo-600/10 text-indigo-700",
        gradientBar: "from-indigo-500 to-blue-500",
        textDark: "text-indigo-900",
        textSoft: "text-indigo-800/70",
      },
      emerald: {
        ring: "ring-emerald-300",
        bg: "from-emerald-50 to-teal-50",
        badge: "bg-emerald-100 text-emerald-800",
        badge2: "bg-emerald-50 text-emerald-800 border-emerald-200",
        iconWrap: "bg-emerald-600/10 text-emerald-700",
        gradientBar: "from-emerald-500 to-teal-500",
        textDark: "text-emerald-900",
        textSoft: "text-emerald-800/70",
      },
    }[accent];

    const count = existing ? guessQuestionCount(existing) : Number(templateCount || 0);

    // prefer actual quiz id if exists, else use template-derived id
    const resolvedId = safeStr(existing ? getQuizId(existing) : templateId);
    const hrefId = toHrefId(resolvedId);
    const canNavigate = !!hrefId;

    // ✅ consider created if template is fetched OR existing quiz exists
    const consideredCreated = !!existing || (!templateLoading && !templateError);

    const updated =
      existing?.updated_at || existing?.created_at
        ? new Date(existing.updated_at || existing.created_at).toLocaleDateString()
        : null;

    const templateLabel = existing
      ? `${count} ${count === 1 ? "item" : "items"}`
      : templateLoading
      ? "Template loading…"
      : templateError
      ? "Template unavailable"
      : `${count || 0} template ${count === 1 ? "item" : "items"}`;

    return (
      <div
        className={cn(
          "relative overflow-hidden rounded-4xl bg-gradient-to-br ring-1 shadow-sm",
          accents.bg,
          accents.ring
        )}
      >
        <div
          className={cn(
            "absolute -top-8 -right-10 h-32 w-40 rotate-45 bg-gradient-to-r opacity-20",
            accents.gradientBar
          )}
        />
        <div
          className={cn(
            "absolute -bottom-10 -left-12 h-24 w-32 -rotate-12 bg-gradient-to-r opacity-10",
            accents.gradientBar
          )}
        />

        <div className="relative p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <span
                className={cn(
                  "inline-flex h-10 w-10 items-center justify-center rounded-2xl",
                  accents.iconWrap
                )}
              >
                <Sparkles className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <h5 className={cn("font-black truncate", accents.textDark)}>{title}</h5>
                <p className={cn("text-xs truncate font-semibold", accents.textSoft)}>{subtitle}</p>
              </div>
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              <span className={cn("px-2 py-0.5 rounded-full text-[11px] font-black", accents.badge)}>
                {templateLabel}
              </span>

              {/* ✅ no more "Not created" — if bucket template fetched, it's created */}
              <span
                className={cn(
                  "px-2 py-0.5 rounded-full text-[11px] font-black border",
                  accents.badge2
                )}
              >
                {consideredCreated ? "Created" : "—"}
              </span>

              {updated ? (
                <span className="text-[11px] font-semibold text-muted-foreground">
                  Updated {updated}
                </span>
              ) : null}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button
              asChild
              variant="secondary"
              className="rounded-2xl font-black"
              disabled={!canNavigate}
              title={!canNavigate ? "Missing ID for routing (quiz/template id)" : undefined}
            >
              <Link href={canNavigate ? `/admin/assessments/view/${hrefId}` : "#"}>{viewLabel}</Link>
            </Button>

            {perm.canEdit ? (
              <Button
                asChild
                variant="outline"
                className="rounded-2xl font-black"
                disabled={!canNavigate}
                title={!canNavigate ? "Missing ID for routing (quiz/template id)" : undefined}
              >
                <Link href={canNavigate ? `/admin/assessments/${hrefId}/edit` : "#"}>
                  <Pencil className="mr-2 h-4 w-4" />
                  {editLabel}
                </Link>
              </Button>
            ) : null}
          </div>

          {/* small hint if template exists but we couldn't derive an id */}
          {!existing && !templateLoading && !templateError && !canNavigate ? (
            <div className="mt-3 text-xs text-muted-foreground font-semibold">
              Template fetched from bucket, but no routable ID was provided in the API response.
            </div>
          ) : null}
        </div>
      </div>
    );
  };

  if (!perm.canViewPage) {
    return (
      <div className="p-8">
        <Card className="rounded-4xl">
          <CardHeader>
            <CardTitle className="font-black">Access denied</CardTitle>
            <CardDescription className="font-semibold">
              You do not have access to the Quizzes page.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="rounded-2xl font-black">
              <Link href="/admin">Go back</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const selectAllDisplayed = () =>
    setSelectedIds(
      new Set(
        displayed
          .map((q) => getDeleteKey(q))
          .map(String)
          .filter((k) => safeStr(k))
      )
    );

  return (
    <div className="space-y-8">
      {/* ===== HERO ===== */}
      <section className="relative overflow-hidden rounded-4xl border border-border bg-gradient-to-b from-background via-background to-background">
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
          transition={{ duration: 1.2, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }}
        />

        <div className="relative p-6 sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-black mb-5">
                <Sparkles className="h-4 w-4" />
                Admin • Quizzes
              </div>

              <h1 className="text-4xl sm:text-5xl font-black tracking-tight leading-tight">
                Manage{" "}
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent bg-[length:200%] animate-gradient-x">
                  Quizzes
                </span>
              </h1>

              <p className="mt-4 text-muted-foreground text-lg font-semibold leading-relaxed">
                Search, filter, and maintain quizzes — with featured shortcuts, selection mode, and clean list/grid views.
              </p>

              <div className="mt-6 flex flex-wrap gap-2">
                {activeChips.length ? (
                  activeChips.slice(0, 3).map((c, idx) => (
                    <Chip key={idx} icon={c.icon} onClear={c.clear} title={c.label}>
                      {c.label}
                    </Chip>
                  ))
                ) : (
                  <Chip icon={Search} title="Tip">
                    Try searching “RIASEC”, “NCAE”, “STEM”… or paste a quiz ID.
                  </Chip>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                className="rounded-2xl font-black"
                onClick={() => mutate()}
                disabled={isLoading}
              >
                <RefreshCcw className="mr-2 h-4 w-4" />
                Refresh
              </Button>

              {perm.isSuperAdmin ? (
                <Button
                  variant="outline"
                  className="rounded-2xl font-black"
                  onClick={() => setApiKeyModal(true)}
                >
                  <Settings className="mr-2 h-4 w-4" />
                  API Settings
                </Button>
              ) : null}

              <Button
                className={cn("rounded-2xl font-black", !perm.canCreate && "opacity-60 pointer-events-none")}
                asChild
              >
                <Link href="/admin/assessments/new">
                  <Plus className="mr-2 h-4 w-4" />
                  New Quiz
                </Link>
              </Button>
            </div>
          </div>

          <style>{`
            @keyframes gradientX { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
            .animate-gradient-x { animation: gradientX 6s ease infinite; }
          `}</style>

          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard label="Total Quizzes" value={stats.total} icon={ClipboardList} />
            <StatCard label="Published" value={stats.published} icon={CheckCircle2} />
            <StatCard label="Total Submissions" value={stats.totalResponses.toLocaleString()} icon={Users} />
            {/* <StatCard label="Avg. Completion" value={`${stats.avgCompletion}%`} icon={TrendingUp} /> */}
          </div>
        </div>
      </section>

      {/* ===== FEATURED ===== */}
      <section className="rounded-4xl bg-card border border-border shadow-sm overflow-hidden">
        <div className="p-6 sm:p-7 border-b border-border">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-black tracking-tight">Featured Assessments</h2>
              <p className="mt-2 text-muted-foreground font-semibold">Quick access to your core assessments.</p>
            </div>
            <Badge variant="secondary" className="rounded-full border font-black">
              Recommended
            </Badge>
          </div>
        </div>

        <div className="p-6 sm:p-7 grid grid-cols-1 md:grid-cols-2 gap-5">
          <FeaturedCard
            title="NCAE Pre-Assessment Test"
            subtitle="Baseline assessment aligned to the National Career Assessment Examination."
            existing={existingNCAE}
            accent="indigo"
            templateCount={ncaeTemplateCount}
            templateLoading={ncaeTplLoading}
            templateError={ncaeTplErr}
            templateId={safeStr(getQuizId(existingNCAE)) || (hasNcaeTemplate ? ncaeTemplateId : "")}
            viewLabel="View NCAE"
            editLabel="Edit NCAE"
          />
          <FeaturedCard
            title="RIASEC Test"
            subtitle="Holland Code (RIASEC) interest inventory for career orientation."
            existing={existingRIASEC}
            accent="emerald"
            templateCount={riasecTemplateCount}
            templateLoading={riasecTplLoading}
            templateError={riasecTplErr}
            templateId={safeStr(getQuizId(existingRIASEC)) || (hasRiasecTemplate ? riasecTemplateId : "")}
            viewLabel="View RIASEC"
            editLabel="Edit RIASEC"
          />
        </div>
      </section>

      {/* ===== FILTERS / TOOLBAR ===== */}
      <div className="rounded-4xl bg-card border border-border shadow-sm overflow-hidden">
        <div className="p-6 sm:p-7 border-b border-border">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-2xl font-black tracking-tight">All Quizzes</h2>
              <p className="mt-2 text-muted-foreground font-semibold">
                Search and filter by type, status, track, and subject.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
              <div className="relative w-full sm:w-[360px]">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by title, description, or ID..."
                  className="pl-9 pr-10 rounded-2xl font-semibold"
                />
                {search ? (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label="Clear search"
                    title="Clear search"
                  >
                    <X className="h-4 w-4" />
                  </button>
                ) : null}
              </div>

              <div className="inline-flex rounded-2xl overflow-hidden border">
                <Button
                  type="button"
                  variant={viewMode === "grid" ? "secondary" : "ghost"}
                  className="rounded-none font-black"
                  onClick={() => setView("grid")}
                >
                  <LayoutGrid className="mr-2 h-4 w-4" />
                  Grid
                </Button>
                <Button
                  type="button"
                  variant={viewMode === "list" ? "secondary" : "ghost"}
                  className="rounded-none font-black"
                  onClick={() => setView("list")}
                >
                  <List className="mr-2 h-4 w-4" />
                  List
                </Button>
              </div>

              {perm.canEdit ? (
                <Button
                  type="button"
                  variant={selectMode ? "secondary" : "outline"}
                  className={cn("rounded-2xl font-black", selectMode && "border-primary/30")}
                  onClick={() => {
                    setSelectMode((v) => !v);
                    clearSelection();
                  }}
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  {selectMode ? "Cancel Selection" : "Select"}
                </Button>
              ) : null}

              <Button type="button" variant="outline" className="rounded-2xl font-black" onClick={resetFilters}>
                Reset
              </Button>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 md:grid-cols-5 gap-3">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="rounded-2xl font-semibold">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                {quizTypes.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="rounded-2xl font-semibold">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterTrackId || "ALL"} onValueChange={(v) => setFilterTrackId(v === "ALL" ? "" : v)}>
              <SelectTrigger className="rounded-2xl font-semibold">
                <SelectValue placeholder="Track" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Tracks</SelectItem>
                {tracks.map((t) => {
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

            <Select
              value={filterSubject || "ALL"}
              onValueChange={(v) => setFilterSubject(v === "ALL" ? "" : v)}
              disabled={!filterTrackId}
            >
              <SelectTrigger className="rounded-2xl font-semibold">
                <SelectValue placeholder={filterTrackId ? "Subject" : "Select a track first"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All under selected track</SelectItem>
                {subjectsForTrack.map((s) => {
                  const sid = safeStr(s?.subject_id);
                  if (!sid) return null;
                  const label = s?.subject_name || sid;
                  return (
                    <SelectItem key={sid} value={sid}>
                      {label}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>

            <Select value={sortKey} onValueChange={setSortKey}>
              <SelectTrigger className="rounded-2xl font-semibold">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                {sortOptions.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {activeChips.length ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {activeChips.map((c, idx) => (
                <Chip key={idx} icon={c.icon} onClear={c.clear} title={c.label}>
                  {c.label}
                </Chip>
              ))}
            </div>
          ) : null}
        </div>

        <AnimatePresence>
          {selectMode && perm.canEdit ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="px-6 sm:px-7 py-4 border-b border-border bg-muted/20"
            >
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <div className="text-sm font-semibold">
                    <b>{selectedIds.size}</b> selected out of <b>{displayed.length}</b>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-2xl font-black"
                    onClick={selectAllDisplayed}
                    disabled={!displayed.length}
                  >
                    Select All ({displayed.length})
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-2xl font-black"
                    onClick={clearSelection}
                    disabled={!selectedIds.size}
                  >
                    Deselect All
                  </Button>

                  <Button
                    type="button"
                    variant="destructive"
                    className="rounded-2xl font-black"
                    onClick={() => setDeleteBulkOpen(true)}
                    disabled={!selectedIds.size}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Selected
                  </Button>
                </div>

                <div className="text-xs text-muted-foreground font-semibold">
                  Confirmation required: type <b>CONFIRM</b> or <b>DELETE</b>
                </div>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <div className="p-6 sm:p-7">
          {isLoading ? (
            <div className="py-14 text-center text-muted-foreground font-semibold">Loading…</div>
          ) : displayed.length === 0 ? (
            <div className="py-14 text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-black">
                <Sparkles className="h-4 w-4" />
                No quizzes found
              </div>
              <p className="mt-4 text-muted-foreground font-semibold">
                Click <span className="font-black text-foreground">New Quiz</span> to get started.
              </p>
              <div className="mt-5">
                <Button
                  className={cn("rounded-2xl font-black", !perm.canCreate && "opacity-60 pointer-events-none")}
                  asChild
                >
                  <Link href="/admin/assessments/new">
                    <Plus className="mr-2 h-4 w-4" />
                    New Quiz
                  </Link>
                </Button>
              </div>
            </div>
          ) : viewMode === "list" ? (
            <ul className="space-y-2">
              {displayed.map((qz) => {
                const quizId = getQuizId(qz);
                const hrefId = toHrefId(quizId);
                const canNavigate = !!hrefId;

                const deleteKey = getDeleteKey(qz);
                const canDeleteThis = perm.canEdit && !!safeStr(deleteKey);

                const title = getTitle(qz);
                const desc = getDesc(qz);

                const trackId = safeStr(qz?.track_id || qz?.strand_id);
                const trackLabel = trackLabelMap.get(trackId) || trackId || "—";

                const subjectLabel =
                  subjectNameMap.get(safeStr(qz.subject_id)) || safeStr(qz.subject_id) || "—";

                const count = guessQuestionCount(qz);
                const checked = selectMode && perm.canEdit ? isSelected(deleteKey) : false;

                const status = safeStr(qz.status) || "Draft";
                const type = safeStr(qz.type) || "Quiz";
                const completion = Number(qz.completionRate || 0);
                const responses = Number(qz.responses || 0);

                const TypeIcon = typeMeta[type]?.icon || ClipboardList;

                return (
                  <li
                    key={deleteKey || quizId || title}
                    className={cn(
                      "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-3xl px-4 py-3 border",
                      checked ? "bg-primary/10 border-primary/30" : "bg-muted/20 border-border"
                    )}
                  >
                    <div className="min-w-0 flex items-start gap-3">
                      {selectMode && perm.canEdit ? (
                        <div className="mt-1">
                          <Checkbox checked={checked} onCheckedChange={() => toggleSelect(deleteKey)} />
                        </div>
                      ) : null}

                      <div className="mt-0.5 h-10 w-10 rounded-2xl bg-background border flex items-center justify-center shrink-0">
                        <TypeIcon className="h-4 w-4 text-muted-foreground" />
                      </div>

                      <div className="min-w-0">
                        <p className="font-black truncate">{title}</p>

                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className="rounded-full text-[11px] font-black">
                            {trackLabel}
                          </Badge>
                          <Badge variant="outline" className="rounded-full text-[11px] font-black">
                            {subjectLabel}
                          </Badge>
                          <Badge variant="secondary" className="rounded-full text-[11px] font-black">
                            {count} {count === 1 ? "question" : "questions"}
                          </Badge>

                          <Badge
                            variant="outline"
                            className={cn("rounded-full text-[11px] font-black", typeMeta[type]?.badge)}
                          >
                            {type}
                          </Badge>

                          <Badge
                            className={cn(
                              "rounded-full text-[11px] font-black border-0",
                              statusMeta[status] || statusMeta.Draft
                            )}
                          >
                            {status}
                          </Badge>

                          <span className="text-[11px] text-muted-foreground font-semibold">
                            Updated {fmtDate(qz.updated_at || qz.created_at)}
                          </span>
                        </div>

                        <p className="mt-2 text-sm text-muted-foreground font-semibold line-clamp-1">{desc}</p>

                        {/* <div className="mt-3 hidden md:block max-w-[360px]">
                          <div className="flex items-center justify-between text-xs font-black mb-2">
                            <span className="text-muted-foreground">Completion</span>
                            <span>{completion}%</span>
                          </div>
                          <Progress value={completion} className="h-2" />
                          <div className="mt-2 text-xs text-muted-foreground font-semibold">
                            {responses.toLocaleString()} responses
                          </div>
                        </div> */}
                      </div>
                    </div>

                    <div className="flex gap-2 shrink-0 justify-end">
                      <Button
                        asChild={!selectMode}
                        type="button"
                        className={cn(
                          "rounded-2xl font-black",
                          selectMode && "bg-muted text-foreground hover:bg-muted/80"
                        )}
                        onClick={() => {
                          if (selectMode && perm.canEdit) toggleSelect(deleteKey);
                        }}
                        disabled={!selectMode && !canNavigate}
                        title={!canNavigate ? "Missing quiz id" : undefined}
                      >
                        {selectMode && perm.canEdit ? (
                          <span>{checked ? "Selected" : "Select"}</span>
                        ) : (
                          <Link href={canNavigate ? `/admin/assessments/view/${hrefId}` : "#"}>View Submissions</Link>
                        )}
                      </Button>

                      {perm.canEdit && !selectMode ? (
                        <Button
                          asChild
                          variant="outline"
                          className="rounded-2xl font-black"
                          disabled={!canNavigate}
                          title={!canNavigate ? "Missing quiz id" : undefined}
                        >
                          <Link href={canNavigate ? `/admin/assessments/${hrefId}/edit` : "#"}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </Link>
                        </Button>
                      ) : null}

                      {perm.canEdit && !selectMode ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="rounded-2xl" disabled={!canNavigate}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />

                            <DropdownMenuItem asChild disabled={!canNavigate}>
                              <Link href={canNavigate ? `/admin/assessments/view/${hrefId}` : "#"}>View Submissions</Link>
                            </DropdownMenuItem>

                            <DropdownMenuItem asChild disabled={!canNavigate}>
                              <Link href={canNavigate ? `/admin/assessments/${hrefId}/edit` : "#"}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Edit
                              </Link>
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              className={cn(
                                "text-destructive focus:text-destructive",
                                !canDeleteThis && "opacity-60 pointer-events-none"
                              )}
                              onClick={() => openDeleteOne(qz)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {displayed.map((qz) => {
                const quizId = getQuizId(qz);
                const hrefId = toHrefId(quizId);
                const canNavigate = !!hrefId;

                const deleteKey = getDeleteKey(qz);
                const canDeleteThis = perm.canEdit && !!safeStr(deleteKey);

                const title = getTitle(qz);
                const desc = getDesc(qz);

                const type = safeStr(qz.type) || "Quiz";
                const status = safeStr(qz.status) || "Draft";

                const trackId = safeStr(qz?.track_id || qz?.strand_id);
                const trackLabel = trackLabelMap.get(trackId) || trackId || "—";

                const subjectLabel =
                  subjectNameMap.get(safeStr(qz.subject_id)) || safeStr(qz.subject_id) || "—";

                const count = guessQuestionCount(qz);
                const completion = Number(qz.completionRate || 0);
                const responses = Number(qz.responses || 0);

                const checked = selectMode && perm.canEdit ? isSelected(deleteKey) : false;
                const TypeIcon = typeMeta[type]?.icon || ClipboardList;

                return (
                  <motion.div key={deleteKey || quizId || title} whileHover={{ y: -4, scale: 1.01 }}>
                    <Card className={cn("rounded-4xl overflow-hidden border shadow-sm", checked && "ring-2 ring-primary")}>
                      <CardHeader className="pb-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 min-w-0">
                            {selectMode && perm.canEdit ? (
                              <div className="pt-1">
                                <Checkbox checked={checked} onCheckedChange={() => toggleSelect(deleteKey)} />
                              </div>
                            ) : null}

                            <div className="h-10 w-10 rounded-2xl bg-muted flex items-center justify-center border">
                              <TypeIcon className="h-5 w-5 text-muted-foreground" />
                            </div>

                            <div className="min-w-0">
                              <CardTitle className="text-lg font-black truncate">{title}</CardTitle>
                              <CardDescription className="font-semibold line-clamp-1">
                                {trackLabel} • {subjectLabel}
                              </CardDescription>
                            </div>
                          </div>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="rounded-2xl" disabled={!canNavigate}>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />

                              <DropdownMenuItem asChild disabled={!canNavigate}>
                                <Link href={canNavigate ? `/admin/assessments/view/${hrefId}` : "#"}>View Submissions</Link>
                              </DropdownMenuItem>

                              {perm.canEdit ? (
                                <DropdownMenuItem asChild disabled={!canNavigate}>
                                  <Link href={canNavigate ? `/admin/assessments/${hrefId}/edit` : "#"}>
                                    <Pencil className="mr-2 h-4 w-4" />
                                    Edit
                                  </Link>
                                </DropdownMenuItem>
                              ) : null}

                              {perm.canEdit ? (
                                <DropdownMenuItem
                                  className={cn(
                                    "text-destructive focus:text-destructive",
                                    !canDeleteThis && "opacity-60 pointer-events-none"
                                  )}
                                  onClick={() => openDeleteOne(qz)}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              ) : null}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                          <Badge variant="outline" className={cn("text-xs font-black rounded-full", typeMeta[type]?.badge)}>
                            {type}
                          </Badge>
                          <Badge className={cn("text-xs font-black rounded-full border-0", statusMeta[status] || statusMeta.Draft)}>
                            {status}
                          </Badge>
                          <Badge variant="secondary" className="rounded-full border font-black text-xs">
                            {count} Q
                          </Badge>
                        </div>
                      </CardHeader>

                      <CardContent className="space-y-4">
                        <p className="text-sm text-muted-foreground font-semibold line-clamp-3 min-h-[3.75rem]">{desc}</p>

                        {/* <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs font-black">
                            <span className="text-muted-foreground">Completion Rate</span>
                            <span>{completion}%</span>
                          </div>
                          <Progress value={completion} className="h-2" />
                        </div> */}

                        <div className="grid grid-cols-2 gap-2">
                          <div className="p-3 rounded-2xl border bg-muted/20">
                            <div className="text-xs text-muted-foreground font-semibold">Submissions</div>
                            <div className="text-base font-black">{responses.toLocaleString()}</div>
                          </div>
                          <div className="p-3 rounded-2xl border bg-muted/20">
                            <div className="text-xs text-muted-foreground font-semibold">Updated</div>
                            <div className="text-base font-black">{qz.updated_at ? new Date(qz.updated_at).toLocaleDateString() : "—"}</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                          <Button asChild className="rounded-2xl font-black flex-1" disabled={!canNavigate}>
                            <Link href={canNavigate ? `/admin/assessments/view/${hrefId}` : "#"}>View Submissions</Link>
                          </Button>

                          {perm.canEdit ? (
                            <Button asChild variant="outline" className="rounded-2xl font-black" disabled={!canNavigate}>
                              <Link href={canNavigate ? `/admin/assessments/${hrefId}/edit` : "#"}>
                                <Pencil className="h-4 w-4" />
                              </Link>
                            </Button>
                          ) : null}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ✅ Delete one */}
      <Dialog
        open={deleteOneOpen}
        onOpenChange={(open) => {
          setDeleteOneOpen(open);
          if (!open) {
            setConfirmOneText("");
            setDeleteTarget({ quiz: null, id: "", title: "", storage_path: "", quiz_id: "" });
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-black">Delete Quiz</DialogTitle>
            <DialogDescription className="font-semibold">
              This will permanently delete{" "}
              <span className="font-black text-foreground">“{deleteTarget.title || "this quiz"}”</span>.
              <br />
              <span className="text-muted-foreground">
                To confirm, type <span className="font-black text-foreground">DELETE</span> below.
              </span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Input
              value={confirmOneText}
              onChange={(e) => setConfirmOneText(e.target.value)}
              placeholder='Type "DELETE" to confirm'
              className="rounded-2xl font-semibold"
              autoFocus
            />
            <div className="text-xs text-muted-foreground font-semibold space-y-1">
              <div>
                Quiz ID: <span className="font-black text-foreground">{deleteTarget.quiz_id || "—"}</span>
              </div>
              <div>
                Delete Key: <span className="font-black text-foreground">{deleteTarget.id || "—"}</span>
              </div>
              {deleteTarget.storage_path ? (
                <div className="truncate">
                  Storage Path: <span className="font-black text-foreground">{deleteTarget.storage_path}</span>
                </div>
              ) : null}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" className="rounded-2xl font-black" onClick={() => setDeleteOneOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="rounded-2xl font-black"
              onClick={async () => {
                if (!canConfirmDeleteOne) return;
                await handleDeleteOne();
              }}
              disabled={busy || !deleteTarget.id || !canConfirmDeleteOne}
              title={!deleteTarget.id ? "Missing quiz id" : !canConfirmDeleteOne ? 'Type "DELETE" to enable' : undefined}
            >
              {busy ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete bulk */}
      <Dialog
        open={deleteBulkOpen}
        onOpenChange={(open) => {
          setDeleteBulkOpen(open);
          if (!open) setConfirmText("");
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-black">Delete Selected</DialogTitle>
            <DialogDescription className="font-semibold">
              You are about to delete{" "}
              <span className="font-black text-foreground">{selectedIds.size}</span> quiz
              {selectedIds.size === 1 ? "" : "zes"}. Type{" "}
              <span className="font-black text-foreground">CONFIRM</span> or{" "}
              <span className="font-black text-foreground">DELETE</span> to proceed.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Type CONFIRM or DELETE"
              className="rounded-2xl font-semibold"
            />
            <div className="text-xs text-muted-foreground font-semibold">This cannot be undone.</div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              className="rounded-2xl font-black"
              onClick={() => {
                setDeleteBulkOpen(false);
                setConfirmText("");
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="rounded-2xl font-black"
              disabled={busy || !["CONFIRM", "DELETE"].includes(safeStr(confirmText).toUpperCase())}
              onClick={handleBulkDelete}
            >
              {busy ? "Deleting..." : "Delete Selected"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* API Settings */}
      {perm.isSuperAdmin ? (
        <Dialog open={apiKeyModal} onOpenChange={setApiKeyModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-black">API Settings</DialogTitle>
              <DialogDescription className="font-semibold">
                Configure your quizzes API key for external integrations.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2">
              <div className="text-sm font-black">API Key</div>
              <div className="flex gap-2">
                <Input
                  type={showApiKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-..."
                  className="rounded-2xl font-semibold"
                />
                <Button
                  variant="outline"
                  className="rounded-2xl font-black"
                  onClick={() => setShowApiKey((v) => !v)}
                  type="button"
                >
                  {showApiKey ? "Hide" : "Show"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground font-semibold">
                Stored in your browser’s local storage.
              </p>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" className="rounded-2xl font-black" onClick={() => setApiKeyModal(false)}>
                Cancel
              </Button>
              <Button className="rounded-2xl font-black" onClick={handleSaveApiKey}>
                Save API Key
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  );
}
