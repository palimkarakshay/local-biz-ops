import crypto from "crypto";

/**
 * HMAC signing/verification for trusted webhook intake — the exact scheme the
 * n8n workflows use (`X-Ops-Signature: t=<unix>,v1=<hex>` over `${t}.${rawBody}`,
 * HMAC-SHA256, 5-minute replay window, constant-time compare). Modelled on the
 * reference site's n8n bundle. Keep this in lockstep with the "Verify HMAC"
 * function node in `workflows/*.json`.
 */

const WINDOW_SECONDS = 300;

export function signOpsBody(
  rawBody: string,
  secret: string,
  t: number = Math.floor(Date.now() / 1000),
): string {
  const v1 = crypto.createHmac("sha256", secret).update(`${t}.${rawBody}`).digest("hex");
  return `t=${t},v1=${v1}`;
}

export type VerifyResult = { ok: boolean; reason?: string };

export function verifyOpsSignature(
  rawBody: string,
  header: string | null | undefined,
  secret: string,
  nowSec: number = Math.floor(Date.now() / 1000),
): VerifyResult {
  if (!secret) return { ok: false, reason: "no-secret" };
  if (!header) return { ok: false, reason: "missing-signature" };

  const parts = Object.fromEntries(
    header.split(",").map((p) => p.split("=").map((s) => s.trim())),
  ) as Record<string, string>;
  const t = Number(parts.t);
  const supplied = parts.v1;
  if (!Number.isFinite(t) || !supplied) return { ok: false, reason: "bad-format" };
  if (Math.abs(nowSec - t) > WINDOW_SECONDS) return { ok: false, reason: "stale" };

  const expected = crypto.createHmac("sha256", secret).update(`${t}.${rawBody}`).digest("hex");
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(supplied, "hex");
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return { ok: false, reason: "mismatch" };
  }
  return { ok: true };
}
