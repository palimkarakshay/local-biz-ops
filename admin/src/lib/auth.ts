import crypto from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { verifyOpsSignature } from "@/lib/security";

/**
 * Admin authorization for the ops console and the lifecycle/mutating routes.
 *
 * These surfaces read and mutate CRM/PII state (the `/admin` console and its
 * server actions, the per-lead lifecycle API routes, and the CRM/invoice
 * listing endpoints). They are NOT public — only an authenticated operator,
 * or a trusted server-to-server caller (the marketing site / n8n), may reach
 * them. The public front door is `POST /api/leads` only.
 *
 * Two real, server-validated mechanisms, reusing the kit's existing primitives:
 *
 *  1. Browser operator → a signed, HttpOnly session cookie issued by
 *     `/admin/login` only when the correct `ADMIN_TOKEN` is presented. The
 *     cookie is an HMAC over an expiry, verified server-side on every request
 *     (constant-time). No client-only/no-op check.
 *
 *  2. Server-to-server caller (n8n) → the `X-Ops-Token` shared secret (matched
 *     in constant time against `ADMIN_TOKEN`) or a valid `X-Ops-Signature`
 *     HMAC (`OPS_HMAC_SECRET`), the same scheme `POST /api/leads` already trusts.
 *
 * Fails closed: with no `ADMIN_TOKEN` configured every gated surface is denied.
 */

const SESSION_COOKIE = "ops_admin_session";
const SESSION_TTL_SECONDS = 60 * 60 * 12; // 12h operator session

function adminToken(): string {
  return process.env.ADMIN_TOKEN ?? "";
}

/** The secret used to sign session cookies (falls back to the admin token). */
function sessionSecret(): string {
  return process.env.ADMIN_SESSION_SECRET ?? adminToken();
}

/** Constant-time string compare that does not leak length via early return. */
export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a, "utf-8");
  const bb = Buffer.from(b, "utf-8");
  // Hash to a fixed length so unequal lengths still compare in constant time.
  const ah = crypto.createHash("sha256").update(ab).digest();
  const bh = crypto.createHash("sha256").update(bb).digest();
  return crypto.timingSafeEqual(ah, bh) && a.length === b.length;
}

/** Mint a signed session value: `<expiresAtSec>.<hmac>`. */
export function mintSession(nowSec: number = Math.floor(Date.now() / 1000)): string {
  const secret = sessionSecret();
  const exp = nowSec + SESSION_TTL_SECONDS;
  const sig = crypto.createHmac("sha256", secret).update(String(exp)).digest("hex");
  return `${exp}.${sig}`;
}

/** Verify a signed session value server-side (signature + not expired). */
export function verifySession(
  value: string | undefined | null,
  nowSec: number = Math.floor(Date.now() / 1000),
): boolean {
  const secret = sessionSecret();
  if (!secret || !value) return false;
  const dot = value.lastIndexOf(".");
  if (dot <= 0) return false;
  const expStr = value.slice(0, dot);
  const sig = value.slice(dot + 1);
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp < nowSec) return false;
  const expected = crypto.createHmac("sha256", secret).update(expStr).digest("hex");
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(sig, "hex");
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;
  return true;
}

/** True if the supplied login token matches the configured admin token. */
export function checkLogin(token: string | undefined | null): boolean {
  const expected = adminToken();
  if (!expected || !token) return false;
  return safeEqual(token, expected);
}

export const sessionCookieName = SESSION_COOKIE;
export const sessionTtlSeconds = SESSION_TTL_SECONDS;

/**
 * Server-side check for an authenticated browser operator (used by the
 * `/admin` console and its server actions). Reads the signed session cookie.
 */
export async function hasAdminSession(): Promise<boolean> {
  // Fail closed: with no ADMIN_TOKEN configured the console is locked, so a
  // previously minted (still-unexpired) session cookie must not keep granting
  // access — even when a standalone ADMIN_SESSION_SECRET is set.
  if (!adminToken()) return false;
  const jar = await cookies();
  return verifySession(jar.get(SESSION_COOKIE)?.value);
}

/**
 * Authorize a server-to-server / API caller. Accepts a matching `X-Ops-Token`
 * shared secret OR a valid `X-Ops-Signature` HMAC over `rawBody`, OR a valid
 * browser session cookie (so the admin UI's fetches work too).
 */
export async function isAdminRequestAuthorized(
  request: Request,
  rawBody: string = "",
): Promise<boolean> {
  // 1. Shared admin token (constant-time).
  const presented = request.headers.get("x-ops-token");
  if (presented && checkLogin(presented)) return true;

  // 2. HMAC-signed webhook (same scheme as POST /api/leads).
  const signature = request.headers.get("x-ops-signature");
  if (signature) {
    const r = verifyOpsSignature(rawBody, signature, process.env.OPS_HMAC_SECRET ?? "");
    if (r.ok) return true;
  }

  // 3. A logged-in browser operator (session cookie).
  if (await hasAdminSession()) return true;

  return false;
}

/**
 * Guard for API route handlers. Returns a 401 `NextResponse` when the caller
 * is not an authorized admin, or `null` to proceed. Pass the raw request body
 * when one was read, so HMAC verification can run over the exact bytes.
 */
export async function requireAdminApi(
  request: Request,
  rawBody: string = "",
): Promise<NextResponse | null> {
  if (await isAdminRequestAuthorized(request, rawBody)) return null;
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
