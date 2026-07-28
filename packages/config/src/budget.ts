// An authored compatibility contract the `stacktape` npm package publishes as `StacktapeBudgetControl` and
// `StacktapeBudgetControlPlain`. It is not reachable from `StacktapeConfig`, and no property of the typed
// configuration model or the generated schema declares it, so how a caller supplies it is not established
// here; the CLI only strips a `budgetControl` key defensively in one template-compiler path. The package owns
// it because it is published and authored, which is what stops the published aliases from pointing at a type
// that lives nowhere.

export interface BudgetControl {
  /**
   * #### Monthly spending limit in USD.
   *
   * ---
   *
   * Notification thresholds are calculated as a percentage of this amount.
   * Resets at the start of each calendar month.
   */
  limit: number;
  /**
   * #### Email alerts when spending approaches the limit.
   *
   * ---
   *
   * Each notification fires at a percentage threshold of the `limit`, based on
   * actual or forecasted spend. Max 5 notifications.
   */
  notifications?: BudgetNotification[];
}
export interface BudgetNotification {
  /**
   * #### Whether to alert on actual or forecasted spend.
   *
   * ---
   *
   * - `ACTUAL` — fires when you've already spent past the threshold.
   * - `FORECASTED` — fires when AWS predicts you'll exceed the threshold by month-end.
   *
   * Forecasts need ~5 weeks of usage data before they work.
   *
   * @default "ACTUAL"
   */
  budgetType?: 'ACTUAL' | 'FORECASTED';
  /**
   * #### Percentage of the budget limit that triggers this alert.
   *
   * ---
   *
   * Example: limit = $200, threshold = 80 → alert fires at $160.
   *
   * @default 100
   */
  thresholdPercentage?: number;
  /**
   * #### Email addresses that receive the alert. Max 10.
   */
  emails: string[];
}
