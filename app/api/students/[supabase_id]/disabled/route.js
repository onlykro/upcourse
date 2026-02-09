import { NextResponse } from "next/server";
import { setUserDisabled } from "@/app/services/supabase-db.server";

export async function PATCH(req, { params }) {
    try {
        const { supabase_id } = params;
        const body = await req.json();

        const is_disabled = Boolean(body?.is_disabled);
        const result = await setUserDisabled({ supabase_id, is_disabled });

        return NextResponse.json(result, { status: result.success ? 200 : 400 });
    } catch (e) {
        return NextResponse.json(
        { success: false, error: e?.message || "Failed to update status" },
        { status: 400 }
        );
    }
}