"use client";

import { useMemo, useState, useEffect } from "react";
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
  ArrowUpDown,
  Palette,
  Layers,
  Code2,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { fetchTracks, createTrack, updateTrack, deleteTrack } from "@/lib/tracks";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const pretty = (v) => {
  try {
    return JSON.stringify(v ?? [], null, 2);
  } catch {
    return "[]";
  }
};

const DEFAULTS = {
  badge_color: "#1976D2",
  gradient_start: "#B3E5FC",
  gradient_end: "#81D4FA",
  points: "[]",
  sample_curriculum: "[]",
  entry_roles: "[]",
  skills: "[]",
  sources: "[]",
};

const emptyForm = () => ({
  // ✅ now matches DB columns
  track_id: "",
  track_name: "",
  summary: "",
  ...DEFAULTS,
});

function parseJsonField(label, value) {
  const s = String(value ?? "").trim();
  if (!s) return [];
  try {
    return JSON.parse(s);
  } catch {
    throw new Error(`${label} must be valid JSON (array or object).`);
  }
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

function LoadingRow() {
  return (
    <TableRow>
      <TableCell>
        <div className="h-4 w-20 bg-muted rounded animate-pulse" />
      </TableCell>
      <TableCell>
        <div className="h-4 w-44 bg-muted rounded animate-pulse" />
        <div className="mt-2 h-3 w-28 bg-muted rounded animate-pulse" />
      </TableCell>
      <TableCell className="hidden lg:table-cell">
        <div className="h-3 w-full bg-muted rounded animate-pulse" />
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-md bg-muted animate-pulse" />
          <div className="h-6 w-16 rounded-full bg-muted animate-pulse" />
        </div>
      </TableCell>
      <TableCell className="text-right">
        <div className="ml-auto h-8 w-8 rounded-xl bg-muted animate-pulse" />
      </TableCell>
    </TableRow>
  );
}

export default function TracksPage() {
  const [search, setSearch] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(search.trim()), 250);
    return () => clearTimeout(t);
  }, [search]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [errorMsg, setErrorMsg] = useState("");

  const swrKey = useMemo(() => ["tracks", debouncedQ], [debouncedQ]);
  const { data, isLoading, mutate } = useSWR(
    swrKey,
    async () => fetchTracks({ search: debouncedQ }),
    { revalidateOnFocus: false }
  );

  const tracks = Array.isArray(data) ? data : [];

  const stats = useMemo(() => {
    const total = tracks.length;
    const totalSkills = tracks.reduce(
      (acc, t) => acc + (Array.isArray(t.skills) ? t.skills.length : 0),
      0
    );
    const totalRoles = tracks.reduce(
      (acc, t) => acc + (Array.isArray(t.entry_roles) ? t.entry_roles.length : 0),
      0
    );
    return { total, totalSkills, totalRoles };
  }, [tracks]);

  const openCreate = () => {
    setErrorMsg("");
    setEditing(null);
    setForm(emptyForm());
    setDialogOpen(true);
  };

  const openEdit = (row) => {
    setErrorMsg("");
    setEditing(row);
    setForm({
      track_id: row?.track_id ?? "",
      track_name: row?.track_name ?? "",
      summary: row?.summary ?? "",
      badge_color: row?.badge_color ?? DEFAULTS.badge_color,
      gradient_start: row?.gradient_start ?? DEFAULTS.gradient_start,
      gradient_end: row?.gradient_end ?? DEFAULTS.gradient_end,
      points: pretty(row?.points),
      sample_curriculum: pretty(row?.sample_curriculum),
      entry_roles: pretty(row?.entry_roles),
      skills: pretty(row?.skills),
      sources: pretty(row?.sources),
    });
    setDialogOpen(true);
  };

  const onSave = async () => {
    setErrorMsg("");

    const payload = {
      // ✅ matches server aliases + DB columns
      track_id: String(form.track_id ?? "").trim(),
      track_name: String(form.track_name ?? "").trim(),
      summary: String(form.summary ?? "").trim(),

      badge_color: String(form.badge_color ?? "").trim(),
      gradient_start: String(form.gradient_start ?? "").trim(),
      gradient_end: String(form.gradient_end ?? "").trim(),

      points: parseJsonField("Points", form.points),
      sample_curriculum: parseJsonField("Sample Curriculum", form.sample_curriculum),
      entry_roles: parseJsonField("Entry Roles", form.entry_roles),
      skills: parseJsonField("Skills", form.skills),
      sources: parseJsonField("Sources", form.sources),
    };

    if (!payload.track_id || !payload.track_name) {
      setErrorMsg("Code and Name are required.");
      return;
    }

    try {
      // ✅ primary key is track_id (no id)
      if (editing?.track_id) await updateTrack(editing.track_id, payload);
      else await createTrack(payload);

      setDialogOpen(false);
      setEditing(null);
      setForm(emptyForm());
      await mutate();
    } catch (e) {
      setErrorMsg(e?.message || "Failed to save.");
    }
  };

  const onDelete = async (row) => {
    const label = row?.track_name ?? row?.track_id ?? "this track";
    const ok = confirm(`Delete "${label}"? This cannot be undone.`);
    if (!ok) return;

    try {
      await deleteTrack(row.track_id);
      await mutate();
    } catch (e) {
      alert(e?.message || "Failed to delete.");
    }
  };

  const clearSearch = () => setSearch("");

  return (
    <div className="space-y-8">
      {/* ===== HERO (UpCourse vibe) ===== */}
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
                Admin • Track Builder
              </div>

              <h1 className="text-4xl sm:text-5xl font-black tracking-tight leading-tight">
                Manage{" "}
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent bg-[length:200%] animate-gradient-x">
                  Tracks
                </span>
              </h1>

              <p className="mt-4 text-muted-foreground text-lg font-semibold leading-relaxed">
                Create and maintain SHS tracks — including curriculum, roles, skills, and sources.
              </p>

              <div className="mt-6 flex flex-wrap gap-2">
                {debouncedQ ? (
                  <Chip icon={Search} title="Search query" onClear={clearSearch}>
                    {debouncedQ}
                  </Chip>
                ) : (
                  <Chip icon={Search} title="Tip">
                    Try searching STEM, ABM, HUMSS…
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
              <Button className="rounded-2xl font-black" onClick={openCreate}>
                <Plus className="mr-2 h-4 w-4" />
                New Track
              </Button>
            </div>
          </div>

          <style>{`
            @keyframes gradientX { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
            .animate-gradient-x { animation: gradientX 6s ease infinite; }
          `}</style>

          {/* stat tiles */}
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard label="Tracks" value={stats.total} icon={Layers} />
            <StatCard label="Total Skills" value={stats.totalSkills} icon={Code2} />
            <StatCard label="Total Roles" value={stats.totalRoles} icon={ArrowUpDown} />
          </div>
        </div>
      </section>

      {/* ===== SEARCH + TABLE WRAP ===== */}
      <div className="rounded-4xl bg-card border border-border shadow-sm overflow-hidden">
        <div className="p-6 sm:p-7 border-b border-border">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-2xl font-black tracking-tight">All Tracks</h2>
              <p className="mt-2 text-muted-foreground font-semibold">
                Search by code, name, or summary.
              </p>
            </div>

            <div className="relative w-full lg:max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search tracks..."
                className="pl-9 pr-10 rounded-2xl font-semibold"
              />
              {search ? (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="Clear search"
                  title="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </div>
          </div>
        </div>

        <div className="p-6 sm:p-7">
          {isLoading ? (
            <div className="rounded-3xl border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="w-[120px]">Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="hidden lg:table-cell">Summary</TableHead>
                    <TableHead className="w-[170px]">Style</TableHead>
                    <TableHead className="w-[90px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <LoadingRow key={i} />
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : tracks.length === 0 ? (
            <div className="py-14 text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-black">
                <Sparkles className="h-4 w-4" />
                No tracks found
              </div>
              <p className="mt-4 text-muted-foreground font-semibold">
                Click <span className="font-black text-foreground">New Track</span> to create one.
              </p>
            </div>
          ) : (
            <div className="rounded-3xl border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="w-[120px]">Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="hidden lg:table-cell">Summary</TableHead>
                    <TableHead className="w-[170px]">Style</TableHead>
                    <TableHead className="w-[90px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {tracks.map((t) => {
                    const skillsCount = Array.isArray(t.skills) ? t.skills.length : 0;
                    const rolesCount = Array.isArray(t.entry_roles) ? t.entry_roles.length : 0;

                    const g1 = t.gradient_start || "#B3E5FC";
                    const g2 = t.gradient_end || "#81D4FA";
                    const bc = t.badge_color || "#1976D2";

                    return (
                      <TableRow key={t.track_id} className="hover:bg-primary/5">
                        <TableCell className="font-black">{t.track_id}</TableCell>

                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-black">{t.track_name}</span>
                            <span className="text-xs text-muted-foreground font-semibold">
                              {skillsCount} skills • {rolesCount} roles
                            </span>
                          </div>
                        </TableCell>

                        <TableCell className="hidden lg:table-cell text-muted-foreground font-semibold">
                          {t.summary || "—"}
                        </TableCell>

                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span
                              className="h-8 w-8 rounded-2xl border shadow-sm"
                              title="Gradient preview"
                              style={{
                                background: `linear-gradient(135deg, ${g1}, ${g2})`,
                              }}
                            />
                            <Badge
                              variant="secondary"
                              className="rounded-full border font-black"
                              title="Badge outline preview"
                              style={{ borderColor: bc }}
                            >
                              <Palette className="mr-1.5 h-3.5 w-3.5" />
                              Style
                            </Badge>
                          </div>
                        </TableCell>

                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="rounded-2xl">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => openEdit(t)}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => onDelete(t)}
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
          )}
        </div>
      </div>

      {/* ===== CREATE / EDIT DIALOG ===== */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden">
          <div className="relative border-b">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-violet-50 dark:from-blue-950/30 dark:via-indigo-950/25 dark:to-violet-950/30" />
            <div className="relative p-6">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black">
                  {editing ? "Edit Track" : "Create Track"}
                </DialogTitle>
                <DialogDescription className="font-semibold">
                  Code & name are required. JSON fields must be valid JSON (usually arrays).
                </DialogDescription>
              </DialogHeader>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span
                  className="h-9 w-9 rounded-2xl border shadow-sm"
                  style={{
                    background: `linear-gradient(135deg, ${
                      form.gradient_start || DEFAULTS.gradient_start
                    }, ${form.gradient_end || DEFAULTS.gradient_end})`,
                  }}
                  title="Gradient Preview"
                />
                <Badge
                  variant="secondary"
                  className="rounded-full border font-black"
                  style={{ borderColor: form.badge_color || DEFAULTS.badge_color }}
                >
                  Preview Badge
                </Badge>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="font-black">Code *</Label>
                <Input
                  className="rounded-2xl font-semibold"
                  value={form.track_id}
                  onChange={(e) => setForm((p) => ({ ...p, track_id: e.target.value }))}
                  placeholder="e.g. STEM"
                  // optional: lock id on edit (recommended)
                  disabled={!!editing?.track_id}
                />
                {editing?.track_id ? (
                  <p className="text-xs text-muted-foreground font-semibold">
                    Track code (track_id) can’t be changed after creation.
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label className="font-black">Name *</Label>
                <Input
                  className="rounded-2xl font-semibold"
                  value={form.track_name}
                  onChange={(e) => setForm((p) => ({ ...p, track_name: e.target.value }))}
                  placeholder="e.g. Science, Technology, Engineering and Mathematics"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label className="font-black">Summary</Label>
                <Textarea
                  className="rounded-2xl font-semibold min-h-[90px]"
                  value={form.summary}
                  onChange={(e) => setForm((p) => ({ ...p, summary: e.target.value }))}
                  placeholder="Short description..."
                />
              </div>

              <div className="space-y-2">
                <Label className="font-black">Badge Color</Label>
                <Input
                  className="rounded-2xl font-semibold"
                  value={form.badge_color}
                  onChange={(e) => setForm((p) => ({ ...p, badge_color: e.target.value }))}
                  placeholder="#1976D2"
                />
              </div>

              <div className="space-y-2">
                <Label className="font-black">Gradient Start</Label>
                <Input
                  className="rounded-2xl font-semibold"
                  value={form.gradient_start}
                  onChange={(e) => setForm((p) => ({ ...p, gradient_start: e.target.value }))}
                  placeholder="#B3E5FC"
                />
              </div>

              <div className="space-y-2">
                <Label className="font-black">Gradient End</Label>
                <Input
                  className="rounded-2xl font-semibold"
                  value={form.gradient_end}
                  onChange={(e) => setForm((p) => ({ ...p, gradient_end: e.target.value }))}
                  placeholder="#81D4FA"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label className="font-black">Points (jsonb)</Label>
                <Textarea
                  value={form.points}
                  onChange={(e) => setForm((p) => ({ ...p, points: e.target.value }))}
                  className="rounded-2xl font-mono text-xs min-h-[140px]"
                  placeholder='["Hands-on projects", "Research-focused learning"]'
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label className="font-black">Sample Curriculum (jsonb)</Label>
                <Textarea
                  value={form.sample_curriculum}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, sample_curriculum: e.target.value }))
                  }
                  className="rounded-2xl font-mono text-xs min-h-[140px]"
                  placeholder='[{"title":"Grade 11","items":["Gen Math","Earth Sci"]}]'
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label className="font-black">Entry Roles (jsonb)</Label>
                <Textarea
                  value={form.entry_roles}
                  onChange={(e) => setForm((p) => ({ ...p, entry_roles: e.target.value }))}
                  className="rounded-2xl font-mono text-xs min-h-[120px]"
                  placeholder='["Junior Developer", "Lab Assistant"]'
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label className="font-black">Skills (jsonb)</Label>
                <Textarea
                  value={form.skills}
                  onChange={(e) => setForm((p) => ({ ...p, skills: e.target.value }))}
                  className="rounded-2xl font-mono text-xs min-h-[120px]"
                  placeholder='["Critical thinking", "Programming basics"]'
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label className="font-black">Sources (jsonb)</Label>
                <Textarea
                  value={form.sources}
                  onChange={(e) => setForm((p) => ({ ...p, sources: e.target.value }))}
                  className="rounded-2xl font-mono text-xs min-h-[120px]"
                  placeholder='[{"label":"CHED","url":"https://..."}]'
                />
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
                className="rounded-2xl font-black"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button className="rounded-2xl font-black" onClick={onSave}>
                {editing ? "Save Changes" : "Create Track"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
