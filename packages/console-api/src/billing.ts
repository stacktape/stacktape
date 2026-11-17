/**
 * The Free plan: the whole Console while an organization's managed AWS spend stays at or under this amount in a
 * calendar month (UTC). Managed AWS spend is the attributed cost of the stacks Stacktape manages.
 */
export const FREE_PLAN_MONTHLY_LIMIT_USD = 200;

/** From this month-to-date spend on, the Console shows a Free organization what Flexible would cost it. */
export const FREE_PLAN_FEE_ESTIMATE_FROM_USD = 150;

/** How long deploys continue after an organization first passes the Free limit. Once per organization. */
export const FREE_PLAN_GRACE_DAYS = 7;

/**
 * The Flexible plan's fee: ONE rate, chosen by the month's total managed AWS spend and applied to the whole total.
 * Billing charges by this table and the plans page shows it, so what the page promises is what is charged.
 */
export const FEE_BANDS = [
  { upToUsd: 2_000, percentage: 25 },
  { upToUsd: 5_000, percentage: 23 },
  { upToUsd: 10_000, percentage: 21 },
  { upToUsd: 25_000, percentage: 20 },
  { upToUsd: Infinity, percentage: 19 }
] as const;

export type FeeBand = (typeof FEE_BANDS)[number];

/** The band for a month's spend. Each band includes its upper bound: $2,000 is charged 25%, $2,000.01 is 23%. */
export const feeBandFor = (monthlyAwsSpendUsd: number): FeeBand =>
  FEE_BANDS.find((band) => monthlyAwsSpendUsd <= band.upToUsd) ?? FEE_BANDS[FEE_BANDS.length - 1]!;

/** The Flexible fee for a month's managed AWS spend, rounded to cents. */
export const flexibleFeeUsd = (monthlyAwsSpendUsd: number) =>
  Math.round(monthlyAwsSpendUsd * feeBandFor(monthlyAwsSpendUsd).percentage) / 100;
