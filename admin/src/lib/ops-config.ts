/**
 * Ops lifecycle loader — the engine is config-driven, NOT forked per vertical.
 *
 * The per-vertical configs live as data in the top-level `config/` folder. A
 * vertical file overrides only what differs; everything else is inherited from
 * `config/_defaults.json`. The active vertical is chosen by the
 * NEXT_PUBLIC_OPS_VERTICAL env var (default: home-services-trades). Switching
 * verticals is a config/env change — no code edit.
 */

import { z } from "zod";
import defaultsJson from "../../../config/_defaults.json";
import v01 from "../../../config/01-mortgage-broker.json";
import v02 from "../../../config/02-property-management-student-rentals.json";
import v03 from "../../../config/03-auto-dealership.json";
import v04 from "../../../config/04-home-services-trades.json";
import v05 from "../../../config/05-event-venue-photographer.json";
import v06 from "../../../config/06-professional-services.json";
import v07 from "../../../config/07-restaurant-catering.json";
import v08 from "../../../config/08-health-dental-clinic.json";
import v09 from "../../../config/09-fitness-wellness-studio.json";
import v10 from "../../../config/10-salon-spa-barber.json";
import v11 from "../../../config/11-veterinary-pet-services.json";
import v12 from "../../../config/12-childcare-early-learning-tutoring.json";
import v13 from "../../../config/13-managed-it-services.json";
import v14 from "../../../config/14-commercial-cleaning-facility.json";
import v15 from "../../../config/15-commercial-print-signage.json";
import v16 from "../../../config/16-staffing-recruiting-agency.json";
import v17 from "../../../config/17-contract-manufacturing-machine-shop.json";

const templateSchema = z.object({ subject: z.string(), html: z.string() });
export type Template = z.infer<typeof templateSchema>;

const stageSchema = z.object({
  id: z.string(),
  label: z.string(),
  terminal: z.boolean().optional(),
});
export type CrmStage = z.infer<typeof stageSchema>;

export const verticalConfigSchema = z.object({
  vertical: z.string(),
  label: z.string(),
  intents: z
    .array(
      z.object({ value: z.string(), label: z.string(), priority: z.enum(["P1", "P2", "P3"]) }),
    )
    .min(1),
  stages: z.array(stageSchema).min(1),
  reviewLink: z.object({ platform: z.string() }),
  compliance: z.object({
    flags: z.record(z.string(), z.boolean()),
    regulators: z.array(z.string()),
    notes: z.string(),
  }),
  followUp: z.object({ enabled: z.boolean(), delayHours: z.number(), template: templateSchema }),
  reviewRequest: z.object({
    enabled: z.boolean(),
    trigger: z.enum(["job-complete", "on-intake"]),
    delayDays: z.number(),
    template: templateSchema,
  }),
  invoice: z.object({
    enabled: z.boolean(),
    reminderDays: z.array(z.number()),
    repurposedAs: z.string(),
    template: templateSchema,
  }),
});
export type OpsConfig = z.infer<typeof verticalConfigSchema>;

type Raw = Record<string, unknown> & { vertical?: string };

const REGISTRY: Record<string, Raw> = Object.fromEntries(
  [v01, v02, v03, v04, v05, v06, v07, v08, v09, v10, v11, v12, v13, v14, v15, v16, v17].map(
    (v) => [(v as Raw).vertical as string, v as Raw],
  ),
);

/** Deep-merge a vertical config over the shared defaults (one level into each
 *  lifecycle block + its template). */
function mergeVertical(d: Record<string, any>, v: Record<string, any>): Record<string, unknown> {
  return {
    vertical: v.vertical,
    label: v.label,
    intents: v.intents,
    stages: v.stages,
    reviewLink: { ...d.reviewLink, ...(v.reviewLink ?? {}) },
    compliance: {
      flags: { ...(d.compliance?.flags ?? {}), ...(v.compliance?.flags ?? {}) },
      regulators: v.compliance?.regulators ?? d.compliance?.regulators ?? [],
      notes: v.compliance?.notes ?? d.compliance?.notes ?? "",
    },
    followUp: {
      ...d.followUp,
      ...(v.followUp ?? {}),
      template: { ...d.followUp.template, ...(v.followUp?.template ?? {}) },
    },
    reviewRequest: {
      ...d.reviewRequest,
      ...(v.reviewRequest ?? {}),
      template: { ...d.reviewRequest.template, ...(v.reviewRequest?.template ?? {}) },
    },
    invoice: {
      ...d.invoice,
      ...(v.invoice ?? {}),
      template: { ...d.invoice.template, ...(v.invoice?.template ?? {}) },
    },
  };
}

export const ACTIVE_VERTICAL = process.env.NEXT_PUBLIC_OPS_VERTICAL ?? "home-services-trades";

function load(): OpsConfig {
  const vertical = REGISTRY[ACTIVE_VERTICAL];
  if (!vertical) {
    throw new Error(
      `Unknown OPS vertical "${ACTIVE_VERTICAL}". Available: ${Object.keys(REGISTRY).join(", ")}`,
    );
  }
  const merged = mergeVertical(defaultsJson as Record<string, any>, vertical as Record<string, any>);
  return verticalConfigSchema.parse(merged);
}

export const opsConfig: OpsConfig = load();

/** All verticals available to switch to (slug + label) — surfaced in the admin. */
export const availableVerticals = Object.values(REGISTRY).map((v) => ({
  vertical: v.vertical as string,
  label: (v as { label?: string }).label ?? (v.vertical as string),
}));
