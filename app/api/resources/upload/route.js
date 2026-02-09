// app/api/resources/upload/route.js
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs"; // needed for Buffer
export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error(
    "Missing Supabase env vars. Check NEXT_PUBLIC_SUPABASE_URL and SUPABASE_*_KEY."
  );
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
});

// IMPORTANT: your bucket name (must match Supabase Storage)
const BUCKET = "resources";

const toStr = (v) => String(v ?? "").trim();

function cleanFileName(name = "") {
  const base = toStr(name).replace(/[/\\?%*:|"<>]/g, "-").trim();
  return base || "file";
}

function extOf(name = "") {
  const m = toStr(name).toLowerCase().match(/\.([a-z0-9]+)$/i);
  return m ? `.${m[1]}` : "";
}

function pickFolder(file) {
  const mime = toStr(file?.type).toLowerCase();
  const name = toStr(file?.name).toLowerCase();
  const ext = extOf(name);

  const isPDF = mime === "application/pdf" || ext === ".pdf";
  const isPPT =
    mime.includes("presentation") ||
    ext === ".ppt" ||
    ext === ".pptx" ||
    ext === ".key";

  const isImg =
    mime.startsWith("image/") ||
    [".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp", ".svg", ".avif"].includes(ext);

  if (isPDF) return "pdf";
  if (isPPT) return "ppt";
  if (isImg) return "images";

  // fallback
  return "files";
}

async function signedOrPublicUrl(path, { expiresIn = 60 * 60 * 24 * 6 } = {}) {
  // try signed URL first (private buckets)
  const { data: signed } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, expiresIn);

  if (signed?.signedUrl) return signed.signedUrl;

  // fallback to public URL (public buckets)
  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return pub?.publicUrl || "";
}

export async function POST(req) {
  try {
    const form = await req.formData();
    const file = form.get("file");

    if (!file) {
      return NextResponse.json(
        { success: false, error: "Missing file" },
        { status: 400 }
      );
    }

    // Next's File object
    const name = cleanFileName(file.name || "file");
    const folder = pickFolder(file);
    const ext = extOf(name);

    // Optional: enforce size (25MB)
    const MAX_MB = 25;
    if (file.size > MAX_MB * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: `File too large. Max ${MAX_MB}MB.` },
        { status: 413 }
      );
    }

    // Build path: images/xxx-<ts>.png, pdf/xxx-<ts>.pdf, ppt/xxx-<ts>.pptx
    const ts = Date.now();
    const baseNoExt = name.replace(/\.[a-z0-9]+$/i, "");
    const key = `${folder}/${baseNoExt}-${ts}${ext || ""}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: upErr } = await supabase.storage.from(BUCKET).upload(key, buffer, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

    if (upErr) {
      return NextResponse.json(
        { success: false, error: upErr.message },
        { status: 400 }
      );
    }

    const url = await signedOrPublicUrl(key);

    return NextResponse.json({
      success: true,
      key, // <-- store this in file_key
      url, // optional convenience for preview
    });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e?.message || "Upload failed" },
      { status: 500 }
    );
  }
}
