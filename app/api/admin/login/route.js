import { NextResponse } from "next/server";
import { loginAdmin } from "@/app/services/supabase-db.server";
import { setAdminSession } from "@/lib/auth/admin-session.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    const body = await req.json();
    const login = (body?.login || "").trim();
    const password = body?.password || "";
    const rememberMe = !!body?.rememberMe;

    if (!login || !password) {
      return NextResponse.json(
        { success: false, error: "Please enter your email/username and password." },
        { status: 400 }
      );
    }

    const result = await loginAdmin(login, password);

    if (!result?.success) {
      return NextResponse.json(
        { success: false, error: result?.error || "Incorrect username or password." },
        { status: 401 }
      );
    }

    const admin = result.admin || {};
    const { password: _pw, ...safeAdmin } = admin;

    const res = NextResponse.json({ success: true, admin: safeAdmin }, { status: 200 });

    // ✅ IMPORTANT: set cookie ON the response
    setAdminSession(
      {
        admin_id: safeAdmin.admin_id,
        email: safeAdmin.email,
        admin_level: safeAdmin.admin_level,
      },
      res,
      rememberMe
    );

    return res;
  } catch (err) {
    console.error("API /api/admin/login error:", err);
    return NextResponse.json(
      { success: false, error: "Login failed. Try again." },
      { status: 500 }
    );
  }
}
