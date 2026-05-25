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
| `workflows/` | The n8n import bundle — three workflows modelled on the reference site's `docs/N8N_SETUP.md` **webhook + AI-structuring** shape: (a) web lead → CRM → follow-up, (b) job-complete → Google Business Profile review request, (c) invoice reminder. Plus `verify-dispatch.mjs`, a local stand-in for an n8n run. |
| `config/` | Per-vertical config as data — intents, CRM stages, messaging, cadences, review platform, and **compliance flags**. One file per vertical (`NN-*.json`) + shared `_defaults.json`. The engine loads one of these; **compliance is config, not a code fork.** |
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
npm test               # Vitest unit tests for the CRM/pipeline + HMAC logic
```

Verify the signed-webhook path the n8n workflow uses, without an n8n instance —
start the admin with an `OPS_HMAC_SECRET`, then:

```bash
OPS_HMAC_SECRET=dev-secret OPS_INTAKE_URL=http://localhost:3000 \
  node ../workflows/verify-dispatch.mjs   # valid → CRM row + follow-up; tampered → 403
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

The engine is config-driven, not forked per vertical:

- `config/<vertical>.json` — the lifecycle as data: `intents`, `stages`,
  `compliance.flags`, cadences, and message templates (inheriting
  `config/_defaults.json`). All 17 verticals ship here.
- `admin/src/lib/ops-config.ts` — the loader: merges the active vertical over
  defaults and validates it. Select the active one with
  `NEXT_PUBLIC_OPS_VERTICAL` (default `home-services-trades`).
- `admin/src/lib/site-config.ts` — business identity, contact, the review URL,
  and CASL/PIPEDA lines (a subset of the marketing site's `site-config.ts`).

To tailor a vertical's copy further, run the matching `prompts/NN-*.txt`.

## Non-negotiables

- Never fabricate reviews, testimonials, licence numbers, or credentials — TODO
  tokens until real values are supplied.
- Every outbound message is CASL-compliant (consent + unsubscribe) and never
  carries data a vertical restricts (health info, SIN/banking, child data,
  protected hiring fields) — link to a secure channel instead.
