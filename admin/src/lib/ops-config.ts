/**
 * The ops lifecycle config — change the config, not the components.
 *
 * This is the ops-kit twin of the marketing-site kit's config-driven approach:
 * everything about the vertical's lead → CRM → follow-up → review → invoice
 * lifecycle is described here as data. Swapping verticals = swapping this file
 * (each `prompts/NN-*.txt` generates the right one for its vertical).
 *
 * v0.1 ships the `home-services-trades` vertical wired end-to-end.
 */

export type Template = {
  subject: string;
  /** HTML body. Supports {{placeholders}} — see renderTemplate() in mail.ts. */
  html: string;
};

export type CrmStage = {
  id: string;
  label: string;
  /** Terminal stages don't advance further. */
  terminal?: boolean;
};

export type OpsConfig = {
  vertical: string;
  /** Intents the marketing-site lead form can send (drives triage + routing). */
  intents: { value: string; label: string; priority: "P1" | "P2" | "P3" }[];
  /** The CRM pipeline. The first stage is where new leads land. */
  stages: CrmStage[];
  followUp: {
    enabled: boolean;
    /** Hours to wait before the follow-up. v0.1 fires immediately (0). */
    delayHours: number;
    template: Template;
  };
  reviewRequest: {
    enabled: boolean;
    /** "job-complete" = queued at intake, sent when the job is marked done. */
    trigger: "job-complete" | "on-intake";
    /** Days after job completion to wait before asking. */
    delayDays: number;
    template: Template;
  };
  invoice: {
    enabled: boolean;
    /** Days-overdue checkpoints that fire a reminder (workflow c). */
    reminderDays: number[];
    template: Template;
  };
};

export const opsConfig: OpsConfig = {
  vertical: "home-services-trades",

  intents: [
    { value: "emergency", label: "Emergency call-out", priority: "P1" },
    { value: "quote", label: "Quote request", priority: "P2" },
    { value: "booking", label: "Book a service window", priority: "P2" },
    { value: "general", label: "General question", priority: "P3" },
  ],

  stages: [
    { id: "new", label: "New" },
    { id: "contacted", label: "Contacted" },
    { id: "scheduled", label: "Scheduled" },
    { id: "job-complete", label: "Job complete" },
    { id: "won", label: "Won", terminal: true },
    { id: "lost", label: "Lost", terminal: true },
  ],

  followUp: {
    enabled: true,
    delayHours: 0,
    template: {
      subject: "Thanks for reaching out to {{businessName}}",
      html: `
        <p>Hi {{firstName}},</p>
        <p>Thanks for getting in touch with {{businessName}} about your
        <strong>{{intentLabel}}</strong>. We've logged your request and a real
        person will follow up shortly to confirm details and a service window.</p>
        <p>If it's urgent, call us directly at
        <a href="tel:{{businessPhone}}">{{businessPhone}}</a>.</p>
        <p>{{signature}}</p>
        <p style="color:#888;font-size:12px;margin-top:24px">{{caslLine}}
        <a href="{{unsubscribeUrl}}">Unsubscribe</a>.</p>
      `,
    },
  },

  reviewRequest: {
    enabled: true,
    trigger: "job-complete",
    delayDays: 1,
    template: {
      subject: "How did we do? A quick favour from {{businessName}}",
      html: `
        <p>Hi {{firstName}},</p>
        <p>Thanks again for choosing {{businessName}}. If we did right by you,
        a quick public review helps your neighbours find a trade they can
        trust — it takes under a minute.</p>
        <p><a href="{{reviewUrl}}"
        style="display:inline-block;padding:10px 18px;background:#1a1a1a;color:#fff;border-radius:999px;text-decoration:none">Leave a review</a></p>
        <p>If anything fell short, reply to this email first — we'd rather make
        it right than have you tell the internet.</p>
        <p>{{signature}}</p>
        <p style="color:#888;font-size:12px;margin-top:24px">{{caslLine}}
        <a href="{{unsubscribeUrl}}">Unsubscribe</a>.</p>
      `,
    },
  },

  invoice: {
    enabled: true,
    reminderDays: [3, 7, 14],
    template: {
      subject: "Reminder: invoice {{invoiceNumber}} from {{businessName}}",
      html: `
        <p>Hi {{firstName}},</p>
        <p>A friendly reminder that invoice <strong>{{invoiceNumber}}</strong>
        for <strong>{{invoiceAmount}}</strong> is now {{daysOverdue}} day(s) past
        due.</p>
        <p>You can settle it any time. If you've already paid, thank you —
        please ignore this note. Questions? Just reply.</p>
        <p>{{signature}}</p>
        <p style="color:#888;font-size:12px;margin-top:24px">{{caslLine}}
        <a href="{{unsubscribeUrl}}">Unsubscribe</a>.</p>
      `,
    },
  },
};
