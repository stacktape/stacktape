/**
 * What the composed configuration would cost per month.
 *
 * Cost is the third thing a developer worries about, after "will this break what I have" and "will
 * I lose my data", and it is one we can estimate when regional prices are available. Stacktape's anonymous API prices a
 * configuration without an account, which is what makes it usable here: `init` works for someone
 * who has never signed up, and the price has to work for them too.
 *
 * Three rules, because this is a network call in the middle of an offline-first flow:
 *
 * - **It never blocks.** The price arrives after the review screen has already rendered.
 * - **It never fails the run.** No network, no Stacktape, a slow response: the price is absent and
 *   nothing else changes. An estimate is worth having and not worth stopping for.
 * - **It is re-fetched when the configuration changes.** Changing a decision changes the resources,
 *   and a stale price next to a new resource list is worse than no price.
 */

import { publicApiClient } from '@stacktape-api/public';

/**
 * A priced configuration, ready to display.
 *
 * Formatted here rather than in the browser on purpose. The terminal presentation needs the same
 * strings, and a currency formatter copied into two apps is a currency formatter that will disagree
 * with itself. Nothing downstream does arithmetic on these.
 */
export type PriceEstimate = {
  /** Fixed monthly base plus a usage-cost label, or an incomplete-estimate label. */
  monthly: string;
  /** Per-resource monthly cost, keyed by the name in the configuration. */
  byResource: Record<string, string>;
  /** The region it was priced for, since prices differ and the user has not chosen one yet. */
  region: string;
};

/**
 * The region a price is quoted for before the user picks one.
 *
 * Prices differ by region, so quoting a number without saying where it applies would be the same
 * class of mistake as the invented figures this replaced. This one is stated in the interface.
 */
const DEFAULT_PRICING_REGION = 'eu-west-1';

/**
 * Price a configuration, or return nothing.
 *
 * Takes the rendered YAML rather than the composition because that is what the estimator parses,
 * and it keeps this honest: the price describes the file the user is about to write, not an
 * in-memory object that might serialise differently.
 */
export const estimateMonthlyCost = async (
  configYaml: string,
  region: string = DEFAULT_PRICING_REGION
): Promise<PriceEstimate | undefined> => {
  try {
    const result = await publicApiClient.stackPriceEstimation({ stackConfig: configYaml, region });
    if (!result.success || result.costs === null) return undefined;

    const byResource: Record<string, string> = {};
    for (const [name, info] of Object.entries(result.costs.resourcesBreakdown)) {
      const total = info.priceInfo.totalMonthlyFlat;
      const hasUsageCosts = info.priceInfo.costBreakdown.some(({ priceModel }) => priceModel === 'pay-per-use');
      byResource[name] =
        info.priceInfo.incomplete !== false
          ? 'Price unavailable'
          : total === 0 && hasUsageCosts
            ? 'pay-per-use'
            : formatMonthly(total ?? 0);
    }

    const hasUsageCosts = Object.values(result.costs.resourcesBreakdown).some(({ priceInfo }) =>
      priceInfo.costBreakdown.some(({ priceModel }) => priceModel === 'pay-per-use')
    );
    return {
      monthly:
        result.costs.incomplete !== false
          ? 'Estimate incomplete'
          : `${formatMonthly(result.costs.flatMonthlyCost)}${hasUsageCosts ? ' + pay-per-use costs' : ''}`,
      byResource,
      region
    };
  } catch {
    // Offline, blocked, rate-limited, or the API changed under us. All the same answer here.
    return undefined;
  }
};

/** `$23/mo`, or `$23.40/mo` when the cents matter. Rounded the way a person would read it. */
const formatMonthly = (amount: number): string => {
  if (amount >= 10) return `$${Math.round(amount)}/mo`;
  return `$${amount.toFixed(2).replace(/\.00$/, '')}/mo`;
};
