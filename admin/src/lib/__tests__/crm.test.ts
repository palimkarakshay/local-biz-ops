import { describe, it, expect } from "vitest";
import {
  createLead,
  deriveDueInvoices,
  firstName,
  markFollowUp,
  markReviewRequest,
  setStage,
} from "@/lib/crm";
import { renderTemplate } from "@/lib/mail";
import { opsConfig } from "@/lib/ops-config";
import type { CrmLead, LeadIntake } from "@/lib/schemas";

const intake: LeadIntake = {
  name: "Dana Stewart",
  email: "dana@example.com",
  phone: "519-555-0142",
  message: "Furnace is making a noise.",
  intent: "quote",
  source: "intake-demo",
};

describe("createLead", () => {
  it("lands a new lead at the first stage with both steps pending", () => {
    const lead = createLead(intake);
    expect(lead.id).toBeTruthy();
    expect(lead.stage).toBe(opsConfig.stages[0].id);
    expect(lead.followUp.status).toBe("pending");
    expect(lead.reviewRequest.status).toBe("pending");
    expect(lead.history[0].type).toBe("lead-received");
  });
});

describe("stage + step transitions", () => {
  it("advances stage and appends history", () => {
    const lead = setStage(createLead(intake), "scheduled");
    expect(lead.stage).toBe("scheduled");
    expect(lead.history.at(-1)?.type).toBe("stage-change");
  });

  it("rejects unknown stages", () => {
    expect(() => setStage(createLead(intake), "nope")).toThrow();
  });

  it("marks follow-up and review-request steps", () => {
    let lead = markFollowUp(createLead(intake), "sent");
    expect(lead.followUp.status).toBe("sent");
    expect(lead.followUp.at).toBeTruthy();
    lead = markReviewRequest(lead, "sent");
    expect(lead.reviewRequest.status).toBe("sent");
  });
});

describe("renderTemplate", () => {
  it("substitutes placeholders and leaves unknown ones blank", () => {
    const out = renderTemplate("Hi {{firstName}}, from {{businessName}}.{{missing}}", {
      firstName: "Dana",
      businessName: "Acme Trades",
    });
    expect(out).toBe("Hi Dana, from Acme Trades.");
  });

  it("firstName takes the first token", () => {
    expect(firstName("Dana Stewart")).toBe("Dana");
  });
});

function makeLead(overrides: Partial<CrmLead>): CrmLead {
  return {
    ...createLead(intake),
    ...overrides,
  };
}

const DAY = 24 * 60 * 60 * 1000;

describe("deriveDueInvoices", () => {
  const now = new Date("2026-05-25T12:00:00Z");

  it("fires the highest crossed, unfired checkpoint (reminderDays 3/7/14)", () => {
    const lead = makeLead({
      invoice: {
        number: "INV-1001",
        amount: 480,
        currency: "CAD",
        dueDate: new Date(now.getTime() - 8 * DAY).toISOString(),
        status: "open",
        remindersSent: [],
      },
    });
    const due = deriveDueInvoices([lead], now);
    expect(due).toHaveLength(1);
    expect(due[0].checkpoint).toBe(7);
    expect(due[0].daysOverdue).toBe(8);
  });

  it("does not re-fire a checkpoint already recorded", () => {
    const lead = makeLead({
      invoice: {
        number: "INV-1001",
        amount: 480,
        currency: "CAD",
        dueDate: new Date(now.getTime() - 8 * DAY).toISOString(),
        status: "open",
        remindersSent: ["day-7"],
      },
    });
    const due = deriveDueInvoices([lead], now);
    expect(due[0].checkpoint).toBe(3);
  });

  it("ignores paid and not-yet-due invoices", () => {
    const paid = makeLead({
      invoice: {
        number: "INV-2002",
        amount: 100,
        currency: "CAD",
        dueDate: new Date(now.getTime() - 30 * DAY).toISOString(),
        status: "paid",
        remindersSent: [],
      },
    });
    const future = makeLead({
      invoice: {
        number: "INV-3003",
        amount: 100,
        currency: "CAD",
        dueDate: new Date(now.getTime() + 5 * DAY).toISOString(),
        status: "open",
        remindersSent: [],
      },
    });
    expect(deriveDueInvoices([paid, future], now)).toHaveLength(0);
  });
});
