// app/api/admins/[id]/route.js
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getAdminSession } from "@/lib/auth/admin-session.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ADMIN_SELECT =
  "admin_id,created_at,updated_at,email,admin_role,admin_status,first_name,last_name,middle_name,gender,birthdate,phone_number,profile_picture,suffix,username,section,is_adviser,adviser_section,admin_level";

/** Default posture for admin_access row (matches your table defaults) */
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

function normalizeStatus(v) {
  const s = String(v ?? "").trim().toLowerCase();
  if (s === "inactive" || s === "disabled" || s === "0") return "inactive";
  return "active";
}

async function ensureAccessRow(admin_id) {
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
  const session = await getAdminSession();

  if (!session?.admin_id) {
    return { session: null, me: null, myAccess: null, isSuper: false };
  }

  const { data: me, error: meErr } = await supabaseAdmin
    .from("admins")
    .select("admin_id,email,admin_level")
    .eq("admin_id", session.admin_id)
    .maybeSingle();

  if (meErr) throw meErr;
  if (!me?.admin_id) {
    return { session: null, me: null, myAccess: null, isSuper: false };
  }

  const isSuper = String(me.admin_level || "").trim() === "Super Admin";

  // Ensure self access row exists so gating works reliably
  const myAccess = await ensureAccessRow(me.admin_id);

  return { session, me, myAccess, isSuper };
}

function canManageAdmins(ctx) {
  if (ctx.isSuper) return true;
  return !!ctx.myAccess?.admins_manage;
}

function cleanPatch(input = {}) {
  // allow updating these fields
  const allowed = [
    "admin_role",
    "admin_status",
    "first_name",
    "last_name",
    "middle_name",
    "gender",
    "birthdate",
    "phone_number",
    "profile_picture",
    "suffix",
    "username",
    "section",
    "is_adviser",
    "adviser_section",
    // admin_level handled separately (super only)
    // password handled separately (super/manager only)
  ];

  const out = {};
  for (const k of allowed) {
    if (!(k in input)) continue;

    if (k === "is_adviser") out[k] = !!input[k];
    else if (k === "admin_status") out[k] = normalizeStatus(input[k]);
    else out[k] = input[k];
  }

  return out;
}

async function getTargetAdmin(adminId) {
  const { data, error } = await supabaseAdmin
    .from("admins")
    .select("admin_id,admin_level,email")
    .eq("admin_id", adminId)
    .maybeSingle();

  if (error) throw error;
  return data || null;
}

/** PATCH /api/admins/:id */
export async function PATCH(req, { params }) {
  try {
    const adminId = decodeURIComponent(params.id);

    const ctx = await getRequesterContext();
    if (!ctx.session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    if (!canManageAdmins(ctx)) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const target = await getTargetAdmin(adminId);
    if (!target) {
      return NextResponse.json({ success: false, error: "Admin not found" }, { status: 404 });
    }

    // non-super cannot edit a Super Admin
    if (String(target.admin_level || "").trim() === "Super Admin" && !ctx.isSuper) {
      return NextResponse.json(
        { success: false, error: "Only Super Admin can modify a Super Admin" },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const patchIncoming = body?.patch || body || {};

    const next = cleanPatch(patchIncoming);

    // Only Super Admin can change admin_level (promotion/demotion)
    if ("admin_level" in patchIncoming) {
      if (!ctx.isSuper) {
        return NextResponse.json(
          { success: false, error: "Only Super Admin can change admin level" },
          { status: 403 }
        );
      }
      const lvl = String(patchIncoming.admin_level || "").trim();
      if (!lvl) {
        return NextResponse.json({ success: false, error: "admin_level cannot be empty" }, { status: 400 });
      }
      next.admin_level = lvl;
    }

    // Optional password reset (your table has admins.password)
    // SECURITY NOTE: Ideally store hashed passwords, not plaintext.
    if ("password" in patchIncoming) {
      const pw = String(patchIncoming.password || "");
      if (!pw.trim()) {
        return NextResponse.json({ success: false, error: "Password cannot be empty" }, { status: 400 });
      }
      next.password = pw;
    }

    // nothing to update
    if (!Object.keys(next).length) {
      return NextResponse.json({ success: true, data: target }, { status: 200 });
    }

    const upd = await supabaseAdmin
      .from("admins")
      .update(next)
      .eq("admin_id", adminId)
      .select(ADMIN_SELECT)
      .single();

    if (upd.error) throw upd.error;

    // never return password
    const { password: _pw, ...safe } = upd.data || {};
    // normalize status for UI consistency
    safe.admin_status = normalizeStatus(safe.admin_status);

    return NextResponse.json({ success: true, data: safe });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e?.message || "Failed to update admin" },
      { status: 500 }
    );
  }
}

/** DELETE /api/admins/:id */
export async function DELETE(_req, { params }) {
  try {
    const adminId = decodeURIComponent(params.id);

    const ctx = await getRequesterContext();
    if (!ctx.session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    if (!canManageAdmins(ctx)) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    // prevent deleting self
    if (String(ctx.me?.admin_id || "") === String(adminId)) {
      return NextResponse.json(
        { success: false, error: "You cannot delete your own account." },
        { status: 400 }
      );
    }

    const target = await getTargetAdmin(adminId);
    if (!target) {
      return NextResponse.json({ success: false, error: "Admin not found" }, { status: 404 });
    }

    // prevent non-super from deleting super admins
    if (String(target.admin_level || "").trim() === "Super Admin" && !ctx.isSuper) {
      return NextResponse.json(
        { success: false, error: "Only Super Admin can delete a Super Admin" },
        { status: 403 }
      );
    }

    // FK ON DELETE CASCADE exists, but explicit delete is fine too
    await supabaseAdmin.from("admin_access").delete().eq("admin_id", adminId);

    const del = await supabaseAdmin.from("admins").delete().eq("admin_id", adminId);
    if (del.error) throw del.error;

    return NextResponse.json({ success: true, data: true });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e?.message || "Failed to delete admin" },
      { status: 500 }
    );
  }
}
