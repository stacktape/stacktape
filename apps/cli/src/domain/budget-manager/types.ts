export type BudgetInfo = {
  actualSpend?: import('@aws-sdk/client-budgets').Spend;
  forecastedSpend?: import('@aws-sdk/client-budgets').Spend;
};
