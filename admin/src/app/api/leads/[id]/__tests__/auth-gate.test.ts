import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

/**
 * Route-level proof that the lifecycle endpoints reject unauthenticated callers.
 * Without the auth gate these handlers would call into the CRM and return 200;
 * with it, an unauthenticated POST is rejected with 401 BEFORE any mutation.
 */

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => undefined }),
}));

// Spy targets — if the gate works, these must never be called for an
// unauthenticated request.
const getLead = vi.fn(async (id: string) => ({
  id,
  reviewRequest: { status: "pending" },
  stage: "new",
}));
const updateLead = vi.fn(async (_id: string, _fn: unknown) => ({ followUp: { status: "sent" } }));
const markFollowUp = vi.fn((l: unknown) => l);

vi.mock("@/lib/crm", () => ({
  getLead: (id: string) => getLead(id),
  updateLead: (id: string, fn: unknown) => updateLead(id, fn),
  markFollowUp: (l: unknown) => markFollowUp(l),
}));

const sendFollowUp = vi.fn(async () => ({ sent: true, simulated: true }));
vi.mock("@/lib/mail", () => ({
  sendFollowUp: () => sendFollowUp(),
}));

const ADMIN = "route-test-admin-token";
const ORIGINAL = { ...process.env };

beforeEach(() => {
  process.env.ADMIN_TOKEN = ADMIN;
  process.env.ADMIN_SESSION_SECRET = "sess";
  vi.clearAllMocks();
});

afterEach(() => {
  process.env = { ...ORIGINAL };
});

async function loadRoute() {
  return import("@/app/api/leads/[id]/follow-up/route");
}

describe("POST /api/leads/[id]/follow-up auth gate", () => {
  it("rejects an unauthenticated request with 401 and does not mutate", async () => {
    const { POST } = await loadRoute();
    const req = new Request("http://localhost/api/leads/lead_1/follow-up", { method: "POST" });
    const res = await POST(req, { params: Promise.resolve({ id: "lead_1" }) });
    expect(res.status).toBe(401);
    expect(getLead).not.toHaveBeenCalled();
    expect(updateLead).not.toHaveBeenCalled();
    expect(sendFollowUp).not.toHaveBeenCalled();
  });

  it("rejects a wrong token with 401", async () => {
    const { POST } = await loadRoute();
    const req = new Request("http://localhost/api/leads/lead_1/follow-up", {
      method: "POST",
      headers: { "x-ops-token": "wrong" },
    });
    const res = await POST(req, { params: Promise.resolve({ id: "lead_1" }) });
    expect(res.status).toBe(401);
    expect(updateLead).not.toHaveBeenCalled();
  });

  it("admits the correct admin token and proceeds to mutate", async () => {
    const { POST } = await loadRoute();
    const req = new Request("http://localhost/api/leads/lead_1/follow-up", {
      method: "POST",
      headers: { "x-ops-token": ADMIN },
    });
    const res = await POST(req, { params: Promise.resolve({ id: "lead_1" }) });
    expect(res.status).toBe(200);
    expect(getLead).toHaveBeenCalledWith("lead_1");
    expect(sendFollowUp).toHaveBeenCalled();
  });
});
