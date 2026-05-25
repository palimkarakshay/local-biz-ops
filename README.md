# local-biz-ops

The operations kit that sits **next to** a marketing site built from the
[marketing-site-creator](https://github.com/palimkarakshay/marketing-website-creator)
reference kit. The site captures the lead; this kit is what happens **after**:

```
lead intake  →  lightweight CRM  →  follow-up  →  review request  →  invoicing
```

Same philosophy as the reference kit — **config-driven, free-tier, KW-Ontario,
no fabricated claims** — applied to operations instead of the website.

## What's in here

| Folder | What |
|---|---|
| `admin/` | A small Next.js console: the CRM, the public `/api/leads` intake, and the follow-up / review / job-complete / invoice-reminder endpoints. Reuses the reference kit's **Resend + Turnstile** wiring and the **`site-config.ts`** config-driven approach. |
| `workflows/` | The n8n import bundle — three workflows modelled on the reference site's `docs/N8N_SETUP.md` **webhook + AI-structuring** shape: (a) web lead → CRM → follow-up, (b) job-complete → Google Business Profile review request, (c) invoice reminder. |
| `prompts/` | One ops build-prompt per vertical (01–17), mirroring the reference kit's 17 site prompts, plus the shared foundation + an index. |
| `docs/` | `OPERATOR_ONBOARDING.md` (developer runbook) and `OWNER_HANDBOOK.md`, in the same voice as the reference kit's docs. |

## v0.1

For one vertical — **home-services / trades** (`admin/src/lib/ops-config.ts`) —
wired end-to-end:

> A lead submitted lands in the CRM and fires a follow-up **+** a review-request
> step.

It runs at **$0 with nothing configured**: Turnstile is bypassed in dev and
emails are logged instead of sent, so the whole path is demoable offline.

## Quickstart

```bash
cd admin
npm install
npm run dev            # http://localhost:3000
```

- `/intake` — submit a demo lead (the same payload the marketing site posts).
- `/admin` — the CRM: it lands at stage **New** with the **follow-up sent** and
  the **review request queued**. Click **Mark job complete** to fire the review.

```bash
npm run build          # production build (passes clean)
npm test               # Vitest unit tests for the CRM/pipeline logic
```

Then import `workflows/*.json` into n8n (see `workflows/README.md`) and follow
`docs/OPERATOR_ONBOARDING.md` to wire it to a real site, Resend, Turnstile, and
the Google Business Profile review link.

## How it fits the reference kit

Open both repos in one Claude Code session. Build the site from
`marketing-site-creator/prompts/NN-*.txt`; run its operations from this kit's
`prompts/NN-*.txt` (same numbering, same vertical). The ops kit's
`site-config.ts` is a subset of the site's, so the identity values line up. **The
reference kit is read-only — this kit never modifies it.**

## Configure a vertical

Everything rebrandable is data in two files (change the config, not the
components):

- `admin/src/lib/site-config.ts` — identity, contact, review URL, compliance.
- `admin/src/lib/ops-config.ts` — the vertical lifecycle: `intents`, `stages`,
  and the `followUp` / `reviewRequest` / `invoice` templates.

To switch verticals, run the matching `prompts/NN-*.txt` against the kit.

## Non-negotiables

- Never fabricate reviews, testimonials, licence numbers, or credentials — TODO
  tokens until real values are supplied.
- Every outbound message is CASL-compliant (consent + unsubscribe) and never
  carries data a vertical restricts (health info, SIN/banking, child data,
  protected hiring fields) — link to a secure channel instead.
