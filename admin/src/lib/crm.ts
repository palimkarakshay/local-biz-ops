import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { opsConfig } from "@/lib/ops-config";
import type { CrmLead, LeadIntake, Invoice } from "@/lib/schemas";

/**
 * v0.1 CRM store: an append-friendly JSONL file. Mirrors the marketing-site
 * kit's `data/leads.jsonl` lead log, promoted to a tiny pipeline with stages
 * and per-lead steps. Upgrade path (documented in docs/) is Postgres or a
 * Google Sheet once volume warrants it.
 */
const CRM_FILE = path.resolve(process.cwd(), "data", "leads.jsonl");

// ---------------------------------------------------------------------------
// Pure helpers (no filesystem) — unit-tested in __tests__/crm.test.ts
// ---------------------------------------------------------------------------

export function firstName(full: string): string {
  return full.trim().split(/\s+/)[0] || full;
}

/** Build a fresh CRM record from a validated intake payload. */
export function createLead(intake: LeadIntake, now = new Date()): CrmLead {
  const iso = now.toISOString();
  return {
    id: randomUUID(),
    receivedAt: iso,
    name: intake.name,
    email: intake.email,
    phone: intake.phone || undefined,
    message: intake.message,
    intent: intake.intent,
    source: intake.source,
    stage: opsConfig.stages[0].id,
    followUp: { status: "pending" },
    reviewRequest: { status: "pending" },
    history: [{ at: iso, type: "lead-received", note: `via ${intake.source ?? "web"}` }],
  };
}

export function recordEvent(lead: CrmLead, type: string, note?: string): CrmLead {
  return {
    ...lead,
    history: [...lead.history, { at: new Date().toISOString(), type, note }],
  };
}

export function setStage(lead: CrmLead, stageId: string): CrmLead {
  if (!opsConfig.stages.some((s) => s.id === stageId)) {
    throw new Error(`Unknown stage: ${stageId}`);
  }
  return recordEvent({ ...lead, stage: stageId }, "stage-change", `→ ${stageId}`);
}

export function markFollowUp(lead: CrmLead, status: "sent" | "skipped"): CrmLead {
  const at = new Date().toISOString();
  return recordEvent(
    { ...lead, followUp: { status, at } },
    "follow-up",
    status === "sent" ? "follow-up dispatched" : "follow-up skipped",
  );
}

export function markReviewRequest(lead: CrmLead, status: "sent" | "skipped"): CrmLead {
  const at = new Date().toISOString();
  return recordEvent(
    { ...lead, reviewRequest: { status, at } },
    "review-request",
    status === "sent" ? "review request sent" : "review request skipped",
  );
}

export type DueInvoice = {
  lead: CrmLead;
  invoice: Invoice;
  daysOverdue: number;
  /** The reminderDays checkpoint this nudge satisfies (e.g. 7). */
  checkpoint: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Find invoices that have crossed an unfired reminder checkpoint. Drives
 * workflow (c). A checkpoint `d` fires once when daysOverdue >= d and no
 * `day-${d}` marker is recorded in `invoice.remindersSent`.
 */
export function deriveDueInvoices(leads: CrmLead[], now = new Date()): DueInvoice[] {
  const out: DueInvoice[] = [];
  for (const lead of leads) {
    const inv = lead.invoice;
    if (!inv || inv.status !== "open") continue;
    const daysOverdue = Math.floor((now.getTime() - new Date(inv.dueDate).getTime()) / DAY_MS);
    if (daysOverdue <= 0) continue;
    const checkpoint = [...opsConfig.invoice.reminderDays]
      .sort((a, b) => b - a)
      .find((d) => daysOverdue >= d && !inv.remindersSent.includes(`day-${d}`));
    if (checkpoint !== undefined) {
      out.push({ lead, invoice: inv, daysOverdue, checkpoint });
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// File-backed store
// ---------------------------------------------------------------------------

export async function readLeads(): Promise<CrmLead[]> {
  try {
    const raw = await fs.readFile(CRM_FILE, "utf-8");
    return raw
      .split("\n")
      .filter((l) => l.trim())
      .map((l) => JSON.parse(l) as CrmLead);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
}

async function writeLeads(leads: CrmLead[]): Promise<void> {
  await fs.mkdir(path.dirname(CRM_FILE), { recursive: true });
  await fs.writeFile(CRM_FILE, leads.map((l) => JSON.stringify(l)).join("\n") + "\n", "utf-8");
}

export async function appendLead(lead: CrmLead): Promise<void> {
  await fs.mkdir(path.dirname(CRM_FILE), { recursive: true });
  await fs.appendFile(CRM_FILE, JSON.stringify(lead) + "\n", "utf-8");
}

export async function getLead(id: string): Promise<CrmLead | undefined> {
  return (await readLeads()).find((l) => l.id === id);
}

/** Read-modify-write a single lead by id. Returns the updated record. */
export async function updateLead(
  id: string,
  updater: (lead: CrmLead) => CrmLead,
): Promise<CrmLead | undefined> {
  const leads = await readLeads();
  const idx = leads.findIndex((l) => l.id === id);
  if (idx === -1) return undefined;
  leads[idx] = updater(leads[idx]);
  await writeLeads(leads);
  return leads[idx];
}
