"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent as AlertDialogContentRoot,
  AlertDialogDescription as AlertDialogDescriptionRoot,
  AlertDialogFooter as AlertDialogFooterRoot,
  AlertDialogHeader as AlertDialogHeaderRoot,
  AlertDialogTitle as AlertDialogTitleRoot,
} from "@/components/ui/alert-dialog";

import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

import {
  Search,
  X,
  RefreshCcw,
  LayoutList,
  LayoutGrid,
  UserX,
  UserCheck,
  Trash2,
  Mail,
  Copy,
  Plus,
  Pencil,
  Filter,
  ChevronLeft,
  ChevronRight,
  IdCard,
  MapPin,
  Sparkles,
  Users,
  ShieldAlert,
  GraduationCap,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/* helpers */
/* ------------------------------------------------------------------ */

const fetcher = (url) => fetch(url).then((r) => r.json());

function safe(v) {
  return typeof v === "string" ? v : "";
}

function getSection(stu) {
  return stu?.section ?? stu?.section_name ?? stu?.class_section ?? "";
}

function fullName(stu) {
  const suffix = stu?.suffix ? `, ${stu.suffix}` : "";
  const n = [stu?.first_name, stu?.middle_name, stu?.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();
  return (n ? `${n}${suffix}` : "").trim() || "Unknown Student";
}

function initialsFrom(name) {
  const n = safe(name).trim();
  if (!n) return "?";
  return (
    n
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => (w[0] || "").toUpperCase())
      .join("") || "?"
  );
}

function fmtDate(d) {
  if (!d) return "N/A";
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "2-digit",
    year: "numeric",
  });
}

function calcAge(birthdate) {
  if (!birthdate) return "N/A";
  const b = new Date(birthdate);
  if (Number.isNaN(b.getTime())) return "N/A";
  const diff = Date.now() - b.getTime();
  return Math.abs(new Date(diff).getUTCFullYear() - 1970);
}

function getPaginationWindow(current, total, windowSize = 5) {
  if (total <= windowSize) return Array.from({ length: total }, (_, i) => i + 1);
  const half = Math.floor(windowSize / 2);
  let start = Math.max(1, current - half);
  let end = start + windowSize - 1;
  if (end > total) {
    end = total;
    start = end - windowSize + 1;
  }
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

const levelTone = (level) => {
  const v = String(level || "").toLowerCase();
  if (v.includes("senior")) return "bg-violet-100 text-violet-900 border-violet-200";
  if (v.includes("junior")) return "bg-indigo-100 text-indigo-900 border-indigo-200";
  return "bg-zinc-100 text-zinc-900 border-zinc-200";
};

const statusTone = (disabled) => {
  return disabled
    ? "bg-rose-100 text-rose-900 border-rose-200"
    : "bg-emerald-100 text-emerald-900 border-emerald-200";
};

function StatTile({ label, value, icon }) {
  return (
    <div className="rounded-4xl bg-card border border-border shadow-sm p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground font-semibold">{label}</p>
          <p className="mt-2 text-3xl font-black tracking-tight leading-none">{value}</p>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
          {icon}
        </div>
      </div>
    </div>
  );
}

function Chip({ icon, children, onClear, title }) {
  return (
    <span
      title={title}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-black",
        "bg-card/70 backdrop-blur shadow-sm"
      )}
    >
      {icon ? <span className="text-muted-foreground">{icon}</span> : null}
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

function SkeletonRow({ isSuperAdmin }) {
  return (
    <TableRow>
      <TableCell className="w-[320px]">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-muted animate-pulse" />
          <div className="min-w-0 flex-1">
            <div className="h-4 w-40 bg-muted rounded animate-pulse" />
            <div className="mt-2 h-3 w-56 bg-muted rounded animate-pulse" />
          </div>
        </div>
      </TableCell>
      <TableCell className="w-[170px]">
        <div className="h-4 w-28 bg-muted rounded animate-pulse" />
        <div className="mt-2 h-3 w-20 bg-muted rounded animate-pulse" />
      </TableCell>
      <TableCell className="w-[110px]">
        <div className="h-6 w-16 bg-muted rounded-full animate-pulse" />
      </TableCell>
      <TableCell className="hidden lg:table-cell w-[240px]">
        <div className="h-4 w-52 bg-muted rounded animate-pulse" />
      </TableCell>
      <TableCell className="w-[120px]">
        <div className="h-6 w-20 bg-muted rounded-full animate-pulse" />
      </TableCell>
      {isSuperAdmin ? (
        <TableCell className="w-[140px] text-right">
          <div className="ml-auto h-8 w-24 bg-muted rounded-xl animate-pulse" />
        </TableCell>
      ) : null}
    </TableRow>
  );
}

/* ------------------------------------------------------------------ */
/* page */
/* ------------------------------------------------------------------ */

export default function StudentsPage() {
  const { toast } = useToast();

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const { data, error, isLoading, mutate } = useSWR("/api/students", fetcher, {
    revalidateOnFocus: false,
  });

  const students = useMemo(
    () => (data?.data || []).map((s, i) => ({ ...s, _row: i })),
    [data]
  );

  // admin gating
  const [adminLevel, setAdminLevel] = useState("");
  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("currentUser") || "{}");
    setAdminLevel(stored.admin_level || "");
  }, []);

  const levelUpper = (adminLevel || "").toUpperCase();
  const isSuperAdmin = adminLevel === "Super Admin";
  const canViewJHS = isSuperAdmin || levelUpper.includes("JHS");
  const canViewSHS = isSuperAdmin || levelUpper.includes("SHS");

  // view + selection
  const [viewMode, setViewMode] = useState("table"); // "table" | "list"
  const [selectedStudent, setSelectedStudent] = useState(null);

  // search + filters
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [hsFilter, setHsFilter] = useState(""); // "Junior High School" | "Senior High School" | ""
  const [gradeFilter, setGradeFilter] = useState("");
  const [sectionFilter, setSectionFilter] = useState("");
  const [genderFilter, setGenderFilter] = useState("");

  // url sync (?level=JHS|SHS)
  useEffect(() => {
    const lvl = (searchParams.get("level") || "").toUpperCase();
    if (lvl === "JHS") setHsFilter("Junior High School");
    else if (lvl === "SHS") setHsFilter("Senior High School");
    else setHsFilter("");
  }, [searchParams]);

  const setLevelFilter = (val) => {
    setHsFilter(val);
    const params = new URLSearchParams(searchParams.toString());
    if (!val) params.delete("level");
    else params.set("level", val === "Junior High School" ? "JHS" : "SHS");
    router.replace(`${pathname}?${params.toString()}`);
    setPage(1);
  };

  // debounce search
  useEffect(() => {
    const t = setTimeout(() => setQ(search.trim().toLowerCase()), 250);
    return () => clearTimeout(t);
  }, [search]);

  // pagination
  const PAGE_SIZE = 10;
  const [page, setPage] = useState(1);

  const gradeOptions = useMemo(() => {
    const set = new Set();
    students.forEach((s) => s?.grade_level && set.add(s.grade_level));
    return Array.from(set).sort((a, b) =>
      (a || "").toString().localeCompare((b || "").toString())
    );
  }, [students]);

  const sectionOptions = useMemo(() => {
    const set = new Set();
    students.forEach((s) => {
      const sec = getSection(s);
      if (sec) set.add(sec);
    });
    return Array.from(set).sort((a, b) =>
      (a || "").toString().localeCompare((b || "").toString())
    );
  }, [students]);

  const hasSectionData = sectionOptions.length > 0;

  const filtered = useMemo(() => {
    return students.filter((stu) => {
      const name = fullName(stu).toLowerCase();
      const email = safe(stu.email).toLowerCase();
      const sec = getSection(stu);

      if (q && !name.includes(q) && !email.includes(q)) return false;
      if (hsFilter && stu.school_level !== hsFilter) return false;
      if (gradeFilter && stu.grade_level !== gradeFilter) return false;
      if (sectionFilter && sec !== sectionFilter) return false;
      if (genderFilter && stu.gender !== genderFilter) return false;

      if (!isSuperAdmin) {
        if (levelUpper.includes("JHS") && !levelUpper.includes("SHS")) {
          if (stu.school_level !== "Junior High School") return false;
        }
        if (levelUpper.includes("SHS") && !levelUpper.includes("JHS")) {
          if (stu.school_level !== "Senior High School") return false;
        }
      }
      return true;
    });
  }, [
    students,
    q,
    hsFilter,
    gradeFilter,
    sectionFilter,
    genderFilter,
    isSuperAdmin,
    levelUpper,
  ]);

  useEffect(() => {
    setPage(1);
  }, [q, hsFilter, gradeFilter, sectionFilter, genderFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE) || 1;
  const start = (page - 1) * PAGE_SIZE;
  const paginated = filtered.slice(start, start + PAGE_SIZE);
  const pageButtons = getPaginationWindow(page, totalPages, 5);

  const stats = useMemo(() => {
    const total = filtered.length;
    const disabled = filtered.filter((s) => Boolean(s.is_disabled)).length;
    const jhs = filtered.filter((s) => s.school_level === "Junior High School").length;
    const shs = filtered.filter((s) => s.school_level === "Senior High School").length;
    return { total, disabled, jhs, shs };
  }, [filtered]);

  // confirm dialog state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState("");
  const [confirmDesc, setConfirmDesc] = useState("");
  const [confirmAction, setConfirmAction] = useState(null);

  const openConfirm = ({ title, desc, action }) => {
    setConfirmTitle(title);
    setConfirmDesc(desc);
    setConfirmAction(() => action);
    setConfirmOpen(true);
  };

  const runConfirm = async () => {
    if (!confirmAction) return;
    setConfirmLoading(true);
    try {
      await confirmAction();
    } catch (e) {
      toast({
        title: "Action failed",
        description: e?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setConfirmLoading(false);
      setConfirmOpen(false);
      setConfirmAction(null);
    }
  };

  // add/edit modal
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const blankForm = {
    first_name: "",
    middle_name: "",
    last_name: "",
    suffix: "",
    email: "",
    gender: "",
    birthdate: "",
    school_level: "",
    grade_level: "",
    program: "",
    strand: "",
    course: "",
    section: "",
    student_number: "",
    username: "",
    street: "",
    brgy: "",
    city: "",
    province: "",
    profile_picture: "",
  };

  const [form, setForm] = useState(blankForm);

  const openAdd = () => {
    setForm(blankForm);
    setAddOpen(true);
  };

  const openEdit = (stu) => {
    setSelectedStudent(stu);
    setForm({
      ...blankForm,
      ...stu,
      section: getSection(stu),
    });
    setEditOpen(true);
  };

  const refreshAndKeepSelection = async () => {
    const next = await mutate();
    const list = next?.data?.data || [];
    setSelectedStudent((prev) => {
      if (!prev?.supabase_id) return prev;
      const found = list.find((s) => s.supabase_id === prev.supabase_id);
      return found || null;
    });
  };

  const toggleDisabled = (stu) => {
    if (!stu?.supabase_id) {
      toast({ title: "Missing supabase_id", variant: "destructive" });
      return;
    }
    const next = !Boolean(stu.is_disabled);

    openConfirm({
      title: `${next ? "Disable" : "Enable"} ${stu.first_name || "this user"}?`,
      desc: next
        ? "They will be unable to sign in or access their account until re-enabled."
        : "They will regain access to their account.",
      action: async () => {
        const res = await fetch(`/api/students/${stu.supabase_id}/disabled`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ is_disabled: next }),
        });
        const json = await res.json();
        if (!json?.success) throw new Error(json?.error || "Failed");
        toast({ title: `Account ${next ? "disabled" : "enabled"} successfully.` });
        await refreshAndKeepSelection();
      },
    });
  };

  const deleteStudent = (stu) => {
    if (!stu?.supabase_id) {
      toast({ title: "Missing supabase_id", variant: "destructive" });
      return;
    }

    openConfirm({
      title: `Delete ${stu.first_name || "this user"}?`,
      desc: "This action cannot be undone.",
      action: async () => {
        const res = await fetch(`/api/students/${stu.supabase_id}`, { method: "DELETE" });
        const json = await res.json();
        if (!json?.success) throw new Error(json?.error || "Failed");
        toast({ title: "Student deleted." });
        setSelectedStudent((prev) =>
          prev?.supabase_id === stu.supabase_id ? null : prev
        );
        await refreshAndKeepSelection();
      },
    });
  };

  const submitAdd = async () => {
    setSaving(true);
    try {
      if (!safe(form.email).trim()) {
        toast({ title: "Email is required", variant: "destructive" });
        return;
      }
      const payload = {
        ...form,
        section: safe(form.section).trim(),
      };

      const res = await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json?.success) throw new Error(json?.error || "Failed to add student");

      toast({ title: "Student added" });
      setAddOpen(false);
      await refreshAndKeepSelection();
    } catch (e) {
      toast({
        title: "Add failed",
        description: e?.message || "Could not add student.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const submitEdit = async () => {
    if (!selectedStudent?.supabase_id) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        supabase_id: selectedStudent.supabase_id,
        section: safe(form.section).trim(),
      };

      const res = await fetch(`/api/students/${selectedStudent.supabase_id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json?.success) throw new Error(json?.error || "Failed to update student");

      toast({ title: "Student updated" });
      setEditOpen(false);
      await refreshAndKeepSelection();
    } catch (e) {
      toast({
        title: "Update failed",
        description: e?.message || "Could not update student.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const resetFilters = () => {
    setGenderFilter("");
    setGradeFilter("");
    setSectionFilter("");
    setSearch("");
    setLevelFilter("");
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text || "");
      toast({ title: "Copied" });
    } catch {
      toast({ title: "Copy failed", variant: "destructive" });
    }
  };

  /* ------------------------------------------------------------------ */
  /* render states */
  /* ------------------------------------------------------------------ */

  if (isLoading) {
    return (
      <Card className="rounded-4xl">
        <CardContent className="p-6 text-muted-foreground font-semibold">
          Loading students…
        </CardContent>
      </Card>
    );
  }

  if (error || data?.success === false) {
    return (
      <Card className="rounded-4xl">
        <CardContent className="p-6 space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-rose-50 border border-rose-200 px-3 py-1.5 text-rose-900 font-black text-sm">
            <ShieldAlert className="h-4 w-4" />
            Failed to load
          </div>
          <p className="text-sm text-muted-foreground font-semibold">
            {data?.error || "Please try again."}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" className="rounded-2xl font-black" onClick={() => mutate()}>
              <RefreshCcw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  /* ------------------------------------------------------------------ */
  /* UI */
  /* ------------------------------------------------------------------ */

  const hasFilters = Boolean(q || hsFilter || gradeFilter || sectionFilter || genderFilter);

  return (
    <div className="space-y-8">
      {/* ===== HERO ===== */}
      <section
        className={cn(
          "relative overflow-hidden rounded-4xl border",
          "bg-gradient-to-b from-background via-background to-background"
        )}
      >
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

        <div className="relative p-6 sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-black mb-5">
                <Sparkles className="h-4 w-4" />
                Admin • Student Directory
              </div>

              <h1 className="text-4xl sm:text-5xl font-black tracking-tight leading-tight">
                Students{" "}
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent bg-[length:200%] animate-gradient-x">
                  Management
                </span>
              </h1>

              <p className="mt-4 text-muted-foreground text-lg font-semibold leading-relaxed">
                Fast search, clean filters, and a profile inspector — built for speed and clarity.
              </p>

              {/* active chips */}
              <div className="mt-6 flex flex-wrap gap-2">
                {q ? (
                  <Chip
                    icon={<Search className="h-3.5 w-3.5" />}
                    title="Search query"
                    onClear={() => setSearch("")}
                  >
                    {q}
                  </Chip>
                ) : null}

                {hsFilter ? (
                  <Chip
                    icon={<GraduationCap className="h-3.5 w-3.5" />}
                    title="Level filter"
                    onClear={() => setLevelFilter("")}
                  >
                    {hsFilter.includes("Senior") ? "Senior High" : "Junior High"}
                  </Chip>
                ) : null}

                {gradeFilter ? (
                  <Chip title="Grade filter" onClear={() => setGradeFilter("")}>
                    Grade {gradeFilter}
                  </Chip>
                ) : null}

                {sectionFilter ? (
                  <Chip title="Section filter" onClear={() => setSectionFilter("")}>
                    {sectionFilter}
                  </Chip>
                ) : null}

                {genderFilter ? (
                  <Chip title="Gender filter" onClear={() => setGenderFilter("")}>
                    {genderFilter}
                  </Chip>
                ) : null}

                {hasFilters ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full font-black"
                    onClick={resetFilters}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Clear all
                  </Button>
                ) : null}
              </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap justify-start lg:justify-end">
              <Button
                variant="outline"
                className="rounded-2xl font-black"
                onClick={() => mutate()}
              >
                <RefreshCcw className="h-4 w-4 mr-2" />
                Refresh
              </Button>

              {isSuperAdmin ? (
                <Button className="rounded-2xl font-black" onClick={openAdd}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Student
                </Button>
              ) : null}
            </div>
          </div>

          <style>{`
            @keyframes gradientX { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
            .animate-gradient-x { animation: gradientX 6s ease infinite; }
          `}</style>

          {/* stats */}
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatTile label="Results" value={stats.total} icon={<Users className="h-5 w-5 text-primary" />} />
            <StatTile label="Disabled" value={stats.disabled} icon={<ShieldAlert className="h-5 w-5 text-primary" />} />
            <StatTile label="JHS" value={stats.jhs} icon={<GraduationCap className="h-5 w-5 text-primary" />} />
            <StatTile label="SHS" value={stats.shs} icon={<GraduationCap className="h-5 w-5 text-primary" />} />
          </div>
        </div>
      </section>

      {/* ===== MAIN GRID ===== */}
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_380px] gap-6">
        {/* LEFT */}
        <div className="space-y-5">
          {/* FILTERS CARD */}
          <Card className="rounded-4xl border-border shadow-sm">
            <CardContent className="p-6 space-y-5">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                <div className="relative w-full lg:max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search name or email…"
                    className="pl-9 pr-10 rounded-2xl font-semibold"
                  />
                  {search ? (
                    <button
                      type="button"
                      onClick={() => setSearch("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      title="Clear search"
                      aria-label="Clear search"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>

                <div className="flex items-center gap-2 justify-between lg:justify-end">
                  <div className="inline-flex rounded-2xl border overflow-hidden">
                    <Button
                      type="button"
                      variant={viewMode === "table" ? "secondary" : "ghost"}
                      size="sm"
                      onClick={() => setViewMode("table")}
                      className="rounded-none font-black"
                    >
                      <LayoutList className="h-4 w-4 mr-2" />
                      Table
                    </Button>
                    <Button
                      type="button"
                      variant={viewMode === "list" ? "secondary" : "ghost"}
                      size="sm"
                      onClick={() => setViewMode("list")}
                      className="rounded-none font-black"
                    >
                      <LayoutGrid className="h-4 w-4 mr-2" />
                      List
                    </Button>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-2xl font-black"
                    onClick={resetFilters}
                  >
                    <Filter className="h-4 w-4 mr-2" />
                    Reset
                  </Button>
                </div>
              </div>

              <Separator />

              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                {/* level pills */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-muted-foreground font-semibold">Level:</span>

                  <Button
                    type="button"
                    size="sm"
                    variant={hsFilter === "" ? "default" : "outline"}
                    className="rounded-full font-black"
                    onClick={() => setLevelFilter("")}
                  >
                    All
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    variant={hsFilter === "Junior High School" ? "default" : "outline"}
                    className="rounded-full font-black"
                    onClick={() => setLevelFilter("Junior High School")}
                    disabled={!canViewJHS}
                    title={!canViewJHS ? "No access to JHS records" : "Show JHS"}
                  >
                    Junior
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    variant={hsFilter === "Senior High School" ? "default" : "outline"}
                    className="rounded-full font-black"
                    onClick={() => setLevelFilter("Senior High School")}
                    disabled={!canViewSHS}
                    title={!canViewSHS ? "No access to SHS records" : "Show SHS"}
                  >
                    Senior
                  </Button>
                </div>

                {/* dropdowns */}
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={gradeFilter}
                    onChange={(e) => setGradeFilter(e.target.value)}
                    className="h-10 rounded-2xl border bg-background px-3 text-sm font-semibold"
                    title="Filter by Grade"
                  >
                    <option value="">All Grades</option>
                    {gradeOptions.map((g) => (
                      <option key={g} value={g}>
                        Grade {g}
                      </option>
                    ))}
                  </select>

                  <select
                    value={sectionFilter}
                    onChange={(e) => setSectionFilter(e.target.value)}
                    className="h-10 rounded-2xl border bg-background px-3 text-sm font-semibold disabled:opacity-50"
                    disabled={!hasSectionData}
                    title={hasSectionData ? "Filter by Section" : "No section data yet"}
                  >
                    <option value="">All Sections</option>
                    {sectionOptions.map((sec) => (
                      <option key={sec} value={sec}>
                        {sec}
                      </option>
                    ))}
                  </select>

                  <select
                    value={genderFilter}
                    onChange={(e) => setGenderFilter(e.target.value)}
                    className="h-10 rounded-2xl border bg-background px-3 text-sm font-semibold"
                    title="Filter by Gender"
                  >
                    <option value="">All Genders</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>

                  <Badge
                    variant="secondary"
                    className="h-10 rounded-2xl px-4 flex items-center font-black"
                  >
                    {filtered.length} result{filtered.length === 1 ? "" : "s"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* CONTENT */}
          {viewMode === "table" ? (
            <Card className="rounded-4xl overflow-hidden border-border shadow-sm">
              <div className="w-full overflow-x-auto">
                <Table className="w-full table-fixed min-w-[980px]">
                  <TableHeader>
                    <TableRow className="bg-muted/40 sticky top-0 z-10">
                      <TableHead className="w-[340px]">Student</TableHead>
                      <TableHead className="w-[190px]">Grade / Section</TableHead>
                      <TableHead className="w-[130px]">Level</TableHead>
                      <TableHead className="hidden lg:table-cell w-[260px]">Email</TableHead>
                      <TableHead className="w-[130px]">Status</TableHead>
                      {isSuperAdmin ? (
                        <TableHead className="w-[170px] text-right">Actions</TableHead>
                      ) : null}
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {paginated.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={isSuperAdmin ? 6 : 5}
                          className="py-12 text-center text-muted-foreground font-semibold"
                        >
                          No students match your filters.
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginated.map((stu) => {
                        const name = fullName(stu);
                        const section = getSection(stu);
                        const isDisabled = Boolean(stu.is_disabled);

                        const selected = selectedStudent?.supabase_id === stu.supabase_id;

                        return (
                          <TableRow
                            key={stu.supabase_id || stu._row}
                            onClick={() => setSelectedStudent(stu)}
                            className={cn(
                              "cursor-pointer hover:bg-primary/5",
                              selected && "bg-primary/5",
                              isDisabled && "opacity-70"
                            )}
                          >
                            <TableCell className="align-middle">
                              <div className="flex items-center gap-3 min-w-0">
                                <Avatar className="h-10 w-10 shrink-0 ring-4 ring-primary/5">
                                  <AvatarImage src={stu.profile_picture || undefined} alt={name} />
                                  <AvatarFallback className="font-black">
                                    {initialsFrom(name)}
                                  </AvatarFallback>
                                </Avatar>

                                <div className="min-w-0">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <p className="font-black truncate">{name}</p>
                                    {isDisabled ? (
                                      <Badge className={cn("border rounded-full", statusTone(true))}>
                                        Disabled
                                      </Badge>
                                    ) : null}
                                  </div>

                                  <div className="mt-1 flex flex-wrap items-center gap-2">
                                    <span className="text-xs text-muted-foreground truncate font-semibold">
                                      {stu.student_number || "No student #"}
                                    </span>

                                    {stu.course ? (
                                      <Badge className="bg-emerald-100 text-emerald-900 border-emerald-200 rounded-full">
                                        {stu.course}
                                      </Badge>
                                    ) : (
                                      <span className="text-xs text-muted-foreground italic">
                                        Course not set
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </TableCell>

                            <TableCell className="align-middle">
                              <div className="space-y-1">
                                {stu.grade_level ? (
                                  <Badge className="bg-amber-100 text-amber-900 border-amber-200 rounded-full">
                                    Grade {stu.grade_level}
                                  </Badge>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                                <p className="text-xs text-muted-foreground truncate font-semibold">
                                  {section || "No section"}
                                </p>
                              </div>
                            </TableCell>

                            <TableCell className="align-middle">
                              <Badge className={cn("border rounded-full", levelTone(stu.school_level))}>
                                {stu.school_level?.includes("Senior")
                                  ? "SHS"
                                  : stu.school_level?.includes("Junior")
                                  ? "JHS"
                                  : "—"}
                              </Badge>
                            </TableCell>

                            <TableCell className="hidden lg:table-cell align-middle">
                              <span className="truncate block font-semibold">
                                {stu.email || "—"}
                              </span>
                            </TableCell>

                            <TableCell className="align-middle">
                              <Badge
                                className={cn("border rounded-full", statusTone(isDisabled))}
                              >
                                {isDisabled ? "Disabled" : "Active"}
                              </Badge>
                            </TableCell>

                            {isSuperAdmin ? (
                              <TableCell className="align-middle text-right" onClick={(e) => e.stopPropagation()}>
                                <div className="inline-flex gap-2">
                                  <Button
                                    type="button"
                                    size="icon"
                                    variant="outline"
                                    className={cn(
                                      "h-9 w-9 rounded-2xl",
                                      isDisabled
                                        ? "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                                        : "border-rose-200 text-rose-700 hover:bg-rose-50"
                                    )}
                                    onClick={() => toggleDisabled(stu)}
                                    title={isDisabled ? "Enable" : "Disable"}
                                  >
                                    {isDisabled ? (
                                      <UserCheck className="h-4 w-4" />
                                    ) : (
                                      <UserX className="h-4 w-4" />
                                    )}
                                  </Button>

                                  <Button
                                    type="button"
                                    size="icon"
                                    variant="outline"
                                    className="h-9 w-9 rounded-2xl"
                                    onClick={() => openEdit(stu)}
                                    title="Edit"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>

                                  <Button
                                    type="button"
                                    size="icon"
                                    variant="destructive"
                                    className="h-9 w-9 rounded-2xl"
                                    onClick={() => deleteStudent(stu)}
                                    title="Delete"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            ) : null}
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {paginated.length === 0 ? (
                <Card className="rounded-4xl">
                  <CardContent className="p-10 text-center text-muted-foreground font-semibold">
                    No students match your filters.
                  </CardContent>
                </Card>
              ) : (
                paginated.map((stu) => {
                  const name = fullName(stu);
                  const section = getSection(stu);
                  const isDisabled = Boolean(stu.is_disabled);
                  const selected = selectedStudent?.supabase_id === stu.supabase_id;

                  return (
                    <motion.div
                      key={stu.supabase_id || stu._row}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Card
                        className={cn(
                          "rounded-4xl border-border shadow-sm hover:shadow-md transition-all cursor-pointer h-full",
                          selected && "ring-2 ring-primary/25",
                          isDisabled && "opacity-70"
                        )}
                        onClick={() => setSelectedStudent(stu)}
                      >
                        <CardContent className="p-5">
                          <div className="flex items-start gap-3">
                            <Avatar className="h-12 w-12 ring-4 ring-primary/5">
                              <AvatarImage src={stu.profile_picture || undefined} alt={name} />
                              <AvatarFallback className="font-black">
                                {initialsFrom(name)}
                              </AvatarFallback>
                            </Avatar>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-black truncate">{name}</p>
                                <Badge className={cn("border rounded-full", statusTone(isDisabled))}>
                                  {isDisabled ? "Disabled" : "Active"}
                                </Badge>
                                <Badge className={cn("border rounded-full", levelTone(stu.school_level))}>
                                  {stu.school_level?.includes("Senior")
                                    ? "SHS"
                                    : stu.school_level?.includes("Junior")
                                    ? "JHS"
                                    : "—"}
                                </Badge>

                                {stu.grade_level ? (
                                  <Badge variant="outline" className="rounded-full font-semibold">
                                    Grade {stu.grade_level}
                                  </Badge>
                                ) : null}

                                {section ? (
                                  <Badge variant="outline" className="rounded-full font-semibold">
                                    {section}
                                  </Badge>
                                ) : null}

                                {stu.course ? (
                                  <Badge className="bg-emerald-100 text-emerald-900 border-emerald-200 rounded-full">
                                    {stu.course}
                                  </Badge>
                                ) : null}
                              </div>

                              <p className="mt-1 text-sm text-muted-foreground truncate font-semibold">
                                {stu.email || "—"}
                              </p>

                              <p className="mt-2 text-xs text-muted-foreground truncate font-semibold">
                                {stu.student_number || "No student #"} • {stu.supabase_id || "No ID"}
                              </p>
                            </div>

                            {isSuperAdmin ? (
                              <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="outline"
                                  className={cn(
                                    "h-9 w-9 rounded-2xl",
                                    isDisabled
                                      ? "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                                      : "border-rose-200 text-rose-700 hover:bg-rose-50"
                                  )}
                                  onClick={() => toggleDisabled(stu)}
                                  title={isDisabled ? "Enable" : "Disable"}
                                >
                                  {isDisabled ? (
                                    <UserCheck className="h-4 w-4" />
                                  ) : (
                                    <UserX className="h-4 w-4" />
                                  )}
                                </Button>

                                <Button
                                  type="button"
                                  size="icon"
                                  variant="destructive"
                                  className="h-9 w-9 rounded-2xl"
                                  onClick={() => deleteStudent(stu)}
                                  title="Delete"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : null}
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })
              )}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 ? (
            <Card className="rounded-4xl border-border shadow-sm">
              <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <p className="text-sm text-muted-foreground font-semibold">
                  Page <span className="font-black text-foreground">{page}</span> of{" "}
                  <span className="font-black text-foreground">{totalPages}</span>
                </p>

                <div className="flex gap-2 flex-wrap justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-2xl"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>

                  {pageButtons.map((p) => (
                    <Button
                      key={p}
                      variant={p === page ? "default" : "outline"}
                      size="sm"
                      className="rounded-2xl font-black"
                      onClick={() => setPage(p)}
                    >
                      {p}
                    </Button>
                  ))}

                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-2xl"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>

        {/* RIGHT: INSPECTOR */}
        <div className="xl:sticky xl:top-6 h-fit space-y-4">
          {!selectedStudent ? (
            <Card className="rounded-4xl border-border shadow-sm">
              <CardContent className="p-10 text-center text-muted-foreground font-semibold">
                Select a student to view details.
              </CardContent>
            </Card>
          ) : (
            <Card className="rounded-4xl overflow-hidden border-border shadow-sm">
              <CardHeader className="relative border-b">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-violet-50 dark:from-blue-950/30 dark:via-indigo-950/25 dark:to-violet-950/30" />
                <div className="relative">
                  <CardTitle className="text-base font-black">Student Profile</CardTitle>
                  <CardDescription className="font-semibold">
                    Quick actions + full details
                  </CardDescription>
                </div>
              </CardHeader>

              <CardContent className="p-6 space-y-5">
                {/* top */}
                <div className="flex items-start gap-3">
                  <Avatar className="h-16 w-16 ring-4 ring-primary/10 shrink-0">
                    <AvatarImage
                      src={selectedStudent.profile_picture || ""}
                      alt={fullName(selectedStudent)}
                    />
                    <AvatarFallback className="text-lg font-black">
                      {initialsFrom(fullName(selectedStudent))}
                    </AvatarFallback>
                  </Avatar>

                  <div className="min-w-0 flex-1">
                    <p className="text-lg font-black leading-tight truncate">
                      {fullName(selectedStudent)}
                    </p>
                    <p className="text-sm text-muted-foreground truncate font-semibold">
                      {selectedStudent.email || "—"}
                    </p>

                    <div className="mt-2 flex flex-wrap gap-2">
                      <Badge className={cn("border rounded-full", statusTone(Boolean(selectedStudent.is_disabled)))}>
                        {selectedStudent.is_disabled ? "Disabled" : "Active"}
                      </Badge>

                      {selectedStudent.school_level ? (
                        <Badge className={cn("border rounded-full", levelTone(selectedStudent.school_level))}>
                          {selectedStudent.school_level.includes("Senior") ? "Senior High" : "Junior High"}
                        </Badge>
                      ) : null}

                      {selectedStudent.grade_level ? (
                        <Badge variant="outline" className="rounded-full font-semibold">
                          Grade {selectedStudent.grade_level}
                        </Badge>
                      ) : null}

                      {getSection(selectedStudent) ? (
                        <Badge variant="outline" className="rounded-full font-semibold">
                          {getSection(selectedStudent)}
                        </Badge>
                      ) : null}

                      {selectedStudent.course ? (
                        <Badge className="bg-emerald-100 text-emerald-900 border-emerald-200 rounded-full">
                          {selectedStudent.course}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground rounded-full font-semibold">
                          Course: Not set
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                {/* id card */}
                <div className="rounded-3xl border bg-background p-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <IdCard className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground font-semibold">Supabase ID:</span>
                    <span className="font-black truncate">{selectedStudent.supabase_id || "—"}</span>
                  </div>
                  <div className="text-xs text-muted-foreground font-semibold">
                    Created: {fmtDate(selectedStudent.created_at)} • Updated:{" "}
                    {fmtDate(selectedStudent.updated_at)}
                  </div>
                </div>

                {/* quick actions */}
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    className="rounded-2xl font-black"
                    onClick={() =>
                      selectedStudent.email &&
                      (window.location.href = `mailto:${selectedStudent.email}`)
                    }
                    disabled={!selectedStudent.email}
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    Email
                  </Button>

                  <Button
                    variant="outline"
                    className="rounded-2xl font-black"
                    onClick={() => copyToClipboard(selectedStudent.email)}
                    disabled={!selectedStudent.email}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy
                  </Button>
                </div>

                {isSuperAdmin ? (
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      className={cn(
                        "rounded-2xl font-black text-white",
                        selectedStudent.is_disabled
                          ? "bg-emerald-600 hover:bg-emerald-700"
                          : "bg-rose-500 hover:bg-rose-600"
                      )}
                      onClick={() => toggleDisabled(selectedStudent)}
                    >
                      {selectedStudent.is_disabled ? (
                        <>
                          <UserCheck className="h-4 w-4 mr-2" /> Enable
                        </>
                      ) : (
                        <>
                          <UserX className="h-4 w-4 mr-2" /> Disable
                        </>
                      )}
                    </Button>

                    <Button
                      variant="destructive"
                      className="rounded-2xl font-black"
                      onClick={() => deleteStudent(selectedStudent)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>

                    <Button
                      variant="outline"
                      className="col-span-2 rounded-2xl font-black"
                      onClick={() => openEdit(selectedStudent)}
                    >
                      <Pencil className="h-4 w-4 mr-2" />
                      Edit student details
                    </Button>
                  </div>
                ) : null}

                <Separator />

                {/* info blocks */}
                <div className="space-y-4">
                  <InfoBlock title="School">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <Field label="Level" value={selectedStudent.school_level} />
                      <Field label="Grade" value={selectedStudent.grade_level} />
                      <Field label="Program" value={selectedStudent.program} />
                      <Field label="Strand" value={selectedStudent.strand} />
                      <Field label="Course" value={selectedStudent.course} full />
                      <Field label="Section" value={getSection(selectedStudent)} full />
                    </div>
                  </InfoBlock>

                  <InfoBlock title="Personal">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <Field
                        label="Username"
                        value={selectedStudent.username ? `@${selectedStudent.username}` : ""}
                      />
                      <Field label="Gender" value={selectedStudent.gender} />
                      <Field label="Birthdate" value={fmtDate(selectedStudent.birthdate)} />
                      <Field label="Age" value={calcAge(selectedStudent.birthdate)} />
                      <Field label="Student #" value={selectedStudent.student_number} full />
                    </div>
                  </InfoBlock>

                  <InfoBlock title="Address">
                    <Field
                      label="Full Address"
                      value={[
                        selectedStudent.street,
                        selectedStudent.brgy,
                        selectedStudent.city,
                        selectedStudent.province,
                      ]
                        .filter(Boolean)
                        .join(", ")}
                      icon={<MapPin className="h-4 w-4 text-muted-foreground" />}
                      full
                    />
                  </InfoBlock>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Confirm Dialog */}
      <AlertDialog open={confirmOpen} onOpenChange={(o) => !confirmLoading && setConfirmOpen(o)}>
        <AlertDialogContentRoot>
          <AlertDialogHeaderRoot>
            <AlertDialogTitleRoot>{confirmTitle || "Confirm"}</AlertDialogTitleRoot>
            {confirmDesc ? (
              <AlertDialogDescriptionRoot>{confirmDesc}</AlertDialogDescriptionRoot>
            ) : null}
          </AlertDialogHeaderRoot>
          <AlertDialogFooterRoot>
            <AlertDialogCancel disabled={confirmLoading}>No</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                runConfirm();
              }}
              disabled={confirmLoading}
            >
              {confirmLoading ? "Please wait..." : "Yes"}
            </AlertDialogAction>
          </AlertDialogFooterRoot>
        </AlertDialogContentRoot>
      </AlertDialog>

      {/* Add Student Modal */}
      <Dialog open={addOpen} onOpenChange={(o) => !saving && setAddOpen(o)}>
        <DialogContent className="sm:max-w-2xl p-0 overflow-hidden">
          <div className="relative border-b">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-violet-50 dark:from-blue-950/30 dark:via-indigo-950/25 dark:to-violet-950/30" />
            <div className="relative p-6">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black">Add Student</DialogTitle>
                <DialogDescription className="font-semibold">
                  Create a new student record. (Email required)
                </DialogDescription>
              </DialogHeader>
            </div>
          </div>

          <div className="p-6">
            <StudentForm form={form} setForm={setForm} />

            <DialogFooter className="mt-6">
              <Button
                variant="outline"
                className="rounded-2xl font-black"
                onClick={() => setAddOpen(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button className="rounded-2xl font-black" onClick={submitAdd} disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Student Modal */}
      <Dialog open={editOpen} onOpenChange={(o) => !saving && setEditOpen(o)}>
        <DialogContent className="sm:max-w-2xl p-0 overflow-hidden">
          <div className="relative border-b">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-violet-50 dark:from-blue-950/30 dark:via-indigo-950/25 dark:to-violet-950/30" />
            <div className="relative p-6">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black">Edit Student</DialogTitle>
                <DialogDescription className="font-semibold">
                  Update student information.
                </DialogDescription>
              </DialogHeader>
            </div>
          </div>

          <div className="p-6">
            <StudentForm form={form} setForm={setForm} />

            <DialogFooter className="mt-6">
              <Button
                variant="outline"
                className="rounded-2xl font-black"
                onClick={() => setEditOpen(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                className="rounded-2xl font-black"
                onClick={submitEdit}
                disabled={saving || !selectedStudent?.supabase_id}
              >
                {saving ? "Saving..." : "Save changes"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* UI helpers */
/* ------------------------------------------------------------------ */

function InfoBlock({ title, children }) {
  return (
    <div className="rounded-3xl border p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground font-black">
        {title}
      </p>
      <div className="mt-3">{children}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* inline form */
/* ------------------------------------------------------------------ */

function StudentForm({ form, setForm }) {
  const set = (key) => (e) => setForm((p) => ({ ...p, [key]: e.target.value }));

  return (
    <div className="space-y-6">
      <SectionTitle title="Identity" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <FieldInput label="First Name" value={form.first_name} onChange={set("first_name")} placeholder="Juan" />
        <FieldInput label="Last Name" value={form.last_name} onChange={set("last_name")} placeholder="Dela Cruz" />
        <FieldInput label="Middle Name" value={form.middle_name} onChange={set("middle_name")} placeholder="Santos" />
        <FieldInput label="Suffix" value={form.suffix} onChange={set("suffix")} placeholder="Jr." />
      </div>

      <SectionTitle title="Contact" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <FieldInput label="Email (required)" value={form.email} onChange={set("email")} placeholder="juan@example.com" />
        <FieldInput label="Username" value={form.username} onChange={set("username")} placeholder="juan123" />
      </div>

      <SectionTitle title="School" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground font-semibold">School Level</p>
          <select
            value={form.school_level || ""}
            onChange={set("school_level")}
            className="h-10 w-full rounded-2xl border bg-background px-3 text-sm font-semibold"
          >
            <option value="">—</option>
            <option value="Junior High School">Junior High School</option>
            <option value="Senior High School">Senior High School</option>
          </select>
        </div>

        <FieldInput label="Grade Level" value={form.grade_level} onChange={set("grade_level")} placeholder="10 / 11 / 12" />
        <FieldInput label="Section" value={form.section} onChange={set("section")} placeholder="A / Rizal / ..." />
      </div>

      <SectionTitle title="Profile" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground font-semibold">Gender</p>
          <select
            value={form.gender || ""}
            onChange={set("gender")}
            className="h-10 w-full rounded-2xl border bg-background px-3 text-sm font-semibold"
          >
            <option value="">—</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>
        </div>
        <FieldInput label="Birthdate" value={form.birthdate} onChange={set("birthdate")} placeholder="YYYY-MM-DD" />
        <FieldInput label="Profile Picture URL" value={form.profile_picture} onChange={set("profile_picture")} placeholder="https://..." />
      </div>

      <SectionTitle title="Academic" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <FieldInput label="Program" value={form.program} onChange={set("program")} placeholder="STEM / ABM / ..." />
        <FieldInput label="Strand" value={form.strand} onChange={set("strand")} placeholder="Optional" />
        <FieldInput label="Assessment Result (Course)" value={form.course} onChange={set("course")} placeholder="BSIT / STEM / ..." />
      </div>

      <SectionTitle title="Address" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <FieldInput label="Street" value={form.street} onChange={set("street")} placeholder="Street / Purok" />
        <FieldInput label="Barangay" value={form.brgy} onChange={set("brgy")} placeholder="Brgy" />
        <FieldInput label="City" value={form.city} onChange={set("city")} placeholder="City" />
        <FieldInput label="Province" value={form.province} onChange={set("province")} placeholder="Province" />
      </div>

      <SectionTitle title="Misc" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <FieldInput label="Student Number" value={form.student_number} onChange={set("student_number")} placeholder="Optional" />
      </div>
    </div>
  );
}

function SectionTitle({ title }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-1 w-10 rounded-full bg-primary/30" />
      <p className="text-sm font-black">{title}</p>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}

function FieldInput({ label, value, onChange, placeholder }) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs text-muted-foreground font-semibold">{label}</p>
      <Input
        value={value || ""}
        onChange={onChange}
        placeholder={placeholder}
        className="rounded-2xl font-semibold"
      />
    </div>
  );
}

function Field({ label, value, icon, full }) {
  const hasValue = value !== null && value !== undefined && String(value).trim() !== "";

  return (
    <div className={cn("flex flex-col gap-1", full && "sm:col-span-2")}>
      <span className="text-xs uppercase tracking-wide text-muted-foreground font-black">
        {label}
      </span>
      <span className="text-sm text-foreground">
        {hasValue ? (
          <span className="inline-flex items-center gap-2 min-w-0">
            {icon || null}
            <span className="truncate font-semibold">{String(value)}</span>
          </span>
        ) : (
          <span className="text-muted-foreground font-semibold">N/A</span>
        )}
      </span>
    </div>
  );
}
