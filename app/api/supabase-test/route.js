// app/api/supabase-test/route.js
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = createClient();
  const { data, error } = await supabase.from("subjects").select("subject_id").limit(1);

  return NextResponse.json({
    success: !error,
    data: data ?? null,
    error: error?.message ?? null,
  });
}
