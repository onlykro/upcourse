// lib/adminAccess.js

export const ADMIN_ACCESS_KEYS = [
  "scope_junior",
  "scope_senior",

  "quizzes_create",
  "quizzes_edit",
  "quizzes_delete",
  "quizzes_publish",

  "subjects_view",
  "subjects_manage",

  "strands_view",
  "strands_manage",

  "students_view",
  "students_manage",

  "reports_view",
  "reports_export",

  // admin management
  "admins_view",
  "admins_manage",
  "admins_invite",
  "admins_remove",
];

/** Coerce truthy/falsy to booleans for known keys only. */
export function coerceAdminAccessPatch(patch = {}) {
  const next = {};
  for (const k of ADMIN_ACCESS_KEYS) {
    if (k in patch) next[k] = !!patch[k];
  }
  return next;
}

export function buildDefaultAdminAccess(admin_id) {
  return {
    admin_id,

    scope_junior: false,
    scope_senior: false,

    quizzes_create: false,
    quizzes_edit: false,
    quizzes_delete: false,
    quizzes_publish: false,

    subjects_view: true,
    subjects_manage: false,

    strands_view: true,
    strands_manage: false,

    students_view: true,
    students_manage: false,

    reports_view: true,
    reports_export: false,

    admins_view: true,
    admins_manage: false,
    admins_invite: false,
    admins_remove: false,
  };
}