/*
 * What the stage cost this month, by resource.
 *
 * Console shows this as a table with the total set above its top-right corner and one row per
 * resource; the bars here are the one liberty taken, because "the database is 40% of the bill" is
 * the sentence the surface exists to make obvious, and a column of dollar figures does not say it.
 * The wording stays the product's — "Month-to-date costs", a month picker rather than a relative
 * range — and the per-resource colours are the AWS category tints the icons already use, so
 * `mainDatabase` and `cache` share one because both really are database spend.
 *
 * The banner is a claim Stacktape publishes: the dashboard reads the customer's own Cost Explorer
 * data, and AWS bills them directly. There is nothing between the two numbers.
 *
 * Server-rendered; the bar widths are arithmetic on the figures below.
 */
import { RESOURCES } from './story';

/** Month-to-date spend per resource, in the order the table sorts them: largest first. */
const COSTS: Readonly<Record<string, number>> = {
  mainDatabase: 86.2,
  apiService: 54.9,
  cache: 28.4,
  web: 21.15,
  worker: 12.62,
  firewall: 9.2
};

const TOTAL = 212.47;
const PREVIOUS_TO_DATE = 194.17;

/** Six months of the same stage. The last bar is the month in progress. */
const TREND: readonly { month: string; amount: number; isPartial?: boolean }[] = [
  { month: 'Apr', amount: 161.2 },
  { month: 'May', amount: 172.4 },
  { month: 'Jun', amount: 168.9 },
  { month: 'Jul', amount: 181.75 },
  { month: 'Aug', amount: 194.17 },
  { month: 'Sep', amount: 212.47, isPartial: true }
];

export type CostsPanelProps = {
  className?: string | undefined;
};

export function CostsPanel({ className }: CostsPanelProps) {
  // Paired rather than spread into a copy of the resource: the row needs both, and the story's
  // definition of a resource has no business gaining a cost field on the way through here.
  const rows = RESOURCES.map((resource) => ({ resource, amount: COSTS[resource.name] ?? 0 })).toSorted(
    (left, right) => right.amount - left.amount
  );
  const largest = rows[0]?.amount ?? 1;
  const trendMax = Math.max(...TREND.map((entry) => entry.amount));
  const delta = TOTAL - PREVIOUS_TO_DATE;

  return (
    <section className={['costs', className].filter(Boolean).join(' ')}>
      <header className="costs__header">
        <div>
          <p className="costs__label">Month-to-date costs</p>
          <p className="costs__total">{currency(TOTAL)}</p>
          <p className="costs__delta">
            +{currency(delta)} ({((delta / PREVIOUS_TO_DATE) * 100).toFixed(1)}%) vs the same point last month
          </p>
        </div>

        <span className="costs__filters">
          <span className="costs__filter">
            Stage
            <b>production</b>
          </span>
          <span className="costs__filter">
            Time range
            <b>9 / 2026</b>
          </span>
        </span>
      </header>

      <ul className="costs__rows">
        {rows.map(({ resource, amount }) => (
          <li className="cost-row" key={resource.name}>
            <span className="cost-row__identity">
              <span className="cost-row__name">{resource.name}</span>
              <span className="cost-row__type">{resource.consoleLabel}</span>
            </span>
            <span className="cost-row__track">
              <span
                className="cost-row__bar"
                style={{
                  background: `var(--color-aws-${resource.category})`,
                  width: `${Math.round((amount / largest) * 1000) / 10}%`
                }}
              />
            </span>
            <span className="cost-row__amount">{currency(amount)}</span>
          </li>
        ))}
      </ul>

      <div className="costs__trend">
        <p className="costs__section-label">Last 6 months</p>
        <div className="costs__trend-bars">
          {TREND.map((entry) => (
            <span className={`costs__trend-bar${entry.isPartial === true ? ' is-partial' : ''}`} key={entry.month}>
              <span
                className="costs__trend-fill"
                style={{ height: `${Math.round((entry.amount / trendMax) * 100)}%` }}
              />
              <span className="costs__trend-month">{entry.month}</span>
            </span>
          ))}
        </div>
      </div>

      <p className="costs__banner">No markup — AWS bills you directly.</p>
    </section>
  );
}

const currency = (amount: number): string => `$${amount.toFixed(2)}`;
