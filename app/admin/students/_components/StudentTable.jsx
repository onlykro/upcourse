"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

import { Search, X, Trash2, UserX, UserCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import PaginationBar from "./PaginationBar";
import ConfirmDialog from "./ConfirmDialog";

function cx(...a) {
    return a.filter(Boolean).join(" ");
}

const getSection = (stu) => stu?.section ?? stu?.section_name ?? stu?.class_section ?? "";

function safe(v) {
    return typeof v === "string" ? v : "";
}

function Pill({ active, disabled, onClick, children }) {
    return (
        <Button
        type="button"
        variant={active ? "default" : "outline"}
        size="sm"
        onClick={onClick}
        disabled={disabled}
        className={cx("rounded-full h-8", !active && "bg-background")}
        >
        {children}
        </Button>
    );
}

export default function StudentTable({ students = [], onRefresh, onRowClick }) {
    const { toast } = useToast();

    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // admin gating
    const [adminLevel, setAdminLevel] = useState("");
    useEffect(() => {
        const stored = JSON.parse(localStorage.getItem("currentUser") || "{}");
        setAdminLevel(stored.admin_level || "");
    }, []);
    const levelUpper = (adminLevel || "").toUpperCase();
    const canViewJHS = adminLevel === "Super Admin" || levelUpper.includes("JHS");
    const canViewSHS = adminLevel === "Super Admin" || levelUpper.includes("SHS");

    // Search + filters
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedQ, setDebouncedQ] = useState("");

    const [genderFilter, setGenderFilter] = useState("");
    const [hsFilter, setHsFilter] = useState(""); // "Junior High School" | "Senior High School" | ""
    const [gradeFilter, setGradeFilter] = useState("");
    const [sectionFilter, setSectionFilter] = useState("");

    // confirm dialog state
    const [confirm, setConfirm] = useState({
        open: false,
        title: "",
        description: "",
        loading: false,
        onConfirm: null,
    });

    // Pagination
    const [page, setPage] = useState(1);
    const PAGE_SIZE = 10;

    // Sync hsFilter with ?level=JHS|SHS
    useEffect(() => {
        const lvl = (searchParams.get("level") || "").toUpperCase();
        if (lvl === "JHS") setHsFilter("Junior High School");
        else if (lvl === "SHS") setHsFilter("Senior High School");
        else setHsFilter("");
        setPage(1);
    }, [searchParams]);

    const setLevelFilter = (val) => {
        setHsFilter(val);

        const params = new URLSearchParams(searchParams.toString());
        if (!val) params.delete("level");
        else params.set("level", val === "Junior High School" ? "JHS" : "SHS");

        router.replace(`${pathname}?${params.toString()}`);
        setPage(1);
    };

    // Debounce search
    useEffect(() => {
        const t = setTimeout(() => setDebouncedQ(searchQuery.trim().toLowerCase()), 250);
        return () => clearTimeout(t);
    }, [searchQuery]);

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
        const full = `${safe(stu.first_name)} ${safe(stu.middle_name)} ${safe(stu.last_name)}`.toLowerCase();
        const email = safe(stu.email).toLowerCase();
        const sec = getSection(stu);

        if (debouncedQ && !full.includes(debouncedQ) && !email.includes(debouncedQ)) return false;
        if (genderFilter && stu.gender !== genderFilter) return false;
        if (hsFilter && stu.school_level !== hsFilter) return false;
        if (gradeFilter && stu.grade_level !== gradeFilter) return false;
        if (sectionFilter && sec !== sectionFilter) return false;

        // Admin scope guard (same behavior as your old one)
        if (adminLevel !== "Super Admin") {
            if (levelUpper.includes("JHS") && !levelUpper.includes("SHS")) {
            if (stu.school_level !== "Junior High School") return false;
            }
            if (levelUpper.includes("SHS") && !levelUpper.includes("JHS")) {
            if (stu.school_level !== "Senior High School") return false;
            }
        }

        return true;
        });
    }, [students, debouncedQ, genderFilter, hsFilter, gradeFilter, sectionFilter, adminLevel, levelUpper]);

    const totalPages = Math.ceil(filtered.length / PAGE_SIZE) || 1;
    const start = (page - 1) * PAGE_SIZE;
    const paginated = filtered.slice(start, start + PAGE_SIZE);

    const openConfirm = ({ title, description, onConfirm }) => {
        setConfirm({ open: true, title, description, loading: false, onConfirm });
    };

    const closeConfirm = () => {
        setConfirm({ open: false, title: "", description: "", loading: false, onConfirm: null });
    };

    const toggleDisabled = (stu, e) => {
        e?.stopPropagation?.();
        const supabaseId = stu.supabase_id;
        if (!supabaseId) {
        toast({ title: "Missing supabase_id", variant: "destructive" });
        return;
        }

        const next = !Boolean(stu.is_disabled);

        openConfirm({
        title: `${next ? "Disable" : "Enable"} ${stu.first_name || "this user"}?`,
        description: next
            ? "They will be unable to sign in or access their account until re-enabled."
            : "They will regain access to their account.",
        onConfirm: async () => {
            setConfirm((p) => ({ ...p, loading: true }));
            try {
            const res = await fetch(`/api/students/${supabaseId}/disabled`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ is_disabled: next }),
            });
            const json = await res.json();
            if (!json?.success) throw new Error(json?.error || "Failed");
            toast({ title: `Account ${next ? "disabled" : "enabled"} successfully.` });
            closeConfirm();
            onRefresh?.();
            } catch (err) {
            setConfirm((p) => ({ ...p, loading: false }));
            toast({
                title: "Action failed",
                description: err?.message || "Could not update status.",
                variant: "destructive",
            });
            }
        },
        });
    };

    const deleteOne = (stu, e) => {
        e?.stopPropagation?.();
        const supabaseId = stu.supabase_id;
        if (!supabaseId) {
        toast({ title: "Missing supabase_id", variant: "destructive" });
        return;
        }

        openConfirm({
        title: `Delete ${stu.first_name || "this user"}?`,
        description: "This action cannot be undone.",
        confirmText: "Delete",
        onConfirm: async () => {
            setConfirm((p) => ({ ...p, loading: true }));
            try {
            const res = await fetch(`/api/students/${supabaseId}`, { method: "DELETE" });
            const json = await res.json();
            if (!json?.success) throw new Error(json?.error || "Failed");
            toast({ title: "Student deleted." });
            closeConfirm();
            onRefresh?.();
            } catch (err) {
            setConfirm((p) => ({ ...p, loading: false }));
            toast({
                title: "Delete failed",
                description: err?.message || "Could not delete student.",
                variant: "destructive",
            });
            }
        },
        });
    };

    const resetQuickFilters = () => {
        setGenderFilter("");
        setGradeFilter("");
        setSectionFilter("");
        setPage(1);
    };

    return (
        <div className="flex flex-col gap-3">
        {/* Toolbar */}
        <Card className="rounded-2xl">
            <CardContent className="p-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
                {/* Left */}
                <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-muted-foreground">Level:</span>

                <div className="flex items-center gap-2">
                    <Pill active={hsFilter === ""} onClick={() => setLevelFilter("")}>
                    All
                    </Pill>
                    <Pill
                    active={hsFilter === "Junior High School"}
                    onClick={() => setLevelFilter("Junior High School")}
                    disabled={!canViewJHS}
                    >
                    Junior
                    </Pill>
                    <Pill
                    active={hsFilter === "Senior High School"}
                    onClick={() => setLevelFilter("Senior High School")}
                    disabled={!canViewSHS}
                    >
                    Senior
                    </Pill>
                </div>

                {/* Grade */}
                <label className="text-xs text-muted-foreground ml-2">Grade:</label>
                <select
                    value={gradeFilter}
                    onChange={(e) => {
                    setGradeFilter(e.target.value);
                    setPage(1);
                    }}
                    className="h-9 rounded-lg border bg-background px-2 text-sm"
                >
                    <option value="">All</option>
                    {gradeOptions.map((g) => (
                    <option key={g} value={g}>
                        {g}
                    </option>
                    ))}
                </select>

                {/* Section */}
                <label className="text-xs text-muted-foreground">Section:</label>
                <select
                    value={sectionFilter}
                    onChange={(e) => {
                    setSectionFilter(e.target.value);
                    setPage(1);
                    }}
                    disabled={!hasSectionData}
                    className="h-9 rounded-lg border bg-background px-2 text-sm disabled:opacity-50"
                    title={hasSectionData ? "Filter by Section" : "No section data yet"}
                >
                    <option value="">All</option>
                    {sectionOptions.map((sec) => (
                    <option key={sec} value={sec}>
                        {sec}
                    </option>
                    ))}
                </select>

                {(gradeFilter || sectionFilter || genderFilter) && (
                    <Button variant="outline" size="sm" onClick={resetQuickFilters}>
                    Reset
                    </Button>
                )}
                </div>

                {/* Right */}
                <div className="flex items-center gap-3">
                <div className="relative w-[240px] sm:w-[280px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                    value={searchQuery}
                    onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setPage(1);
                    }}
                    placeholder="Search students…"
                    className="pl-9 pr-10"
                    />
                    {searchQuery ? (
                    <button
                        type="button"
                        onClick={() => {
                        setSearchQuery("");
                        setPage(1);
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        aria-label="Clear search"
                        title="Clear search"
                    >
                        <X className="h-4 w-4" />
                    </button>
                    ) : null}
                </div>

                <div className="hidden md:flex items-center gap-2">
                    <Badge variant="secondary">Results: {filtered.length}</Badge>
                    <Badge variant="secondary">Pages: {totalPages}</Badge>
                </div>
                </div>
            </div>
            </CardContent>
        </Card>

        {/* Table */}
        <Card className="rounded-2xl overflow-hidden">
            <div className="w-full overflow-auto">
            <Table className="min-w-[1000px]">
                <TableHeader>
                <TableRow className="bg-muted/40">
                    <TableHead>ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Grade</TableHead>
                    <TableHead>Section</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead>Gender</TableHead>
                    <TableHead>Assessment Result</TableHead>
                    {adminLevel === "Super Admin" ? <TableHead className="text-center">Actions</TableHead> : null}
                </TableRow>
                </TableHeader>

                <TableBody>
                {paginated.map((stu, idx) => {
                    const section = getSection(stu);
                    const midInit = stu.middle_name ? `${stu.middle_name.charAt(0)}. ` : "";
                    const isDisabled = Boolean(stu.is_disabled);
                    const supabaseId = stu.supabase_id;

                    return (
                    <TableRow
                        key={supabaseId || idx}
                        onClick={() => onRowClick?.(stu)}
                        className={cx(
                        "cursor-pointer hover:bg-primary/5",
                        isDisabled && "opacity-60"
                        )}
                    >
                        <TableCell className="text-muted-foreground">{supabaseId || "—"}</TableCell>

                        <TableCell>
                        <div className="font-medium text-foreground flex items-center gap-2">
                            <span>
                            {stu.first_name} {midInit}
                            {stu.last_name}
                            </span>
                            {isDisabled ? <Badge variant="secondary">Disabled</Badge> : null}
                        </div>
                        <div className="text-xs text-muted-foreground">
                            {stu.student_number || ""}
                        </div>
                        </TableCell>

                        <TableCell>{stu.email || "—"}</TableCell>

                        <TableCell>
                        {stu.grade_level ? (
                            <Badge className="bg-amber-100 text-amber-800 border-0">
                            {stu.grade_level}
                            </Badge>
                        ) : (
                            "—"
                        )}
                        </TableCell>

                        <TableCell>{section || "—"}</TableCell>

                        <TableCell>
                        {stu.school_level === "Senior High School" ? (
                            <Badge className="bg-purple-100 text-purple-800 border-0">Senior</Badge>
                        ) : stu.school_level === "Junior High School" ? (
                            <Badge className="bg-indigo-100 text-indigo-800 border-0">Junior</Badge>
                        ) : (
                            <Badge variant="outline">—</Badge>
                        )}
                        </TableCell>

                        <TableCell>{stu.gender || "—"}</TableCell>

                        <TableCell>
                        {stu.course ? (
                            <Badge className="bg-emerald-100 text-emerald-800 border-0">
                            {stu.course}
                            </Badge>
                        ) : (
                            <span className="text-muted-foreground italic">Not set</span>
                        )}
                        </TableCell>

                        {adminLevel === "Super Admin" ? (
                        <TableCell className="text-center">
                            <div className="inline-flex gap-2 opacity-0 hover:opacity-100 group-hover:opacity-100 transition">
                            <Button
                                size="icon"
                                className={cx(
                                "text-white",
                                isDisabled ? "bg-green-600 hover:bg-green-700" : "bg-red-500 hover:bg-red-600"
                                )}
                                onClick={(e) => toggleDisabled(stu, e)}
                                title={isDisabled ? "Enable account" : "Disable account"}
                                aria-label={isDisabled ? "Enable account" : "Disable account"}
                            >
                                {isDisabled ? <UserCheck className="h-4 w-4" /> : <UserX className="h-4 w-4" />}
                            </Button>

                            <Button
                                size="icon"
                                variant="destructive"
                                onClick={(e) => deleteOne(stu, e)}
                                title="Delete student"
                                aria-label="Delete student"
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                            </div>
                        </TableCell>
                        ) : null}
                    </TableRow>
                    );
                })}

                {paginated.length === 0 ? (
                    <TableRow>
                    <TableCell
                        colSpan={adminLevel === "Super Admin" ? 9 : 8}
                        className="py-10 text-center text-muted-foreground"
                    >
                        No students match your filters.
                    </TableCell>
                    </TableRow>
                ) : null}
                </TableBody>
            </Table>
            </div>
        </Card>

        {/* Pagination */}
        {totalPages > 1 ? (
            <div className="pt-1">
            <PaginationBar
                page={page}
                totalPages={totalPages}
                onPageChange={(p) => {
                setPage(p);
                const scroller = document.scrollingElement || document.body;
                scroller.scrollTop = 0;
                }}
            />
            </div>
        ) : null}

        {/* Confirm */}
        <ConfirmDialog
            open={confirm.open}
            onOpenChange={(open) => !open && closeConfirm()}
            title={confirm.title}
            description={confirm.description}
            confirmText="Yes"
            cancelText="No"
            onConfirm={confirm.onConfirm}
            loading={confirm.loading}
        />
        </div>
    );
}
