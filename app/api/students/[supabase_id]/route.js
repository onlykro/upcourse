import { NextResponse } from "next/server";
import { updateStudent, deleteStudent } from "@/app/services/supabase-db.server";

export async function PATCH(req, { params }) {
    try {
        const { supabase_id } = params;
        const body = await req.json();

        const result = await updateStudent({ ...body, supabase_id });
        return NextResponse.json(result, { status: result.success ? 200 : 400 });
    } catch (e) {
        return NextResponse.json(
        { success: false, error: e?.message || "Failed to update student" },
        { status: 400 }
        );
    }
    }

export async function DELETE(req, { params }) {
    try {
        const { supabase_id } = params;
        const result = await deleteStudent({ supabase_id });
        return NextResponse.json(result, { status: result.success ? 200 : 400 });
    } catch (e) {
        return NextResponse.json(
        { success: false, error: e?.message || "Failed to delete student" },
        { status: 400 }
        );
    }
}