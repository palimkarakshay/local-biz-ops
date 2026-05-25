import { NextResponse } from "next/server";
import { leadIntakeSchema } from "@/lib/schemas";
import { opsConfig } from "@/lib/ops-config";
import { appendLead, createLead, markFollowUp, markReviewRequest, readLeads, recordEvent } from "@/lib/crm";
import { sendFollowUp, sendOperatorNotification, sendReviewRequest, verifyTurnstile } from "@/lib/mail";
import { verifyOpsSignature } from "@/lib/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** List the CRM (used by the admin UI fallback and by n8n debugging). */
export async function GET() {
  return NextResponse.json({ leads: await readLeads() });
}

/**
 * Lead intake — the front door of the ops kit. The marketing site's contact
 * form, or n8n workflow (a), POSTs a lead here. On success the lead lands in
 * the CRM, the templated follow-up fires, and the review-request step is set
 * in motion.
 */
export async function POST(request: Request) {
  // Read the raw body so an HMAC signature (if present) can be verified over
  // the exact bytes, matching the n8n workflow's Verify HMAC node.
  const raw = await request.text();
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = leadIntakeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const intake = parsed.data;

  // Auth, in order of preference for trusted server-to-server callers
  // (the marketing site / n8n): a valid HMAC signature, or a shared token.
  // Public browser posts fall back to the Turnstile bot check.
  const opsToken = process.env.OPS_INTAKE_TOKEN;
  const presentedToken = request.headers.get("x-ops-token");
  const tokenTrusted = Boolean(opsToken && presentedToken && presentedToken === opsToken);

  const signature = request.headers.get("x-ops-signature");
  const sigTrusted = signature
    ? verifyOpsSignature(raw, signature, process.env.OPS_HMAC_SECRET ?? "").ok
    : false;

  if (!tokenTrusted && !sigTrusted) {
    const ok = await verifyTurnstile(intake.turnstileToken);
    if (!ok) {
      return NextResponse.json({ error: "Turnstile verification failed" }, { status: 403 });
    }
  }

  let lead = createLead(intake);

  // Operator notification (fire-and-forget — never blocks the lead landing).
  void sendOperatorNotification(lead);

  // Fire the templated follow-up.
  let followUp: string = "skipped";
  if (opsConfig.followUp.enabled) {
    const r = await sendFollowUp(lead);
    lead = markFollowUp(lead, r.sent ? "sent" : "skipped");
    followUp = r.sent ? (r.simulated ? "simulated" : "sent") : "skipped";
  }

  // Set the review-request step in motion. For most verticals it's queued and
  // fires when the job is marked complete; "on-intake" verticals send now.
  let reviewRequest = "disabled";
  if (opsConfig.reviewRequest.enabled) {
    if (opsConfig.reviewRequest.trigger === "on-intake") {
      const r = await sendReviewRequest(lead);
      lead = markReviewRequest(lead, r.sent ? "sent" : "skipped");
      reviewRequest = r.sent ? (r.simulated ? "simulated" : "sent") : "skipped";
    } else {
      lead = recordEvent(
        lead,
        "review-request-queued",
        `scheduled for job completion (+${opsConfig.reviewRequest.delayDays}d)`,
      );
      reviewRequest = "queued";
    }
  }

  await appendLead(lead);

  return NextResponse.json({ ok: true, id: lead.id, stage: lead.stage, followUp, reviewRequest });
}
