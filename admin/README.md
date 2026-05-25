# local-biz-ops admin

A small Next.js console for the operations that happen **after** the marketing
site: lead intake → CRM → follow-up → review request → invoicing. It reuses the
marketing-site kit's wiring — **Resend** transactional email, **Cloudflare
Turnstile** bot protection, and the **config-driven `site-config.ts`** approach
— so an operator running both fills in one config in each and the values line
up.

## v0.1 scope

For one vertical (`home-services-trades`, set in `src/lib/ops-config.ts`):

1. A lead submitted to `POST /api/leads` **lands in the CRM** at the first stage.
2. The **templated follow-up fires** immediately (Resend; simulated when no key).
3. The **review-request step is set in motion** — queued at intake, fired when
   the job is marked complete.

Everything runs at **$0 with nothing configured**: Turnstile is bypassed in dev
and emails are logged instead of sent, so the whole path is demoable offline.

## Run it

```bash
npm install
cp .env.example .env.local   # optional — runs in simulation with nothing set
npm run dev                  # http://localhost:3000
```

- `/` — overview.
- `/intake` — demo lead form (the same payload the marketing site posts).
- `/admin` — the CRM: view leads, advance stages, resend a follow-up, mark a
  job complete (which fires the review request).

```bash
npm run build        # production build (passes clean)
npm test             # Vitest unit tests for the CRM logic
npm run type-check   # tsc --noEmit
```

## Where things live (config-driven)

| What | File |
|---|---|
| Business identity, contact, review URL, compliance | `src/lib/site-config.ts` |
| The vertical lifecycle: stages, intents, follow-up / review / invoice templates | `src/lib/ops-config.ts` |
| Lead + CRM schemas (zod) | `src/lib/schemas.ts` |
| CRM store + pure pipeline helpers | `src/lib/crm.ts` |
| Resend + Turnstile wiring, templating | `src/lib/mail.ts` |

To adopt a new vertical, swap `ops-config.ts` (the matching `prompts/NN-*.txt`
generates it) and fill in `site-config.ts`. You don't touch the components.

## API surface

| Route | Purpose |
|---|---|
| `POST /api/leads` | Intake. Validates, checks Turnstile (or `X-Ops-Token`), creates the CRM row, fires the follow-up, queues the review step. |
| `GET /api/leads` | List the CRM (used by the admin UI / n8n debugging). |
| `POST /api/leads/[id]/follow-up` | (Re)send the templated follow-up. |
| `POST /api/leads/[id]/review-request` | Send the review request. |
| `POST /api/leads/[id]/job-complete` | Advance to `job-complete`; fires the review request. |
| `GET /api/invoices/overdue` | Invoices past an unfired reminder checkpoint (n8n workflow c polls this). |

### Trusted server-to-server intake

The marketing site and the n8n workflows POST leads without a Turnstile token by
presenting a shared secret header:

```
X-Ops-Token: <value of OPS_INTAKE_TOKEN>
```

When `OPS_INTAKE_TOKEN` is unset, public posts must pass Turnstile (bypassed in
dev). See `../workflows/` for the importable n8n templates that call this API.

## The CRM store

v0.1 uses a file-backed JSONL store at `data/leads.jsonl` (gitignored), the same
shape the site kit uses for its lead log, promoted to a tiny pipeline with
stages and per-lead steps. On a serverless host the filesystem is ephemeral —
the upgrade path (Postgres / a Google Sheet) is documented in `../docs/`.
