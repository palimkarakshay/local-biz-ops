#!/usr/bin/env node
/**
 * Stand-in for a live n8n run of workflow (a). It performs the same security +
 * dispatch the workflow does — HMAC-sign the lead body, POST it to the admin's
 * /api/leads with X-Ops-Signature — so you can verify the
 * "webhook (HMAC) -> CRM row -> templated follow-up" chain locally WITHOUT an
 * n8n instance. (In production, n8n's Verify HMAC node runs this exact check,
 * then dispatches to the admin.)
 *
 * Usage:
 *   OPS_INTAKE_URL=http://localhost:3000 OPS_HMAC_SECRET=dev-secret \
 *     node workflows/verify-dispatch.mjs
 *
 * The admin must be started with the SAME OPS_HMAC_SECRET. Run it against a
 * PRODUCTION build (`npm run start`) — or with TURNSTILE_SECRET_KEY set — so the
 * bot-check fallback is active and the tampered case fails closed (403). In dev
 * mode Turnstile is bypassed, so an invalid signature would fall through.
 */
import crypto from "node:crypto";

const BASE = process.env.OPS_INTAKE_URL ?? "http://localhost:3000";
const SECRET = process.env.OPS_HMAC_SECRET ?? "dev-secret";

function sign(rawBody, secret, t = Math.floor(Date.now() / 1000)) {
  const v1 = crypto.createHmac("sha256", secret).update(`${t}.${rawBody}`).digest("hex");
  return `t=${t},v1=${v1}`;
}

async function post(raw, signature) {
  const res = await fetch(`${BASE}/api/leads`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Ops-Signature": signature },
    body: raw,
  });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}

const lead = {
  name: "Jordan Webhook",
  email: "jordan@example.com",
  phone: "519-555-0188",
  intent: "quote",
  message: "Dispatched via the signed webhook path (n8n stand-in).",
  source: "n8n-web",
};
const raw = JSON.stringify(lead);

console.log(`→ admin: ${BASE}`);

// 1) Valid signature → should create the CRM row + fire the follow-up.
const good = await post(raw, sign(raw, SECRET));
console.log(`\n[1] valid signature  → HTTP ${good.status}`);
console.log("    ", JSON.stringify(good.body));
if (good.status !== 200) {
  console.error("    FAIL: expected 200. Is the admin running with the same OPS_HMAC_SECRET?");
  process.exit(1);
}

// 2) Tampered body (signature no longer matches) → should be rejected 403.
const tampered = await post(raw + " ", sign(raw, SECRET));
console.log(`\n[2] tampered body    → HTTP ${tampered.status}`);
console.log("    ", JSON.stringify(tampered.body));
if (tampered.status !== 403) {
  console.error("    FAIL: expected 403 for a tampered/invalid signature.");
  process.exit(1);
}

console.log("\n✓ Signed dispatch verified: valid → CRM row + follow-up; tampered → 403.");
