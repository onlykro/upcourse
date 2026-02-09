// @components/subjects/subject-form-dialog.jsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
    Layers,
    Hash,
    BookOpen,
    Tags,
    Activity,
    AlertCircle,
    Sparkles,
} from "lucide-react";

import { cn } from "@/lib/utils";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

/* ------------------------------ constants ------------------------------ */

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

const DESC_LIMIT = 500;
const WARN_AT = 450;

const normalizeStatus = (v) => {
    const s = String(v || "active").toLowerCase();
    return s === "inactive" ? "Inactive" : "Active";
};

const asString = (v) => String(v ?? "").trim();

/**
 * ✅ UPDATED: tracks table now uses:
 * - track_id (code)  -> used as Select value
 * - track_name (name)
 */
function toTrackOptions(tracks) {
    const list = Array.isArray(tracks) ? tracks : [];
    return list
        .map((t) => {
        if (typeof t === "string") {
            const value = asString(t);
            return value ? { value, label: value, raw: null } : null;
        }
        if (!t || typeof t !== "object") return null;

        const value = asString(t.track_id ?? t.code ?? t.id ?? t.value);
        if (!value) return null;

        const name = asString(t.track_name ?? t.name ?? t.title);
        const label = name ? `${value} — ${name}` : value;

        return { value, label, raw: t };
        })
        .filter(Boolean);
}

function FieldError({ id, children }) {
    if (!children) return null;
    return (
        <p id={id} className="mt-1 text-xs font-semibold text-destructive">
        {children}
        </p>
    );
}

export default function SubjectFormDialog({
    open,
    onOpenChange,
    initial = null,
    tracks = [],
    tracksLoading = false,
    onSubmit,
    }) {
    const loadingTracks = Boolean(tracksLoading);

    const initialCode = useMemo(
        () => asString(initial?.subject_id),
        [initial?.subject_id]
    );
    const isEdit = Boolean(initialCode);

    const trackOptions = useMemo(() => toTrackOptions(tracks), [tracks]);

    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState("");
    const [errors, setErrors] = useState({});

    const [form, setForm] = useState({
        track_id: "",
        subject_id: "",
        subject_name: "",
        subject_category: "",
        subject_status: "Active",
        subject_description: "",
    });

    useEffect(() => {
        if (!open) return;

        const track_id = asString(initial?.track_id);
        const subject_id = initialCode;
        const subject_name = asString(initial?.subject_name);
        const subject_category = asString(initial?.subject_category);
        const subject_status = normalizeStatus(initial?.subject_status);
        const subject_description = asString(
        initial?.subject_description ?? initial?.description ?? ""
        );

        setForm({
        track_id,
        subject_id,
        subject_name,
        subject_category,
        subject_status,
        subject_description,
        });

        setSubmitting(false);
        setFormError("");
        setErrors({});
    }, [
        open,
        initialCode,
        initial?.track_id,
        initial?.subject_name,
        initial?.subject_category,
        initial?.subject_status,
        initial?.subject_description,
        initial?.description,
    ]);

    const selectedTrack = useMemo(() => {
        const v = asString(form.track_id);
        if (!v) return null;
        return trackOptions.find((x) => String(x.value) === String(v)) || null;
    }, [form.track_id, trackOptions]);

    const selectedTrackText = useMemo(() => {
        const t = selectedTrack?.raw || {};
        const blob = [
        t.track_profile,
        t.track_description,
        t.summary,
        t.track_name,
        t.track_id,
        ]
        .map((x) => String(x || "").toLowerCase())
        .join(" ");
        return blob;
    }, [selectedTrack]);

    const isAcademicTrack = /academic|gas|abm|humss|stem/.test(selectedTrackText);
    const isTechProfTrack =
        /tech|tvl|tvb|technical|t\/v|ict|industrial|agri|maritime|hospitality|tourism|automotive|construction/.test(
        selectedTrackText
        );

    const electivesForTrack = useMemo(() => {
        if (!form.track_id) return [];
        if (isAcademicTrack && !isTechProfTrack) return ACADEMIC_ELECTIVES;
        if (isTechProfTrack && !isAcademicTrack) return TECH_PROF_ELECTIVES;
        return [...ACADEMIC_ELECTIVES, ...TECH_PROF_ELECTIVES];
    }, [form.track_id, isAcademicTrack, isTechProfTrack]);

    const allCategoryOptions = useMemo(() => {
        const base = [...CORE_CATEGORIES, ...electivesForTrack];
        const current = asString(form.subject_category);
        if (current && !base.includes(current)) return [current, ...base];
        return base;
    }, [electivesForTrack, form.subject_category]);

    const validate = () => {
        const next = {};

        if (!asString(form.track_id)) next.track_id = "Please select a Track.";
        if (!asString(form.subject_id)) next.subject_id = "Subject Code is required.";
        if (!asString(form.subject_name)) next.subject_name = "Subject name is required.";
        if (asString(form.subject_description).length > DESC_LIMIT) {
        next.subject_description = `Max ${DESC_LIMIT} characters.`;
        }

        setErrors(next);
        return Object.keys(next).length === 0;
    };

    const submit = async (e) => {
        e?.preventDefault?.();
        setFormError("");
        if (!validate()) return;

        const payload = {
        track_id: asString(form.track_id) || null,
        subject_id: asString(form.subject_id),
        subject_name: asString(form.subject_name),
        subject_category: asString(form.subject_category) || null,
        subject_status: normalizeStatus(form.subject_status),
        subject_description: asString(form.subject_description) || null,
        };

        setSubmitting(true);
        try {
        await onSubmit?.(payload);
        onOpenChange?.(false);
        } catch (err) {
        setFormError(err?.message || "Something went wrong while saving.");
        } finally {
        setSubmitting(false);
        }
    };

    return (
        <Dialog
        open={open}
        onOpenChange={(v) => {
            if (!v) {
            setSubmitting(false);
            setFormError("");
            setErrors({});
            }
            onOpenChange?.(v);
        }}
        >
        <DialogContent showCloseButton={false} size="xl" className="p-0 overflow-hidden">
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
                <DialogHeader>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-black w-fit">
                    <Sparkles className="h-4 w-4" />
                    {isEdit ? "Update Subject" : "Create Subject"}
                </div>

                <DialogTitle className="mt-4 text-3xl sm:text-4xl font-black tracking-tight leading-tight">
                    {isEdit ? "Edit subject details" : "Add a new subject"}
                </DialogTitle>

                <DialogDescription className="mt-2 font-semibold">
                    Select Track → Subject Code → Subject Name.
                </DialogDescription>
                </DialogHeader>

                <div className="mt-5 flex flex-wrap items-center gap-2">
                <Badge
                    variant="secondary"
                    className="rounded-full border bg-card/70 backdrop-blur px-3 py-1.5 text-[11px] font-black gap-2"
                >
                    <Layers className="h-3.5 w-3.5 text-muted-foreground" />
                    {selectedTrack?.label || "Choose a Track"}
                </Badge>
                </div>
            </div>
            </div>

            {/* ================= BODY ================= */}
            <form onSubmit={submit} className="max-h-[78vh] overflow-auto">
            <div className="p-6 sm:p-8 space-y-5">
                <AnimatePresence>
                {formError ? (
                    <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    className="rounded-4xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive font-semibold flex gap-2"
                    >
                    <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                    <div>{formError}</div>
                    </motion.div>
                ) : null}
                </AnimatePresence>

                <div className="rounded-4xl bg-card border border-border shadow-sm p-6">
                <div className="flex items-center gap-2 text-sm font-black">
                    <BookOpen className="h-4 w-4 text-primary" />
                    Subject Info
                </div>

                <Separator className="my-4" />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Track */}
                    <div className="space-y-2">
                    <Label className="font-semibold">
                        Track <span className="text-destructive">*</span>
                    </Label>

                    <Select
                        value={asString(form.track_id) || "__EMPTY__"}
                        onValueChange={(v) => {
                        const next = v === "__EMPTY__" ? "" : v;
                        setForm((p) => ({ ...p, track_id: next }));
                        }}
                        disabled={loadingTracks}
                    >
                        <SelectTrigger
                        className={cn(
                            "rounded-2xl font-semibold",
                            errors.track_id ? "border-destructive/50" : ""
                        )}
                        >
                        <SelectValue
                            placeholder={loadingTracks ? "Loading…" : "Select a track…"}
                        />
                        </SelectTrigger>
                        <SelectContent>
                        <SelectItem value="__EMPTY__">
                            {loadingTracks ? "Loading…" : "Select a track…"}
                        </SelectItem>
                        {trackOptions.map((t) => (
                            <SelectItem key={t.value} value={t.value}>
                            {t.label}
                            </SelectItem>
                        ))}
                        </SelectContent>
                    </Select>

                    <FieldError id="track_id-error">{errors.track_id}</FieldError>
                    </div>

                    {/* Subject Code */}
                    <div className="space-y-2">
                    <Label className="font-semibold">
                        Subject Code <span className="text-destructive">*</span>
                    </Label>

                    <div className="relative">
                        <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                        className={cn(
                            "pl-9 rounded-2xl font-semibold",
                            errors.subject_id ? "border-destructive/50" : "",
                            isEdit ? "bg-muted/40" : ""
                        )}
                        value={form.subject_id}
                        onChange={(e) =>
                            setForm((p) => ({ ...p, subject_id: e.target.value }))
                        }
                        placeholder="e.g., ENG10"
                        readOnly={isEdit}
                        />
                    </div>

                    <FieldError id="subject_id-error">{errors.subject_id}</FieldError>
                    {isEdit ? (
                        <p className="text-[11px] text-muted-foreground font-semibold">
                        Subject Code can’t be changed while editing.
                        </p>
                    ) : null}
                    </div>

                    {/* Subject Name */}
                    <div className="md:col-span-2 space-y-2">
                    <Label className="font-semibold">
                        Subject Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                        className={cn(
                        "rounded-2xl font-semibold",
                        errors.subject_name ? "border-destructive/50" : ""
                        )}
                        value={form.subject_name}
                        onChange={(e) =>
                        setForm((p) => ({ ...p, subject_name: e.target.value }))
                        }
                        placeholder="e.g., English 10"
                        autoFocus={!isEdit}
                    />
                    <FieldError id="subject_name-error">{errors.subject_name}</FieldError>
                    </div>
                </div>
                </div>

                {/* Category + Status */}
                <div className="rounded-4xl bg-card border border-border shadow-sm p-6">
                <div className="flex items-center gap-2 text-sm font-black">
                    <Tags className="h-4 w-4 text-primary" />
                    Category & Status
                </div>

                <Separator className="my-4" />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Category */}
                    <div className="space-y-2">
                    <Label className="font-semibold">Electives category</Label>

                    <Select
                        value={asString(form.subject_category) || "__EMPTY__"}
                        onValueChange={(v) =>
                        setForm((p) => ({
                            ...p,
                            subject_category: v === "__EMPTY__" ? "" : v,
                        }))
                        }
                        disabled={!form.track_id}
                    >
                        <SelectTrigger className="rounded-2xl font-semibold disabled:opacity-60">
                        <SelectValue
                            placeholder={
                            !form.track_id
                                ? "Select a track first…"
                                : "Select category…"
                            }
                        />
                        </SelectTrigger>
                        <SelectContent>
                        <SelectItem value="__EMPTY__">
                            {!form.track_id
                            ? "Select a track first…"
                            : "Select category…"}
                        </SelectItem>

                        {allCategoryOptions.map((opt) => (
                            <SelectItem key={opt} value={opt}>
                            {opt}
                            </SelectItem>
                        ))}
                        </SelectContent>
                    </Select>

                    <p className="text-[11px] text-muted-foreground font-semibold">
                        Core/Specialized are allowed; electives list changes based on the selected track.
                    </p>
                    </div>

                    {/* Status */}
                    <div className="space-y-2">
                    <Label className="font-semibold">Status</Label>
                    <Select
                        value={normalizeStatus(form.subject_status)}
                        onValueChange={(v) =>
                        setForm((p) => ({ ...p, subject_status: v }))
                        }
                    >
                        <SelectTrigger className="rounded-2xl font-semibold">
                        <Activity className="mr-2 h-4 w-4 text-muted-foreground" />
                        <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                        <SelectItem value="Active">Active</SelectItem>
                        <SelectItem value="Inactive">Inactive</SelectItem>
                        </SelectContent>
                    </Select>
                    </div>
                </div>
                </div>

                {/* Description */}
                <div className="rounded-4xl bg-card border border-border shadow-sm p-6">
                <div className="flex items-center gap-2 text-sm font-black">
                    <BookOpen className="h-4 w-4 text-primary" />
                    Description
                </div>

                <Separator className="my-4" />

                <Textarea
                    className={cn(
                    "rounded-2xl font-semibold min-h-[120px]",
                    errors.subject_description ? "border-destructive/50" : ""
                    )}
                    value={form.subject_description}
                    onChange={(e) => {
                    const next = e.target.value || "";
                    setForm((p) => ({
                        ...p,
                        subject_description:
                        next.length > DESC_LIMIT ? next.slice(0, DESC_LIMIT) : next,
                    }));
                    }}
                    placeholder="Brief overview, scope, or notes…"
                />

                <div className="mt-2 flex items-center justify-between">
                    <div className="text-[11px] text-muted-foreground font-semibold">
                    {errors.subject_description ? (
                        <span className="text-destructive">
                        {errors.subject_description}
                        </span>
                    ) : (
                        "You can edit anytime."
                    )}
                    </div>

                    <div
                    className={cn(
                        "text-[11px] font-black",
                        (form.subject_description || "").length >= WARN_AT
                        ? "text-destructive"
                        : "text-muted-foreground"
                    )}
                    >
                    {(form.subject_description || "").length}/{DESC_LIMIT}
                    </div>
                </div>
                </div>

                <DialogFooter className="gap-2">
                <Button
                    type="button"
                    variant="outline"
                    className="rounded-2xl font-black bg-card/70 backdrop-blur"
                    onClick={() => onOpenChange?.(false)}
                    disabled={submitting}
                >
                    Cancel
                </Button>

                <Button type="submit" className="rounded-2xl font-black" disabled={submitting}>
                    {submitting ? "Saving…" : isEdit ? "Save Changes" : "Create Subject"}
                </Button>
                </DialogFooter>
            </div>
            </form>
        </DialogContent>
        </Dialog>
    );
}
