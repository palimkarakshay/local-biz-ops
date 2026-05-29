import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// next/headers cookies() is only available inside a Next request context. The
// API-caller auth paths we exercise here (X-Ops-Token / X-Ops-Signature) return
// before the session-cookie fallback is reached, but isAdminRequestAuthorized
// still references cookies() in its no-auth branch, so stub it to "no cookie".
let sessionCookieValue: string | undefined;
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (_name: string) =>
      sessionCookieValue === undefined ? undefined : { value: sessionCookieValue },
  }),
}));

import {
  checkLogin,
  hasAdminSession,
  isAdminRequestAuthorized,
  mintSession,
  requireAdminApi,
  safeEqual,
  verifySession,
} from "@/lib/auth";
import { signOpsBody } from "@/lib/security";

const ADMIN = "s3cret-admin-token";
const HMAC = "shared-hmac-secret";

const ORIGINAL = { ...process.env };

beforeEach(() => {
  process.env.ADMIN_TOKEN = ADMIN;
  process.env.ADMIN_SESSION_SECRET = "session-signing-secret";
  process.env.OPS_HMAC_SECRET = HMAC;
  sessionCookieValue = undefined;
});

afterEach(() => {
  process.env = { ...ORIGINAL };
  vi.restoreAllMocks();
});

describe("safeEqual", () => {
  it("matches equal strings and rejects different ones", () => {
    expect(safeEqual("abc", "abc")).toBe(true);
    expect(safeEqual("abc", "abd")).toBe(false);
    expect(safeEqual("abc", "abcd")).toBe(false);
    expect(safeEqual("", "")).toBe(true);
  });
});

describe("checkLogin", () => {
  it("accepts the configured admin token only", () => {
    expect(checkLogin(ADMIN)).toBe(true);
    expect(checkLogin("wrong")).toBe(false);
    expect(checkLogin("")).toBe(false);
    expect(checkLogin(null)).toBe(false);
  });

  it("fails closed when no admin token is configured", () => {
    delete process.env.ADMIN_TOKEN;
    delete process.env.ADMIN_SESSION_SECRET;
    expect(checkLogin("anything")).toBe(false);
    expect(checkLogin("")).toBe(false);
  });
});

describe("session cookie", () => {
  it("round-trips a freshly minted session", () => {
    const now = 1_700_000_000;
    const v = mintSession(now);
    expect(verifySession(v, now + 60)).toBe(true);
  });

  it("rejects an expired session", () => {
    const now = 1_700_000_000;
    const v = mintSession(now);
    expect(verifySession(v, now + 60 * 60 * 13)).toBe(false);
  });

  it("rejects a tampered / forged session", () => {
    const now = 1_700_000_000;
    const v = mintSession(now);
    const [exp] = v.split(".");
    expect(verifySession(`${exp}.deadbeef`, now)).toBe(false);
    expect(verifySession("not-a-session", now)).toBe(false);
    expect(verifySession(undefined, now)).toBe(false);
  });

  it("cannot be forged when the signing secret is unknown", () => {
    const now = 1_700_000_000;
    const minted = mintSession(now);
    // Attacker who does not know the secret cannot produce a valid cookie:
    process.env.ADMIN_SESSION_SECRET = "different-secret";
    expect(verifySession(minted, now + 60)).toBe(false);
  });
});

describe("hasAdminSession (browser operator)", () => {
  it("accepts a valid, unexpired session cookie when ADMIN_TOKEN is set", async () => {
    sessionCookieValue = mintSession();
    expect(await hasAdminSession()).toBe(true);
  });

  it("fails closed when ADMIN_TOKEN is unset, even with a session secret and a valid cookie", async () => {
    // Mint a still-valid cookie under the standalone session secret, then
    // remove the admin token: the console must lock anyway.
    sessionCookieValue = mintSession();
    delete process.env.ADMIN_TOKEN;
    expect(await hasAdminSession()).toBe(false);
  });
});

describe("isAdminRequestAuthorized (server-to-server)", () => {
  it("denies a request with no credentials", async () => {
    const req = new Request("http://localhost/api/leads/x/follow-up", { method: "POST" });
    expect(await isAdminRequestAuthorized(req, "")).toBe(false);
  });

  it("denies a request with a wrong token", async () => {
    const req = new Request("http://localhost/x", {
      method: "POST",
      headers: { "x-ops-token": "nope" },
    });
    expect(await isAdminRequestAuthorized(req, "")).toBe(false);
  });

  it("admits a request with the correct admin token", async () => {
    const req = new Request("http://localhost/x", {
      method: "POST",
      headers: { "x-ops-token": ADMIN },
    });
    expect(await isAdminRequestAuthorized(req, "")).toBe(true);
  });

  it("admits a request with a valid HMAC signature over the body", async () => {
    const body = JSON.stringify({ hi: "there" });
    const sig = signOpsBody(body, HMAC);
    const req = new Request("http://localhost/x", {
      method: "POST",
      headers: { "x-ops-signature": sig },
    });
    expect(await isAdminRequestAuthorized(req, body)).toBe(true);
  });

  it("denies a tampered HMAC body", async () => {
    const body = JSON.stringify({ hi: "there" });
    const sig = signOpsBody(body, HMAC);
    const req = new Request("http://localhost/x", {
      method: "POST",
      headers: { "x-ops-signature": sig },
    });
    expect(await isAdminRequestAuthorized(req, body + "tamper")).toBe(false);
  });

  it("fails closed: no token configured → even a present token is denied", async () => {
    delete process.env.ADMIN_TOKEN;
    delete process.env.ADMIN_SESSION_SECRET;
    const req = new Request("http://localhost/x", {
      method: "POST",
      headers: { "x-ops-token": "" },
    });
    expect(await isAdminRequestAuthorized(req, "")).toBe(false);
  });
});

describe("requireAdminApi", () => {
  it("returns a 401 NextResponse for an unauthenticated caller", async () => {
    const req = new Request("http://localhost/x", { method: "POST" });
    const res = await requireAdminApi(req, "");
    expect(res).not.toBeNull();
    expect(res?.status).toBe(401);
  });

  it("returns null (proceed) for the correct admin token", async () => {
    const req = new Request("http://localhost/x", {
      method: "POST",
      headers: { "x-ops-token": ADMIN },
    });
    expect(await requireAdminApi(req, "")).toBeNull();
  });
});
