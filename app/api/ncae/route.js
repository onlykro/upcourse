// app/api/ncae/route.js
import "server-only";

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  getNcaeQuestionnaire,
  saveNcaeQuestionnaire,
  NCAE_BUCKET,
  NCAE_PATH,
} from "@/app/services/ncae";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function ok(payload, status = 200) {
  return NextResponse.json({ success: true, ...payload }, { status });
}

function fail(err, status = 500, extra = {}) {
  const message =
    typeof err === "string"
      ? err
      : err?.message || err?.error_description || "Internal Server Error";

  const supaBits = {
    hint: err?.hint,
    details: err?.details,
    code: err?.code,
  };

  const devBits =
    process.env.NODE_ENV === "production"
      ? {}
      : { stack: typeof err === "object" ? err?.stack : undefined };

  const clean = Object.fromEntries(
    Object.entries({ ...extra, ...supaBits, ...devBits }).filter(([, v]) => v !== undefined)
  );

  return NextResponse.json({ success: false, error: message, ...clean }, { status });
}

async function safeJson(req) {
  try {
    return await req.json();
  } catch {
    return null;
  }
}

function normalizeIncoming(body) {
  // Accept { data: [...] } OR [...] directly
  if (body && typeof body === "object" && !Array.isArray(body) && "data" in body) {
    return body.data;
  }
  return body;
}

export async function GET() {
  try {
    const res = await getNcaeQuestionnaire(); // { bucket, path, data }
    return ok(res);
  } catch (e) {
    return fail(e, 500, { where: "GET /api/ncae" });
  }
}

async function upsert(req) {
  try {
    const body = await safeJson(req);
    const incoming = normalizeIncoming(body);

    if (!Array.isArray(incoming)) {
      return fail('Body must be an array OR { data: array }', 400, { got: typeof incoming });
    }

    const saved = await saveNcaeQuestionnaire(incoming);
    return ok(saved);
  } catch (e) {
    return fail(e, 500, { where: "PUT/POST /api/ncae" });
  }
}

export async function PUT(req) {
  return upsert(req);
}

export async function POST(req) {
  return upsert(req);
}

export async function DELETE() {
  try {
    const { error } = await supabaseAdmin.storage
      .from(NCAE_BUCKET)
      .remove([NCAE_PATH]);

    // Treat missing file as success
    const msg = String(error?.message || "").toLowerCase();
    const status = Number(error?.statusCode ?? error?.status ?? error?.code);
    const notFound =
      status === 404 ||
      msg.includes("not found") ||
      msg.includes("object not found") ||
      msg.includes("no such file") ||
      msg.includes("does not exist");

    if (error && !notFound) throw error;

    return ok({ bucket: NCAE_BUCKET, path: NCAE_PATH });
  } catch (e) {
    return fail(e, 500, { where: "DELETE /api/ncae" });
  }
}
