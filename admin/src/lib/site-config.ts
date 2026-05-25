/**
 * Single source of truth for the business identity behind the ops kit. This is
 * the SAME shape (a trimmed subset) as the marketing-site kit's
 * `src/lib/site-config.ts`, on purpose: an operator running both the site and
 * this ops kit fills in ONE config in each, and the values line up.
 *
 * A new business adopting this kit changes ONLY this file (identity) plus
 * `ops-config.ts` (the vertical lifecycle). Every TODO token is intentional —
 * fill them in before going live.
 */

export const siteConfig = {
  /** Business identity — must match the marketing site's siteConfig.business. */
  business: {
    name: "Acme Trades Co.", // TODO: your business / brand name
    title: "Owner", // TODO: role shown in email signatures
    email: "hello@yourdomain.ca", // TODO
    phone: "+1-519-555-0100", // TODO
    /** Where the marketing site lives — used in follow-up links + signatures. */
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "https://yourdomain.ca",
  },

  /** Optional legal organization block (NAP for email footers). */
  organization: undefined as
    | {
        name: string;
        address: string;
        phone: string;
      }
    | undefined,

  /** Locale basics — match the marketing site. */
  site: {
    locale: "en-CA",
    timezone: "America/Toronto",
  },

  /** Compliance copy attached to every outbound message (CASL / PIPEDA). */
  compliance: {
    /** CASL unsubscribe line appended to follow-up + review emails. */
    casl: "You're receiving this because you contacted us. Reply STOP or use the unsubscribe link to opt out.",
    /** Public unsubscribe endpoint on the marketing site. */
    unsubscribeUrl:
      (process.env.NEXT_PUBLIC_SITE_URL ?? "https://yourdomain.ca") + "/unsubscribe",
  },

  /**
   * Review destination for the review-request step. Default is a Google
   * Business Profile "write a review" deep link — replace the PLACE_ID TODO
   * with the business's real Place ID (or set GOOGLE_REVIEW_URL in env).
   */
  reviews: {
    platform: "Google Business Profile",
    url:
      process.env.GOOGLE_REVIEW_URL ??
      "https://search.google.com/local/writereview?placeid=TODO_GBP_PLACE_ID",
  },
} as const;

export type SiteConfig = typeof siteConfig;
