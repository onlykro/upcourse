import { NextResponse } from "next/server";
import { uploadQuizMediaToBucket } from "@/app/services/quizzes.server";

export async function POST(req) {
    try {
        const fd = await req.formData();
        const file = fd.get("file");
        const media = await uploadQuizMediaToBucket(file, "media/files");
        return NextResponse.json({ success: true, media });
    } catch (e) {
        return NextResponse.json({ success: false, error: e?.message || "Upload failed" }, { status: 500 });
    }
}