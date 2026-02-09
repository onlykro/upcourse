// app/api/admin/access/[id]/route.js
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getAdminSession } from "@/lib/auth/admin-session.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ACCESS_KEYS = [
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
  "admins_view",
  "admins_manage",
  "admins_invite",
  "admins_remove",
];

function coercePatch(patch = {}) {
  const next = {};
  for (const k of ACCESS_KEYS) {
    if (k in patch) next[k] = !!patch[k];
  }
  return next;
}

function defaultAccessRow(admin_id) {
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

/**
 * Ensures the requester (current logged-in admin) has an admin_access row.
 * This prevents a "first login can't see access panel" deadlock.
 */
async function ensureSelfAccessRow(admin_id) {
  const { data, error } = await supabaseAdmin
    .from("admin_access")
    .select("*")
    .eq("admin_id", admin_id)
    .maybeSingle();

  if (error) throw error;
  if (data) return data;

  const ins = await supabaseAdmin
    .from("admin_access")
    .insert(defaultAccessRow(admin_id))
    .select("*")
    .single();

  if (ins.error) throw ins.error;
  return ins.data;
}

async function getRequesterContext() {
  // ✅ Your app's real auth: httpOnly cookie session
  const session = await getAdminSession();

  if (!session?.admin_id) {
    return { session: null, me: null, myAccess: null, isSuper: false };
  }

  // Load the admin row (source of truth)
  const { data: me, error: meErr } = await supabaseAdmin
    .from("admins")
    .select("admin_id,email,admin_level")
    .eq("admin_id", session.admin_id)
    .maybeSingle();

  if (meErr) throw meErr;

  // If session exists but admin row doesn't, treat as unauthorized
  if (!me?.admin_id) {
    return { session: null, me: null, myAccess: null, isSuper: false };
  }

  const isSuper = String(me.admin_level || "").trim() === "Super Admin";

  // ✅ Ensure self access row exists (so canView/canManage decisions are stable)
  const myAccess = await ensureSelfAccessRow(me.admin_id);

  return { session, me, myAccess, isSuper };
}

function canViewAccess(ctx) {
  if (ctx.isSuper) return true;
  return !!ctx.myAccess?.admins_view || !!ctx.myAccess?.admins_manage;
}

function canManageAccess(ctx) {
  if (ctx.isSuper) return true;
  return !!ctx.myAccess?.admins_manage;
}

async function ensureTargetAccessRow(admin_id) {
  // Make sure target admin exists (prevents FK insert error)
  const { data: adminRow, error: adminErr } = await supabaseAdmin
    .from("admins")
    .select("admin_id")
    .eq("admin_id", admin_id)
    .maybeSingle();

  if (adminErr) throw adminErr;
  if (!adminRow?.admin_id) return null;

  const { data, error } = await supabaseAdmin
    .from("admin_access")
    .select("*")
    .eq("admin_id", admin_id)
    .maybeSingle();

  if (error) throw error;
  if (data) return data;

  const ins = await supabaseAdmin
    .from("admin_access")
    .insert(defaultAccessRow(admin_id))
    .select("*")
    .single();

  if (ins.error) throw ins.error;
  return ins.data;
}

/** GET /api/admin/access/:id */
export async function GET(req, { params }) {
  try {
    const adminId = decodeURIComponent(params.id);

    const ctx = await getRequesterContext();
    if (!ctx.session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const isSelf = String(ctx.me?.admin_id || "") === String(adminId);

    // ✅ Allow self to view own access; others require admins_view/admins_manage or super
    if (!isSelf && !canViewAccess(ctx)) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const { data, error } = await supabaseAdmin
      .from("admin_access")
      .select("*")
      .eq("admin_id", adminId)
      .maybeSingle();

    if (error) throw error;

    return NextResponse.json({ success: true, data: data || null });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e?.message || "Failed to load access" },
      { status: 500 }
    );
  }
}

/** POST /api/admin/access/:id  (ensure row) */
export async function POST(req, { params }) {
  try {
    const adminId = decodeURIComponent(params.id);

    const ctx = await getRequesterContext();
    if (!ctx.session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const isSelf = String(ctx.me?.admin_id || "") === String(adminId);

    /**
     * ✅ Ensure row rules:
     * - Self: allowed (so first-login can bootstrap its own row)
     * - Others: require admins_manage (or Super Admin)
     */
    if (!isSelf && !canManageAccess(ctx)) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const ensured = await ensureTargetAccessRow(adminId);
    if (!ensured) {
      return NextResponse.json({ success: false, error: "Admin not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: ensured });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e?.message || "Failed to ensure access" },
      { status: 500 }
    );
  }
}

/** PATCH /api/admin/access/:id */
export async function PATCH(req, { params }) {
  try {
    const adminId = decodeURIComponent(params.id);
    const body = await req.json().catch(() => ({}));
    const patch = body?.patch || body || {};

    const ctx = await getRequesterContext();
    if (!ctx.session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    // ✅ Only Super Admin or admins_manage can change access for anyone (including self)
    if (!canManageAccess(ctx)) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const ensured = await ensureTargetAccessRow(adminId);
    if (!ensured) {
      return NextResponse.json({ success: false, error: "Admin not found" }, { status: 404 });
    }

    const next = coercePatch(patch);

    // no-op patch
    if (!Object.keys(next).length) {
      return NextResponse.json({ success: true, data: ensured }, { status: 200 });
    }

    const { data, error } = await supabaseAdmin
      .from("admin_access")
      .update(next)
      .eq("admin_id", adminId)
      .select("*")
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e?.message || "Failed to save access" },
      { status: 500 }
    );
  }
}
