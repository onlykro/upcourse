import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
    const supabase = await createClient();

    // Change "instruments" to a table you actually have
    const { data, error } = await supabase.from("users").select("*").limit(5);

    if (error) {
        return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
        );
    }

    return NextResponse.json({ ok: true, data });
}