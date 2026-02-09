// app/api/quizzes/route.js
import { NextResponse } from "next/server";
import { getQuizzesFromBucket, saveQuizToBucket } from "@/app/services/quizzes.server";

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const subject_id = searchParams.get("subject_id") || "";
        const search = searchParams.get("search") || "";
        const limit = searchParams.get("limit") || "200";

        const quizzes = await getQuizzesFromBucket({ subject_id, search, limit: Number(limit) || 200 });
        return NextResponse.json({ success: true, quizzes });
    } catch (e) {
        return NextResponse.json({ success: false, error: e?.message || "Failed" }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const payload = await req.json();
        const quiz = await saveQuizToBucket(payload);
        return NextResponse.json({ success: true, quiz });
    } catch (e) {
        return NextResponse.json({ success: false, error: e?.message || "Failed" }, { status: 500 });
    }
}
