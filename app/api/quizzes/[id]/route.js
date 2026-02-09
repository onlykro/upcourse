// app/api/quizzes/[id]/route.js
import { NextResponse } from "next/server";
import {
  getQuizFromBucket,
  saveQuizToBucket,
  deleteQuizFromBucket,
} from "@/app/services/quizzes.server";

function safeStr(v) {
  return String(v ?? "").trim();
}

/**
 * Read JSON safely ONCE.
 * (Request body can only be read once.)
 */
async function readJsonSafe(req) {
  try {
    return await req.json();
  } catch {
    return null;
  }
}

/**
 * Robust ID resolver:
 * - params.id (normal)
 * - request JSON body { quiz_id, id, assessment_id } (fallback)
 * - last segment of URL pathname (fallback)
 */
function resolveQuizIdFrom(req, params, body) {
  // #1: route param
  let id = safeStr(params?.id);

  // #2: body fallback
  if (!id && body) {
    id = safeStr(body?.quiz_id || body?.id || body?.assessment_id);
  }

  // #3: URL segment fallback
  if (!id) {
    try {
      const url = new URL(req.url);
      const last = url.pathname.split("/").filter(Boolean).pop();
      id = safeStr(last ? decodeURIComponent(last) : "");
    } catch {
      // ignore
    }
  }

  return id;
}

/**
 * Normalize payload:
 * - prioritize track_id
 * - fallback to strand_id
 * - remove strand_id so we only save track_id
 */
function normalizePayload(payload) {
  const p = payload && typeof payload === "object" ? payload : {};

  const track_id = safeStr(p.track_id) || safeStr(p.strand_id) || "";

  const out = {
    ...p,
    track_id: track_id || null,
  };

  // never persist legacy key again
  delete out.strand_id;

  return out;
}

export async function GET(req, { params }) {
  try {
    // ✅ Do NOT read body for GET
    const id = resolveQuizIdFrom(req, params, null);

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Missing quiz id." },
        { status: 400 }
      );
    }

    const quiz = await getQuizFromBucket(id);
    return NextResponse.json({ success: true, quiz });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e?.message || "Failed" },
      { status: 500 }
    );
  }
}

export async function PUT(req, { params }) {
  try {
    const raw = await readJsonSafe(req);
    const id = resolveQuizIdFrom(req, params, raw);

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Missing quiz id." },
        { status: 400 }
      );
    }

    const payload = normalizePayload(raw);

    // ✅ Force stable id into payload so bucket save updates the right file
    const quiz = await saveQuizToBucket({
      ...payload,
      quiz_id: id,
      id,
      assessment_id: id, // harmless if ignored
      mode: "update",
    });

    return NextResponse.json({ success: true, quiz });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e?.message || "Failed" },
      { status: 500 }
    );
  }
}

export async function DELETE(req, { params }) {
  try {
    // Some clients send id in body for DELETE, so support it
    const body = await readJsonSafe(req);
    const id = resolveQuizIdFrom(req, params, body);

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Missing quiz id." },
        { status: 400 }
      );
    }

    await deleteQuizFromBucket(id);
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e?.message || "Failed" },
      { status: 500 }
    );
  }
}
