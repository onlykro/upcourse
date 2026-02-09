// app/services/storage-json.js
import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

/* ------------------------------ small helpers ------------------------------ */

function toStr(v) {
  return String(v ?? "").trim();
}

function parseJsonSafe(text, fallback) {
  try {
    const t = String(text ?? "").trim();
    if (!t) return fallback;
    return JSON.parse(t);
  } catch {
    return fallback;
  }
}

function isNotFoundError(err) {
  if (!err) return false;
  const msg = String(err?.message || "").toLowerCase();

  if (msg.includes("not found")) return true;
  if (msg.includes("object not found")) return true;
  if (msg.includes("no such file")) return true;

  const status = Number(err?.statusCode ?? err?.status ?? err?.code);
  return status === 404;
}

async function readBlobAsText(file) {
  if (!file) return "";

  // Blob (supabase-js v2 commonly returns Blob)
  if (typeof file.text === "function") {
    return await file.text();
  }

  // Buffer
  // eslint-disable-next-line no-undef
  if (typeof Buffer !== "undefined" && Buffer.isBuffer(file)) {
    return file.toString("utf-8");
  }

  // ArrayBuffer / Uint8Array
  // eslint-disable-next-line no-undef
  if (typeof ArrayBuffer !== "undefined" && file instanceof ArrayBuffer) {
    // eslint-disable-next-line no-undef
    if (typeof Buffer !== "undefined") return Buffer.from(file).toString("utf-8");
    return new TextDecoder("utf-8").decode(new Uint8Array(file));
  }

  // eslint-disable-next-line no-undef
  if (typeof ArrayBuffer !== "undefined" && ArrayBuffer.isView(file)) {
    // eslint-disable-next-line no-undef
    if (typeof Buffer !== "undefined") return Buffer.from(file.buffer).toString("utf-8");
    return new TextDecoder("utf-8").decode(new Uint8Array(file.buffer));
  }

  // Web ReadableStream (rare)
  if (typeof file.getReader === "function") {
    const reader = file.getReader();
    const chunks = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }

    // eslint-disable-next-line no-undef
    if (typeof Buffer !== "undefined") {
      // eslint-disable-next-line no-undef
      return Buffer.concat(chunks.map((c) => Buffer.from(c))).toString("utf-8");
    }

    const total = chunks.reduce((sum, c) => sum + (c?.length || 0), 0);
    const merged = new Uint8Array(total);
    let offset = 0;
    for (const c of chunks) {
      merged.set(c, offset);
      offset += c.length;
    }
    return new TextDecoder("utf-8").decode(merged);
  }

  throw new Error("Unsupported storage download type.");
}

function jsonToBytes(jsonText) {
  const text = String(jsonText ?? "");

  // eslint-disable-next-line no-undef
  if (typeof Buffer !== "undefined") {
    // eslint-disable-next-line no-undef
    return Buffer.from(text, "utf-8");
  }

  return new TextEncoder().encode(text);
}

/**
 * Best-effort ensure the bucket exists (service role only).
 * If missing permissions, it will just throw on first write anyway.
 */
export async function ensureBucketExists(bucket, { public: isPublic = false } = {}) {
  const b = toStr(bucket);
  if (!b) throw new Error("Missing bucket for ensureBucketExists.");

  const { data, error } = await supabaseAdmin.storage.getBucket(b);
  if (!error && data) return true;

  const created = await supabaseAdmin.storage.createBucket(b, { public: !!isPublic });
  if (created.error) {
    const msg = String(created.error.message || "").toLowerCase();
    if (!msg.includes("already exists")) throw created.error;
  }
  return true;
}

/* ---------------------------- public API exports --------------------------- */

/**
 * Download JSON from Supabase Storage.
 * - Tries server client first (auth/RLS)
 * - Falls back to service role client
 * - If missing and defaultValue is provided, returns defaultValue (no throw)
 */
export async function downloadJsonFromStorage({
  bucket,
  path,
  defaultValue = null,
} = {}) {
  const cleanBucket = toStr(bucket);
  const cleanPath = toStr(path);

  if (!cleanBucket || !cleanPath) {
    throw new Error("Missing bucket/path for storage JSON download.");
  }

  // 1) Try with normal server client (respects auth/RLS)
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.storage
      .from(cleanBucket)
      .download(cleanPath);

    if (!error && data) {
      const text = await readBlobAsText(data);
      return parseJsonSafe(text, defaultValue);
    }

    if (error && isNotFoundError(error)) {
      return defaultValue;
    }
  } catch {
    // fall through
  }

  // 2) Fallback to service role (bypasses RLS) — server-side only
  const { data: adminData, error: adminErr } = await supabaseAdmin.storage
    .from(cleanBucket)
    .download(cleanPath);

  if (adminErr || !adminData) {
    if (isNotFoundError(adminErr)) return defaultValue;
    throw new Error(adminErr?.message || `Failed to download ${cleanBucket}/${cleanPath}`);
  }

  const adminText = await readBlobAsText(adminData);
  return parseJsonSafe(adminText, defaultValue);
}

/**
 * Upload JSON to Supabase Storage.
 * - Tries server client first (auth/RLS)
 * - Falls back to service role client
 */
export async function uploadJsonToStorage({
  bucket,
  path,
  data,
  upsert = true,
  cacheControl = "no-store",
  ensureBucket = true,
} = {}) {
  const cleanBucket = toStr(bucket);
  const cleanPath = toStr(path);

  if (!cleanBucket || !cleanPath) {
    throw new Error("Missing bucket/path for storage JSON upload.");
  }

  const jsonText = JSON.stringify(data ?? null, null, 2);
  const bytes = jsonToBytes(jsonText);

  const uploadOpts = {
    upsert: !!upsert,
    contentType: "application/json",
    cacheControl: String(cacheControl || "no-store"),
  };

  // 1) Try with normal server client (respects auth/RLS)
  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.storage
      .from(cleanBucket)
      .upload(cleanPath, bytes, uploadOpts);

    if (!error) return true;
  } catch {
    // fall through
  }

  // 2) Fallback to service role
  if (ensureBucket) {
    try {
      await ensureBucketExists(cleanBucket, { public: false });
    } catch {
      // ignore; write will surface the real error
    }
  }

  const { error: adminErr } = await supabaseAdmin.storage
    .from(cleanBucket)
    .upload(cleanPath, bytes, uploadOpts);

  if (adminErr) {
    throw new Error(adminErr?.message || `Failed to upload ${cleanBucket}/${cleanPath}`);
  }

  return true;
}
