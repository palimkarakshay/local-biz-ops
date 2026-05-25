"use client";

import { useState } from "react";
import Link from "next/link";
import { Turnstile } from "@/components/forms/turnstile";

type Result = { ok: boolean; id: string; stage: string; followUp: string; reviewRequest: string };
type Intent = { value: string; label: string };

export function LeadForm({ intents }: { intents: Intent[] }) {
  const [token, setToken] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const form = new FormData(e.currentTarget);
    const payload = {
      name: String(form.get("name") ?? ""),
      email: String(form.get("email") ?? ""),
      phone: String(form.get("phone") ?? ""),
      intent: String(form.get("intent") ?? "general"),
      message: String(form.get("message") ?? ""),
      consent: form.get("consent") === "on",
      source: "intake-demo",
      turnstileToken: token,
    };
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? "Submission failed");
        return;
      }
      setResult(data as Result);
    } catch {
      setError("Network error. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <div className="success-box">
        <h2 style={{ marginTop: 0 }}>Lead captured.</h2>
        <ul className="small">
          <li>
            CRM row created at stage <code>{result.stage}</code>.
          </li>
          <li>
            Follow-up: <strong>{result.followUp}</strong>.
          </li>
          <li>
            Review request: <strong>{result.reviewRequest}</strong>.
          </li>
        </ul>
        <p>
          <Link className="btn" href="/admin">
            See it in the CRM
          </Link>
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="card">
      <label>
        <span>Your name</span>
        <input name="name" required autoComplete="name" />
      </label>
      <label>
        <span>Email</span>
        <input name="email" type="email" required autoComplete="email" />
      </label>
      <label>
        <span>Phone (optional)</span>
        <input name="phone" type="tel" autoComplete="tel" />
      </label>
      <label>
        <span>What can we help with?</span>
        <select name="intent" defaultValue="general">
          {intents.map((i) => (
            <option key={i.value} value={i.value}>
              {i.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>Tell us a bit more</span>
        <textarea name="message" rows={5} required />
      </label>
      <label style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start" }}>
        <input type="checkbox" name="consent" style={{ width: "auto", marginTop: "0.3rem" }} />
        <span style={{ margin: 0 }}>I consent to being emailed about my inquiry.</span>
      </label>

      <Turnstile onToken={setToken} />

      {error ? (
        <p className="small" style={{ color: "var(--error)" }}>
          {error}
        </p>
      ) : null}

      <button type="submit" disabled={submitting}>
        {submitting ? "Sending…" : "Submit lead"}
      </button>
    </form>
  );
}
