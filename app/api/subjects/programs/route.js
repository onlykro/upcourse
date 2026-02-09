import { NextResponse } from "next/server";
import { getSubjectPrograms } from "@/app/services/subjects.server";

export async function GET() {
    const programs = await getSubjectPrograms();
    return NextResponse.json({ success: true, programs }, { status: 200 });
}