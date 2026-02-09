import { NextResponse } from "next/server";
import {
    getResourceById,
    updateResource,
    deleteResourceAndFile,
} from "@/app/services/resources.server";

export async function GET(_req, { params }) {
    const row = await getResourceById(params.id);
    if (!row) {
        return NextResponse.json({ success: false, error: "Resource not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, resource: row }, { status: 200 });
}

export async function PUT(req, { params }) {
    try {
        const body = await req.json();
        const result = await updateResource(params.id, body);

        if (!result.success) {
        return NextResponse.json(
            { success: false, error: result.error || "Failed to update resource" },
            { status: 400 }
        );
        }

        return NextResponse.json({ success: true, resource: result.resource }, { status: 200 });
    } catch (err) {
        console.error("PUT /api/resources/[id] error:", err);
        return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
    }
}

export async function DELETE(_req, { params }) {
    try {
        const result = await deleteResourceAndFile(params.id);

        if (!result.success) {
        return NextResponse.json(
            { success: false, error: result.error || "Failed to delete resource" },
            { status: 400 }
        );
        }

        return NextResponse.json({ success: true }, { status: 200 });
    } catch (err) {
        console.error("DELETE /api/resources/[id] error:", err);
        return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
    }
}