# config/ — per-vertical ops config

The engine is **config-driven, not forked per vertical**. Everything that
differs between business types — lead intents, the CRM pipeline, message copy,
cadences, the review platform, and **compliance flags** — lives here as data.
The admin (`../admin/`) loads one of these at runtime; switching verticals is an
env change (`NEXT_PUBLIC_OPS_VERTICAL`), not a code edit.

## Files

- `_defaults.json` — the shared baseline every vertical inherits (default
  message templates, default cadences, the full compliance-flag set defaulted to
  off, the review platform).
- `NN-<vertical>.json` — one per vertical, numbered to match
  `../prompts/NN-*.txt` and the reference site kit's prompts. A vertical file
  **overrides only what differs**; unspecified keys fall back to `_defaults.json`.

`04-home-services-trades.json` is fully implemented (the v0.1 default). The other
16 are scaffolded with real intents, stages, and compliance flags, and inherit
the default message templates — fill in tailored copy as you take each live.

## Shape (after merge with defaults)

```jsonc
{
  "vertical": "home-services-trades",          // slug — matches the file + NEXT_PUBLIC_OPS_VERTICAL
  "label": "Home Services / Trades",
  "intents": [{ "value": "emergency", "label": "Emergency call-out", "priority": "P1" }],
  "stages": [{ "id": "new", "label": "New" }],  // new leads land in stages[0]
  "reviewLink": { "platform": "Google Business Profile" },  // URL comes from GOOGLE_REVIEW_URL
  "compliance": {
    "flags": { "noSinOrBankingByEmail": false, "phipa": false, "...": false },
    "regulators": ["TSSA (gas/HVAC)", "..."],   // names only; numbers are TODO in site-config.ts
    "notes": "Plain-language guidance for the operator."
  },
  "followUp":      { "enabled": true, "delayHours": 0, "template": { "subject": "…", "html": "…" } },
  "reviewRequest": { "enabled": true, "trigger": "job-complete", "delayDays": 1, "template": { … } },
  "invoice":       { "enabled": true, "reminderDays": [3, 7, 14], "repurposedAs": "…", "template": { … } }
}
```

The merged result is validated by `verticalConfigSchema` in
`../admin/src/lib/ops-config.ts` — a malformed config fails fast at startup.

## Compliance flags are config, not code

Flags like `phipa`, `noSinOrBankingByEmail`, `humanRightsCode`,
`minimalChildDataByEmail`, `secureIntakeLink`, `reviewNeedsApproval`,
`allergenDisclaimer`, `truthfulClaimsOnly`, and `ndaBeforeFiles` express what a
vertical legally requires of its outbound messaging. They live here so a new
vertical never means a code fork — the admin reads them and the per-vertical
prompt (`../prompts/`) explains how each shapes the templates. `reviewRequest.
enabled: false` (e.g. professional services, health, manufacturing) holds the
review step until a human approves the wording under the relevant ad rules.

## Editing copy

Templates are strings with `{{placeholders}}` resolved by the admin
(`firstName`, `businessName`, `businessPhone`, `reviewUrl`, `invoiceNumber`,
`invoiceAmount`, `daysOverdue`, `signature`, `caslLine`, `unsubscribeUrl`,
`intentLabel`). Edit the strings; never edit the components.
