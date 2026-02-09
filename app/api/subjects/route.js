// app/api/subjects/route.js
import { NextResponse } from "next/server";
import { getSubjects, createSubject } from "@/app/services/subjects.server";

export async function GET(req) {
    const sp = req?.nextUrl?.searchParams;

    const search = String(sp?.get("search") ?? "").trim();
    const track_id = String(sp?.get("track_id") ?? "").trim();
    const category = String(sp?.get("category") ?? "").trim();
    const status = String(sp?.get("status") ?? "").trim();
    const type = String(sp?.get("type") ?? "").trim();
    const sort = String(sp?.get("sort") ?? "name-asc").trim();

    const page = Number(sp?.get("page") ?? 1);
    const limit = Number(sp?.get("limit") ?? 12);

    const result = await getSubjects({
        search,
        track_id,
        category,
        status,
        type,
        sort,
        page,
        limit,
    });

    return NextResponse.json({ success: true, ...result }, { status: 200 });
}

export async function POST(req) {
    try {
        const body = await req.json();

        if (!String(body?.track_id ?? "").trim()) {
        return NextResponse.json(
            { success: false, error: "track_id is required." },
            { status: 400 }
        );
        }

        const result = await createSubject(body);

        if (!result.success) {
        return NextResponse.json(
            { success: false, error: result.error || "Failed to create subject" },
            { status: 400 }
        );
        }

        return NextResponse.json(
        { success: true, subject: result.subject },
        { status: 201 }
        );
    } catch (err) {
        console.error("POST /api/subjects error:", err);
        return NextResponse.json(
        { success: false, error: "Server error" },
        { status: 500 }
        );
    }
}
