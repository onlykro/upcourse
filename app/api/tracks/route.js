import { NextResponse } from "next/server";
import { getTracks, createTrack } from "@/app/services/tracks.server";

export async function GET(req) {
    // SWR might call without params – keep this safe
    const search = String(req?.nextUrl?.searchParams?.get("search") ?? "").trim();

    const tracks = await getTracks({ search });
    return NextResponse.json({ success: true, tracks }, { status: 200 });
}

export async function POST(req) {
    try {
        const body = await req.json();
        const result = await createTrack(body);

        if (!result.success) {
        return NextResponse.json(
            { success: false, error: result.error || "Failed to create track" },
            { status: 400 }
        );
        }

        return NextResponse.json({ success: true, track: result.track }, { status: 201 });
    } catch (err) {
        console.error("POST /api/tracks error:", err);
        return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
    }
}
