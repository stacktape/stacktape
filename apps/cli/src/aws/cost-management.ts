import type { Budget, BudgetsClient } from '@aws-sdk/client-budgets';
import { DescribeBudgetsCommand } from '@aws-sdk/client-budgets';

type ErrorHandlerFactory = (message: string) => (error: Error) => never;

export class AwsCostManagement {
  readonly #createBudgetsClient: () => BudgetsClient;
  readonly #getErrorHandler: ErrorHandlerFactory;

  constructor({
    createBudgetsClient,
    getErrorHandler
  }: {
    createBudgetsClient: () => BudgetsClient;
    getErrorHandler: ErrorHandlerFactory;
  }) {
    this.#createBudgetsClient = createBudgetsClient;
    this.#getErrorHandler = getErrorHandler;
  }

  listBudgets = async ({ accountId }: { accountId: string }) => {
    const errorHandler = this.#getErrorHandler('Failed to list budgets in the account.');
    const result: Budget[][] = [];
    let { NextToken, Budgets } = await this.#createBudgetsClient()
      .send(new DescribeBudgetsCommand({ AccountId: accountId }))
      .catch(errorHandler);
    result.push(Budgets);
    while (NextToken) {
      ({ NextToken, Budgets } = await this.#createBudgetsClient()
        .send(new DescribeBudgetsCommand({ AccountId: accountId, NextToken }))
        .catch(errorHandler));
      result.push(Budgets);
    }
    return result.flat().filter((budget) => budget !== undefined);
  };
}
