import { NextResponse } from "next/server";
import { getLead, markFollowUp, updateLead } from "@/lib/crm";
import { sendFollowUp } from "@/lib/mail";
import { requireAdminApi } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Manually (re)send the templated follow-up for a lead. Admin-only. */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const raw = await request.text();
  const denied = await requireAdminApi(request, raw);
  if (denied) return denied;
  const { id } = await ctx.params;
  const lead = await getLead(id);
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  const result = await sendFollowUp(lead);
  const saved = await updateLead(id, (l) => markFollowUp(l, result.sent ? "sent" : "skipped"));

  return NextResponse.json({ ok: true, followUp: saved?.followUp, simulated: result.simulated });
}
