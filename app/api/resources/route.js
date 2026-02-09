import { NextResponse } from "next/server";
import { getResources, createResource } from "@/app/services/resources.server";

export async function GET(req) {
    try {
        const sp = req?.nextUrl?.searchParams;
        const subject_id = String(sp?.get("subject_id") ?? "").trim();
        const search = String(sp?.get("search") ?? "").trim();
        const limit = Number(sp?.get("limit") ?? 200);

        const resources = await getResources({ subject_id, search, limit });
        return NextResponse.json({ success: true, resources }, { status: 200 });
    } catch (err) {
        console.error("GET /api/resources error:", err);
        return NextResponse.json(
        { success: false, error: err?.message || "Server error" },
        { status: 500 }
        );
    }
}

export async function POST(req) {
    try {
        const body = await req.json();
        const result = await createResource(body);

        if (!result.success) {
        return NextResponse.json(
            { success: false, error: result.error || "Failed to create resource" },
            { status: 400 }
        );
        }

        return NextResponse.json({ success: true, resource: result.resource }, { status: 201 });
    } catch (err) {
        console.error("POST /api/resources error:", err);
        return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
    }
}