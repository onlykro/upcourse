import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getAdminSession } from "@/lib/auth/admin-session.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ADMIN_SELECT =
  "admin_id,created_at,updated_at,email,admin_role,admin_status,first_name,last_name,middle_name,gender,birthdate,phone_number,profile_picture,suffix,username,section,is_adviser,adviser_section,admin_level";

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

async function ensureMyAccessRow(admin_id) {
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
  const session = getAdminSession();
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
  const myAccess = await ensureMyAccessRow(me.admin_id);

  return { session, me, myAccess, isSuper };
}

function canViewAdmins(ctx) {
  if (ctx.isSuper) return true;
  return !!ctx.myAccess?.admins_view || !!ctx.myAccess?.admins_manage;
}

function canManageAdmins(ctx) {
  if (ctx.isSuper) return true;
  return !!ctx.myAccess?.admins_manage;
}

/** GET /api/admins (list) */
export async function GET() {
  try {
    const ctx = await getRequesterContext();
    if (!ctx.session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    if (!canViewAdmins(ctx)) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const { data, error } = await supabaseAdmin
      .from("admins")
      .select(ADMIN_SELECT)
      .order("created_at", { ascending: false });

    if (error) throw error;

    // never return password
    return NextResponse.json({ success: true, data: data || [], admins: data || [] });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e?.message || "Failed to load admins" },
      { status: 500 }
    );
  }
}

/** POST /api/admins (create) */
export async function POST(req) {
  try {
    const ctx = await getRequesterContext();
    if (!ctx.session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    if (!canManageAdmins(ctx)) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));

    const email = String(body?.email || "").trim();
    const password = String(body?.password || "").trim();
    const admin_level = String(body?.admin_level || "Admin").trim();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "Email and password are required." },
        { status: 400 }
      );
    }

    if (admin_level === "Super Admin" && !ctx.isSuper) {
      return NextResponse.json(
        { success: false, error: "Only Super Admin can create a Super Admin." },
        { status: 403 }
      );
    }

    // Insert admin
    const ins = await supabaseAdmin
      .from("admins")
      .insert({
        email,
        password, // NOTE: ideally hash
        admin_level,
        admin_role: body?.admin_role ?? "Faculty",
        admin_status: body?.admin_status ?? "Active",
        first_name: body?.first_name ?? "",
        last_name: body?.last_name ?? "",
        middle_name: body?.middle_name ?? "",
        gender: body?.gender ?? null,
        birthdate: body?.birthdate ?? null,
        phone_number: body?.phone_number ?? "",
        profile_picture: body?.profile_picture ?? "",
        suffix: body?.suffix ?? "",
        username: body?.username ?? "",
        section: body?.section ?? "",
        is_adviser: !!body?.is_adviser,
        adviser_section: body?.adviser_section ?? "",
      })
      .select(ADMIN_SELECT)
      .single();

    if (ins.error) throw ins.error;

    // Ensure access row exists (defaults)
    await supabaseAdmin
      .from("admin_access")
      .insert(defaultAccessRow(ins.data.admin_id))
      .select("admin_id")
      .maybeSingle()
      .catch(() => null);

    return NextResponse.json({ success: true, data: ins.data });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e?.message || "Failed to create admin" },
      { status: 500 }
    );
  }
}
