# Operator onboarding (developer's runbook)

Step-by-step setup for the developer (you, or a tech-savvy friend) standing up
the **ops kit** next to a marketing site built from the reference kit. This is
the launch checklist; it applies to any vertical — the only things that change
are which lifecycle you configure (`ops-config.ts`) and which compliance fields
you fill in.

This is the twin of the site kit's `docs/OPERATOR_ONBOARDING.md`. If you already
launched the site, most accounts here are the same ones.

## Target: ~60-minute setup, $0 cost month one

Everything defaults to free tiers. With nothing configured the kit runs in
simulation (Turnstile bypassed, emails logged) so you can demo the whole path
before signing up for anything.

## Pre-launch checklist

- [ ] The marketing site is built (reference kit) and capturing leads
- [ ] GitHub account (free)
- [ ] Resend account (free — likely the same one as the site)
- [ ] Cloudflare account (free — Turnstile)
- [ ] A host for the admin app (Vercel Hobby for the demo; see step 6)
- [ ] Railway account (free Hobby) if you want the n8n automation now
- [ ] The business's Google Business Profile (for the review link)

## 1. Start from the kit

```bash
cd admin
npm install
cp .env.example .env.local      # optional — runs in simulation with nothing set
npm run dev                     # http://localhost:3000
```

Open `/` for the overview, `/intake` to submit a demo lead, `/admin` for the
CRM. The `workflows/` folder holds the n8n import bundle (step 7).

## 2. Configure the business + the vertical

Two files, mirroring the site kit's config-driven approach. Find every `TODO`:

```bash
grep -rn "TODO" admin/src/lib
```

- `admin/src/lib/site-config.ts` — business name, title, email, phone, the
  marketing-site URL, the **review URL** (Google Business Profile), and the
  CASL/PIPEDA lines. Keep these in sync with the site's `site-config.ts`.
- `admin/src/lib/ops-config.ts` — the **vertical lifecycle**: `intents`,
  `stages`, and the `followUp` / `reviewRequest` / `invoice` templates. The kit
  ships wired for `home-services-trades`; to switch verticals, run the matching
  `prompts/NN-*.txt` against the kit (it rewrites `ops-config.ts`).

## 3. Resend transactional email

1. Sign up at resend.com (free: 100 emails/day) — or reuse the site's account.
2. Verify the domain with the DNS records Resend provides.
3. Create an API key. Add to `admin/.env.local`:
   ```
   RESEND_API_KEY=re_...
   RESEND_FROM_EMAIL=hello@theirdomain.ca
   RESEND_TO_EMAIL=owner-inbox@gmail.com
   ```
   `RESEND_TO_EMAIL` is where the operator notification lands; follow-up and
   review emails go to the customer.

## 4. Cloudflare Turnstile (protects the public intake)

1. Cloudflare dashboard → Turnstile → Add site (`theirdomain.ca` + `localhost`).
2. Copy the site key + secret into `admin/.env.local`:
   ```
   NEXT_PUBLIC_TURNSTILE_SITE_KEY=0x...
   TURNSTILE_SECRET_KEY=0x...
   ```

## 5. Connect the marketing site

The site forwards its leads to the ops kit. Two ways:

- **Direct (simplest):** have the site's `/api/contact` route also POST the lead
  to `https://<ops-host>/api/leads` with an `X-Ops-Token` header. Set a shared
  secret in both: `OPS_INTAKE_TOKEN` on the ops kit, the same value on the site.
  Trusted calls skip Turnstile (the site already verified it).
- **Via n8n (adds AI structuring + a buffer):** point the site at the
  `ops-web-lead` webhook (step 7). The workflow structures the lead with Claude,
  then calls `/api/leads`.

Leaving `OPS_INTAKE_TOKEN` blank means every intake must pass Turnstile.

## 6. Deploy the admin

### Demo — Vercel Hobby (free)

1. Push to GitHub → vercel.com/new → import → set the **root directory** to
   `admin/`.
2. Add the env vars from `.env.local` before deploying.
3. Deploy.

> **CRM store note.** v0.1 uses a file-backed store (`admin/data/leads.jsonl`).
> Serverless hosts have an **ephemeral, read-only** filesystem, so on Vercel the
> store won't persist between requests. For a real deployment use the upgrade
> path below, or run the admin on a host with a persistent disk (Railway,
> Render, a small VPS). The demo and the local v0.1 path work as-is.

### Commercial use

Vercel Hobby is non-commercial. For the live business use Vercel Pro, Render,
Railway, or a small VPS — anywhere the store can persist.

## 7. n8n automation bundle (optional but recommended)

Follow the same Railway setup as the site repo's `docs/N8N_SETUP.md`, then:

1. n8n → **Import from File** → import each file in `workflows/`.
2. Set credentials (the Anthropic key on workflow 01's structurer node).
3. Variables panel → set `OPS_HMAC_SECRET`, `OPS_INTAKE_URL` (your admin URL),
   and `OPS_INTAKE_TOKEN` (same as the admin's).
4. Activate. See `workflows/README.md` for the per-workflow wiring + threat model.

## 8. Review destination

Get the business's Google Business Profile "write a review" link (Place ID) and
set it:
```
GOOGLE_REVIEW_URL=https://search.google.com/local/writereview?placeid=...
```
This is what the review-request step sends.

## 9. Test the v0.1 path end-to-end

1. Submit a lead at `/intake` (or from the live marketing site).
2. Confirm it appears in `/admin` at the first stage, the **follow-up shows
   sent** (or `simulated` with no Resend key), and the **review request is
   queued**.
3. Click **Mark job complete** on the row → the **review request fires**.
4. With Resend configured, confirm the customer received the follow-up and the
   review email, and the operator inbox got the notification.

That's the v0.1 acceptance: a lead lands in the CRM and fires a follow-up + a
review-request step.

## 10. Hand off to the owner

1. Walk them through `/admin`: stages, resend a follow-up, mark a job complete.
2. Show them where leads come from (the site form / their inbox notification).
3. Hand off `docs/OWNER_HANDBOOK.md`.

## The CRM store + upgrade path

| Volume | Store |
|---|---|
| v0.1 / demo / single operator | File-backed `data/leads.jsonl` (ships) |
| Real traffic, one business | A Google Sheet (Apps Script webhook, like the site kit) or Postgres (Railway/Neon free tier) |
| Multi-client / reporting | Postgres + the admin pointed at it (swap `crm.ts` read/write) |

The pure pipeline logic in `crm.ts` (stages, steps, due-invoice derivation) is
storage-agnostic — only the read/write functions change.

## Per-vertical repurposing (the "invoice" workflow)

Not every vertical bills one-off invoices. Repoint workflow (c) per the matching
prompt:

| Vertical | "Invoice reminder" becomes |
|---|---|
| Trades / print / manufacturing | Deposit + balance reminders (ships as default) |
| Property management | Rent due + late-rent notice |
| Fitness / childcare | Recurring dues / tuition + dunning |
| Health / vet | Recall reminders (6-month / vaccination) |
| Mortgage / MSP | Renewal reminders before the anniversary |
| Salon | Rebooking cadence + no-show deposit |

## Maintenance schedule

- **Day 1:** confirm a real lead lands end-to-end (CRM + follow-up + review).
- **Week 1:** confirm review requests fire on job completion; spot-check Resend.
- **Month 1:** verify Resend free-tier usage is under the daily cap; confirm the
  CRM store is persisting (if you deployed beyond the demo).
- **Quarterly:** re-check that licence/credential TODOs in `site-config.ts` are
  filled and current; review the upgrade triggers above.
