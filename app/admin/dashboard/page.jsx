// app/admin/dashboard/page.jsx (or wherever this DashboardPage lives)
"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from "recharts";

import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import {
  Filter,
  Search,
  RefreshCcw,
  ExternalLink,
  Download,
  FileText,
  Users,
  GraduationCap,
  UserPlus,
  BarChart3,
  PieChart as PieIcon,
  Sparkles,
  ShieldAlert,
  X,
} from "lucide-react";

/* -------------------------------- helpers ------------------------------- */

const fetcher = (url) => fetch(url).then((r) => r.json());

const GRADES = ["ALL", "6", "7", "8", "9", "10", "11", "12"];
const LEVELS = ["ALL", "JHS", "SHS"];
const RANGES = [7, 30, 90];

function safe(v) {
  return typeof v === "string" ? v : "";
}

function getSection(s) {
  return s?.section ?? s?.section_name ?? s?.class_section ?? "";
}

function fullName(s) {
  const suffix = s?.suffix ? `, ${s.suffix}` : "";
  const n = [s?.first_name, s?.middle_name, s?.last_name].filter(Boolean).join(" ").trim();
  return (n ? `${n}${suffix}` : "").trim() || s?.name || "Unknown Student";
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

function isInLevel(s, levelFilter) {
  if (!levelFilter || levelFilter === "ALL") return true;
  const lvl = String(s?.school_level || "").toLowerCase();
  if (levelFilter === "JHS") return lvl.includes("junior");
  if (levelFilter === "SHS") return lvl.includes("senior");
  return true;
}

function normalizeCourse(s) {
  const c =
    s?.course ??
    s?.assessment_result ??
    s?.program ??
    s?.strand ??
    s?.track ??
    s?.recommended_course ??
    "";
  const out = String(c || "").trim();
  return out ? out : "Undeclared";
}

function timeAgo(ts) {
  const t = new Date(ts || 0).getTime();
  if (!t || Number.isNaN(t)) return "—";
  const diff = Date.now() - t;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

/* --------- primary color parsing (for PDF header + chart palette) --------- */

function hslToRgb(h, s, l) {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = h / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r1 = 0,
    g1 = 0,
    b1 = 0;
  if (hp >= 0 && hp < 1) [r1, g1, b1] = [c, x, 0];
  else if (hp >= 1 && hp < 2) [r1, g1, b1] = [x, c, 0];
  else if (hp >= 2 && hp < 3) [r1, g1, b1] = [0, c, x];
  else if (hp >= 3 && hp < 4) [r1, g1, b1] = [0, x, c];
  else if (hp >= 4 && hp < 5) [r1, g1, b1] = [x, 0, c];
  else if (hp >= 5 && hp < 6) [r1, g1, b1] = [c, 0, x];
  const m = l - c / 2;
  const r = Math.round((r1 + m) * 255);
  const g = Math.round((g1 + m) * 255);
  const b = Math.round((b1 + m) * 255);
  return [r, g, b];
}

function rgbToHsl(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0,
    s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
        break;
    }
    h *= 60;
  }
  return [h, s, l];
}

function hexToRgbArray(hex) {
  const h = (hex || "").replace("#", "").trim();
  if (h.length !== 6) return null;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  if ([r, g, b].some((x) => Number.isNaN(x))) return null;
  return [r, g, b];
}

function getPrimaryRgbForPdf() {
  try {
    const raw = getComputedStyle(document.documentElement).getPropertyValue("--primary").trim();

    // hex token
    if (raw.startsWith("#")) return hexToRgbArray(raw) || [37, 99, 235];

    // shadcn hsl token: "222.2 47.4% 11.2%"
    const parts = raw.split(/\s+/).filter(Boolean);
    if (parts.length >= 3) {
      const h = parseFloat(parts[0]);
      const s = parseFloat(parts[1].replace("%", "")) / 100;
      const l = parseFloat(parts[2].replace("%", "")) / 100;
      if (![h, s, l].some((x) => Number.isNaN(x))) return hslToRgb(h, s, l);
    }

    return [37, 99, 235];
  } catch {
    return [37, 99, 235];
  }
}

function useChartPalette(count = 10) {
  const [colors, setColors] = useState(() =>
    Array.from({ length: count }, (_, i) => `hsl(var(--primary) / ${0.95 - i * 0.05})`)
  );

  useEffect(() => {
    try {
      const raw = getComputedStyle(document.documentElement).getPropertyValue("--primary").trim();

      let h = 215,
        s = 0.85,
        l = 0.55;

      if (raw.startsWith("#")) {
        const rgb = hexToRgbArray(raw);
        if (rgb) {
          const hsl = rgbToHsl(rgb[0], rgb[1], rgb[2]);
          h = hsl[0];
          s = hsl[1];
          l = hsl[2];
        }
      } else {
        const parts = raw.split(/\s+/).filter(Boolean);
        if (parts.length >= 3) {
          const hh = parseFloat(parts[0]);
          const ss = parseFloat(parts[1].replace("%", "")) / 100;
          const ll = parseFloat(parts[2].replace("%", "")) / 100;
          if (![hh, ss, ll].some((x) => Number.isNaN(x))) {
            h = hh;
            s = ss;
            l = ll;
          }
        }
      }

      const next = Array.from({ length: count }, (_, i) => {
        const hue = (h + i * 28) % 360;
        const sat = Math.max(0.35, Math.min(0.92, s));
        const lit = Math.max(0.35, Math.min(0.72, l + (i % 2 === 0 ? 0.06 : -0.02)));
        return `hsl(${hue} ${Math.round(sat * 100)}% ${Math.round(lit * 100)}%)`;
      });

      setColors(next);
    } catch {
      // keep fallback
    }
  }, [count]);

  return colors;
}

/* ------------------------------ UI helpers ------------------------------ */

function Segmented({ value, onChange, items, renderLabel }) {
  return (
    <div className="inline-flex rounded-2xl border overflow-hidden bg-muted/20">
      {items.map((it) => (
        <Button
          key={it}
          type="button"
          variant={value === it ? "secondary" : "ghost"}
          size="sm"
          className="rounded-none font-black"
          onClick={() => onChange(it)}
        >
          {renderLabel(it)}
        </Button>
      ))}
    </div>
  );
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

function StatTile({ label, value, icon }) {
  return (
    <motion.div
      whileHover={{ y: -3, scale: 1.01 }}
      className="rounded-4xl bg-card border border-border shadow-sm p-6 transition-all"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground font-semibold">{label}</p>
          <p className="mt-2 text-3xl font-black tracking-tight leading-none">{value}</p>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
          {icon}
        </div>
      </div>
    </motion.div>
  );
}

function ChartEmpty({ title = "No chart data", desc = "Try adjusting filters." }) {
  return (
    <div className="h-[360px] rounded-3xl border bg-muted/20 grid place-items-center text-center p-6">
      <div className="max-w-sm">
        <p className="font-black">{title}</p>
        <p className="mt-1 text-sm text-muted-foreground font-semibold">{desc}</p>
      </div>
    </div>
  );
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-popover border border-border rounded-2xl px-3 py-2 shadow-md">
      <p className="text-sm font-black">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-sm text-muted-foreground font-semibold">
          <span className="font-black text-foreground">{p.name}:</span>{" "}
          {Number(p.value || 0).toLocaleString()}
        </p>
      ))}
    </div>
  );
}

/* ---------------------------------- page ---------------------------------- */

export default function DashboardPage() {
  // global filters
  const [levelFilter, setLevelFilter] = useState("ALL"); // ALL | JHS | SHS
  const [range, setRange] = useState(7); // new registrations window

  // analytics controls
  const [gradePick, setGradePick] = useState("ALL");
  const [sectionPick, setSectionPick] = useState("ALL");

  // recent controls
  const [recentSearch, setRecentSearch] = useState("");
  const [recentLimit, setRecentLimit] = useState("5");

  // export quick filter
  const [exportSearch, setExportSearch] = useState("");

  const chartColors = useChartPalette(12);

  const { data, error, isLoading, mutate } = useSWR("/api/students", fetcher, {
    revalidateOnFocus: false,
  });

  const students = useMemo(() => (data?.data || []).map((s, i) => ({ ...s, _row: i })), [data]);

  const filteredByLevel = useMemo(
    () => students.filter((s) => isInLevel(s, levelFilter)),
    [students, levelFilter]
  );

  const sinceTs = useMemo(() => Date.now() - range * 24 * 60 * 60 * 1000, [range]);

  const filteredByRange = useMemo(() => {
    return filteredByLevel.filter((s) => new Date(s.created_at || 0).getTime() >= sinceTs);
  }, [filteredByLevel, sinceTs]);

  // sections list depends on level + grade (old behavior)
  const sectionsForLevelGrade = useMemo(() => {
    const set = new Set();
    for (const s of filteredByLevel) {
      const g = Number(s.grade_level);
      if (gradePick !== "ALL" && g !== Number(gradePick)) continue;
      set.add(getSection(s) || "—");
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [filteredByLevel, gradePick]);

  useEffect(() => {
    if (sectionPick !== "ALL" && !sectionsForLevelGrade.includes(sectionPick)) {
      setSectionPick("ALL");
    }
  }, [sectionsForLevelGrade, sectionPick]);

  // Courses bar dataset (level + grade + section)
  const coursesBarData = useMemo(() => {
    const counts = new Map();
    for (const s of filteredByLevel) {
      const g = Number(s.grade_level);
      if (gradePick !== "ALL" && g !== Number(gradePick)) continue;

      const sec = getSection(s) || "—";
      if (sectionPick !== "ALL" && sec !== sectionPick) continue;

      const c = normalizeCourse(s);
      counts.set(c, (counts.get(c) || 0) + 1);
    }

    const rows = Array.from(counts, ([course, count]) => ({ course, count }));
    rows.sort((a, b) => b.count - a.count || a.course.localeCompare(b.course));

    // keep chart readable: top 10 + Others
    const top = rows.slice(0, 10);
    const rest = rows.slice(10);
    if (rest.length) {
      top.push({ course: "Others", count: rest.reduce((t, x) => t + x.count, 0) });
    }
    return top;
  }, [filteredByLevel, gradePick, sectionPick]);

  // Pie dataset (level + grade; ignores section by design)
  const pieData = useMemo(() => {
    const map = new Map();
    for (const s of filteredByLevel) {
      const g = Number(s.grade_level);
      if (gradePick !== "ALL" && g !== Number(gradePick)) continue;
      const c = normalizeCourse(s);
      map.set(c, (map.get(c) || 0) + 1);
    }
    const arr = Array.from(map, ([name, value]) => ({ name, value })).sort(
      (a, b) => b.value - a.value
    );
    const top = arr.slice(0, 8);
    const others = arr.slice(8);
    if (others.length) top.push({ name: "Others", value: others.reduce((t, x) => t + x.value, 0) });
    return top;
  }, [filteredByLevel, gradePick]);

  // Notes / quick insights
  const notes = useMemo(() => {
    const base = filteredByLevel.filter(
      (s) => gradePick === "ALL" || Number(s.grade_level) === Number(gradePick)
    );

    const total = base.length;
    const courseMap = new Map();
    const gradeCounts = { 6: 0, 7: 0, 8: 0, 9: 0, 10: 0, 11: 0, 12: 0 };

    let undeclared = 0;
    let missingEmail = 0;
    let missingSection = 0;

    for (const s of base) {
      const g = Number(s.grade_level);
      if (!Number.isNaN(g) && gradeCounts[g] !== undefined) gradeCounts[g]++;

      const c = normalizeCourse(s);
      if (c === "Undeclared") undeclared++;
      courseMap.set(c, (courseMap.get(c) || 0) + 1);

      if ((getSection(s) || "") === "") missingSection++;
      if (!s.email) missingEmail++;
    }

    const courseArr = Array.from(courseMap, ([name, count]) => ({ name, count })).sort(
      (a, b) => b.count - a.count
    );

    const topCourse = courseArr[0] || { name: "—", count: 0 };
    const topShare = total ? Math.round((topCourse.count / total) * 100) : 0;

    return {
      total,
      topCourse,
      topShare,
      top5: courseArr.slice(0, 5),
      undeclared,
      undeclaredPct: total ? Math.round((undeclared / total) * 100) : 0,
      missingEmail,
      missingSection,
      gradeCounts,
    };
  }, [filteredByLevel, gradePick]);

  // Stats cards
  const stats = useMemo(() => {
    const total = filteredByLevel.length;
    const jhs = filteredByLevel.filter((s) => String(s.school_level) === "Junior High School").length;
    const shs = filteredByLevel.filter((s) => String(s.school_level) === "Senior High School").length;
    const newPeriod = filteredByRange.length;
    return { total, jhs, shs, newPeriod };
  }, [filteredByLevel, filteredByRange]);

  // Recent list
  const recentStudents = useMemo(() => {
    const sorted = [...filteredByLevel].sort(
      (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)
    );

    const q = recentSearch.trim().toLowerCase();
    const searched = q
      ? sorted.filter((s) => {
          const name = fullName(s).toLowerCase();
          const email = (s.email || "").toLowerCase();
          return name.includes(q) || email.includes(q);
        })
      : sorted;

    return searched.slice(0, Number(recentLimit || 5));
  }, [filteredByLevel, recentSearch, recentLimit]);

  /* ------------------------------- exports ------------------------------- */

  const contextRowsForExport = useMemo(() => {
    const q = exportSearch.trim().toLowerCase();
    let rows = filteredByLevel;

    if (gradePick !== "ALL") rows = rows.filter((s) => Number(s.grade_level) === Number(gradePick));
    if (sectionPick !== "ALL") rows = rows.filter((s) => (getSection(s) || "—") === sectionPick);

    if (q) {
      rows = rows.filter((s) => {
        const name = fullName(s).toLowerCase();
        const email = (s.email || "").toLowerCase();
        const section = (getSection(s) || "").toLowerCase();
        const course = normalizeCourse(s).toLowerCase();
        return name.includes(q) || email.includes(q) || section.includes(q) || course.includes(q);
      });
    }

    return rows;
  }, [filteredByLevel, gradePick, sectionPick, exportSearch]);

  const exportCsv = () => {
    const cols = [
      "supabase_id",
      "first_name",
      "middle_name",
      "last_name",
      "email",
      "gender",
      "grade_level",
      "section",
      "school_level",
      "course",
      "created_at",
    ];

    const rows = contextRowsForExport.map((s) =>
      cols
        .map((c) => {
          const val = c === "section" ? getSection(s) : s?.[c] ?? "";
          return `"${String(val).replace(/"/g, '""')}"`;
        })
        .join(",")
    );

    const csv = [cols.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;

    const g = gradePick === "ALL" ? "AllGrades" : `G${gradePick}`;
    const sec = sectionPick === "ALL" ? "AllSections" : sectionPick.replace(/\s+/g, "-");
    a.download = `students_${levelFilter}_${g}_${sec}.csv`;

    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPdf = async () => {
    try {
      const primaryRgb = getPrimaryRgbForPdf();

      const { jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;

      const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "A4" });

      const title = `Students — ${levelFilter === "ALL" ? "All Levels" : levelFilter}`;
      const contextBits = [
        gradePick !== "ALL" ? `Grade ${gradePick}` : "All Grades",
        sectionPick !== "ALL" ? `Section ${sectionPick}` : "All Sections",
        exportSearch.trim() ? `Query “${exportSearch.trim()}”` : "No query",
      ].join(" • ");

      doc.setFontSize(14);
      doc.text(title, 40, 36);
      doc.setFontSize(11);
      doc.text(contextBits, 40, 54);

      const head = [["ID", "Name", "Email", "Grade", "Section", "Level", "Course", "Created"]];
      const body = contextRowsForExport.map((s) => [
        s.supabase_id || "",
        fullName(s) || "",
        s.email || "",
        s.grade_level || "",
        getSection(s) || "",
        s.school_level || "",
        normalizeCourse(s),
        s.created_at ? new Date(s.created_at).toLocaleDateString() : "",
      ]);

      autoTable(doc, {
        startY: 70,
        head,
        body,
        styles: { fontSize: 9, cellPadding: 6 },
        headStyles: { fillColor: primaryRgb, halign: "left" },
        alternateRowStyles: { fillColor: [245, 247, 250] },
        didDrawPage: () => {
          const pageHeight = doc.internal.pageSize.getHeight();
          doc.setFontSize(9);
          doc.text(`Generated ${new Date().toLocaleString()}`, 40, pageHeight - 18);
        },
      });

      const g = gradePick === "ALL" ? "AllGrades" : `G${gradePick}`;
      const sec = sectionPick === "ALL" ? "AllSections" : sectionPick.replace(/\s+/g, "-");
      doc.save(`students_${levelFilter}_${g}_${sec}.pdf`);
    } catch (e) {
      console.error(e);
      // optional: toast
    }
  };

  /* ---------------------------------- UI ---------------------------------- */

  const levelLabel =
    levelFilter === "ALL" ? "All Levels" : levelFilter === "JHS" ? "Junior High" : "Senior High";

  const insights = useMemo(() => {
    const items = [];

    if (notes.topCourse?.name && notes.topCourse.name !== "—") {
      items.push(
        `Top course is “${notes.topCourse.name}” (${notes.topCourse.count} student${
          notes.topCourse.count === 1 ? "" : "s"
        }, ~${notes.topShare}% share).`
      );
    }

    if (notes.undeclaredPct >= 15) {
      items.push(
        `Undeclared course is high (${notes.undeclared} / ${notes.total} ≈ ${notes.undeclaredPct}%). Consider enforcing assessment result or required course selection.`
      );
    } else {
      items.push(`Undeclared course: ${notes.undeclared} (${notes.undeclaredPct}%).`);
    }

    if (notes.missingSection > 0) items.push(`Missing section label: ${notes.missingSection}.`);
    if (notes.missingEmail > 0) items.push(`Missing email: ${notes.missingEmail}.`);

    return items.slice(0, 5);
  }, [notes]);

  const hasContext =
    levelFilter !== "ALL" ||
    range !== 7 ||
    gradePick !== "ALL" ||
    sectionPick !== "ALL" ||
    exportSearch.trim();

  const clearContext = () => {
    setLevelFilter("ALL");
    setRange(7);
    setGradePick("ALL");
    setSectionPick("ALL");
    setExportSearch("");
    setRecentSearch("");
    setRecentLimit("5");
  };

  if (isLoading) {
    return (
      <Card className="rounded-4xl">
        <CardContent className="p-6 text-muted-foreground font-semibold">
          Loading dashboard…
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
          <Button variant="outline" className="rounded-2xl font-black" onClick={() => mutate()}>
            <RefreshCcw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      {/* ===== HERO ===== */}
      <section className="relative overflow-hidden rounded-4xl border bg-gradient-to-b from-background via-background to-background">
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
                Admin • Dashboard
              </div>

              <h1 className="text-4xl sm:text-5xl font-black tracking-tight leading-tight">
                Student{" "}
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent bg-[length:200%] animate-gradient-x">
                  Analytics
                </span>
              </h1>

              <p className="mt-4 text-muted-foreground text-lg font-semibold leading-relaxed">
                Overview, charts, and exports — designed for quick decisions.
              </p>

              {/* context chips */}
              <div className="mt-6 flex flex-wrap gap-2">
                <Chip icon={Filter} title="Level">
                  {levelLabel}
                </Chip>
                <Chip icon={Sparkles} title="New window">
                  New window: {range}d
                </Chip>
                {gradePick !== "ALL" ? (
                  <Chip icon={GraduationCap} title="Grade" onClear={() => setGradePick("ALL")}>
                    Grade {gradePick}
                  </Chip>
                ) : null}
                {sectionPick !== "ALL" ? (
                  <Chip icon={Users} title="Section" onClear={() => setSectionPick("ALL")}>
                    {sectionPick}
                  </Chip>
                ) : null}
                {exportSearch.trim() ? (
                  <Chip icon={Search} title="Export query" onClear={() => setExportSearch("")}>
                    {exportSearch.trim()}
                  </Chip>
                ) : null}

                {hasContext ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full font-black"
                    onClick={clearContext}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Clear all
                  </Button>
                ) : null}
              </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap justify-start lg:justify-end">
              <Button variant="outline" className="rounded-2xl font-black" onClick={() => mutate()}>
                <RefreshCcw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button variant="outline" className="rounded-2xl font-black" asChild>
                <Link href="/admin/students">
                  Students <ExternalLink className="h-4 w-4 ml-2" />
                </Link>
              </Button>
              <Button className="rounded-2xl font-black" asChild>
                <Link href="/admin/quizzes">
                  Assessment <ExternalLink className="h-4 w-4 ml-2" />
                </Link>
              </Button>
            </div>
          </div>

          <style>{`
            @keyframes gradientX { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
            .animate-gradient-x { animation: gradientX 6s ease infinite; }
          `}</style>

          {/* stats */}
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatTile
              label="Total Students"
              value={stats.total.toLocaleString()}
              icon={<Users className="h-5 w-5 text-primary" />}
            />
            <StatTile
              label="Junior High"
              value={stats.jhs.toLocaleString()}
              icon={<GraduationCap className="h-5 w-5 text-primary" />}
            />
            <StatTile
              label="Senior High"
              value={stats.shs.toLocaleString()}
              icon={<GraduationCap className="h-5 w-5 text-primary" />}
            />
            <StatTile
              label={`New (${range}d)`}
              value={stats.newPeriod.toLocaleString()}
              icon={<UserPlus className="h-5 w-5 text-primary" />}
            />
          </div>
        </div>
      </section>

      {/* ===== CONTROL BAR ===== */}
      <Card className="rounded-4xl sticky top-4 z-10 shadow-sm border-border">
        <CardContent className="p-5 space-y-4">
          <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-2 text-xs text-muted-foreground font-semibold">
                <Filter className="h-4 w-4" />
                Filters
              </span>

              <Segmented
                value={levelFilter}
                onChange={setLevelFilter}
                items={LEVELS}
                renderLabel={(v) => (v === "ALL" ? "All" : v === "JHS" ? "Junior" : "Senior")}
              />

              <Segmented value={range} onChange={setRange} items={RANGES} renderLabel={(v) => `${v}d`} />

              <div className="flex flex-wrap items-center gap-2">
                <Select value={gradePick} onValueChange={setGradePick}>
                  <SelectTrigger className="rounded-2xl font-black h-10 w-[170px]">
                    <SelectValue placeholder="All Grades" />
                  </SelectTrigger>
                  <SelectContent>
                    {GRADES.map((g) => (
                      <SelectItem key={g} value={g}>
                        {g === "ALL" ? "All Grades" : `Grade ${g}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={sectionPick} onValueChange={setSectionPick}>
                  <SelectTrigger className="rounded-2xl font-black h-10 w-[220px] max-w-[70vw]">
                    <SelectValue placeholder="All Sections" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Sections</SelectItem>
                    {sectionsForLevelGrade.map((sec) => (
                      <SelectItem key={sec} value={sec}>
                        {sec}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 justify-between xl:justify-end">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={exportSearch}
                  onChange={(e) => setExportSearch(e.target.value)}
                  placeholder="Export filter (name/email/section/course)…"
                  className="pl-9 w-[320px] max-w-[88vw] rounded-2xl font-semibold"
                />
              </div>

              <Button variant="outline" className="rounded-2xl font-black" onClick={exportCsv}>
                <Download className="h-4 w-4 mr-2" />
                CSV
              </Button>

              <Button className="rounded-2xl font-black" onClick={exportPdf}>
                <FileText className="h-4 w-4 mr-2" />
                PDF
              </Button>
            </div>
          </div>

          <div className="text-xs text-muted-foreground font-semibold">
            Exports respect: <span className="font-black text-foreground">Level</span> +{" "}
            <span className="font-black text-foreground">Grade</span> +{" "}
            <span className="font-black text-foreground">Section</span> +{" "}
            <span className="font-black text-foreground">Export query</span>.
          </div>
        </CardContent>
      </Card>

      {/* ===== CHARTS ===== */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Bar */}
        <Card className="rounded-4xl overflow-hidden border-border shadow-sm">
          <CardHeader className="relative border-b">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-violet-50 dark:from-blue-950/30 dark:via-indigo-950/25 dark:to-violet-950/30" />
            <div className="relative">
              <CardTitle className="text-base flex items-center gap-2 font-black">
                <BarChart3 className="h-4 w-4 text-primary" />
                Courses by Grade & Section
              </CardTitle>
              <CardDescription className="font-semibold">
                Based on <span className="font-black text-foreground">{levelLabel}</span>. Top 10 shown; remainder grouped
                as “Others”.
              </CardDescription>

              <div className="mt-3 flex flex-wrap gap-2">
                <Badge variant="secondary" className="rounded-full font-black">
                  {gradePick === "ALL" ? "All Grades" : `Grade ${gradePick}`}
                </Badge>
                <Badge variant="secondary" className="rounded-full font-black">
                  {sectionPick === "ALL" ? "All Sections" : sectionPick}
                </Badge>
                <Badge variant="outline" className="rounded-full font-black">
                  Items: {coursesBarData.reduce((t, x) => t + x.count, 0)}
                </Badge>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-6">
            {coursesBarData.length === 0 ? (
              <ChartEmpty
                title="No course distribution for this selection"
                desc="Try changing grade/section or switching to All."
              />
            ) : (
              <div className="h-[360px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={coursesBarData} margin={{ top: 8, right: 16, left: 0, bottom: 44 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis
                      dataKey="course"
                      tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                      interval={0}
                      angle={-18}
                      textAnchor="end"
                      height={66}
                    />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="count" name="Students" fill="hsl(var(--primary))" radius={[12, 12, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pie */}
        <Card className="rounded-4xl overflow-hidden border-border shadow-sm">
          <CardHeader className="relative border-b">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 dark:from-emerald-950/25 dark:via-teal-950/20 dark:to-cyan-950/25" />
            <div className="relative">
              <CardTitle className="text-base flex items-center gap-2 font-black">
                <PieIcon className="h-4 w-4 text-primary" />
                In-Demand Courses
              </CardTitle>
              <CardDescription className="font-semibold">
                Top courses by count. “Others” groups the remainder.
              </CardDescription>

              <div className="mt-3 flex flex-wrap gap-2">
                <Badge variant="secondary" className="rounded-full font-black">
                  {gradePick === "ALL" ? "All Grades" : `Grade ${gradePick}`}
                </Badge>
                <Badge variant="outline" className="rounded-full font-black">
                  Total: {notes.total.toLocaleString()}
                </Badge>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-6 space-y-4">
            {pieData.length === 0 ? (
              <ChartEmpty title="No pie chart data" desc="Try changing grade or level filters." />
            ) : (
              <>
                <div className="h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={58}
                        outerRadius={98}
                        paddingAngle={2}
                        strokeWidth={0}
                      >
                        {pieData.map((_, i) => (
                          <Cell key={i} fill={chartColors[i % chartColors.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <Separator />

                <div className="space-y-2">
                  {pieData.map((d, i) => (
                    <div key={d.name} className="flex items-center gap-2 text-sm">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: chartColors[i % chartColors.length] }}
                      />
                      <span className="text-muted-foreground truncate font-semibold">{d.name}</span>
                      <span className="ml-auto font-black">{d.value.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ===== RECENT + INSIGHTS ===== */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Recent students */}
        <Card className="rounded-4xl overflow-hidden border-border shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base font-black">Recent Students</CardTitle>
                <CardDescription className="font-semibold">
                  Newest registrations (within current level filter).
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" className="rounded-2xl font-black" asChild>
                <Link href="/admin/students">View all</Link>
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-6 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={recentSearch}
                  onChange={(e) => setRecentSearch(e.target.value)}
                  placeholder="Search recent…"
                  className="pl-9 rounded-2xl font-semibold"
                />
              </div>

              <Select value={recentLimit} onValueChange={setRecentLimit}>
                <SelectTrigger className="w-[150px] rounded-2xl font-black h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">Top 5</SelectItem>
                  <SelectItem value="10">Top 10</SelectItem>
                  <SelectItem value="20">Top 20</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {recentStudents.length === 0 ? (
              <div className="rounded-3xl border bg-muted/20 p-8 text-center text-muted-foreground font-semibold">
                No recent students.
              </div>
            ) : (
              <div className="space-y-2">
                {recentStudents.map((s) => {
                  const name = fullName(s);
                  return (
                    <div
                      key={s.supabase_id || s._row}
                      className="flex items-center gap-3 rounded-3xl border bg-background p-3 hover:bg-primary/5 transition-colors"
                    >
                      <Avatar className="h-10 w-10 ring-4 ring-primary/5">
                        <AvatarImage src={s.profile_picture || s.avatar || ""} alt={name} />
                        <AvatarFallback className="font-black">{initialsFrom(name)}</AvatarFallback>
                      </Avatar>

                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-black truncate">{name}</p>
                        <p className="text-xs text-muted-foreground truncate font-semibold">
                          {s.email || "—"} • {timeAgo(s.created_at)}
                        </p>
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        <Badge variant="secondary" className="rounded-full font-black max-w-[180px] truncate">
                          {normalizeCourse(s)}
                        </Badge>
                        <span className="text-xs text-muted-foreground font-semibold">
                          {s.grade_level ? `G${s.grade_level}` : "—"} • {getSection(s) || "No section"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Insights */}
        <Card className="rounded-4xl overflow-hidden border-border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-black">
              Notes & Quick Insights — {levelLabel}
              {gradePick !== "ALL" ? `, Grade ${gradePick}` : ""}
            </CardTitle>
            <CardDescription className="font-semibold">Fast health checks based on your filters.</CardDescription>
          </CardHeader>

          <CardContent className="p-6 space-y-5">
            <div className="rounded-4xl border bg-primary/5 p-5">
              <p className="text-sm font-black">
                Top course: <span className="text-primary">{notes.topCourse.name}</span>
              </p>
              <p className="mt-1 text-sm text-muted-foreground font-semibold">
                {notes.topCourse.count} student{notes.topCourse.count === 1 ? "" : "s"} • {notes.topShare}% share
              </p>
            </div>

            <div>
              <p className="text-xs text-muted-foreground font-black mb-2">Top 5 courses</p>

              <div className="space-y-3">
                {notes.top5.length === 0 ? (
                  <p className="text-sm text-muted-foreground font-semibold">No course data yet.</p>
                ) : (
                  notes.top5.map((c) => {
                    const pct = notes.total ? Math.round((c.count / notes.total) * 100) : 0;
                    return (
                      <div key={c.name}>
                        <div className="flex justify-between text-sm">
                          <span className="font-black truncate">{c.name}</span>
                          <span className="text-muted-foreground font-semibold">
                            {c.count} ({pct}%)
                          </span>
                        </div>
                        <div className="mt-2 h-2.5 rounded-full bg-muted overflow-hidden">
                          <div className="h-2.5 rounded-full bg-primary" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              {insights.map((t, i) => (
                <div key={i} className="flex gap-2 text-sm">
                  <span className="mt-0.5 h-6 w-6 rounded-full bg-muted grid place-items-center shrink-0">
                    <span className="text-xs font-black">{i + 1}</span>
                  </span>
                  <p className="text-muted-foreground leading-relaxed font-semibold">{t}</p>
                </div>
              ))}
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-3xl border p-4">
                <p className="text-xs text-muted-foreground font-black">Undeclared</p>
                <p className="mt-1 font-black">
                  {notes.undeclared}{" "}
                  <span className="text-muted-foreground font-semibold">({notes.undeclaredPct}%)</span>
                </p>
              </div>
              <div className="rounded-3xl border p-4">
                <p className="text-xs text-muted-foreground font-black">Missing Email</p>
                <p className="mt-1 font-black">{notes.missingEmail}</p>
              </div>

              <div className="rounded-3xl border p-4 col-span-2">
                <p className="text-xs text-muted-foreground font-black mb-2">Grade coverage</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(notes.gradeCounts).map(([g, n]) => (
                    <Badge key={g} variant="outline" className="rounded-full font-black">
                      G{g}: {n}
                    </Badge>
                  ))}
                </div>
              </div>

              {notes.missingSection > 0 ? (
                <div className="rounded-3xl border border-amber-200 bg-amber-50/60 p-4 col-span-2">
                  <p className="text-xs text-amber-900 font-black">Attention</p>
                  <p className="mt-1 text-sm text-amber-900 font-semibold">
                    {notes.missingSection} student{notes.missingSection === 1 ? "" : "s"} missing section label.
                  </p>
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
