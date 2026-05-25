import { NextResponse } from "next/server";
import { getLead, markFollowUp, updateLead } from "@/lib/crm";
import { sendFollowUp } from "@/lib/mail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Manually (re)send the templated follow-up for a lead. */
export async function POST(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const lead = await getLead(id);
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  const result = await sendFollowUp(lead);
  const saved = await updateLead(id, (l) => markFollowUp(l, result.sent ? "sent" : "skipped"));

  return NextResponse.json({ ok: true, followUp: saved?.followUp, simulated: result.simulated });
}
