import { NextResponse } from "next/server";
import { clearAdminSession } from "@/lib/auth/admin-session.server";

export const runtime = "nodejs";

export async function POST() {
  await clearAdminSession();
  return NextResponse.json({ success: true });
}
