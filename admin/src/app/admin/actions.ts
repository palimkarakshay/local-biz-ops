"use server";

import { revalidatePath } from "next/cache";
import { getLead, markFollowUp, markReviewRequest, setStage, updateLead } from "@/lib/crm";
import { opsConfig } from "@/lib/ops-config";
import { sendFollowUp, sendReviewRequest } from "@/lib/mail";

export async function fireFollowUpAction(formData: FormData) {
  const id = String(formData.get("id"));
  const lead = await getLead(id);
  if (!lead) return;
  const r = await sendFollowUp(lead);
  await updateLead(id, (l) => markFollowUp(l, r.sent ? "sent" : "skipped"));
  revalidatePath("/admin");
}

export async function fireReviewRequestAction(formData: FormData) {
  const id = String(formData.get("id"));
  const lead = await getLead(id);
  if (!lead) return;
  const r = await sendReviewRequest(lead);
  await updateLead(id, (l) => markReviewRequest(l, r.sent ? "sent" : "skipped"));
  revalidatePath("/admin");
}

export async function markJobCompleteAction(formData: FormData) {
  const id = String(formData.get("id"));
  const lead = await getLead(id);
  if (!lead) return;
  await updateLead(id, (l) => setStage(l, "job-complete"));

  // Completing the job fires the review request on "job-complete" verticals.
  if (
    opsConfig.reviewRequest.enabled &&
    opsConfig.reviewRequest.trigger === "job-complete" &&
    lead.reviewRequest.status === "pending"
  ) {
    const r = await sendReviewRequest(lead);
    await updateLead(id, (l) => markReviewRequest(l, r.sent ? "sent" : "skipped"));
  }
  revalidatePath("/admin");
}

export async function setStageAction(formData: FormData) {
  const id = String(formData.get("id"));
  const stage = String(formData.get("stage"));
  await updateLead(id, (l) => setStage(l, stage));
  revalidatePath("/admin");
}
