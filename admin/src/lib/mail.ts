import { Resend } from "resend";
import { siteConfig } from "@/lib/site-config";
import { opsConfig, type Template } from "@/lib/ops-config";
import type { CrmLead } from "@/lib/schemas";
import { firstName } from "@/lib/crm";

/**
 * Verify a Cloudflare Turnstile token server-side — identical wiring to the
 * marketing-site kit's `verifyTurnstile`. Free, no credit card. With no secret
 * configured it accepts in development only.
 */
export async function verifyTurnstile(token?: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return process.env.NODE_ENV !== "production";
  if (!token) return false;
  const form = new FormData();
  form.append("secret", secret);
  form.append("response", token);
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: form,
    });
    const data = (await res.json()) as { success?: boolean };
    return Boolean(data.success);
  } catch {
    return false;
  }
}

/** Replace {{placeholders}} in a template string with values from `vars`. */
export function renderTemplate(tpl: string, vars: Record<string, string>): string {
  return tpl.replace(/\{\{\s*([\w]+)\s*\}\}/g, (_, key: string) => vars[key] ?? "");
}

function signature(): string {
  return [siteConfig.business.name, siteConfig.business.title, siteConfig.organization?.name]
    .filter(Boolean)
    .join("<br/>");
}

function intentLabel(intent: string): string {
  return opsConfig.intents.find((i) => i.value === intent)?.label ?? intent;
}

/** The placeholder map shared by every templated message. */
export function buildVars(lead: CrmLead, extra: Record<string, string> = {}): Record<string, string> {
  return {
    firstName: firstName(lead.name),
    name: lead.name,
    intent: lead.intent,
    intentLabel: intentLabel(lead.intent),
    message: lead.message,
    businessName: siteConfig.business.name,
    businessPhone: siteConfig.business.phone,
    siteUrl: siteConfig.business.siteUrl,
    reviewUrl: siteConfig.reviews.url,
    signature: signature(),
    caslLine: siteConfig.compliance.casl,
    unsubscribeUrl: siteConfig.compliance.unsubscribeUrl,
    ...extra,
  };
}

export type SendResult = { sent: boolean; simulated: boolean; error?: string };

/**
 * Send one email via Resend. With no RESEND_API_KEY it logs and reports a
 * simulated send (so the v0.1 lifecycle is fully demoable with zero config),
 * mirroring the kit's "dev no-ops" philosophy for Turnstile.
 */
export async function sendEmail(args: { to: string; subject: string; html: string }): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL ?? siteConfig.business.email;
  if (!apiKey) {
    console.warn(`[mail] RESEND_API_KEY not set — simulating send to ${args.to}: "${args.subject}"`);
    return { sent: true, simulated: true };
  }
  try {
    const resend = new Resend(apiKey);
    await resend.emails.send({ from, to: args.to, subject: args.subject, html: args.html });
    return { sent: true, simulated: false };
  } catch (err) {
    console.error("[mail] Resend send failed:", err);
    return { sent: false, simulated: false, error: String(err) };
  }
}

function fill(template: Template, vars: Record<string, string>) {
  return { subject: renderTemplate(template.subject, vars), html: renderTemplate(template.html, vars) };
}

/** Operator notification — to the business inbox, like the kit's admin email. */
export async function sendOperatorNotification(lead: CrmLead): Promise<SendResult> {
  const to = process.env.RESEND_TO_EMAIL ?? siteConfig.business.email;
  const vars = buildVars(lead);
  const html = `
    <h2>New ${vars.intentLabel} lead</h2>
    <p><strong>Name:</strong> ${vars.name}</p>
    <p><strong>Email:</strong> ${lead.email}</p>
    ${lead.phone ? `<p><strong>Phone:</strong> ${lead.phone}</p>` : ""}
    <p><strong>Message:</strong></p>
    <pre style="white-space:pre-wrap;font-family:inherit">${lead.message}</pre>
    <p style="color:#888"><small>Source: ${lead.source ?? "web"} · Received: ${lead.receivedAt}</small></p>
  `;
  return sendEmail({ to, subject: `New ${vars.intentLabel} lead — ${lead.name}`, html });
}

export async function sendFollowUp(lead: CrmLead): Promise<SendResult> {
  const { subject, html } = fill(opsConfig.followUp.template, buildVars(lead));
  return sendEmail({ to: lead.email, subject, html });
}

export async function sendReviewRequest(lead: CrmLead): Promise<SendResult> {
  const { subject, html } = fill(opsConfig.reviewRequest.template, buildVars(lead));
  return sendEmail({ to: lead.email, subject, html });
}

export async function sendInvoiceReminder(lead: CrmLead, daysOverdue: number): Promise<SendResult> {
  if (!lead.invoice) return { sent: false, simulated: false, error: "no-invoice" };
  const vars = buildVars(lead, {
    invoiceNumber: lead.invoice.number,
    invoiceAmount: `${lead.invoice.currency} $${lead.invoice.amount.toFixed(2)}`,
    daysOverdue: String(daysOverdue),
  });
  const { subject, html } = fill(opsConfig.invoice.template, vars);
  return sendEmail({ to: lead.email, subject, html });
}
