import { NextResponse } from "next/server";
import { deriveDueInvoices, getLead, recordEvent, updateLead } from "@/lib/crm";
import { sendInvoiceReminder } from "@/lib/mail";
import { requireAdminApi } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Send the invoice reminder for the lead's highest unfired checkpoint, then
 * record it so it can't fire twice. Idempotent: if no checkpoint is due it
 * no-ops. n8n workflow (c) calls this for each id returned by
 * `GET /api/invoices/overdue`. Admin-only.
 */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const raw = await request.text();
  const denied = await requireAdminApi(request, raw);
  if (denied) return denied;
  const { id } = await ctx.params;
  const lead = await getLead(id);
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  const due = deriveDueInvoices([lead]);
  if (due.length === 0) {
    return NextResponse.json({ ok: true, skipped: true });
  }
  const { checkpoint, daysOverdue } = due[0];

  const result = await sendInvoiceReminder(lead, daysOverdue);
  await updateLead(id, (l) => {
    const inv = l.invoice
      ? { ...l.invoice, remindersSent: [...l.invoice.remindersSent, `day-${checkpoint}`] }
      : l.invoice;
    return recordEvent(
      { ...l, invoice: inv },
      "invoice-reminder",
      `day-${checkpoint} (${daysOverdue}d overdue)`,
    );
  });

  return NextResponse.json({ ok: true, checkpoint, daysOverdue, simulated: result.simulated });
}
