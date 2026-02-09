// Real authentication utilities for UpCourse admin dashboard (Next.js App Router)
// Uses /api/admin/login which calls Supabase server function loginAdmin()

const AUTH_STORAGE_KEY = "upcourse_auth";

// ------------------------------------------------------
// Helpers
// ------------------------------------------------------
function safeParse(json) {
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function now() {
  return Date.now();
}

function normalizeRole(admin) {
  // Map your DB admin_level/admin_role into app roles used by UI checks
  const level = String(admin?.admin_level || "").toLowerCase();
  const role = String(admin?.admin_role || "").toLowerCase();

  if (level.includes("super") || role.includes("super")) return "super_admin";
  if (level.includes("faculty") || role.includes("faculty")) return "faculty";
  return "admin";
}

function buildFullName(admin) {
  const fullName = [
    admin?.first_name,
    admin?.middle_name ? `${admin.middle_name}.` : "",
    admin?.last_name,
    admin?.suffix,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return fullName || admin?.username || admin?.email || "Admin";
}

function getStorage(preferLocal) {
  if (typeof window === "undefined") return null;
  return preferLocal ? window.localStorage : window.sessionStorage;
}

function clearAllStorageCopies() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(AUTH_STORAGE_KEY);
  window.sessionStorage.removeItem(AUTH_STORAGE_KEY);
}

function writeSession(sessionData, rememberMe) {
  if (typeof window === "undefined") return;

  // store only in ONE place
  clearAllStorageCopies();

  const storage = rememberMe ? window.localStorage : window.sessionStorage;

  // expiry: 30 days if rememberMe else 1 day
  const expiresAt = now() + (rememberMe ? 30 : 1) * 24 * 60 * 60 * 1000;

  const payload = {
    ...sessionData,
    __meta: {
      rememberMe: !!rememberMe,
      storedAt: now(),
      expiresAt,
    },
  };

  storage.setItem(AUTH_STORAGE_KEY, JSON.stringify(payload));
}

function readSessionFrom(storage) {
  const raw = storage.getItem(AUTH_STORAGE_KEY);
  if (!raw) return null;

  const parsed = safeParse(raw);
  if (!parsed) return null;

  const expiresAt = parsed?.__meta?.expiresAt;
  if (expiresAt && now() > expiresAt) {
    storage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }

  return parsed;
}

function getStoredSession() {
  if (typeof window === "undefined") return null;

  const local = readSessionFrom(window.localStorage);
  const session = readSessionFrom(window.sessionStorage);

  // If both exist (shouldn't), pick the newest
  if (local && session) {
    const a = local?.__meta?.storedAt || 0;
    const b = session?.__meta?.storedAt || 0;
    return a >= b ? local : session;
  }

  return local || session || null;
}

// ------------------------------------------------------
// Login (real)
// ------------------------------------------------------
// Backward compatible signature:
// login(email, password)
// New signature also works:
// login(loginValue, password, rememberMe)
export const login = async (emailOrUsername, password, rememberMe = false) => {
  const loginValue = String(emailOrUsername || "").trim();

  if (!loginValue || !password) {
    return { success: false, error: "Please enter your email/username and password." };
  }

  try {
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login: loginValue, password }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok || !data?.success) {
      return { success: false, error: data?.error || "Invalid email/username or password." };
    }

    const admin = data.admin || {};

    // Build session data compatible with your UI
    const role = admin.role || normalizeRole(admin);
    const fullName = admin.name || buildFullName(admin);

    const sessionData = {
      // keep existing keys your dashboard expects
      id: admin.admin_id || admin.id || admin.supabase_id || admin.email,
      email: admin.email,
      name: fullName,

      first_name: admin.first_name || "",
      middle_name: admin.middle_name || "",
      last_name: admin.last_name || "",
      suffix: admin.suffix || "",

      username: admin.username || "",
      role, // 'super_admin' | 'admin' | 'faculty' (based on normalizeRole)
      role_type: admin.admin_level || admin.admin_role || role,

      avatar: admin.avatar || null,

      // If you later add permissions in DB, it will be used automatically.
      // For now, keep it as object so existing checks won't crash.
      permissions: admin.permissions || {},

      // extra useful fields
      admin_id: admin.admin_id || null,
      admin_level: admin.admin_level || null,
      admin_role: admin.admin_role || null,
      admin_status: admin.admin_status || admin.status || "active",
      section: admin.section || "",
      is_adviser: !!admin.is_adviser,
      adviser_section: admin.adviser_section || null,

      logged_in_at: new Date().toISOString(),
    };

    writeSession(sessionData, rememberMe);

    return { success: true, user: sessionData };
  } catch (err) {
    console.error("auth.login error:", err);
    return { success: false, error: "Login failed. Try again." };
  }
};

// ------------------------------------------------------
// Logout
// ------------------------------------------------------
export const logout = async () => {
  clearAllStorageCopies();
  return { success: true };
};

// ------------------------------------------------------
// Current user/session helpers
// ------------------------------------------------------
export const getCurrentUser = () => {
  if (typeof window === "undefined") return null;
  return getStoredSession();
};

export const isAuthenticated = () => {
  return getCurrentUser() !== null;
};

export const hasRole = (requiredRole) => {
  const user = getCurrentUser();
  if (!user) return false;

  if (requiredRole === "admin") {
    return user.role === "admin" || user.role === "super_admin";
  }

  return user.role === requiredRole;
};

export const isSuperAdmin = () => {
  const user = getCurrentUser();
  return user?.role === "super_admin";
};

// If you don't have permissions stored in DB yet,
// this falls back to role-based allow for admins.
export const hasPermission = (permissionPath) => {
  const user = getCurrentUser();
  if (!user) return false;

  // Super admins have all permissions
  if (user.role === "super_admin") return true;

  // If no permissions object exists yet, default allow for admins (prevents locking UI)
  // Change this to "return false" if you want strict permission gating.
  if (!user.permissions) return user.role === "admin" || user.role === "faculty";

  const parts = permissionPath.split(".");
  let current = user.permissions;

  for (const part of parts) {
    if (current === undefined || current === null) return false;
    current = current[part];
  }

  return current === true;
};

export const canAccessGradeLevel = (gradeLevel) => {
  const user = getCurrentUser();
  if (!user) return false;

  if (user.role === "super_admin") return true;

  const allowedLevels = user?.permissions?.grade_level_access || null;

  // If grade access isn't implemented yet, default allow for admins
  if (!Array.isArray(allowedLevels)) {
    return user.role === "admin" || user.role === "faculty";
  }

  return allowedLevels.includes(gradeLevel);
};

export const getUserFullName = (user = null) => {
  const currentUser = user || getCurrentUser();
  if (!currentUser) return "";
  return currentUser.name || buildFullName(currentUser);
};

export const getUserInitials = (user = null) => {
  const currentUser = user || getCurrentUser();
  if (!currentUser) return "?";

  const first = currentUser.first_name?.[0] || "";
  const last = currentUser.last_name?.[0] || "";

  return (first + last).toUpperCase() || "?";
};

export const formatRole = (role) => {
  const roleLabels = {
    super_admin: "Super Admin",
    admin: "Admin",
    faculty: "Faculty",
  };
  return roleLabels[role] || role;
};

export const maskEmail = (email, showFull = false) => {
  if (showFull) return email;

  const [localPart, domain] = String(email || "").split("@");
  if (!domain) return email;

  const maskedLocal = (localPart?.[0] || "") + "*".repeat(Math.max((localPart?.length || 1) - 1, 5));
  return `${maskedLocal}@${domain}`;
};

export const updateStoredUser = (updates) => {
  const currentUser = getCurrentUser();
  if (!currentUser) return null;

  const updatedUser = { ...currentUser, ...updates };

  // keep meta if present
  const meta = currentUser.__meta || null;
  if (meta) updatedUser.__meta = meta;

  // write back to whichever storage currently holds it
  if (typeof window !== "undefined") {
    const inLocal = !!window.localStorage.getItem(AUTH_STORAGE_KEY);
    const storage = inLocal ? window.localStorage : window.sessionStorage;
    storage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updatedUser));
  }

  return updatedUser;
};

export const validatePassword = (password) => {
  const errors = [];

  if (password.length < 8) errors.push("Password must be at least 8 characters");
  if (!/[A-Z]/.test(password)) errors.push("Password must contain at least one uppercase letter");
  if (!/[a-z]/.test(password)) errors.push("Password must contain at least one lowercase letter");
  if (!/[0-9]/.test(password)) errors.push("Password must contain at least one number");
  if (!/[!@#$%^&*]/.test(password)) errors.push("Password must contain at least one special character (!@#$%^&*)");

  return { valid: errors.length === 0, errors };
};

export default {
  login,
  logout,
  getCurrentUser,
  isAuthenticated,
  hasRole,
  isSuperAdmin,
  hasPermission,
  canAccessGradeLevel,
  getUserFullName,
  getUserInitials,
  formatRole,
  maskEmail,
  updateStoredUser,
  validatePassword,
};
