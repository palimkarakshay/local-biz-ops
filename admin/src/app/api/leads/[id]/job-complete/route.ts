import { NextResponse } from "next/server";
import { getLead, markReviewRequest, setStage, updateLead } from "@/lib/crm";
import { opsConfig } from "@/lib/ops-config";
import { sendReviewRequest } from "@/lib/mail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Mark a job complete. This is the trigger for the review-request step on
 * "job-complete" verticals: completing the job fires the review request.
 * n8n workflow (b) hits this same transition from the field.
 */
export async function POST(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const lead = await getLead(id);
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  await updateLead(id, (l) => setStage(l, "job-complete"));

  let reviewRequest = "unchanged";
  if (
    opsConfig.reviewRequest.enabled &&
    opsConfig.reviewRequest.trigger === "job-complete" &&
    lead.reviewRequest.status === "pending"
  ) {
    const result = await sendReviewRequest(lead);
    await updateLead(id, (l) => markReviewRequest(l, result.sent ? "sent" : "skipped"));
    reviewRequest = result.sent ? (result.simulated ? "simulated" : "sent") : "skipped";
  }

  return NextResponse.json({ ok: true, stage: "job-complete", reviewRequest });
}
