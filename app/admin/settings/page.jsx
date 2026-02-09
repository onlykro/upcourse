"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useReducedMotion } from "framer-motion";
import {
  Settings,
  User,
  Palette,
  Shield,
  Users,
  Search,
  Plus,
  RefreshCcw,
  SlidersHorizontal,
  Pencil,
  Trash2,
  KeyRound,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  X,
  Lock,
  Eye,
  EyeOff,
  Sparkles,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/AuthContext";
import { useTheme } from "@/components/ThemeProvider";

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
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

/* ------------------------------------------------------------
 * Small Helpers
 * ------------------------------------------------------------ */

function safeInitials(name = "") {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return "NA";
  const a = parts[0]?.[0] || "";
  const b = parts[parts.length - 1]?.[0] || "";
  return (a + b).toUpperCase();
}

function normStr(v) {
  return String(v ?? "").trim().toLowerCase();
}

function isActiveStatus(status = "") {
  const s = normStr(status);
  return s === "active";
}

function isInactiveStatus(status = "") {
  const s = normStr(status);
  return s === "inactive";
}

function roleBadge(role = "") {
  const r = normStr(role);
  if (r.includes("super")) return "default";
  if (r.includes("admin")) return "secondary";
  return "outline";
}

function statusBadge(status = "") {
  if (isInactiveStatus(status)) return "secondary";
  if (isActiveStatus(status)) return "default";
  return "outline";
}

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function normalizeAdmin(row) {
  // your DB uses admin_id
  const id = row?.admin_id ?? row?.id ?? row?.uuid ?? row?.user_id;

  const first = row?.first_name ?? "";
  const last = row?.last_name ?? "";

  const fullName =
    row?.name ??
    row?.full_name ??
    [first, last].filter(Boolean).join(" ").trim();

  const name = fullName || row?.username || row?.email || "Unknown Admin";

  // your DB uses admin_level + admin_status
  const role = row?.admin_level || row?.role || "Admin";
  const status = row?.admin_status || row?.status || "Active";

  const avatar = row?.profile_picture || row?.avatar || row?.avatar_url || "";
  const admin_role = row?.admin_role || "";
  const section = row?.section || "";
  const is_adviser = !!row?.is_adviser;

  return {
    raw: row,
    id,
    name,
    email: row?.email || "",
    role,
    status,
    avatar,
    first_name: first,
    last_name: last,
    admin_role,
    section,
    is_adviser,
  };
}

/* ------------------------------------------------------------
 * API (cookie session)
 * - IMPORTANT: credentials:"include" so httpOnly cookie is sent
 * ------------------------------------------------------------ */

async function apiRequest(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    cache: "no-store",
    credentials: "include",
    headers: {
      ...(options.headers || {}),
    },
  });

  const text = await res.text().catch(() => "");
  let json = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = {};
  }

  if (!res.ok || json?.success === false) {
    throw new Error(json?.error || `Request failed (${res.status})`);
  }

  return json;
}

/** Admins */
async function apiFetchAdmins() {
  const json = await apiRequest("/api/admins", { method: "GET" });
  return json?.admins ?? json?.data ?? [];
}

async function apiCreateAdmin(payload) {
  const json = await apiRequest("/api/admins", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return json?.data ?? null;
}

async function apiUpdateAdmin(adminId, patch) {
  const json = await apiRequest(`/api/admins/${encodeURIComponent(adminId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ patch }),
  });
  return json?.data ?? null;
}

async function apiDeleteAdmin(adminId) {
  const json = await apiRequest(`/api/admins/${encodeURIComponent(adminId)}`, {
    method: "DELETE",
  });
  return json?.data ?? true;
}

/** Admin access */
async function apiGetAdminAccess(adminId) {
  const json = await apiRequest(
    `/api/admin/access/${encodeURIComponent(adminId)}`,
    { method: "GET" }
  );
  return json?.data ?? null;
}

async function apiEnsureAdminAccess(adminId) {
  const json = await apiRequest(
    `/api/admin/access/${encodeURIComponent(adminId)}`,
    { method: "POST" }
  );
  return json?.data ?? null;
}

async function apiSaveAdminAccess(adminId, patch) {
  const json = await apiRequest(
    `/api/admin/access/${encodeURIComponent(adminId)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ patch }),
    }
  );
  return json?.data ?? null;
}

/* ------------------------------------------------------------
 * Access Matrix (UI state) – matches your admin_access keys
 * ------------------------------------------------------------ */
const EMPTY_ACCESS = {
  scopes: { junior: false, senior: false },
  features: {
    quizzes: { create: false, edit: false, publish: false, delete: false },
    subjects: { view: false, manage: false },
    strands: { view: false, manage: false },
    students: { view: false, manage: false },
    reports: { view: false, export: false },
    admins: { view: false, manage: false, invite: false, remove: false },
  },
};

function toUiAccess(row) {
  const r = row || {};
  const ui = deepClone(EMPTY_ACCESS);

  ui.scopes.junior = !!r.scope_junior;
  ui.scopes.senior = !!r.scope_senior;

  ui.features.quizzes.create = !!r.quizzes_create;
  ui.features.quizzes.edit = !!r.quizzes_edit;
  ui.features.quizzes.delete = !!r.quizzes_delete;
  ui.features.quizzes.publish = !!r.quizzes_publish;

  ui.features.subjects.view = !!r.subjects_view;
  ui.features.subjects.manage = !!r.subjects_manage;

  ui.features.strands.view = !!r.strands_view;
  ui.features.strands.manage = !!r.strands_manage;

  ui.features.students.view = !!r.students_view;
  ui.features.students.manage = !!r.students_manage;

  ui.features.reports.view = !!r.reports_view;
  ui.features.reports.export = !!r.reports_export;

  ui.features.admins.view = !!r.admins_view;
  ui.features.admins.manage = !!r.admins_manage;
  ui.features.admins.invite = !!r.admins_invite;
  ui.features.admins.remove = !!r.admins_remove;

  return ui;
}

function toPatchAccess(ui) {
  const u = ui || EMPTY_ACCESS;

  return {
    scope_junior: !!u.scopes.junior,
    scope_senior: !!u.scopes.senior,

    quizzes_create: !!u.features.quizzes.create,
    quizzes_edit: !!u.features.quizzes.edit,
    quizzes_delete: !!u.features.quizzes.delete,
    quizzes_publish: !!u.features.quizzes.publish,

    subjects_view: !!u.features.subjects.view,
    subjects_manage: !!u.features.subjects.manage,

    strands_view: !!u.features.strands.view,
    strands_manage: !!u.features.strands.manage,

    students_view: !!u.features.students.view,
    students_manage: !!u.features.students.manage,

    reports_view: !!u.features.reports.view,
    reports_export: !!u.features.reports.export,

    admins_view: !!u.features.admins.view,
    admins_manage: !!u.features.admins.manage,
    admins_invite: !!u.features.admins.invite,
    admins_remove: !!u.features.admins.remove,
  };
}

/* ------------------------------------------------------------
 * Presets
 * ------------------------------------------------------------ */
function presetSuperAdmin() {
  const ui = deepClone(EMPTY_ACCESS);
  ui.scopes.junior = true;
  ui.scopes.senior = true;

  Object.keys(ui.features).forEach((group) => {
    Object.keys(ui.features[group]).forEach(
      (k) => (ui.features[group][k] = true)
    );
  });

  return ui;
}

function presetQuizManager() {
  const ui = deepClone(EMPTY_ACCESS);
  ui.scopes.junior = true;
  ui.scopes.senior = true;

  ui.features.quizzes.create = true;
  ui.features.quizzes.edit = true;
  ui.features.quizzes.publish = true;

  ui.features.subjects.view = true;
  ui.features.strands.view = true;
  ui.features.students.view = true;
  ui.features.reports.view = true;

  ui.features.admins.view = true;
  return ui;
}

function presetViewer() {
  const ui = deepClone(EMPTY_ACCESS);
  ui.scopes.junior = true;
  ui.scopes.senior = true;

  ui.features.subjects.view = true;
  ui.features.strands.view = true;
  ui.features.students.view = true;
  ui.features.reports.view = true;
  ui.features.admins.view = true;

  return ui;
}

/* ------------------------------------------------------------
 * UI Pieces
 * ------------------------------------------------------------ */
function StatPill({ icon: IconCmp, label, value, hint }) {
  return (
    <Card className="relative overflow-hidden">
      <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-gradient-to-br from-primary/20 to-transparent blur-2xl" />
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-muted">
              <IconCmp className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">{label}</div>
              <div className="text-xl font-semibold leading-tight">{value}</div>
            </div>
          </div>
          {hint ? (
            <Badge variant="secondary" className="rounded-full">
              {hint}
            </Badge>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function SectionHeader({ icon: IconCmp, title, description, right }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-muted">
            <IconCmp className="h-5 w-5" />
          </div>
          <div className="text-xl font-semibold">{title}</div>
        </div>
        {description ? (
          <div className="text-sm text-muted-foreground">{description}</div>
        ) : null}
      </div>
      {right ? <div className="flex items-center gap-2">{right}</div> : null}
    </div>
  );
}

function AccessGroup({ title, description, children }) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
        {description ? (
          <CardDescription className="text-sm">{description}</CardDescription>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-3">{children}</CardContent>
    </Card>
  );
}

function ToggleRow({ label, desc, checked, onChange, disabled }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border p-3">
      <div className="min-w-0">
        <div className="text-sm font-medium">{label}</div>
        {desc ? (
          <div className="text-xs text-muted-foreground">{desc}</div>
        ) : null}
      </div>
      <Switch checked={!!checked} onCheckedChange={onChange} disabled={disabled} />
    </div>
  );
}

/* ============================================================
 * Main Page
 * ============================================================ */
export default function SettingsPage() {
  const prefersReducedMotion = useReducedMotion();

  const { toast } = useToast();
  const { user, updateProfile } = useAuth();
  const { theme, setTheme } = useTheme();

  const meId = useMemo(
    () => user?.admin_id || user?.id || user?.user_id || null,
    [user]
  );

  const currentAdminIsSuper = useMemo(() => {
    const a = normStr(user?.admin_level);
    const b = normStr(user?.role);
    const c = normStr(user?.admin_role);
    return a.includes("super") || b.includes("super") || c.includes("super");
  }, [user]);

  const [activeTab, setActiveTab] = useState("team");

  // Profile
  const [profile, setProfile] = useState({
    name:
      user?.name ||
      [user?.first_name, user?.last_name].filter(Boolean).join(" ").trim(),
    email: user?.email || "",
    bio: user?.bio || "",
  });

  // keep profile in sync once user loads
  useEffect(() => {
    setProfile({
      name:
        user?.name ||
        [user?.first_name, user?.last_name].filter(Boolean).join(" ").trim(),
      email: user?.email || "",
      bio: user?.bio || "",
    });
  }, [user]);

  // Appearance
  const [appearance, setAppearance] = useState({
    theme: theme || "system",
    accentColor: "blue",
    reduceMotion: !!prefersReducedMotion,
  });

  // Security
  const [security, setSecurity] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
    showPasswords: false,
  });

  // Admins
  const [admins, setAdmins] = useState([]);
  const [loadingAdmins, setLoadingAdmins] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [scopeFilter, setScopeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [levelFilter, setLevelFilter] = useState("all");
  const [sortKey, setSortKey] = useState("name");

  const [selectedAdminId, setSelectedAdminId] = useState(null);

  // Access states per admin
  const [accessByAdmin, setAccessByAdmin] = useState({});
  const [accessLoading, setAccessLoading] = useState(false);

  // UI dialogs
  const [adminDialogOpen, setAdminDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetPayload, setResetPayload] = useState({
    newPassword: "",
    confirmNew: "",
    show: false,
    typedEmail: "",
    typedConfirm: "",
  });

  const [adminForm, setAdminForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    admin_level: "Admin",
    admin_role: "Faculty",
    admin_status: "Active",
    section: "",
    is_adviser: false,
    password: "",
  });

  const myAccess = useMemo(
    () => (meId ? accessByAdmin[meId] : null),
    [accessByAdmin, meId]
  );

  // ✅ Gate per your requirement: Super Admin OR admins_manage
  const canManageAdmins = useMemo(() => {
    if (currentAdminIsSuper) return true;
    return !!myAccess?.features?.admins?.manage;
  }, [currentAdminIsSuper, myAccess]);

  // Allow viewing panel if admins_view OR admins_manage
  const canViewAdminAccessPanel = useMemo(() => {
    if (currentAdminIsSuper) return true;
    return (
      !!myAccess?.features?.admins?.view || !!myAccess?.features?.admins?.manage
    );
  }, [currentAdminIsSuper, myAccess]);

  const selectedAdmin = useMemo(() => {
    const found = admins.find((a) => a.id === selectedAdminId);
    return found || null;
  }, [admins, selectedAdminId]);

  const selectedAccess = useMemo(() => {
    if (!selectedAdmin?.id) return null;
    return accessByAdmin[selectedAdmin.id] || null;
  }, [accessByAdmin, selectedAdmin?.id]);

  /* ----------------------------
   * Load current user's access (for gating)
   * ---------------------------- */
  const loadMyAccess = useCallback(async () => {
    try {
      if (!meId) return;

      // ensure self row first (route allows self ensure)
      const ensured = await apiEnsureAdminAccess(meId).catch(() => null);
      const raw = ensured || (await apiGetAdminAccess(meId).catch(() => null));
      if (!raw) return;

      setAccessByAdmin((prev) => ({ ...prev, [meId]: toUiAccess(raw) }));
    } catch {
      // silent
    }
  }, [meId]);

  /* ----------------------------
   * Load admins (real data)
   * ---------------------------- */
  const loadAdmins = useCallback(async () => {
    try {
      setLoadingAdmins(true);

      const rows = await apiFetchAdmins();
      const norm = (Array.isArray(rows) ? rows : []).map(normalizeAdmin);

      setAdmins(norm);
      setSelectedAdminId((prev) => prev || norm[0]?.id || null);
      setLoadingAdmins(false);
    } catch (e) {
      setLoadingAdmins(false);
      toast({
        title: "Failed to load admins",
        description: e?.message || "Please try again.",
        variant: "destructive",
      });
    }
  }, [toast]);

  // initial load
  useEffect(() => {
    loadAdmins();
  }, [loadAdmins]);

  // load my access once meId becomes available (AuthProvider loads from storage)
  useEffect(() => {
    if (!meId) return;
    loadMyAccess();
  }, [meId, loadMyAccess]);

  /* ----------------------------
   * When selecting an admin, fetch their access (if allowed)
   * ---------------------------- */
  const hydrateSelectedAccess = useCallback(
    async (adminId) => {
      if (!adminId) return;
      if (!canViewAdminAccessPanel) return;

      try {
        setAccessLoading(true);

        const canEnsure = canManageAdmins || adminId === meId;
        const ensured = canEnsure
          ? await apiEnsureAdminAccess(adminId).catch(() => null)
          : null;

        const raw =
          ensured || (await apiGetAdminAccess(adminId).catch(() => null));

        setAccessByAdmin((prev) => ({
          ...prev,
          [adminId]: raw ? toUiAccess(raw) : deepClone(EMPTY_ACCESS),
        }));

        setAccessLoading(false);
      } catch (e) {
        setAccessLoading(false);
        toast({
          title: "Failed to load access",
          description: e?.message || "Please try again.",
          variant: "destructive",
        });
      }
    },
    [toast, canViewAdminAccessPanel, canManageAdmins, meId]
  );

  useEffect(() => {
    if (selectedAdminId) hydrateSelectedAccess(selectedAdminId);
  }, [selectedAdminId, hydrateSelectedAccess]);

  /* ----------------------------
   * Filters
   * ---------------------------- */
  const filteredAdmins = useMemo(() => {
    let list = [...admins];

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter((a) =>
        [a.name, a.email, a.role, a.admin_role, a.section]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q))
      );
    }

    if (statusFilter !== "all") {
      list = list.filter((a) => {
        const s = normStr(a.status);
        if (statusFilter === "active") return s === "active";
        if (statusFilter === "inactive") return s === "inactive";
        return true;
      });
    }

    if (levelFilter !== "all") {
      list = list.filter((a) => {
        const r = normStr(a.role);
        if (levelFilter === "super") return r.includes("super");
        return r.includes("admin") && !r.includes("super");
      });
    }

    if (scopeFilter !== "all") {
      list = list.filter((a) => {
        const acc = accessByAdmin[a.id];
        const j = !!acc?.scopes?.junior;
        const s = !!acc?.scopes?.senior;
        if (scopeFilter === "junior") return j;
        if (scopeFilter === "senior") return s;
        if (scopeFilter === "none") return !j && !s;
        return true;
      });
    }

    list.sort((a, b) => {
      if (sortKey === "role")
        return String(a.role).localeCompare(String(b.role));
      if (sortKey === "status")
        return String(a.status).localeCompare(String(b.status));
      return String(a.name).localeCompare(String(b.name));
    });

    return list;
  }, [
    admins,
    searchTerm,
    statusFilter,
    levelFilter,
    scopeFilter,
    sortKey,
    accessByAdmin,
  ]);

  const adminStats = useMemo(() => {
    const total = admins.length;
    const active = admins.filter((a) => normStr(a.status) === "active").length;
    const superCount = admins.filter((a) => normStr(a.role).includes("super"))
      .length;
    return { total, active, superCount };
  }, [admins]);

  /* ----------------------------
   * Profile action
   * ---------------------------- */
  const handleUpdateProfile = async () => {
    try {
      if (typeof updateProfile !== "function") {
        toast({
          title: "Not wired",
          description: "Profile update isn’t wired to your Auth provider yet.",
          variant: "destructive",
        });
        return;
      }
      await updateProfile(profile);
      toast({
        title: "Profile updated",
        description: "Your profile changes were saved.",
      });
    } catch (e) {
      toast({
        title: "Update failed",
        description: e?.message || "Please try again.",
        variant: "destructive",
      });
    }
  };

  /* ----------------------------
   * Appearance action
   * ---------------------------- */
  const handleThemeChange = (nextTheme) => {
    setAppearance((p) => ({ ...p, theme: nextTheme }));
    setTheme(nextTheme);
    toast({ title: "Theme updated", description: `Theme set to ${nextTheme}.` });
  };

  /* ----------------------------
   * Admin Actions (CRUD)
   * ---------------------------- */
  const openCreateAdmin = () => {
    setEditMode(false);
    setAdminForm({
      first_name: "",
      last_name: "",
      email: "",
      admin_level: "Admin",
      admin_role: "Faculty",
      admin_status: "Active",
      section: "",
      is_adviser: false,
      password: "",
    });
    setAdminDialogOpen(true);
  };

  const openEditAdmin = (admin) => {
    if (!admin) return;
    setEditMode(true);

    setAdminForm({
      first_name: admin.first_name || "",
      last_name: admin.last_name || "",
      email: admin.email || "",
      admin_level: normStr(admin.role).includes("super") ? "Super Admin" : "Admin",
      admin_role: admin.admin_role || "Faculty",
      admin_status: admin.status || "Active",
      section: admin.section || "",
      is_adviser: !!admin.is_adviser,
      password: "",
    });

    setAdminDialogOpen(true);
  };

  const submitAdminForm = async () => {
    try {
      if (!canManageAdmins) {
        toast({
          title: "Not allowed",
          description: "You don't have permission to manage admins.",
          variant: "destructive",
        });
        return;
      }

      const payload = {
        email: adminForm.email,
        first_name: adminForm.first_name,
        last_name: adminForm.last_name,
        admin_level: adminForm.admin_level,
        admin_role: adminForm.admin_role,
        admin_status: adminForm.admin_status,
        section: adminForm.section,
        is_adviser: adminForm.is_adviser,
      };

      if (!editMode) {
        if (!payload.email || !String(adminForm.password || "").trim()) {
          toast({
            title: "Missing fields",
            description: "Email and password are required for new admins.",
            variant: "destructive",
          });
          return;
        }
        payload.password = adminForm.password;

        // non-super can't create Super Admin (API also blocks)
        if (payload.admin_level === "Super Admin" && !currentAdminIsSuper) {
          toast({
            title: "Not allowed",
            description: "Only Super Admin can create Super Admin.",
            variant: "destructive",
          });
          return;
        }

        await apiCreateAdmin(payload);
        toast({ title: "Admin created", description: "New admin added successfully." });
      } else {
        if (!selectedAdmin?.id) return;

        // non-super can't change admin_level (API blocks)
        if (
          payload.admin_level === "Super Admin" &&
          !currentAdminIsSuper &&
          normStr(selectedAdmin.role).includes("super") === false
        ) {
          toast({
            title: "Not allowed",
            description: "Only Super Admin can assign Super Admin.",
            variant: "destructive",
          });
          return;
        }

        await apiUpdateAdmin(selectedAdmin.id, payload);
        toast({ title: "Admin updated", description: "Changes saved successfully." });
      }

      setAdminDialogOpen(false);
      await loadAdmins();
    } catch (e) {
      toast({
        title: "Action failed",
        description: e?.message || "Please try again.",
        variant: "destructive",
      });
    }
  };

  const requestDeleteAdmin = (admin) => {
    if (admin?.id) setSelectedAdminId(admin.id);
    setDeleteConfirmText("");
    setDeleteDialogOpen(true);
  };

  const confirmDeleteAdmin = async () => {
    try {
      if (!canManageAdmins) {
        toast({
          title: "Not allowed",
          description: "You don't have permission to delete admins.",
          variant: "destructive",
        });
        return;
      }
      if (!selectedAdmin?.id) return;

      if (deleteConfirmText.trim().toLowerCase() !== "confirm") {
        toast({
          title: 'Type "Confirm" to delete',
          description: "This action is irreversible.",
          variant: "destructive",
        });
        return;
      }

      await apiDeleteAdmin(selectedAdmin.id);
      toast({ title: "Admin deleted", description: "Admin has been removed." });

      setDeleteDialogOpen(false);
      setSelectedAdminId(null);
      await loadAdmins();
    } catch (e) {
      toast({
        title: "Delete failed",
        description: e?.message || "Please try again.",
        variant: "destructive",
      });
    }
  };

  /* ----------------------------
   * Reset password flow (PATCH /api/admins/:id)
   * ---------------------------- */
  const openResetPassword = () => {
    setResetPayload({
      newPassword: "",
      confirmNew: "",
      show: false,
      typedEmail: "",
      typedConfirm: "",
    });
    setResetDialogOpen(true);
  };

  const doResetPassword = async () => {
    try {
      if (!canManageAdmins) {
        toast({
          title: "Not allowed",
          description: "You don't have permission to reset passwords.",
          variant: "destructive",
        });
        return;
      }

      if (!selectedAdmin?.id) return;

      if (
        resetPayload.typedEmail.trim().toLowerCase() !==
        (selectedAdmin.email || "").trim().toLowerCase()
      ) {
        toast({
          title: "Email mismatch",
          description: "Type the admin's email exactly to continue.",
          variant: "destructive",
        });
        return;
      }

      if (resetPayload.typedConfirm.trim().toLowerCase() !== "confirm") {
        toast({
          title: 'Type "Confirm" to continue',
          description: "This will overwrite the current password.",
          variant: "destructive",
        });
        return;
      }

      if (!resetPayload.newPassword || resetPayload.newPassword.length < 8) {
        toast({
          title: "Weak password",
          description: "Use at least 8 characters.",
          variant: "destructive",
        });
        return;
      }

      if (resetPayload.newPassword !== resetPayload.confirmNew) {
        toast({
          title: "Passwords do not match",
          description: "Please re-check the new password fields.",
          variant: "destructive",
        });
        return;
      }

      await apiUpdateAdmin(selectedAdmin.id, { password: resetPayload.newPassword });

      toast({
        title: "Password reset",
        description: "The admin can now sign in using the new password.",
      });

      setResetDialogOpen(false);
    } catch (e) {
      toast({
        title: "Reset failed",
        description: e?.message || "Please try again.",
        variant: "destructive",
      });
    }
  };

  /* ----------------------------
   * Access actions
   * ---------------------------- */
  const setAccessValue = (path, value) => {
    if (!selectedAdmin?.id) return;

    setAccessByAdmin((prev) => {
      const next = { ...prev };
      const base = deepClone(next[selectedAdmin.id] || EMPTY_ACCESS);

      const parts = path.split(".");
      let node = base;
      for (let i = 0; i < parts.length - 1; i++) node = node[parts[i]];
      node[parts[parts.length - 1]] = value;

      next[selectedAdmin.id] = base;
      return next;
    });
  };

  const applyPreset = (presetFn) => {
    if (!selectedAdmin?.id) return;
    setAccessByAdmin((prev) => ({ ...prev, [selectedAdmin.id]: presetFn() }));
    toast({
      title: "Preset applied",
      description: "Review changes then click Save Access.",
    });
  };

  const saveAccess = async () => {
    try {
      if (!selectedAdmin?.id) return;

      if (!canManageAdmins) {
        toast({
          title: "Not allowed",
          description: "You don't have permission to change access.",
          variant: "destructive",
        });
        return;
      }

      const ui = accessByAdmin[selectedAdmin.id] || EMPTY_ACCESS;
      const patch = toPatchAccess(ui);

      await apiSaveAdminAccess(selectedAdmin.id, patch);

      toast({
        title: "Access saved",
        description: "Permissions were updated successfully.",
      });
    } catch (e) {
      toast({
        title: "Save failed",
        description: e?.message || "Please try again.",
        variant: "destructive",
      });
    }
  };

  /* ----------------------------
   * Refresh
   * ---------------------------- */
  const onRefresh = async () => {
    setRefreshing(true);
    await loadMyAccess();
    await loadAdmins();
    if (selectedAdminId) await hydrateSelectedAccess(selectedAdminId);
    setRefreshing(false);
  };

  return (
    <div className="relative min-h-screen bg-background">
      {/* Background accents */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -right-24 top-24 h-72 w-72 rounded-full bg-purple-500/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-emerald-500/10 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-muted shadow-sm">
                <Settings className="h-5 w-5" />
              </div>
              <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
              <Badge variant="secondary" className="rounded-full">
                Admin Console
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Manage your account, UI preferences, security, and admin access.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              onClick={onRefresh}
              disabled={refreshing}
              className="gap-2"
            >
              <RefreshCcw className={cn("h-4 w-4", refreshing && "animate-spin")} />
              Refresh
            </Button>
            <Button
              variant="secondary"
              className="gap-2"
              type="button"
              onClick={() =>
                toast({
                  title: "Tip",
                  description: "Use presets then Save Access.",
                })
              }
            >
              <Sparkles className="h-4 w-4" />
              Tips
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
            <TabsTrigger value="profile" className="gap-2">
              <User className="h-4 w-4" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="appearance" className="gap-2">
              <Palette className="h-4 w-4" />
              Appearance
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-2">
              <Shield className="h-4 w-4" />
              Security
            </TabsTrigger>
            <TabsTrigger value="team" className="gap-2">
              <Users className="h-4 w-4" />
              Team
            </TabsTrigger>
          </TabsList>

          {/* Profile */}
          <TabsContent value="profile" className="space-y-6">
            <SectionHeader
              icon={User}
              title="Profile"
              description="Update your information shown across the admin console."
              right={
                <Button onClick={handleUpdateProfile} className="gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Save
                </Button>
              }
            />

            <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
              <Card className="overflow-hidden">
                <CardHeader>
                  <CardTitle className="text-base">Preview</CardTitle>
                  <CardDescription>How your profile appears.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={user?.avatar || ""} alt={profile.name || "User"} />
                      <AvatarFallback>{safeInitials(profile.name)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="truncate font-medium">
                        {profile.name || "Unnamed User"}
                      </div>
                      <div className="truncate text-sm text-muted-foreground">
                        {profile.email}
                      </div>
                    </div>
                  </div>
                  <Separator />
                  <div className="rounded-xl bg-muted p-3 text-sm text-muted-foreground">
                    {profile.bio?.trim()
                      ? profile.bio
                      : "Add a short bio to help your team recognize you."}
                  </div>
                </CardContent>
              </Card>

              <Card className="overflow-hidden">
                <CardHeader>
                  <CardTitle className="text-base">Details</CardTitle>
                  <CardDescription>These fields can be updated anytime.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input
                      value={profile.name}
                      onChange={(e) =>
                        setProfile({ ...profile, name: e.target.value })
                      }
                      placeholder="Full name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input value={profile.email} disabled placeholder="Email" />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Bio</Label>
                    <Textarea
                      value={profile.bio}
                      onChange={(e) =>
                        setProfile({ ...profile, bio: e.target.value })
                      }
                      placeholder="Short description about you"
                      rows={5}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Appearance */}
          <TabsContent value="appearance" className="space-y-6">
            <SectionHeader
              icon={Palette}
              title="Appearance"
              description="Adjust theme and UI preferences for a better experience."
            />

            <div className="grid gap-6 lg:grid-cols-3">
              <StatPill icon={Palette} label="Theme" value={appearance.theme} hint="Live" />
              <StatPill icon={SlidersHorizontal} label="Accent" value={appearance.accentColor} />
              <StatPill icon={Sparkles} label="Motion" value={appearance.reduceMotion ? "Reduced" : "Normal"} />

              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-base">Theme</CardTitle>
                  <CardDescription>Choose how the app looks on your device.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-3">
                  <Button
                    variant={appearance.theme === "light" ? "default" : "outline"}
                    onClick={() => handleThemeChange("light")}
                  >
                    Light
                  </Button>
                  <Button
                    variant={appearance.theme === "dark" ? "default" : "outline"}
                    onClick={() => handleThemeChange("dark")}
                  >
                    Dark
                  </Button>
                  <Button
                    variant={appearance.theme === "system" ? "default" : "outline"}
                    onClick={() => handleThemeChange("system")}
                  >
                    System
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Motion</CardTitle>
                  <CardDescription>Reduce animations if you prefer.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <ToggleRow
                    label="Reduce motion"
                    desc="Fewer animations across the UI."
                    checked={appearance.reduceMotion}
                    onChange={(v) => setAppearance((p) => ({ ...p, reduceMotion: v }))}
                  />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Security */}
          <TabsContent value="security" className="space-y-6">
            <SectionHeader
              icon={Shield}
              title="Security"
              description="Basic security controls for your account."
              right={
                <Button variant="outline" className="gap-2" disabled>
                  <ShieldCheck className="h-4 w-4" />
                  Advanced (Soon)
                </Button>
              }
            />

            <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Change password</CardTitle>
                  <CardDescription>
                    Your authentication provider may require re-login after changes.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Note</AlertTitle>
                    <AlertDescription>
                      If your project uses Supabase Auth, password updates should be handled via Auth APIs.
                    </AlertDescription>
                  </Alert>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2 sm:col-span-2">
                      <Label>Current password</Label>
                      <div className="relative">
                        <Input
                          type={security.showPasswords ? "text" : "password"}
                          value={security.currentPassword}
                          onChange={(e) =>
                            setSecurity((p) => ({
                              ...p,
                              currentPassword: e.target.value,
                            }))
                          }
                          placeholder="••••••••"
                        />
                        <button
                          type="button"
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                          onClick={() =>
                            setSecurity((p) => ({
                              ...p,
                              showPasswords: !p.showPasswords,
                            }))
                          }
                        >
                          {security.showPasswords ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>New password</Label>
                      <Input
                        type={security.showPasswords ? "text" : "password"}
                        value={security.newPassword}
                        onChange={(e) =>
                          setSecurity((p) => ({
                            ...p,
                            newPassword: e.target.value,
                          }))
                        }
                        placeholder="At least 8 characters"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Confirm new password</Label>
                      <Input
                        type={security.showPasswords ? "text" : "password"}
                        value={security.confirmPassword}
                        onChange={(e) =>
                          setSecurity((p) => ({
                            ...p,
                            confirmPassword: e.target.value,
                          }))
                        }
                        placeholder="Repeat new password"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button disabled className="gap-2">
                      <Lock className="h-4 w-4" />
                      Update password (wire to Auth)
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() =>
                        setSecurity({
                          currentPassword: "",
                          newPassword: "",
                          confirmPassword: "",
                          showPasswords: false,
                        })
                      }
                      className="gap-2"
                    >
                      <X className="h-4 w-4" />
                      Clear
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="h-fit">
                <CardHeader>
                  <CardTitle className="text-base">Quick checks</CardTitle>
                  <CardDescription>Recommended baseline.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="rounded-xl border p-3">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium">2FA</div>
                      <Badge variant="secondary" className="rounded-full">
                        Optional
                      </Badge>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Enable 2FA in your auth provider if available.
                    </div>
                  </div>
                  <div className="rounded-xl border p-3">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium">Sessions</div>
                      <Badge variant="outline" className="rounded-full">
                        Review
                      </Badge>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Regularly revoke old sessions for shared devices.
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Team */}
          <TabsContent value="team" className="space-y-6">
            <SectionHeader
              icon={Users}
              title="Admins & Access"
              description="Manage admin accounts and granular permissions (admin_access)."
              right={
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    onClick={openCreateAdmin}
                    className="gap-2"
                    disabled={!canManageAdmins}
                  >
                    <Plus className="h-4 w-4" />
                    New Admin
                  </Button>
                </div>
              }
            />

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <StatPill icon={Users} label="Total admins" value={adminStats.total} />
              <StatPill icon={CheckCircle2} label="Active" value={adminStats.active} />
              <StatPill icon={ShieldCheck} label="Super admins" value={adminStats.superCount} />
            </div>

            <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
              {/* Left list */}
              <Card className="overflow-hidden">
                <CardHeader className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-base">Admin Directory</CardTitle>
                      <CardDescription>
                        Search, filter and select an admin to view details.
                      </CardDescription>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="icon">
                          <SlidersHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuLabel>Filters</DropdownMenuLabel>
                        <DropdownMenuSeparator />

                        <div className="px-2 py-2 space-y-2">
                          <div className="space-y-1">
                            <div className="text-xs text-muted-foreground">Scope</div>
                            <Select value={scopeFilter} onValueChange={setScopeFilter}>
                              <SelectTrigger>
                                <SelectValue placeholder="Scope" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All</SelectItem>
                                <SelectItem value="junior">Junior</SelectItem>
                                <SelectItem value="senior">Senior</SelectItem>
                                <SelectItem value="none">None</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-1">
                            <div className="text-xs text-muted-foreground">Status</div>
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                              <SelectTrigger>
                                <SelectValue placeholder="Status" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All</SelectItem>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="inactive">Inactive</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-1">
                            <div className="text-xs text-muted-foreground">Level</div>
                            <Select value={levelFilter} onValueChange={setLevelFilter}>
                              <SelectTrigger>
                                <SelectValue placeholder="Level" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All</SelectItem>
                                <SelectItem value="super">Super Admin</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <Separator />

                          <div className="space-y-1">
                            <div className="text-xs text-muted-foreground">Sort</div>
                            <Select value={sortKey} onValueChange={setSortKey}>
                              <SelectTrigger>
                                <SelectValue placeholder="Sort" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="name">Name</SelectItem>
                                <SelectItem value="role">Role</SelectItem>
                                <SelectItem value="status">Status</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search by name, email, role, section..."
                      className="pl-9"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={onRefresh}
                      disabled={refreshing}
                    >
                      <RefreshCcw className={cn("h-4 w-4", refreshing && "animate-spin")} />
                      Refresh
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-2"
                      onClick={() => {
                        setSearchTerm("");
                        setScopeFilter("all");
                        setStatusFilter("all");
                        setLevelFilter("all");
                        setSortKey("name");
                      }}
                    >
                      <X className="h-4 w-4" />
                      Clear
                    </Button>
                  </div>
                </CardHeader>

                <CardContent className="p-0">
                  <div className="max-h-[560px] overflow-auto">
                    {loadingAdmins ? (
                      <div className="p-4 text-sm text-muted-foreground">
                        Loading admins...
                      </div>
                    ) : filteredAdmins.length ? (
                      <div className="divide-y">
                        {filteredAdmins.map((a) => {
                          const isSelected = a.id === selectedAdminId;
                          const acc = accessByAdmin[a.id];
                          const scopeHint =
                            acc?.scopes?.junior && acc?.scopes?.senior
                              ? "Junior + Senior"
                              : acc?.scopes?.junior
                              ? "Junior"
                              : acc?.scopes?.senior
                              ? "Senior"
                              : "No scope";

                          return (
                            <button
                              key={a.id}
                              onClick={() => setSelectedAdminId(a.id)}
                              className={cn(
                                "w-full text-left px-4 py-3 transition",
                                isSelected ? "bg-muted/70" : "hover:bg-muted/40"
                              )}
                            >
                              <div className="flex items-center gap-3">
                                <Avatar className="h-9 w-9">
                                  <AvatarImage src={a.avatar || ""} alt={a.name} />
                                  <AvatarFallback>{safeInitials(a.name)}</AvatarFallback>
                                </Avatar>

                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="truncate text-sm font-medium">
                                      {a.name}
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <Badge
                                        variant={roleBadge(a.role)}
                                        className="rounded-full"
                                      >
                                        {normStr(a.role).includes("super")
                                          ? "Super"
                                          : "Admin"}
                                      </Badge>
                                      <Badge
                                        variant={statusBadge(a.status)}
                                        className="rounded-full"
                                      >
                                        {normStr(a.status)}
                                      </Badge>
                                    </div>
                                  </div>
                                  <div className="mt-1 flex flex-wrap items-center gap-2">
                                    <div className="truncate text-xs text-muted-foreground">
                                      {a.email || "No email"}
                                    </div>
                                    <span className="text-muted-foreground">•</span>
                                    <div className="text-xs text-muted-foreground">
                                      {scopeHint}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-4 text-sm text-muted-foreground">
                        No admins found. Try a different search or filter.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Right detail */}
              <div className="space-y-6">
                <Card className="overflow-hidden">
                  <CardHeader className="space-y-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-base">Admin Details</CardTitle>
                        <CardDescription>
                          View profile, reset password, and manage permissions.
                        </CardDescription>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          variant="outline"
                          className="gap-2"
                          disabled={!selectedAdmin || !canManageAdmins}
                          onClick={() => openEditAdmin(selectedAdmin)}
                        >
                          <Pencil className="h-4 w-4" />
                          Edit
                        </Button>

                        <Button
                          variant="outline"
                          className="gap-2"
                          disabled={!selectedAdmin || !canManageAdmins}
                          onClick={openResetPassword}
                        >
                          <KeyRound className="h-4 w-4" />
                          Reset Password
                        </Button>

                        <Button
                          variant="destructive"
                          className="gap-2"
                          disabled={!selectedAdmin || !canManageAdmins}
                          onClick={() => requestDeleteAdmin(selectedAdmin)}
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-5">
                    {!selectedAdmin ? (
                      <div className="rounded-xl border p-4 text-sm text-muted-foreground">
                        Select an admin from the left to view details.
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-12 w-12">
                              <AvatarImage
                                src={selectedAdmin.avatar || ""}
                                alt={selectedAdmin.name}
                              />
                              <AvatarFallback>
                                {safeInitials(selectedAdmin.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <div className="truncate text-lg font-semibold">
                                {selectedAdmin.name}
                              </div>
                              <div className="truncate text-sm text-muted-foreground">
                                {selectedAdmin.email}
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <Badge
                              variant={roleBadge(selectedAdmin.role)}
                              className="rounded-full"
                            >
                              {selectedAdmin.role}
                            </Badge>
                            <Badge
                              variant={statusBadge(selectedAdmin.status)}
                              className="rounded-full"
                            >
                              {selectedAdmin.status}
                            </Badge>
                            {selectedAdmin.section ? (
                              <Badge variant="outline" className="rounded-full">
                                {selectedAdmin.section}
                              </Badge>
                            ) : null}
                            {selectedAdmin.admin_role ? (
                              <Badge variant="secondary" className="rounded-full">
                                {selectedAdmin.admin_role}
                              </Badge>
                            ) : null}
                            {selectedAdmin.is_adviser ? (
                              <Badge className="rounded-full">Adviser</Badge>
                            ) : null}
                          </div>
                        </div>

                        <Separator />

                        {/* Access Panel */}
                        {!canViewAdminAccessPanel ? (
                          <Alert>
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle>Restricted</AlertTitle>
                            <AlertDescription>
                              You do not have permission to view the access panel.
                            </AlertDescription>
                          </Alert>
                        ) : (
                          <div className="space-y-4">
                            {!canManageAdmins ? (
                              <Alert>
                                <Lock className="h-4 w-4" />
                                <AlertTitle>View only</AlertTitle>
                                <AlertDescription>
                                  You can view permissions, but you can’t change them unless{" "}
                                  <span className="font-mono">admins_manage</span> is enabled.
                                </AlertDescription>
                              </Alert>
                            ) : null}

                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                              <div>
                                <div className="text-sm font-semibold">Access Control</div>
                                <div className="text-xs text-muted-foreground">
                                  Stored in <span className="font-mono">admin_access</span>.
                                </div>
                              </div>

                              <div className="flex flex-wrap items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => applyPreset(presetViewer)}
                                  disabled={!canManageAdmins}
                                >
                                  Viewer
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => applyPreset(presetQuizManager)}
                                  disabled={!canManageAdmins}
                                >
                                  Quiz Manager
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => applyPreset(presetSuperAdmin)}
                                  disabled={!canManageAdmins}
                                >
                                  Full Access
                                </Button>
                                <Button
                                  size="sm"
                                  className="gap-2"
                                  onClick={saveAccess}
                                  disabled={!canManageAdmins || accessLoading}
                                >
                                  <ShieldCheck className="h-4 w-4" />
                                  Save Access
                                </Button>
                              </div>
                            </div>

                            {accessLoading && !selectedAccess ? (
                              <div className="rounded-xl border p-4 text-sm text-muted-foreground">
                                Loading access…
                              </div>
                            ) : (
                              <div className="grid gap-4 lg:grid-cols-2">
                                <AccessGroup
                                  title="Scope"
                                  description="Choose where the admin has permission to operate."
                                >
                                  <ToggleRow
                                    label="Junior High"
                                    desc="Access Junior High areas and data."
                                    checked={selectedAccess?.scopes?.junior}
                                    onChange={(v) => setAccessValue("scopes.junior", v)}
                                    disabled={!canManageAdmins}
                                  />
                                  <ToggleRow
                                    label="Senior High"
                                    desc="Access Senior High areas and data."
                                    checked={selectedAccess?.scopes?.senior}
                                    onChange={(v) => setAccessValue("scopes.senior", v)}
                                    disabled={!canManageAdmins}
                                  />
                                </AccessGroup>

                                <AccessGroup
                                  title="Admins"
                                  description="Visibility and management of admins."
                                >
                                  <ToggleRow
                                    label="View admins"
                                    checked={selectedAccess?.features?.admins?.view}
                                    onChange={(v) =>
                                      setAccessValue("features.admins.view", v)
                                    }
                                    disabled={!canManageAdmins}
                                  />
                                  <ToggleRow
                                    label="Manage admins"
                                    desc="Create, edit, reset password, delete admins."
                                    checked={selectedAccess?.features?.admins?.manage}
                                    onChange={(v) =>
                                      setAccessValue("features.admins.manage", v)
                                    }
                                    disabled={!canManageAdmins}
                                  />
                                  <ToggleRow
                                    label="Invite admins"
                                    checked={selectedAccess?.features?.admins?.invite}
                                    onChange={(v) =>
                                      setAccessValue("features.admins.invite", v)
                                    }
                                    disabled={!canManageAdmins}
                                  />
                                  <ToggleRow
                                    label="Remove admins"
                                    checked={selectedAccess?.features?.admins?.remove}
                                    onChange={(v) =>
                                      setAccessValue("features.admins.remove", v)
                                    }
                                    disabled={!canManageAdmins}
                                  />
                                </AccessGroup>

                                <AccessGroup title="Quizzes" description="Quiz permissions.">
                                  <ToggleRow
                                    label="Create"
                                    checked={selectedAccess?.features?.quizzes?.create}
                                    onChange={(v) =>
                                      setAccessValue("features.quizzes.create", v)
                                    }
                                    disabled={!canManageAdmins}
                                  />
                                  <ToggleRow
                                    label="Edit"
                                    checked={selectedAccess?.features?.quizzes?.edit}
                                    onChange={(v) =>
                                      setAccessValue("features.quizzes.edit", v)
                                    }
                                    disabled={!canManageAdmins}
                                  />
                                  <ToggleRow
                                    label="Publish"
                                    checked={selectedAccess?.features?.quizzes?.publish}
                                    onChange={(v) =>
                                      setAccessValue("features.quizzes.publish", v)
                                    }
                                    disabled={!canManageAdmins}
                                  />
                                  <ToggleRow
                                    label="Delete"
                                    checked={selectedAccess?.features?.quizzes?.delete}
                                    onChange={(v) =>
                                      setAccessValue("features.quizzes.delete", v)
                                    }
                                    disabled={!canManageAdmins}
                                  />
                                </AccessGroup>

                                <AccessGroup
                                  title="Academics"
                                  description="Subjects, strands, and students."
                                >
                                  <div className="grid gap-3">
                                    <div className="rounded-xl border p-3">
                                      <div className="mb-2 text-sm font-semibold">
                                        Subjects
                                      </div>
                                      <div className="grid gap-2">
                                        <ToggleRow
                                          label="View"
                                          checked={selectedAccess?.features?.subjects?.view}
                                          onChange={(v) =>
                                            setAccessValue(
                                              "features.subjects.view",
                                              v
                                            )
                                          }
                                          disabled={!canManageAdmins}
                                        />
                                        <ToggleRow
                                          label="Manage"
                                          desc="Create/edit/delete subjects."
                                          checked={selectedAccess?.features?.subjects?.manage}
                                          onChange={(v) =>
                                            setAccessValue(
                                              "features.subjects.manage",
                                              v
                                            )
                                          }
                                          disabled={!canManageAdmins}
                                        />
                                      </div>
                                    </div>

                                    <div className="rounded-xl border p-3">
                                      <div className="mb-2 text-sm font-semibold">
                                        Strands
                                      </div>
                                      <div className="grid gap-2">
                                        <ToggleRow
                                          label="View"
                                          checked={selectedAccess?.features?.strands?.view}
                                          onChange={(v) =>
                                            setAccessValue(
                                              "features.strands.view",
                                              v
                                            )
                                          }
                                          disabled={!canManageAdmins}
                                        />
                                        <ToggleRow
                                          label="Manage"
                                          desc="Create/edit/delete strands."
                                          checked={selectedAccess?.features?.strands?.manage}
                                          onChange={(v) =>
                                            setAccessValue(
                                              "features.strands.manage",
                                              v
                                            )
                                          }
                                          disabled={!canManageAdmins}
                                        />
                                      </div>
                                    </div>

                                    <div className="rounded-xl border p-3">
                                      <div className="mb-2 text-sm font-semibold">
                                        Students
                                      </div>
                                      <div className="grid gap-2">
                                        <ToggleRow
                                          label="View"
                                          checked={selectedAccess?.features?.students?.view}
                                          onChange={(v) =>
                                            setAccessValue(
                                              "features.students.view",
                                              v
                                            )
                                          }
                                          disabled={!canManageAdmins}
                                        />
                                        <ToggleRow
                                          label="Manage"
                                          desc="Create/edit/delete students."
                                          checked={selectedAccess?.features?.students?.manage}
                                          onChange={(v) =>
                                            setAccessValue(
                                              "features.students.manage",
                                              v
                                            )
                                          }
                                          disabled={!canManageAdmins}
                                        />
                                      </div>
                                    </div>
                                  </div>
                                </AccessGroup>

                                <AccessGroup title="Reports" description="Dashboards and exports.">
                                  <ToggleRow
                                    label="View reports"
                                    checked={selectedAccess?.features?.reports?.view}
                                    onChange={(v) =>
                                      setAccessValue("features.reports.view", v)
                                    }
                                    disabled={!canManageAdmins}
                                  />
                                  <ToggleRow
                                    label="Export"
                                    desc="Download reports to CSV/PDF."
                                    checked={selectedAccess?.features?.reports?.export}
                                    onChange={(v) =>
                                      setAccessValue("features.reports.export", v)
                                    }
                                    disabled={!canManageAdmins}
                                  />
                                </AccessGroup>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Create/Edit Admin Dialog */}
                <Dialog open={adminDialogOpen} onOpenChange={setAdminDialogOpen}>
                  <DialogContent className="sm:max-w-[720px]">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        {editMode ? (
                          <Pencil className="h-4 w-4" />
                        ) : (
                          <Plus className="h-4 w-4" />
                        )}
                        {editMode ? "Edit Admin" : "Create Admin"}
                      </DialogTitle>
                      <DialogDescription>
                        {editMode
                          ? "Update admin information. Email is immutable."
                          : "Create a new admin and set an initial password."}
                      </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>First name</Label>
                        <Input
                          value={adminForm.first_name}
                          onChange={(e) =>
                            setAdminForm((p) => ({
                              ...p,
                              first_name: e.target.value,
                            }))
                          }
                          placeholder="Juan"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Last name</Label>
                        <Input
                          value={adminForm.last_name}
                          onChange={(e) =>
                            setAdminForm((p) => ({
                              ...p,
                              last_name: e.target.value,
                            }))
                          }
                          placeholder="Dela Cruz"
                        />
                      </div>

                      <div className="space-y-2 sm:col-span-2">
                        <Label>Email</Label>
                        <Input
                          value={adminForm.email}
                          onChange={(e) =>
                            setAdminForm((p) => ({ ...p, email: e.target.value }))
                          }
                          placeholder="admin@school.edu"
                          disabled={editMode}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Admin level</Label>
                        <Select
                          value={adminForm.admin_level}
                          onValueChange={(v) =>
                            setAdminForm((p) => ({ ...p, admin_level: v }))
                          }
                          disabled={!currentAdminIsSuper}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select level" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Admin">Admin</SelectItem>
                            <SelectItem value="Super Admin">Super Admin</SelectItem>
                          </SelectContent>
                        </Select>
                        {!currentAdminIsSuper ? (
                          <div className="text-xs text-muted-foreground">
                            Only Super Admin can change admin level.
                          </div>
                        ) : null}
                      </div>

                      <div className="space-y-2">
                        <Label>Status</Label>
                        <Select
                          value={adminForm.admin_status}
                          onValueChange={(v) =>
                            setAdminForm((p) => ({ ...p, admin_status: v }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Active">Active</SelectItem>
                            <SelectItem value="Inactive">Inactive</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Role (School)</Label>
                        <Select
                          value={adminForm.admin_role}
                          onValueChange={(v) =>
                            setAdminForm((p) => ({ ...p, admin_role: v }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Faculty">Faculty</SelectItem>
                            <SelectItem value="Facilitator">Facilitator</SelectItem>
                            <SelectItem value="Guidance">Guidance</SelectItem>
                            <SelectItem value="Staff">Staff</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Section (optional)</Label>
                        <Input
                          value={adminForm.section}
                          onChange={(e) =>
                            setAdminForm((p) => ({ ...p, section: e.target.value }))
                          }
                          placeholder="STEM 12-A"
                        />
                      </div>

                      {!editMode ? (
                        <div className="space-y-2 sm:col-span-2">
                          <Label>Initial password</Label>
                          <Input
                            type="password"
                            value={adminForm.password}
                            onChange={(e) =>
                              setAdminForm((p) => ({
                                ...p,
                                password: e.target.value,
                              }))
                            }
                            placeholder="At least 8 characters"
                          />
                          <div className="text-xs text-muted-foreground">
                            Share the initial password securely. You can reset it later.
                          </div>
                        </div>
                      ) : (
                        <div className="sm:col-span-2">
                          <Alert>
                            <ShieldCheck className="h-4 w-4" />
                            <AlertTitle>Tip</AlertTitle>
                            <AlertDescription>
                              Use <span className="font-medium">Reset Password</span> to
                              change credentials safely.
                            </AlertDescription>
                          </Alert>
                        </div>
                      )}

                      <div className="sm:col-span-2 flex items-center justify-between rounded-xl border p-3">
                        <div>
                          <div className="text-sm font-medium">Adviser</div>
                          <div className="text-xs text-muted-foreground">
                            Marks this admin as an adviser (if your app uses it).
                          </div>
                        </div>
                        <Switch
                          checked={adminForm.is_adviser}
                          onCheckedChange={(v) =>
                            setAdminForm((p) => ({ ...p, is_adviser: v }))
                          }
                        />
                      </div>
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0">
                      <Button variant="outline" onClick={() => setAdminDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={submitAdminForm} disabled={!canManageAdmins}>
                        {editMode ? "Save Changes" : "Create Admin"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                {/* Delete Dialog */}
                <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle className="flex items-center gap-2">
                        <Trash2 className="h-4 w-4" />
                        Delete admin
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently remove the admin and cannot be undone.
                        <br />
                        Type <span className="font-semibold">Confirm</span> to proceed.
                      </AlertDialogDescription>
                    </AlertDialogHeader>

                    <div className="space-y-2">
                      <Label>Type Confirm</Label>
                      <Input
                        value={deleteConfirmText}
                        onChange={(e) => setDeleteConfirmText(e.target.value)}
                        placeholder="Confirm"
                      />
                    </div>

                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={(e) => {
                          e.preventDefault();
                          confirmDeleteAdmin();
                        }}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                {/* Reset Password Dialog */}
                <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
                  <DialogContent className="sm:max-w-[720px]">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <KeyRound className="h-4 w-4" />
                        Reset Password
                      </DialogTitle>
                      <DialogDescription>
                        Confirm identity and set a new password for the selected admin.
                      </DialogDescription>
                    </DialogHeader>

                    {!selectedAdmin ? (
                      <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>No admin selected</AlertTitle>
                        <AlertDescription>Select an admin first from the directory.</AlertDescription>
                      </Alert>
                    ) : (
                      <div className="space-y-4">
                        <div className="rounded-xl border p-3">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                              <AvatarImage src={selectedAdmin.avatar || ""} alt={selectedAdmin.name} />
                              <AvatarFallback>{safeInitials(selectedAdmin.name)}</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <div className="truncate text-sm font-semibold">{selectedAdmin.name}</div>
                              <div className="truncate text-xs text-muted-foreground">{selectedAdmin.email}</div>
                            </div>
                          </div>
                        </div>

                        <Alert>
                          <Lock className="h-4 w-4" />
                          <AlertTitle>Safety check</AlertTitle>
                          <AlertDescription>
                            To avoid mistakes, confirm the admin’s email and type{" "}
                            <span className="font-semibold">Confirm</span>.
                          </AlertDescription>
                        </Alert>

                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label>Type admin email</Label>
                            <Input
                              value={resetPayload.typedEmail}
                              onChange={(e) =>
                                setResetPayload((p) => ({ ...p, typedEmail: e.target.value }))
                              }
                              placeholder={selectedAdmin.email || "admin@school.edu"}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>Type Confirm</Label>
                            <Input
                              value={resetPayload.typedConfirm}
                              onChange={(e) =>
                                setResetPayload((p) => ({ ...p, typedConfirm: e.target.value }))
                              }
                              placeholder="Confirm"
                            />
                          </div>

                          <div className="space-y-2 sm:col-span-2">
                            <Label>New password</Label>
                            <div className="relative">
                              <Input
                                type={resetPayload.show ? "text" : "password"}
                                value={resetPayload.newPassword}
                                onChange={(e) =>
                                  setResetPayload((p) => ({ ...p, newPassword: e.target.value }))
                                }
                                placeholder="At least 8 characters"
                              />
                              <button
                                type="button"
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                                onClick={() =>
                                  setResetPayload((p) => ({ ...p, show: !p.show }))
                                }
                              >
                                {resetPayload.show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </button>
                            </div>
                          </div>

                          <div className="space-y-2 sm:col-span-2">
                            <Label>Confirm new password</Label>
                            <Input
                              type={resetPayload.show ? "text" : "password"}
                              value={resetPayload.confirmNew}
                              onChange={(e) =>
                                setResetPayload((p) => ({ ...p, confirmNew: e.target.value }))
                              }
                              placeholder="Repeat new password"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    <DialogFooter className="gap-2 sm:gap-0">
                      <Button variant="outline" onClick={() => setResetDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={doResetPassword} disabled={!selectedAdmin || !canManageAdmins}>
                        Reset Password
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                {!currentAdminIsSuper && !canManageAdmins ? (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Limited permissions</AlertTitle>
                    <AlertDescription>
                      Admin management is disabled unless your{" "}
                      <span className="font-mono">admin_access.admins_manage</span> is enabled.
                    </AlertDescription>
                  </Alert>
                ) : null}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
