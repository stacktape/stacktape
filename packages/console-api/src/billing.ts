/**
 * The Flexible plan's fee: one percentage, chosen by the month's total managed AWS costs, applied to the whole total.
 * The plans page shows this same table, so what it promises is what billing charges.
 */
export const FEE_BANDS = [
  { upToUsd: 1_000, percentage: 30 },
  { upToUsd: 4_000, percentage: 28 },
  { upToUsd: 10_000, percentage: 26 },
  { upToUsd: 17_500, percentage: 24 },
  { upToUsd: 25_000, percentage: 22 },
  { upToUsd: Infinity, percentage: 20 }
] as const;

export const feeBandFor = (totalAwsCosts: number) =>
  FEE_BANDS.find((band) => totalAwsCosts <= band.upToUsd) ?? FEE_BANDS[FEE_BANDS.length - 1]!;
