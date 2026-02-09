import "server-only";
import crypto from "crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "admin_session";
const MAX_AGE_SEC = 60 * 60 * 24 * 7; // 7 days

function secret() {
  const s = process.env.ADMIN_SESSION_SECRET || "";
  if (!s) throw new Error("Missing ADMIN_SESSION_SECRET");
  return s;
}

function b64urlEncode(buf) {
  return Buffer.from(buf)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function b64urlDecode(str) {
  const pad = str.length % 4 ? "=".repeat(4 - (str.length % 4)) : "";
  const base64 = (str + pad).replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(base64, "base64");
}

function sign(input) {
  return b64urlEncode(crypto.createHmac("sha256", secret()).update(input).digest());
}

function encode(payload, rememberMe = true) {
  const now = Math.floor(Date.now() / 1000);
  const body = {
    ...payload,
    iat: now,
    // if rememberMe = false, still set exp but cookie can be session-only (no maxAge)
    exp: now + MAX_AGE_SEC,
  };
  const bodyB64 = b64urlEncode(Buffer.from(JSON.stringify(body)));
  const sig = sign(bodyB64);
  return `${bodyB64}.${sig}`;
}

function decode(token) {
  if (!token) return null;
  const [bodyB64, sig] = String(token).split(".");
  if (!bodyB64 || !sig) return null;

  const expected = sign(bodyB64);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  const body = JSON.parse(b64urlDecode(bodyB64).toString("utf8"));
  const now = Math.floor(Date.now() / 1000);
  if (body?.exp && now > body.exp) return null;

  return body;
}

function cookieOptions(rememberMe = true) {
  const base = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  };

  // if rememberMe=false, do NOT set maxAge => session cookie
  return rememberMe ? { ...base, maxAge: MAX_AGE_SEC } : base;
}

/**
 * ✅ Works in BOTH:
 * - Route Handlers: pass a NextResponse as 2nd arg
 * - Server Actions / Server Components: omit res
 */
export function setAdminSession(sessionPayload, res, rememberMe = true) {
  const value = encode(sessionPayload, rememberMe);
  const opts = cookieOptions(rememberMe);

  if (res?.cookies?.set) {
    res.cookies.set(COOKIE_NAME, value, opts);
    return;
  }

  // fallback (server actions)
  cookies().set(COOKIE_NAME, value, opts);
}

export function getAdminSession() {
  const token = cookies().get(COOKIE_NAME)?.value;
  return decode(token);
}

export function clearAdminSession(res) {
  if (res?.cookies?.set) {
    res.cookies.set(COOKIE_NAME, "", { path: "/", maxAge: 0 });
    return;
  }
  cookies().set(COOKIE_NAME, "", { path: "/", maxAge: 0 });
}
