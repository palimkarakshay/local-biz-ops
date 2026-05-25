# Owner handbook

The business owner's handbook for running the operations side — what happens to
a lead after it comes off your website. Read it once on launch day; reference it
afterwards. It's the twin of the site kit's `docs/CLIENT_HANDBOOK.md` (which
covers the website itself).

## The pipeline in one picture

```
lead comes in  →  lands in your CRM  →  follow-up goes out  →  you do the work
   →  job complete  →  review request goes out  →  invoice + reminders
```

Your job is to work the CRM and keep things moving. The kit handles the
repetitive sends.

## Where things live

| What | Where | Edited via |
|---|---|---|
| Your name, phone, email, review link, compliance lines | `admin/src/lib/site-config.ts` | Code editor / GitHub web UI |
| Your lifecycle: lead types, pipeline stages, the email templates | `admin/src/lib/ops-config.ts` | Code editor |
| Your leads | the CRM at `/admin` | The admin console |

To change what a follow-up or review email *says*, edit the template strings in
`ops-config.ts` — you don't touch any code logic.

## Daily workflow

1. **A lead comes in** — from your website form (or a phone call you log). You
   get an email notification; the lead appears at `/admin` under stage **New**.
2. **The follow-up already went out.** The customer got a templated reply the
   moment they submitted. Your job is the real, human reply — **within one
   business day, same day where possible.** Speed-to-lead wins.
3. **Move the lead along.** Use the **Stage** dropdown as you go: Contacted →
   Scheduled → and so on. The stage list matches how your business actually runs
   (set per vertical).
4. **When the job's done, click "Mark job complete."** That fires the **review
   request** — the single biggest driver of your next lead. (A short delay is
   built in so you're not asking the moment you pack up.)
5. **Invoicing / reminders** run on their own once an invoice is on the lead:
   polite nudges at set checkpoints until it's paid.

## The review request — why it matters

A steady trickle of fresh Google reviews is the cheapest marketing you have. The
kit asks at the right moment (job done, customer happy) and includes a "reply to
us first if anything fell short" line — so unhappy customers come to you, not to
your public profile. **Never offer payment or discounts for a review** — it's
against Google's rules and the kit won't do it.

## Following up by hand

Any lead row has **Send** buttons to re-fire a follow-up or the review request
yourself — handy when you spoke on the phone and want to send the link again.

## Things you must keep current (compliance)

- Your **licence / credential number(s)** in `site-config.ts` (the kind your
  vertical requires) — accurate and renewed.
- **CASL:** every email only goes to people who contacted you, and carries an
  unsubscribe link. If someone opts out, honour it (within 10 business days).
- **Don't email sensitive details.** Depending on your trade, the kit
  deliberately keeps certain things out of email (health info, SIN/banking,
  children's details, protected hiring info) and links to a secure form instead.
  Don't paste those into a reply either.

## When something's off

- **A follow-up didn't send.** Check that Resend is configured (your developer
  set this up). With no key, the kit *simulates* sends (logs them) — fine for a
  demo, but real emails need the key.
- **Leads aren't showing up.** Confirm your website form is pointed at the ops
  kit (your developer wired this). Test by submitting your own form.
- **Wrong wording in an email.** Edit the template in `ops-config.ts` (or ask
  your developer). Changes take effect on the next send.

## When to upgrade

The kit grows with you. Each step costs a little to add — talk to your developer:

| Add | When |
|---|---|
| SMS follow-up (e.g. Twilio) | After your first busy week — speed-to-lead by text |
| A persistent database for the CRM | When you're past a handful of leads a week, or deployed to a serverless host |
| Reporting / a dashboard | When you want conversion + revenue numbers |
| A full CRM (HubSpot, etc.) | When the team grows beyond you |
