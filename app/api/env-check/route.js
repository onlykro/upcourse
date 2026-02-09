import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    vercelEnv: process.env.VERCEL_ENV || null,
    hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasAnon: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    hasService: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    hasAdminSecret: !!process.env.ADMIN_SESSION_SECRET,
  });
}
