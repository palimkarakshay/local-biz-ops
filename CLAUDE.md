# CLAUDE.md

This repo is the local-business ops kit: the three n8n workflows in `workflows/`
plus a Next.js admin app (`admin/`). `.mcp.json` wires the shared KW
marketing-site MCP servers, plus Stripe (invoice-reminder workflow) and n8n
(read/edit the workflows directly).

## MCP servers — one-line use policy

Reach for the right server instead of guessing or hand-rolling:

- **context7** — pull current, version-accurate docs for any library/framework/API before you write or upgrade code against it; never code an API from memory.
- **shadcn** — add/update shadcn/ui components through the MCP (keep `components.json` authoritative) rather than hand-writing primitives.
- **playwright** — drive a real browser for end-to-end checks, screenshots, and responsive / AODA-accessibility verification before calling any UI change done.
- **vercel** — inspect deployments, build logs, env vars, and domains; diagnose a failed deploy from its logs instead of guessing.
- **sentry** — triage runtime errors and confirm a change cleared (not introduced) issues; read the stack trace before debugging blind.
- **cloudflare** — manage the site's DNS, Turnstile, and Email Routing through the MCP; verify records there, not by hand.
- **resend** — send and verify transactional email during lead-path testing; the key comes from `RESEND_API_KEY` — never hard-code it.
- **github** — do all branch / PR / review / CI work through the GitHub MCP.
- **stripe** — look up invoices/customers and exercise the invoice-reminder flow against the Stripe API (test mode); never invent IDs, amounts, or customers.
- **n8n** — read and edit the three workflow definitions in `workflows/` through the MCP, subject to the hard rule below.

## Hard rule: n8n production workflows

**The agent never modifies a production-published workflow.** All edits go to an
**unpublished/draft version only**; the operator reviews and publishes manually.
The three workflows — `workflows/01-web-lead-to-crm.json` (lead intake),
`workflows/02-job-complete-review-request.json` (job-complete review request),
and `workflows/03-invoice-reminder.json` (invoice reminder) — are live
revenue/communication paths, so a bad publish silently breaks lead intake,
review requests, or invoicing. Edit the draft, hand off, and let the operator
publish.
