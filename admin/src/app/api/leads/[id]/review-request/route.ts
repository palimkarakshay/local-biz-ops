import { NextResponse } from "next/server";
import { getLead, markReviewRequest, updateLead } from "@/lib/crm";
import { sendReviewRequest } from "@/lib/mail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Send the review request for a lead (the review-request step). Idempotent:
 * skips if already sent unless `?force=1`, so n8n workflow (b) can fire it
 * safely even if the admin UI already sent it. The admin "Send" button uses a
 * server action and always sends (explicit operator intent).
 */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const force = new URL(request.url).searchParams.get("force");
  const lead = await getLead(id);
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  if (lead.reviewRequest.status === "sent" && !force) {
    return NextResponse.json({ ok: true, skipped: true, reviewRequest: lead.reviewRequest });
  }

  const result = await sendReviewRequest(lead);
  const saved = await updateLead(id, (l) => markReviewRequest(l, result.sent ? "sent" : "skipped"));

  return NextResponse.json({ ok: true, reviewRequest: saved?.reviewRequest, simulated: result.simulated });
}
