================================================================
OPS PROMPTS — INDEX & HOW TO USE
================================================================

WHAT THIS FOLDER IS
-------------------
These are paste-ready build prompts for the local-biz-ops kit — one per
vertical, mirroring the 17 site prompts in the marketing-site-creator
(reference) kit's `prompts/` folder. Each one tells a Claude Code agent how to
configure the OPERATIONS that run AFTER the website for one type of local
Kitchener-Waterloo (KW), Ontario business: lead intake -> lightweight CRM ->
follow-up -> review request -> invoicing.

Each numbered prompt is FULLY SELF-CONTAINED. It inlines the ops common
foundation (the stack, the config-driven lifecycle, the three workflows, the
quality bar) so you paste ONE file into a session. `00-common-foundation.txt`
is the reference copy of that shared block — you don't paste it on its own.

The numbering matches the site kit 1:1, so prompt NN here is the ops twin of
prompt NN there. Build the site with the site prompt; run its operations with
this one.

THE FILES
---------
00-common-foundation.txt   Reference copy of the inlined ops foundation.

01-mortgage-broker.txt                      Rate/pre-approval inquiries; funded-deal review;
                                            renewal reminders. FSRA; no SIN/banking by email.
02-property-management-student-rentals.txt  Viewing/application inquiries; move-in review;
                                            rent-due reminders. RTA + Human Rights Code.
03-auto-dealership.txt                      Test-drive/e-price/trade-in; delivery review;
                                            deposit + service reminders. OMVIC.
04-home-services-trades.txt                 Emergency/quote/booking; job-complete review;
                                            deposit + invoice reminders. TSSA/ECRA-ESA/WSIB.
                                            >>> Ships as the v0.1 default ops-config.
05-event-venue-photographer.txt             Date inquiries; post-event review; milestone
                                            (deposit/installment) invoicing.
06-professional-services.txt                Consultation intake; matter-complete review;
                                            retainer/billing reminders. LSO/CPA ad rules.
07-restaurant-catering.txt                  Catering/event inquiries; post-event review;
                                            deposit + balance. Allergen disclaimer.
08-health-dental-clinic.txt                 New-patient/booking; post-visit review; balance +
                                            recall reminders. PHIPA + College ad rules.
09-fitness-wellness-studio.txt              Free-trial inquiries; post-trial review; membership
                                            dues + dunning. Consumer Protection; PAR-Q.
10-salon-spa-barber.txt                     Booking inquiries; post-visit review; rebooking +
                                            no-show/deposit. Public-health PSS.
11-veterinary-pet-services.txt              New-client/appointment; post-visit review; balance +
                                            vaccination recalls. CVO ad rules.
12-childcare-early-learning-tutoring.txt    Tour/waitlist/enrollment; term review; tuition
                                            reminders. CCEYA; minimal child data by email.
13-managed-it-services.txt                  Assessment/discovery (sales vs support); onboarding
                                            review; monthly + renewal billing. PIPEDA; SLAs.
14-commercial-cleaning-facility.txt         Walkthrough requests; first-month review; recurring
                                            monthly invoicing. WSIB/WHMIS; insured/bonded.
15-commercial-print-signage.txt             RFQ + proof approval; post-delivery review; deposit +
                                            reorder reminders. Truthful capability claims.
16-staffing-recruiting-agency.txt           Employer request-talent + candidate resume (two
                                            inboxes); placement review; placement-fee invoicing.
                                            Temp-help/recruiter licensing; Human Rights Code.
17-contract-manufacturing-machine-shop.txt  RFQ (NDA + drawing); post-delivery reference request;
                                            PO/net-terms invoicing. Cert claims; OHSA/WSIB; NDA.

THE TWO-REPO WORKFLOW
---------------------
Open this kit alongside the reference marketing-site-creator kit in one Claude
Code session:

  1. local-biz-ops (this kit) — where you configure the ops console + workflows.
  2. marketing-site-creator (reference) — READ-ONLY. The matching site prompt
     built the site that feeds leads in. Do NOT modify it.

HOW TO USE
----------
  1. Build (or already have) the marketing site from the reference kit's
     matching prompt NN.
  2. Pick the prompt here that matches the business.
  3. Paste that one .txt file into the session as the build instruction.
  4. The agent sets `ops-config.ts` (intents, stages, follow-up/review/invoice
     templates) + `site-config.ts` (identity, review URL), adapts the three n8n
     workflows for the vertical, keeps `npm run build` + Vitest green, and points
     the site's lead form at this kit's `/api/leads`.
  5. Follow `../docs/` to onboard the operator and run the v0.1 path live.

WHAT THE AGENT MUST NOT DO
--------------------------
  - Modify anything in the reference marketing-site-creator kit.
  - Fabricate reviews, testimonials, licence numbers, credentials, or stats.
    Use TODO tokens and marked placeholders.
  - Email data a vertical restricts (SIN/banking, health info, child data,
    protected candidate fields). Link to a secure channel instead.
================================================================
