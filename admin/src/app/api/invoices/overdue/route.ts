import { NextResponse } from "next/server";
import { deriveDueInvoices, readLeads } from "@/lib/crm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Overdue invoices that have crossed an unfired reminder checkpoint. n8n
 * workflow (c) polls this on a schedule and sends a reminder for each, then
 * records the checkpoint so it won't fire twice.
 */
export async function GET() {
  const due = deriveDueInvoices(await readLeads());
  return NextResponse.json({
    due: due.map((d) => ({
      id: d.lead.id,
      email: d.lead.email,
      name: d.lead.name,
      invoice: d.invoice,
      daysOverdue: d.daysOverdue,
      checkpoint: d.checkpoint,
    })),
  });
}
