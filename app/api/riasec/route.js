// app/api/riasec/route.js
import "server-only";

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  getRiasecItems,
  saveRiasecItems,
  RIASEC_BUCKET,
  RIASEC_PATH,
} from "@/app/services/riasec";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function isNotFoundError(err) {
  const msg = String(err?.message || "").toLowerCase();
  const status = Number(err?.statusCode ?? err?.status ?? err?.code);
  return (
    status === 404 ||
    msg.includes("not found") ||
    msg.includes("object not found") ||
    msg.includes("no such file") ||
    msg.includes("does not exist")
  );
}

async function safeJson(req) {
  try {
    return await req.json();
  } catch {
    return null;
  }
}

function ok(payload, status = 200) {
  return NextResponse.json({ success: true, ...payload }, { status });
}

function fail(err, status = 500, extra = {}) {
  const message =
    typeof err === "string"
      ? err
      : err?.message || err?.error_description || "Internal Server Error";

  const supaBits = { hint: err?.hint, details: err?.details, code: err?.code };

  const devBits =
    process.env.NODE_ENV === "production"
      ? {}
      : { stack: typeof err === "object" ? err?.stack : undefined };

  const clean = Object.fromEntries(
    Object.entries({ ...extra, ...supaBits, ...devBits }).filter(([, v]) => v !== undefined)
  );

  return NextResponse.json({ success: false, error: message, ...clean }, { status });
}

function normalizeIncoming(body) {
  if (body && typeof body === "object" && !Array.isArray(body) && "data" in body) return body.data;
  return body;
}

export async function GET() {
  try {
    const res = await getRiasecItems();
    return ok(res);
  } catch (e) {
    return fail(e, 500, { where: "GET /api/riasec" });
  }
}

async function upsertRiasec(req) {
  try {
    const body = await safeJson(req);
    const incoming = normalizeIncoming(body);

    if (incoming === undefined || incoming === null) {
      return fail('Missing body "data".', 400);
    }

    const saved = await saveRiasecItems(incoming);
    return ok(saved);
  } catch (e) {
    return fail(e, 500, { where: "PUT/POST /api/riasec" });
  }
}

export async function PUT(req) {
  return upsertRiasec(req);
}

export async function POST(req) {
  return upsertRiasec(req);
}

export async function DELETE() {
  try {
    const { error } = await supabaseAdmin.storage.from(RIASEC_BUCKET).remove([RIASEC_PATH]);
    if (error && !isNotFoundError(error)) throw error;
    return ok({ bucket: RIASEC_BUCKET, path: RIASEC_PATH });
  } catch (e) {
    return fail(e, 500, { where: "DELETE /api/riasec" });
  }
}
