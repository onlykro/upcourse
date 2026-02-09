// app/api/subjects/programs/route.js
import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json(
    { success: false, error: "Programs endpoint removed." },
    { status: 404 }
  );
}
