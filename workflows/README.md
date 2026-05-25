# n8n workflow templates

The operator's import bundle for the ops kit. These three workflows run the
lifecycle that happens **after** the marketing site, on free-tier self-hosted
n8n (Railway Hobby ≈ $1–2/mo — same setup as the reference site's
`docs/N8N_SETUP.md`). They are modelled on that doc's **webhook + AI-structuring**
shape: a `Webhook` node, an HMAC `Verify` function, a Claude **structurer**, and
downstream action nodes.

The **admin app (`../admin/`) is the CRM and the single source of truth** for
records, templates, and the Google Business Profile review link. These workflows
are thin orchestrators that sign their calls and dispatch to the admin's API —
no GitHub/Resend/GBP credentials live in Next.js, only inside n8n + the admin.

| File | Shape | Does |
|---|---|---|
| `01-web-lead-to-crm.json` | Webhook → Verify HMAC → **Structure with Claude** → CRM row → ACK | A web lead lands in the CRM; the admin fires the templated follow-up. |
| `02-job-complete-review-request.json` | Webhook → Verify HMAC → Wait → review request → ACK | When a job is marked complete, waits, then fires the Google Business Profile review request (idempotent). |
| `03-invoice-reminder.json` | Schedule (daily) → get overdue → fan out → reminder | Sends an escalating reminder for each invoice that crosses a `reminderDays` checkpoint. |

## Editing via the n8n MCP

The repo's `.mcp.json` wires an **n8n MCP server**, so the agent can now **read
AND edit** all three workflows directly — lead intake
(`01-web-lead-to-crm.json`), the job-complete review request
(`02-job-complete-review-request.json`), and the invoice reminder
(`03-invoice-reminder.json`) — without hand-editing the exported JSON.

> **Hard rule — never touch a production-published workflow.** The agent only
> edits an **unpublished / draft version**; the operator reviews and **publishes
> manually**. These three workflows are live revenue/communication paths, so a
> bad publish silently breaks lead intake, review requests, or invoicing. Edit
> the draft, hand off, let the operator publish.

The JSON files in this folder remain the importable source of truth; keep them
in sync with any workflow you edit through the MCP.

## How to import

1. n8n → top-right **Import from File** → select the JSON.
2. Open the new workflow → set **Credentials** on each coloured node:
   - `anthropic` (workflow 01): API key for the structuring step. Swap for the
     `gemini`/`openai` node if you prefer — the system prompt is provider-neutral.
3. **Variables panel** (left sidebar → ⚙ → Variables) — set:
   - `OPS_HMAC_SECRET` — shared secret; the dispatcher signs
     `X-Ops-Signature: t=<unix>,v1=<hex>` over `${t}.${rawBody}` (HMAC-SHA256).
     The verify node rejects anything older than 5 minutes, so a captured
     request is unreplayable.
   - `OPS_INTAKE_URL` — base URL of the admin app, e.g. `https://ops.yourdomain.ca`.
   - `OPS_INTAKE_TOKEN` — same value as the admin's `OPS_INTAKE_TOKEN` env var;
     sent as the `X-Ops-Token` header so trusted calls skip Turnstile.
4. **Activate** each workflow. The webhook URLs that appear under the webhook
   nodes (01, 02) are what you point the marketing site / field app at.

## Wiring the channels

- **Workflow 01** — point the marketing site's lead form (or any channel) at
  the `ops-web-lead` webhook URL, signing the body. Or skip n8n entirely and
  have the site POST straight to the admin `POST /api/leads` with `X-Ops-Token`;
  n8n adds the Claude structuring + a buffer if the admin is briefly down.
- **Workflow 02** — POST `{ "leadId": "<id>" }` to the `ops-job-complete`
  webhook when a job finishes (a field app, a "done" SMS handler, or a GitHub
  label-added hook). The admin UI's **Mark job complete** button fires the
  review request immediately; this workflow is the delayed, from-the-field path.
- **Workflow 03** — no wiring; the schedule trigger polls
  `GET /api/invoices/overdue` every morning.

## Threat model

- **HMAC** on every inbound webhook (workflows 01, 02): timestamped, 5-minute
  replay window, constant-time compare — identical to the reference site's n8n
  bundle.
- **No outbound credentials in Next.js.** The admin holds Resend; n8n holds the
  channel + model credentials. Each call is authenticated with `X-Ops-Token`.
- Every admin write the workflows trigger is **idempotent** (review request
  skips if already sent; invoice reminders record a `day-N` checkpoint), so a
  retried webhook never double-sends.

## Verify locally without n8n

`verify-dispatch.mjs` is a stand-in for a live run of workflow (a): it
HMAC-signs a lead and POSTs it to the admin's `/api/leads` exactly as the
workflow does, so you can confirm the **signed webhook → CRM row → follow-up**
chain before importing anything into n8n.

```bash
# admin running with the same secret (production build, so the bot-check is active):
OPS_HMAC_SECRET=dev-secret npm run start            # in admin/
OPS_HMAC_SECRET=dev-secret OPS_INTAKE_URL=http://localhost:3000 \
  node workflows/verify-dispatch.mjs
```

Expect a valid signature → `200` + a new CRM row with the follow-up fired, and a
tampered body → `403`. The admin's `verifyOpsSignature` uses the identical
algorithm to each workflow's **Verify HMAC** node — keep them in lockstep.

## Replication for a new client

Each client gets its own bundle (own admin URL, own secrets):

```bash
cp -r workflows workflows-<slug>
# then import workflows-<slug>/*.json into n8n and set that client's Variables
```
