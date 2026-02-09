import { NextResponse } from "next/server";
import { getData, addStudent } from "@/app/services/supabase-db.server";

export async function GET() {
    try {
        const data = await getData();
        return NextResponse.json({ success: true, data });
    } catch (e) {
        return NextResponse.json(
        { success: false, error: e?.message || "Failed to load students" },
        { status: 500 }
        );
    }
}

export async function POST(req) {
    try {
        const body = await req.json();
        const result = await addStudent(body);
        return NextResponse.json(result, { status: result.success ? 200 : 400 });
    } catch (e) {
        return NextResponse.json(
        { success: false, error: e?.message || "Failed to add student" },
        { status: 400 }
        );
    }
}