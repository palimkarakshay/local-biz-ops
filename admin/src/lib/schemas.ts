import { z } from "zod";
import { opsConfig } from "@/lib/ops-config";

const intentValues = opsConfig.intents.map((i) => i.value);

/**
 * Lead intake — the payload the marketing site's contact form (or an n8n
 * workflow) POSTs to `/api/leads`. This is intentionally a superset-compatible
 * shape with the marketing-site kit's `leadSchema` so the site can forward
 * leads verbatim.
 */
export const leadIntakeSchema = z.object({
  name: z.string().min(1, "Name is required").max(120),
  email: z.string().email("A valid email is required"),
  phone: z.string().max(40).optional().or(z.literal("")),
  message: z.string().min(1, "Please share a few details").max(4000),
  /** Free-form intent; unknown values are accepted and bucketed as "general". */
  intent: z
    .string()
    .transform((v) => (intentValues.includes(v) ? v : "general"))
    .default("general"),
  /** Attribution (UTM / page / channel). */
  source: z.string().max(200).optional(),
  /** Cloudflare Turnstile token — required for public form posts, omitted by
   *  trusted server-to-server callers that present the X-Ops-Token header. */
  turnstileToken: z.string().optional(),
  consent: z.boolean().optional(),
  /** Optional structured fields produced by the n8n Claude structurer. */
  structured: z
    .object({
      service: z.string().optional(),
      urgency: z.enum(["low", "medium", "high"]).optional(),
      summary: z.string().optional(),
    })
    .optional(),
});
export type LeadIntake = z.infer<typeof leadIntakeSchema>;

const stepStatus = z.enum(["pending", "sent", "skipped"]);

/** A single timeline entry on a lead. */
export const crmEventSchema = z.object({
  at: z.string(),
  type: z.string(),
  note: z.string().optional(),
});
export type CrmEvent = z.infer<typeof crmEventSchema>;

/** Optional invoice attached to a lead (drives workflow c — invoice reminder). */
export const invoiceSchema = z.object({
  number: z.string(),
  amount: z.number().nonnegative(),
  currency: z.string().default("CAD"),
  /** ISO date the invoice is due. */
  dueDate: z.string(),
  status: z.enum(["open", "paid", "void"]).default("open"),
  /** ISO timestamps of reminders already sent (dedupes repeat nudges). */
  remindersSent: z.array(z.string()).default([]),
});
export type Invoice = z.infer<typeof invoiceSchema>;

/** The persisted CRM record — one row per lead. */
export const crmLeadSchema = z.object({
  id: z.string(),
  receivedAt: z.string(),
  name: z.string(),
  email: z.string(),
  phone: z.string().optional(),
  message: z.string(),
  intent: z.string(),
  source: z.string().optional(),
  stage: z.string(),
  followUp: z.object({ status: stepStatus, at: z.string().optional() }),
  reviewRequest: z.object({ status: stepStatus, at: z.string().optional() }),
  invoice: invoiceSchema.optional(),
  history: z.array(crmEventSchema).default([]),
});
export type CrmLead = z.infer<typeof crmLeadSchema>;
