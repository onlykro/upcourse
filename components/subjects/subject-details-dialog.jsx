// @components/subjects/subject-details-dialog.jsx
"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
    ClipboardList,
    FileText,
    Search,
    ExternalLink,
    Copy,
    Pencil,
    Calendar,
    Hash,
    Layers,
    Tags,
    ChevronRight,
    Sparkles,
    AlertCircle,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { fetchQuizzes } from "@/lib/quizzes";
import { fetchResources } from "@/lib/resources";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

/* -------------------------------- utils -------------------------------- */

const formatDate = (d) => {
    if (!d) return "—";
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) return "—";
    return new Intl.DateTimeFormat(undefined, {
        year: "numeric",
        month: "short",
        day: "2-digit",
    }).format(dt);
};

const clamp = (s, n = 220) => {
    const t = String(s || "");
    return t.length > n ? `${t.slice(0, n)}…` : t;
};

const resourceUrl = (r) => String(r?._url || r?.file_url || "").trim();

const canPreviewInline = (url) => {
    const u = String(url || "");
    return u.startsWith("http://") || u.startsWith("https://");
};

const statusUI = (status) => {
    const v = String(status || "Active").toLowerCase();
    if (v === "active") {
        return {
        dot: "bg-emerald-500",
        badge: "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-200 dark:border-emerald-500/20",
        };
    }
    if (v === "inactive") {
        return {
        dot: "bg-zinc-400",
        badge: "bg-zinc-50 text-zinc-800 border-zinc-200 dark:bg-zinc-500/10 dark:text-zinc-200 dark:border-zinc-500/20",
        };
    }
    return {
        dot: "bg-amber-500",
        badge: "bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-500/10 dark:text-amber-200 dark:border-amber-500/20",
    };
};

const trackLabelFrom = (subject) => {
    const t = subject?.tracks || subject?.track || subject?.__track || null;
    if (t) {
        const id = String(t.track_id ?? t.code ?? t.id ?? "").trim();
        const name = String(t.track_name ?? t.name ?? "").trim();
        if (id && name) return `${id} — ${name}`;
        if (name) return name;
        if (id) return id;
    }
    const id = String(subject?.track_id || "").trim();
    return id ? id : "—";
};

const categoryDisplayFrom = (subject) => {
    const group = String(subject?.subject_category || "").trim();
    const sub = String(
        subject?.subject_elective || subject?.elective_name || ""
    ).trim();
    if (!group && !sub) return "—";
    if (group.toLowerCase().includes("elective") && sub) return `${group}: ${sub}`;
    return group || sub || "—";
};

/* ------------------------------ ui bits ------------------------------ */

function Pill({ icon: Icon, children, className, title }) {
    return (
        <Badge
        variant="secondary"
        title={title}
        className={cn(
            "gap-1.5 rounded-full border bg-card/70 backdrop-blur px-3 py-1.5 text-[11px] font-black",
            className
        )}
        >
        {Icon ? <Icon className="h-3.5 w-3.5 text-muted-foreground" /> : null}
        <span className="truncate">{children}</span>
        </Badge>
    );
}

function Kpi({ icon: Icon, label, value, hint }) {
    return (
        <motion.div
        whileHover={{ y: -3, scale: 1.01 }}
        className="rounded-4xl bg-card border border-border shadow-sm p-5 transition"
        >
        <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
            <div className="text-sm text-muted-foreground font-semibold">
                {label}
            </div>
            <div className="mt-2 text-3xl font-black tracking-tight leading-none">
                {value}
            </div>
            {hint ? (
                <div className="mt-1 text-xs text-muted-foreground font-semibold line-clamp-1">
                {hint}
                </div>
            ) : null}
            </div>
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Icon className="h-5 w-5 text-primary" />
            </div>
        </div>
        </motion.div>
    );
}

function EmptyState({ icon: Icon, title, description, action }) {
    return (
        <div className="rounded-4xl bg-card border border-border shadow-sm p-10 text-center">
        <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 border border-border">
            <Icon className="h-5 w-5 text-primary" />
        </div>
        <div className="text-base font-black">{title}</div>
        <div className="mt-2 text-sm text-muted-foreground font-semibold">
            {description}
        </div>
        {action ? <div className="mt-5">{action}</div> : null}
        </div>
    );
}

function LoadingGrid({ count = 6, itemHeight = 150 }) {
    return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: count }).map((_, i) => (
            <div
            key={i}
            className="rounded-4xl bg-card border border-border shadow-sm p-5"
            style={{ minHeight: itemHeight }}
            >
            <div className="h-4 w-2/3 rounded bg-muted animate-pulse" />
            <div className="mt-3 h-3 w-full rounded bg-muted animate-pulse" />
            <div className="mt-2 h-3 w-5/6 rounded bg-muted animate-pulse" />
            <div className="mt-6 flex gap-2">
                <div className="h-9 w-24 rounded-2xl bg-muted animate-pulse" />
                <div className="h-9 w-28 rounded-2xl bg-muted animate-pulse" />
            </div>
            </div>
        ))}
        </div>
    );
}

function Toolbar({ query, onQuery, sort, onSort, placeholder }) {
    return (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-12 md:items-center">
        <div className="md:col-span-8 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder={placeholder}
            className="pl-9 rounded-2xl font-semibold"
            />
            {query ? (
            <button
                type="button"
                onClick={() => onQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Clear"
                title="Clear"
            >
                <span className="text-xs font-black">Clear</span>
            </button>
            ) : null}
        </div>

        <div className="md:col-span-4">
            <Select value={sort} onValueChange={onSort}>
            <SelectTrigger className="rounded-2xl font-black">
                <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="oldest">Oldest</SelectItem>
                <SelectItem value="a-z">Title A–Z</SelectItem>
            </SelectContent>
            </Select>
        </div>
        </div>
    );
}

/* ------------------------------ cards ------------------------------ */

function QuizCard({ quiz, onOpen }) {
    const id = quiz?.quiz_id || quiz?.id;
    return (
        <button
        type="button"
        onClick={() => onOpen?.(id)}
        className={cn(
            "group text-left rounded-4xl bg-card border border-border shadow-sm p-5 transition-all",
            "hover:-translate-y-1 hover:shadow-xl hover:border-primary/40",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
        )}
        >
        <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
            <div className="text-base font-black leading-snug line-clamp-2">
                {quiz?.quiz_title || "Untitled Quiz"}
            </div>
            <div className="mt-2 text-sm text-muted-foreground font-semibold line-clamp-2">
                {quiz?.quiz_description || "No description."}
            </div>
            </div>

            <div className="shrink-0 text-xs text-muted-foreground font-semibold whitespace-nowrap">
            {formatDate(quiz?.updated_at || quiz?.created_at)}
            </div>
        </div>

        <div className="mt-5 inline-flex items-center gap-2 text-sm font-black text-primary">
            Open
            <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </div>
        </button>
    );
}

function ResourceCard({ resource, onPreview }) {
    const url = resourceUrl(resource);
    const hasUrl = Boolean(url);

    return (
        <div
        className={cn(
            "rounded-4xl bg-card border border-border shadow-sm p-5 transition-all",
            "hover:shadow-xl hover:border-primary/40"
        )}
        >
        <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
            <div className="text-base font-black leading-snug line-clamp-2">
                {resource?.resource_title || "Untitled Resource"}
            </div>
            <div className="mt-2 text-sm text-muted-foreground font-semibold line-clamp-2">
                {resource?.resource_description || "No description."}
            </div>
            </div>

            <div className="shrink-0 text-xs text-muted-foreground font-semibold whitespace-nowrap">
            {formatDate(resource?.updated_at || resource?.created_at)}
            </div>
        </div>

        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <Button
            type="button"
            size="sm"
            variant="outline"
            className="w-full sm:w-auto rounded-2xl font-black"
            onClick={() => onPreview?.(resource)}
            disabled={!hasUrl}
            >
            Preview
            </Button>

            <Button
            type="button"
            size="sm"
            className="w-full sm:w-auto rounded-2xl font-black"
            disabled={!hasUrl}
            onClick={() => window.open(url, "_blank", "noopener,noreferrer")}
            >
            Open <ExternalLink className="ml-2 h-4 w-4" />
            </Button>
        </div>

        {!hasUrl ? (
            <div className="mt-3 text-xs text-muted-foreground font-semibold">
            No file attached.
            </div>
        ) : null}
        </div>
    );
}

/* ------------------------------ component ------------------------------ */

export default function SubjectDetailsDialog({
    open,
    onOpenChange,
    subject,
    onEdit,
    }) {
    const router = useRouter();

    const subjectId = String(subject?.subject_id || subject?.id || "").trim();
    const subjectName = subject?.subject_name || "Untitled Subject";

    const [tab, setTab] = useState("overview");

    const [quizQ, setQuizQ] = useState("");
    const [quizSort, setQuizSort] = useState("newest");

    const [resQ, setResQ] = useState("");
    const [resSort, setResSort] = useState("newest");

    const [preview, setPreview] = useState(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (!open) return;
        setTab("overview");
        setQuizQ("");
        setQuizSort("newest");
        setResQ("");
        setResSort("newest");
        setPreview(null);
        setCopied(false);
    }, [open, subjectId]);

    const { data: quizzesRaw = [], isLoading: loadingQuizzes } = useSWR(
        open && subjectId ? ["quizzes-by-subject", subjectId] : null,
        () => fetchQuizzes({ subject_id: subjectId, limit: 500 }),
        { revalidateOnFocus: false }
    );

    const { data: resourcesRaw = [], isLoading: loadingResources } = useSWR(
        open && subjectId ? ["resources-by-subject", subjectId] : null,
        () => fetchResources({ subject_id: subjectId, limit: 500 }),
        { revalidateOnFocus: false }
    );

    const quizzes = useMemo(() => {
        const q = quizQ.trim().toLowerCase();
        let list = Array.isArray(quizzesRaw) ? [...quizzesRaw] : [];

        if (q) {
        list = list.filter((x) => {
            const hay = `${x.quiz_title || ""} ${x.quiz_description || ""} ${
            x.quiz_id || ""
            }`.toLowerCase();
            return hay.includes(q);
        });
        }

        switch (quizSort) {
        case "a-z":
            list.sort((a, b) =>
            String(a.quiz_title || "").localeCompare(String(b.quiz_title || ""))
            );
            break;
        case "oldest":
            list.sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));
            break;
        default:
            list.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
        }

        return list;
    }, [quizzesRaw, quizQ, quizSort]);

    const resources = useMemo(() => {
        const q = resQ.trim().toLowerCase();
        let list = Array.isArray(resourcesRaw) ? [...resourcesRaw] : [];

        if (q) {
        list = list.filter((x) => {
            const hay = `${x.resource_title || ""} ${x.resource_description || ""} ${
            x.resource_id || ""
            }`.toLowerCase();
            return hay.includes(q);
        });
        }

        switch (resSort) {
        case "a-z":
            list.sort((a, b) =>
            String(a.resource_title || "").localeCompare(String(b.resource_title || ""))
            );
            break;
        case "oldest":
            list.sort(
            (a, b) =>
                new Date(a.created_at || a.updated_at || 0) -
                new Date(b.created_at || b.updated_at || 0)
            );
            break;
        default:
            list.sort(
            (a, b) =>
                new Date(b.created_at || b.updated_at || 0) -
                new Date(a.created_at || a.updated_at || 0)
            );
        }

        return list;
    }, [resourcesRaw, resQ, resSort]);

    const quizzesCount = Array.isArray(quizzesRaw) ? quizzesRaw.length : 0;
    const resourcesCount = Array.isArray(resourcesRaw) ? resourcesRaw.length : 0;

    const sUI = statusUI(subject?.subject_status);

    const copyId = async () => {
        try {
        await navigator.clipboard.writeText(subjectId || "");
        setCopied(true);
        window.clearTimeout(copyId._t);
        copyId._t = window.setTimeout(() => setCopied(false), 1400);
        } catch {}
    };

    const openQuiz = (quizId) => router.push(`/admin/quizzes/${quizId}`);

    if (!subject) return null;

    const headerKey = `${subjectId || ""}-${subjectName || ""}`;
    const trackLabel = trackLabelFrom(subject);
    const categoryDisplay = categoryDisplayFrom(subject);

    return (
        <>
        <Dialog
            open={open}
            onOpenChange={(v) => {
            if (!v) setPreview(null);
            onOpenChange?.(v);
            }}
        >
            <DialogContent size="xl" showCloseButton={false} className="p-0 overflow-hidden">
            {/* ================= HEADER ================= */}
            <div className="relative overflow-hidden border-b">
                <motion.div
                aria-hidden
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8 }}
                className="pointer-events-none absolute -left-44 -top-32 w-[520px] h-[520px] rounded-full bg-gradient-to-tr from-primary/30 to-secondary/30 blur-3xl mix-blend-screen"
                />
                <motion.div
                aria-hidden
                className="pointer-events-none absolute -right-32 bottom-[-40px] w-80 h-80 rounded-full bg-gradient-to-br from-accent/20 to-primary/10 blur-3xl mix-blend-screen"
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1.05, opacity: 1 }}
                transition={{
                    duration: 1.2,
                    repeat: Infinity,
                    repeatType: "mirror",
                    ease: "easeInOut",
                }}
                />

                <div className="relative p-6 sm:p-8">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-black">
                        <Sparkles className="h-4 w-4" />
                        Subject Details
                    </div>

                    <AnimatePresence mode="popLayout">
                        <motion.div
                        key={headerKey}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                        className="mt-4"
                        >
                        <DialogTitle className="text-3xl sm:text-4xl font-black tracking-tight leading-tight truncate">
                            {subjectName}
                        </DialogTitle>

                        <DialogDescription className="mt-3 flex flex-wrap items-center gap-2">
                            <Pill icon={Hash} title={subjectId}>
                            {subjectId || "—"}
                            </Pill>

                            <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={copyId}
                            className="h-9 rounded-full bg-card/70 backdrop-blur font-black"
                            title="Copy Subject Code"
                            >
                            <Copy className="mr-2 h-4 w-4" />
                            {copied ? "Copied" : "Copy"}
                            </Button>

                            <Pill icon={Layers} title={trackLabel}>
                            {trackLabel}
                            </Pill>

                            <Pill icon={Tags} title={categoryDisplay}>
                            {categoryDisplay}
                            </Pill>

                            <Badge
                            className={cn(
                                "rounded-full border px-3 py-1.5 text-[11px] font-black bg-card/70 backdrop-blur",
                                sUI.badge
                            )}
                            >
                            <span
                                className={cn(
                                "mr-2 inline-block h-1.5 w-1.5 rounded-full",
                                sUI.dot
                                )}
                            />
                            {subject.subject_status || "Active"}
                            </Badge>
                        </DialogDescription>

                        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground font-semibold">
                            <span className="inline-flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5" />
                            Created: {formatDate(subject.created_at)}
                            </span>
                            <span className="text-muted-foreground/50">•</span>
                            <span className="inline-flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5" />
                            Updated: {formatDate(subject.updated_at)}
                            </span>
                        </div>
                        </motion.div>
                    </AnimatePresence>

                    <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <Kpi
                        icon={ClipboardList}
                        label="Quizzes"
                        value={quizzesCount}
                        hint="Total linked quizzes"
                        />
                        <Kpi
                        icon={FileText}
                        label="Resources"
                        value={resourcesCount}
                        hint="Files & materials"
                        />
                        <Kpi
                        icon={Sparkles}
                        label="Tip"
                        value="Search + Sort"
                        hint="Use the tabs to filter"
                        />
                    </div>
                    </div>

                    <div className="flex items-center gap-2 lg:justify-end">
                    <Button
                        type="button"
                        className="rounded-2xl font-black"
                        onClick={() => onEdit?.(subject)}
                    >
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                    </Button>

                    <Button
                        type="button"
                        variant="outline"
                        className="rounded-2xl font-black bg-card/70 backdrop-blur"
                        onClick={() => onOpenChange?.(false)}
                    >
                        Close
                    </Button>
                    </div>
                </div>
                </div>
            </div>

            {/* ================= BODY ================= */}
            <div className="max-h-[78vh] overflow-auto">
                <div className="p-6 sm:p-8">
                <Tabs value={tab} onValueChange={setTab}>
                    <TabsList className="w-full flex flex-wrap justify-start gap-2 h-auto rounded-2xl bg-muted/30 p-1">
                    <TabsTrigger
                        value="overview"
                        className="rounded-2xl data-[state=active]:shadow-sm font-black"
                    >
                        Overview
                    </TabsTrigger>
                    <TabsTrigger
                        value="quizzes"
                        className="rounded-2xl data-[state=active]:shadow-sm font-black"
                    >
                        Quizzes ({quizzesCount})
                    </TabsTrigger>
                    <TabsTrigger
                        value="resources"
                        className="rounded-2xl data-[state=active]:shadow-sm font-black"
                    >
                        Resources ({resourcesCount})
                    </TabsTrigger>
                    </TabsList>

                    {/* OVERVIEW */}
                    <TabsContent value="overview" className="mt-6 space-y-5">
                    <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
                        <div className="lg:col-span-2 rounded-4xl bg-card border border-border shadow-sm p-6">
                        <div className="flex items-center justify-between gap-3">
                            <div className="text-sm font-black tracking-tight">
                            Description
                            </div>
                            <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="rounded-2xl font-black"
                            onClick={() => onEdit?.(subject)}
                            >
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                            </Button>
                        </div>

                        <Separator className="my-4" />

                        <div className="text-sm leading-relaxed">
                            {subject.description || subject.subject_description ? (
                            <div className="whitespace-pre-wrap font-semibold text-foreground/90">
                                {subject.description || subject.subject_description}
                            </div>
                            ) : (
                            <div className="flex items-start gap-2 rounded-3xl border bg-muted/20 p-5 text-muted-foreground">
                                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                                <span className="italic font-semibold">
                                No description provided.
                                </span>
                            </div>
                            )}
                        </div>
                        </div>

                        <div className="rounded-4xl bg-card border border-border shadow-sm p-6">
                        <div className="text-sm font-black tracking-tight">
                            Metadata
                        </div>
                        <Separator className="my-4" />

                        <div className="space-y-4 text-sm">
                            <div>
                            <div className="text-xs text-muted-foreground font-semibold">
                                Subject Code
                            </div>
                            <div className="mt-1 font-mono text-xs break-all">
                                {subjectId || "—"}
                            </div>
                            </div>

                            <div>
                            <div className="text-xs text-muted-foreground font-semibold">
                                Track
                            </div>
                            <div className="mt-1 font-black break-words">
                                {trackLabel}
                            </div>
                            </div>

                            <div>
                            <div className="text-xs text-muted-foreground font-semibold">
                                Category
                            </div>
                            <div className="mt-1 font-black break-words">
                                {categoryDisplay}
                            </div>
                            </div>

                            <div>
                            <div className="text-xs text-muted-foreground font-semibold">
                                Status
                            </div>
                            <div className="mt-2">
                                <Badge
                                className={cn(
                                    "rounded-full border px-3 py-1.5 text-[11px] font-black",
                                    sUI.badge
                                )}
                                >
                                <span
                                    className={cn(
                                    "mr-2 inline-block h-1.5 w-1.5 rounded-full",
                                    sUI.dot
                                    )}
                                />
                                {subject.subject_status || "Active"}
                                </Badge>
                            </div>
                            </div>

                            <Separator />

                            <div className="grid grid-cols-2 gap-3">
                            <Button
                                type="button"
                                variant="secondary"
                                className="rounded-2xl font-black"
                                onClick={() => setTab("quizzes")}
                            >
                                View quizzes
                                <ChevronRight className="ml-2 h-4 w-4" />
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                className="rounded-2xl font-black"
                                onClick={() => setTab("resources")}
                            >
                                View resources
                                <ChevronRight className="ml-2 h-4 w-4" />
                            </Button>
                            </div>
                        </div>
                        </div>
                    </div>
                    </TabsContent>

                    {/* QUIZZES */}
                    <TabsContent value="quizzes" className="mt-6 space-y-5">
                    <Toolbar
                        query={quizQ}
                        onQuery={setQuizQ}
                        sort={quizSort}
                        onSort={setQuizSort}
                        placeholder="Search quizzes by title, description, or ID..."
                    />

                    {loadingQuizzes ? (
                        <LoadingGrid />
                    ) : quizzes.length === 0 ? (
                        <EmptyState
                        icon={ClipboardList}
                        title="No quizzes found"
                        description={
                            quizQ
                            ? "Try a different keyword or clear your search."
                            : "This subject doesn’t have any quizzes yet."
                        }
                        />
                    ) : (
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {quizzes.map((q) => (
                            <QuizCard
                            key={q?.quiz_id || q?.id || `${q?.storage_path || ""}`}
                            quiz={q}
                            onOpen={(qid) => openQuiz(qid)}
                            />
                        ))}
                        </div>
                    )}
                    </TabsContent>

                    {/* RESOURCES */}
                    <TabsContent value="resources" className="mt-6 space-y-5">
                    <Toolbar
                        query={resQ}
                        onQuery={setResQ}
                        sort={resSort}
                        onSort={setResSort}
                        placeholder="Search resources by title, description, or ID..."
                    />

                    {loadingResources ? (
                        <LoadingGrid />
                    ) : resources.length === 0 ? (
                        <EmptyState
                        icon={FileText}
                        title="No resources found"
                        description={
                            resQ
                            ? "Try a different keyword or clear your search."
                            : "This subject doesn’t have any resources yet."
                        }
                        />
                    ) : (
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {resources.map((r) => (
                            <ResourceCard
                            key={r?.resource_id || r?.id || `${resourceUrl(r)}`}
                            resource={r}
                            onPreview={(rr) => setPreview(rr)}
                            />
                        ))}
                        </div>
                    )}
                    </TabsContent>
                </Tabs>
                </div>
            </div>
            </DialogContent>
        </Dialog>

        {/* RESOURCE PREVIEW */}
        <AnimatePresence>
            {preview ? (
            <Dialog open={!!preview} onOpenChange={(v) => (!v ? setPreview(null) : null)}>
                <DialogContent showCloseButton={false} size="xl" className="overflow-hidden rounded-4xl">
                <div className="relative overflow-hidden border-b">
                    <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-gradient-to-tr from-primary/22 to-secondary/18 blur-3xl mix-blend-screen" />
                    <div className="pointer-events-none absolute -right-24 -bottom-24 h-72 w-72 rounded-full bg-gradient-to-br from-accent/18 to-primary/12 blur-3xl mix-blend-screen" />

                    <div className="relative p-6 sm:p-7">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black truncate">
                        {preview?.resource_title || "Resource Preview"}
                        </DialogTitle>
                        <DialogDescription className="font-semibold line-clamp-2">
                        {resourceUrl(preview)
                            ? clamp(preview?.resource_description, 160)
                            : "No file attached."}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="mt-4 flex flex-wrap items-center gap-2">
                        <Button
                        type="button"
                        variant="outline"
                        className="rounded-2xl font-black bg-card/70 backdrop-blur"
                        onClick={() => setPreview(null)}
                        >
                        Close
                        </Button>

                        <Button
                        type="button"
                        className="rounded-2xl font-black"
                        disabled={!resourceUrl(preview)}
                        onClick={() =>
                            window.open(resourceUrl(preview), "_blank", "noopener,noreferrer")
                        }
                        >
                        Open in new tab <ExternalLink className="ml-2 h-4 w-4" />
                        </Button>
                    </div>
                    </div>
                </div>

                <div className="max-h-[80vh] overflow-auto p-6 sm:p-8">
                    {resourceUrl(preview) && canPreviewInline(resourceUrl(preview)) ? (
                    <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                        className="rounded-4xl bg-card border border-border shadow-sm overflow-hidden"
                    >
                        <iframe
                        src={resourceUrl(preview)}
                        title="Resource Preview"
                        className="w-full h-[72vh] sm:h-[78vh]"
                        />
                    </motion.div>
                    ) : (
                    <EmptyState
                        icon={FileText}
                        title="Nothing to preview"
                        description="This resource has no file URL available."
                        action={
                        <Button
                            type="button"
                            variant="secondary"
                            className="rounded-2xl font-black"
                            disabled={!resourceUrl(preview)}
                            onClick={() =>
                            window.open(resourceUrl(preview), "_blank", "noopener,noreferrer")
                            }
                        >
                            Open anyway <ExternalLink className="ml-2 h-4 w-4" />
                        </Button>
                        }
                    />
                    )}

                    <DialogFooter className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-between sm:items-center">
                    <div className="text-xs text-muted-foreground font-semibold">
                        Tip: If preview fails due to permissions, use “Open in new tab”.
                    </div>

                    <Button
                        type="button"
                        variant="outline"
                        className="rounded-2xl font-black"
                        onClick={() => setPreview(null)}
                    >
                        Done
                    </Button>
                    </DialogFooter>
                </div>
                </DialogContent>
            </Dialog>
            ) : null}
        </AnimatePresence>
        </>
    );
}