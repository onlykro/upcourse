// @components/subjects/subject-card.jsx
"use client";

import {
  MoreHorizontal,
  Eye,
  Pencil,
  Trash2,
  BookOpen,
  Calendar,
  Hash,
  Tags,
  Layers,
  Sparkles,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/* ------------------------------ utils ------------------------------ */

const toStr = (v) => String(v ?? "").trim();

const safeDate = (d1, d2) => {
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

const statusUI = (status) => {
  const v = String(status || "Active").toLowerCase();
  if (v === "active")
    return {
      dot: "bg-emerald-500",
      ring: "ring-emerald-500/20",
      pill: "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-200 dark:border-emerald-500/20",
      label: "Active",
    };
  if (v === "inactive")
    return {
      dot: "bg-zinc-400",
      ring: "ring-zinc-500/15",
      pill: "bg-zinc-50 text-zinc-800 border-zinc-200 dark:bg-zinc-500/10 dark:text-zinc-200 dark:border-zinc-500/20",
      label: "Inactive",
    };
  return {
    dot: "bg-amber-500",
    ring: "ring-amber-500/20",
    pill: "bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-500/10 dark:text-amber-emerald-200 dark:border-amber-500/20",
    label: status || "Pending",
  };
};

/**
 * 🎨 Category-driven theme
 */
const categoryTheme = (catRaw = "") => {
  const c = toStr(catRaw);
  const v = c.toLowerCase();

  const isArts =
    v.includes("arts") || v.includes("humanit") || v.includes("social");
  const isBusiness = v.includes("business") || v.includes("entrepreneur");
  const isStem =
    v.includes("science") ||
    v.includes("technology") ||
    v.includes("engineering") ||
    v.includes("mathematics") ||
    v.includes("stem");
  const isSports =
    v.includes("sports") || v.includes("health") || v.includes("wellness");

  const isCore = v === "core" || v.includes(" core");
  const isSpecialized = v.includes("special");
  const isElective = v.includes("elective");

  const base = {
    key: "neutral",
    ribbon:
      "from-zinc-400 via-zinc-300 to-zinc-200 dark:from-zinc-500 dark:via-zinc-400 dark:to-zinc-300",
    iconBg: "bg-zinc-500/10",
    iconText: "text-zinc-700 dark:text-zinc-200",
    hoverBorder: "hover:border-zinc-400/35",
    auraA: "from-zinc-500/10 via-transparent to-transparent",
    auraB: "from-zinc-400/10 via-transparent to-transparent",
    chip: "bg-zinc-50 text-zinc-900 border-zinc-200 dark:bg-zinc-500/10 dark:text-zinc-200 dark:border-zinc-500/20",
  };

  if (isArts)
    return {
      key: "arts",
      ribbon: "from-fuchsia-500 via-violet-500 to-cyan-400",
      iconBg: "bg-fuchsia-500/10",
      iconText: "text-fuchsia-600 dark:text-fuchsia-300",
      hoverBorder: "hover:border-fuchsia-500/35",
      auraA: "from-fuchsia-500/12 via-transparent to-transparent",
      auraB: "from-cyan-500/10 via-transparent to-transparent",
      chip: "bg-fuchsia-50 text-fuchsia-900 border-fuchsia-200 dark:bg-fuchsia-500/10 dark:text-fuchsia-200 dark:border-fuchsia-500/20",
    };

  if (isBusiness)
    return {
      key: "business",
      ribbon: "from-amber-500 via-orange-500 to-rose-400",
      iconBg: "bg-amber-500/10",
      iconText: "text-amber-700 dark:text-amber-200",
      hoverBorder: "hover:border-amber-500/35",
      auraA: "from-amber-500/12 via-transparent to-transparent",
      auraB: "from-rose-500/10 via-transparent to-transparent",
      chip: "bg-amber-50 text-amber-950 border-amber-200 dark:bg-amber-500/10 dark:text-amber-200 dark:border-amber-500/20",
    };

  if (isStem)
    return {
      key: "stem",
      ribbon: "from-sky-500 via-indigo-500 to-violet-500",
      iconBg: "bg-sky-500/10",
      iconText: "text-sky-700 dark:text-sky-200",
      hoverBorder: "hover:border-sky-500/35",
      auraA: "from-sky-500/12 via-transparent to-transparent",
      auraB: "from-indigo-500/10 via-transparent to-transparent",
      chip: "bg-sky-50 text-sky-950 border-sky-200 dark:bg-sky-500/10 dark:text-sky-200 dark:border-sky-500/20",
    };

  if (isSports)
    return {
      key: "sports",
      ribbon: "from-emerald-500 via-teal-500 to-cyan-400",
      iconBg: "bg-emerald-500/10",
      iconText: "text-emerald-700 dark:text-emerald-200",
      hoverBorder: "hover:border-emerald-500/35",
      auraA: "from-emerald-500/12 via-transparent to-transparent",
      auraB: "from-teal-500/10 via-transparent to-transparent",
      chip: "bg-emerald-50 text-emerald-950 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-200 dark:border-emerald-500/20",
    };

  if (isCore)
    return {
      key: "core",
      ribbon: "from-blue-500 via-indigo-500 to-cyan-400",
      iconBg: "bg-blue-500/10",
      iconText: "text-blue-700 dark:text-blue-200",
      hoverBorder: "hover:border-blue-500/35",
      auraA: "from-blue-500/12 via-transparent to-transparent",
      auraB: "from-cyan-500/10 via-transparent to-transparent",
      chip: "bg-blue-50 text-blue-950 border-blue-200 dark:bg-blue-500/10 dark:text-blue-200 dark:border-blue-500/20",
    };

  if (isSpecialized)
    return {
      key: "specialized",
      ribbon: "from-violet-500 via-fuchsia-500 to-rose-400",
      iconBg: "bg-violet-500/10",
      iconText: "text-violet-700 dark:text-violet-200",
      hoverBorder: "hover:border-violet-500/35",
      auraA: "from-violet-500/12 via-transparent to-transparent",
      auraB: "from-rose-500/10 via-transparent to-transparent",
      chip: "bg-violet-50 text-violet-950 border-violet-200 dark:bg-violet-500/10 dark:text-violet-200 dark:border-violet-500/20",
    };

  if (isElective)
    return {
      key: "elective",
      ribbon: "from-sky-500 via-cyan-500 to-emerald-400",
      iconBg: "bg-cyan-500/10",
      iconText: "text-cyan-700 dark:text-cyan-200",
      hoverBorder: "hover:border-cyan-500/35",
      auraA: "from-cyan-500/12 via-transparent to-transparent",
      auraB: "from-emerald-500/10 via-transparent to-transparent",
      chip: "bg-cyan-50 text-cyan-950 border-cyan-200 dark:bg-cyan-500/10 dark:text-cyan-200 dark:border-cyan-500/20",
    };

  return { ...base, key: "neutral" };
};

function Chip({ icon: Icon, children, className, title }) {
  return (
    <span
      title={title}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5",
        "text-[11px] sm:text-xs font-black",
        "bg-card/70 backdrop-blur shadow-sm",
        "transition-colors",
        className
      )}
    >
      {Icon ? <Icon className="h-3.5 w-3.5 text-muted-foreground" /> : null}
      <span className="truncate max-w-[220px]">{children}</span>
    </span>
  );
}

/**
 * ✅ UPDATED: subject now links to tracks by `track_id`
 * Common shapes supported:
 * - subject.tracks (from Supabase select: "tracks:track_id (...)")
 * - subject.track (custom join)
 * - subject.__track (your older adapter)
 */
const trackLabelFrom = (subject) => {
  const t = subject?.tracks || subject?.track || subject?.__track || null;
  if (t) {
    const id = toStr(t.track_id ?? t.code ?? t.id);
    const name = toStr(t.track_name ?? t.name);
    if (id && name) return `${id} — ${name}`;
    if (name) return name;
    if (id) return id;
  }

  const id = toStr(subject?.track_id);
  return id ? id : "—";
};

/* ------------------------------ component ------------------------------ */

export default function SubjectCard({
  subject,
  onView,
  onEdit,
  onDelete,
  className,
  compact = false,
  clickable = true,
}) {
  const code = toStr(subject?.subject_id || subject?.id) || "—";
  const name = toStr(subject?.subject_name) || "Untitled Subject";

  const trackLabel = trackLabelFrom(subject);

  const categoryGroup = toStr(subject?.subject_category) || "—";
  const categorySub = toStr(
    subject?.subject_elective || subject?.elective_name || subject?.elective
  );

  const status = toStr(subject?.subject_status) || "Active";
  const desc = toStr(subject?.subject_description ?? subject?.description);
  const updated = safeDate(subject?.updated_at, subject?.created_at);

  const sUI = statusUI(status);
  const theme = categoryTheme(categoryGroup);

  const categoryDisplay =
    categoryGroup.toLowerCase().includes("elective") && categorySub
      ? `${categoryGroup}: ${categorySub}`
      : categoryGroup || "—";

  const handleOpen = (e) => {
    if (!clickable) return;
    const el = e?.target;
    if (el && el.closest?.('[data-no-card-click="true"]')) return;
    onView?.(subject);
  };

  const handleKey = (e) => {
    if (!clickable) return;
    if (e.key === "Enter" || e.key === " ") {
      const el = e?.target;
      if (el && el.closest?.('[data-no-card-click="true"]')) return;
      e.preventDefault();
      onView?.(subject);
    }
  };

  const stop = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <Card
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={handleOpen}
      onKeyDown={handleKey}
      className={cn(
        "h-full",
        "group relative overflow-hidden text-left",
        "rounded-4xl border border-border bg-card shadow-sm",
        "transition-all duration-200",
        "hover:-translate-y-1 hover:shadow-2xl",
        theme.hoverBorder,
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
        "active:translate-y-0",
        clickable && "cursor-pointer",
        className
      )}
    >
      {/* Ambient background */}
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0",
          "opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        )}
      >
        <div
          className={cn(
            "absolute -left-36 -top-36 h-[420px] w-[420px] rounded-full blur-3xl",
            "bg-gradient-to-tr",
            theme.auraA
          )}
        />
        <div
          className={cn(
            "absolute -right-40 -bottom-40 h-[420px] w-[420px] rounded-full blur-3xl",
            "bg-gradient-to-tr",
            theme.auraB
          )}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-white/0 via-white/0 to-black/5 dark:to-white/5" />
      </div>

      {/* Top ribbon */}
      <div
        className={cn(
          "relative h-1.5 w-full opacity-90",
          "bg-gradient-to-r",
          theme.ribbon
        )}
      />

      <CardContent
        className={cn(
          "relative p-5 sm:p-6 flex flex-col",
          compact ? "gap-3" : "gap-4"
        )}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-start gap-3">
              {/* Icon tile */}
              <div
                className={cn(
                  "mt-0.5 h-11 w-11 shrink-0 rounded-2xl border",
                  "shadow-sm grid place-items-center ring-1",
                  sUI.ring,
                  theme.iconBg,
                  "transition-transform duration-200",
                  "group-hover:scale-[1.02]"
                )}
              >
                <BookOpen className={cn("h-5 w-5", theme.iconText)} />
              </div>

              <div className="min-w-0 flex-1">
                {/* title + code */}
                <div className="flex flex-wrap items-start gap-2">
                  <h3 className="min-w-0 text-base sm:text-[17px] font-black tracking-tight leading-snug truncate">
                    {name}
                  </h3>

                  <Badge
                    variant="secondary"
                    className={cn(
                      "rounded-full border font-black",
                      "bg-card/70 backdrop-blur shadow-sm",
                      "shrink-0"
                    )}
                    title="Subject Code"
                  >
                    <Hash className="mr-1.5 h-3.5 w-3.5" />
                    <span className="font-mono text-[11px]">{code}</span>
                  </Badge>
                </div>

                {/* chips row */}
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Chip icon={Layers} title={trackLabel}>
                    {trackLabel}
                  </Chip>

                  {/* Category */}
                  <span
                    className={cn(
                      "inline-flex items-center gap-2 rounded-full border px-3 py-1.5",
                      "text-[11px] sm:text-xs font-black",
                      "bg-card/70 backdrop-blur shadow-sm",
                      theme.chip
                    )}
                    title={categoryDisplay}
                  >
                    <Tags className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="truncate max-w-[220px]">
                      {categoryDisplay}
                    </span>
                  </span>

                  {/* status */}
                  <span
                    className={cn(
                      "inline-flex items-center gap-2 rounded-full border px-3 py-1.5",
                      "text-xs font-black",
                      "bg-card/70 backdrop-blur shadow-sm",
                      sUI.pill
                    )}
                    title={status}
                  >
                    <span className={cn("h-2 w-2 rounded-full", sUI.dot)} />
                    {sUI.label}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div data-no-card-click="true" className="shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "rounded-2xl",
                    "opacity-100 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100 transition",
                    "hover:bg-muted/60"
                  )}
                  aria-label={`Actions for ${name}`}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent
                align="end"
                onClick={(e) => e.stopPropagation()}
              >
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={(e) => {
                    e.preventDefault();
                    onView?.(subject);
                  }}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  View
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={(e) => {
                    e.preventDefault();
                    onEdit?.(subject);
                  }}
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onSelect={(e) => {
                    e.preventDefault();
                    onDelete?.(subject);
                  }}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Description */}
        {!compact ? (
          <div className="rounded-3xl border bg-muted/20 p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-black text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5" />
                Overview
              </div>

              <span className="text-[11px] font-semibold text-muted-foreground/80">
                Click card to view
              </span>
            </div>

            <p className="mt-2 text-sm text-muted-foreground leading-relaxed line-clamp-3 font-semibold">
              {desc ? desc : "No description provided."}
            </p>
          </div>
        ) : null}

        {/* Footer */}
        <div className="mt-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-2xl border bg-card/70 backdrop-blur shadow-sm">
              <Calendar className="h-3.5 w-3.5" />
            </span>
            Updated: <span className="text-foreground/80 font-black">{updated}</span>
          </div>

          <div data-no-card-click="true" className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="rounded-2xl font-black"
              onClick={(e) => {
                stop(e);
                onEdit?.(subject);
              }}
            >
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </Button>

            <Button
              size="sm"
              className="rounded-2xl font-black"
              onClick={(e) => {
                stop(e);
                onView?.(subject);
              }}
            >
              <Eye className="mr-2 h-4 w-4" />
              View
            </Button>
          </div>
        </div>
      </CardContent>

      {/* soft bottom fade */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-background/30 to-transparent"
      />
    </Card>
  );
}
