import { NextResponse } from "next/server";
import { getTrackById, updateTrack, deleteTrack } from "@/app/services/tracks.server";

export async function GET(_req, { params }) {
    const track = await getTrackById(params.id);
    if (!track) {
        return NextResponse.json({ success: false, error: "Track not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, track }, { status: 200 });
    }

    export async function PUT(req, { params }) {
    try {
        const body = await req.json();
        const result = await updateTrack(params.id, body);

        if (!result.success) {
        return NextResponse.json(
            { success: false, error: result.error || "Failed to update track" },
            { status: 400 }
        );
        }

        return NextResponse.json({ success: true, track: result.track }, { status: 200 });
    } catch (err) {
        console.error("PUT /api/tracks/[id] error:", err);
        return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
    }
}

export async function DELETE(_req, { params }) {
    try {
        const result = await deleteTrack(params.id);

        if (!result.success) {
        return NextResponse.json(
            { success: false, error: result.error || "Failed to delete track" },
            { status: 400 }
        );
        }

        return NextResponse.json({ success: true }, { status: 200 });
    } catch (err) {
        console.error("DELETE /api/tracks/[id] error:", err);
        return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
    }
}