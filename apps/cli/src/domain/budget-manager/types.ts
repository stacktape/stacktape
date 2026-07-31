export type CostExplorerTagsError = 'USER_NOT_ENABLED_FOR_COST_EXPLORER' | 'DATA_UNAVAILABLE';

export type BudgetInfo = {
  actualSpend?: import('@aws-sdk/client-budgets').Spend;
  forecastedSpend?: import('@aws-sdk/client-budgets').Spend;
};
