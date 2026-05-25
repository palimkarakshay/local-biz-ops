import { describe, it, expect } from "vitest";
import { signOpsBody, verifyOpsSignature } from "@/lib/security";

const SECRET = "test-hmac-secret";
const body = JSON.stringify({ name: "Dana", email: "dana@example.com", message: "hi" });

describe("verifyOpsSignature", () => {
  it("accepts a freshly signed body", () => {
    const now = 1_700_000_000;
    const header = signOpsBody(body, SECRET, now);
    expect(verifyOpsSignature(body, header, SECRET, now).ok).toBe(true);
  });

  it("rejects a stale signature (outside the 5-minute window)", () => {
    const t = 1_700_000_000;
    const header = signOpsBody(body, SECRET, t);
    const r = verifyOpsSignature(body, header, SECRET, t + 301);
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("stale");
  });

  it("rejects a tampered body", () => {
    const now = 1_700_000_000;
    const header = signOpsBody(body, SECRET, now);
    const r = verifyOpsSignature(body + " ", header, SECRET, now);
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("mismatch");
  });

  it("rejects the wrong secret", () => {
    const now = 1_700_000_000;
    const header = signOpsBody(body, SECRET, now);
    expect(verifyOpsSignature(body, header, "other-secret", now).ok).toBe(false);
  });

  it("rejects a missing or malformed header", () => {
    expect(verifyOpsSignature(body, null, SECRET).reason).toBe("missing-signature");
    expect(verifyOpsSignature(body, "garbage", SECRET).reason).toBe("bad-format");
  });

  it("rejects when no secret is configured", () => {
    const header = signOpsBody(body, SECRET);
    expect(verifyOpsSignature(body, header, "").reason).toBe("no-secret");
  });
});
