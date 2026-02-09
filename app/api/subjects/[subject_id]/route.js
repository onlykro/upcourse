// app/api/subjects/[subject_id]/route.js
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error("Missing Supabase env vars.");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const TABLE = "subjects";

const toStr = (v) => String(v ?? "").trim();

// ✅ params is a Promise in your Next version, so we must await it
async function getSubjectIdOrThrow(params) {
    const p = await params; // <-- important
    const raw = p?.subject_id;
    const id = toStr(raw ? decodeURIComponent(raw) : "");
    if (!id) throw new Error("Missing subject_id in URL.");
    return id;
}

export async function GET(_req, { params }) {
    try {
        const subject_id = await getSubjectIdOrThrow(params);

        const { data, error } = await supabase
        .from(TABLE)
        .select("*")
        .eq("subject_id", subject_id)
        .maybeSingle();

        if (error) throw error;
        if (!data) {
        return NextResponse.json(
            { success: false, error: "Subject not found." },
            { status: 404 }
        );
        }

        return NextResponse.json({ success: true, subject: data }, { status: 200 });
    } catch (e) {
        return NextResponse.json(
        { success: false, error: e?.message || "Bad Request" },
        { status: 400 }
        );
    }
}

export async function PUT(req, { params }) {
    try {
        const subject_id = await getSubjectIdOrThrow(params);
        const body = await req.json().catch(() => ({}));

        // ✅ never allow changing the PK
        if ("subject_id" in body) delete body.subject_id;

        // optional alias support
        if ("description" in body && !("subject_description" in body)) {
        body.subject_description = toStr(body.description);
        delete body.description;
        }

        // optional: keep updated_at current (if you don't have a DB trigger)
        body.updated_at = new Date().toISOString();

        const { data, error } = await supabase
        .from(TABLE)
        .update(body)
        .eq("subject_id", subject_id)
        .select("*")
        .maybeSingle();

        if (error) throw error;
        if (!data) {
        return NextResponse.json(
            { success: false, error: "Subject not found." },
            { status: 404 }
        );
        }

        return NextResponse.json({ success: true, subject: data }, { status: 200 });
    } catch (e) {
        return NextResponse.json(
        { success: false, error: e?.message || "Bad Request" },
        { status: 400 }
        );
    }
}

export async function DELETE(_req, { params }) {
    try {
        const subject_id = await getSubjectIdOrThrow(params);

        const { error } = await supabase.from(TABLE).delete().eq("subject_id", subject_id);
        if (error) throw error;

        return NextResponse.json({ success: true }, { status: 200 });
    } catch (e) {
        return NextResponse.json(
        { success: false, error: e?.message || "Bad Request" },
        { status: 400 }
        );
    }
}
