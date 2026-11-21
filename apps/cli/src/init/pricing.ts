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
  /** The fixed monthly part as a number, for comparing two estimates. Absent when incomplete. */
  flatMonthly?: number;
  /**
   * What each other answer to an infrastructure choice would change, keyed by choice and then
   * by answer: `+$15/mo`, `-$4/mo`, or `Same price`. Only for answers that could be priced.
   */
  options?: Record<string, Record<string, string>>;
  /** Each resource's fixed monthly amount, by name, for the share each takes of the total. Absent when unpriced. */
  resourceFlat?: Record<string, number>;
  /** What each resource's price is made of, as the estimator lists it: the instance, its storage, requests. */
  lines?: Record<string, CostLine[]>;
  /**
   * For each resource's priced settings, what each option would cost: the resource's own fixed monthly amount and
   * the whole stack's, keyed by resource, setting and the option's value as text.
   */
  settings?: Record<string, Record<string, Record<string, { resource?: number; total?: number }>>>;
};

/** One product of a resource's price: "RDS-instance-db.t4g.micro-postgres" at $11.68 a month. */
export type CostLine = {
  /** The estimator's product name, which the page turns into words. */
  name: string;
  priceModel: string;
  /** The fixed monthly amount, for a flat-priced product. */
  monthly?: number;
  /** The rate, for a product billed by use: `0.2` per `1M requests`. */
  rate?: number;
  unit?: string;
  /** How many units the configuration asks for (two instances, 20 GB). */
  quantity?: number;
};

/**
 * The region a price is quoted for before the user picks one.
 *
 * Prices differ by region, so quoting a number without saying where it applies would be the same
 * class of mistake as the invented figures this replaced. This one is stated in the interface.
 */
export const DEFAULT_PRICING_REGION = 'eu-west-1';

/** The per-resource label for a resource the estimator has no price for. */
export const PRICE_UNAVAILABLE = 'Price unavailable';

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
    const resourceFlat: Record<string, number> = {};
    const lines: Record<string, CostLine[]> = {};
    for (const [name, info] of Object.entries(result.costs.resourcesBreakdown)) {
      const total = info.priceInfo.totalMonthlyFlat;
      if (info.priceInfo.incomplete === false && total !== undefined) resourceFlat[name] = total;
      lines[name] = info.priceInfo.costBreakdown.flatMap((item): CostLine[] =>
        item.unsupportedProduct === true
          ? []
          : [
              {
                name: item.name,
                priceModel: item.priceModel,
                ...(typeof item.pricePerMonth === 'number' ? { monthly: item.pricePerMonth } : {}),
                ...(typeof item.pricePerUnit === 'number' ? { rate: item.pricePerUnit } : {}),
                ...(typeof item.unit === 'string' ? { unit: item.unit } : {}),
                ...(typeof item.multiplier === 'number' ? { quantity: item.multiplier } : {})
              }
            ]
      );
      const hasUsageCosts = info.priceInfo.costBreakdown.some(({ priceModel }) => priceModel === 'pay-per-use');
      byResource[name] =
        info.priceInfo.incomplete !== false
          ? PRICE_UNAVAILABLE
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
      region,
      resourceFlat,
      lines,
      ...(result.costs.incomplete !== false ? {} : { flatMonthly: result.costs.flatMonthlyCost })
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

/** The difference a choice makes to the fixed monthly cost, as a card would show it. */
export const formatMonthlyDelta = (delta: number): string => {
  if (Math.abs(delta) < 0.5) return 'Same price';
  return `${delta > 0 ? '+' : '-'}${formatMonthly(Math.abs(delta))}`;
};
