import type { Budget, BudgetsClient } from '@aws-sdk/client-budgets';
import { DescribeBudgetsCommand } from '@aws-sdk/client-budgets';
import type { CostExplorerClient } from '@aws-sdk/client-cost-explorer';
import { GetTagsCommand } from '@aws-sdk/client-cost-explorer';
import type { ResourceGroupsTaggingAPIClient } from '@aws-sdk/client-resource-groups-tagging-api';
import { GetTagKeysCommand } from '@aws-sdk/client-resource-groups-tagging-api';

type ErrorHandlerFactory = (message: string) => (error: Error) => never;

export type CostExplorerTagsResult = {
  error?: 'DATA_UNAVAILABLE' | 'USER_NOT_ENABLED_FOR_COST_EXPLORER';
  tags: string[];
};

export class AwsCostManagement {
  readonly #createBudgetsClient: () => BudgetsClient;
  readonly #createCostExplorerClient: () => CostExplorerClient;
  readonly #createResourceTaggingClient: () => ResourceGroupsTaggingAPIClient;
  readonly #getErrorHandler: ErrorHandlerFactory;

  constructor({
    createBudgetsClient,
    createCostExplorerClient,
    createResourceTaggingClient,
    getErrorHandler
  }: {
    createBudgetsClient: () => BudgetsClient;
    createCostExplorerClient: () => CostExplorerClient;
    createResourceTaggingClient: () => ResourceGroupsTaggingAPIClient;
    getErrorHandler: ErrorHandlerFactory;
  }) {
    this.#createBudgetsClient = createBudgetsClient;
    this.#createCostExplorerClient = createCostExplorerClient;
    this.#createResourceTaggingClient = createResourceTaggingClient;
    this.#getErrorHandler = getErrorHandler;
  }

  listResourceTagKeys = async () => {
    const errorHandler = this.#getErrorHandler('Could not fetch information about tags used in this region');
    const result: string[] = [];
    let { TagKeys, PaginationToken } = await this.#createResourceTaggingClient()
      .send(new GetTagKeysCommand({}))
      .catch(errorHandler);
    result.push(...(TagKeys || []));
    while (PaginationToken) {
      ({ TagKeys, PaginationToken } = await this.#createResourceTaggingClient()
        .send(new GetTagKeysCommand({ PaginationToken }))
        .catch(errorHandler));
      result.push(...(TagKeys || []));
    }
    return result;
  };

  listCostExplorerTags = async (): Promise<CostExplorerTagsResult> => {
    const errorHandler = this.#getErrorHandler('Could not fetch information about tags usable for budget');
    const result: string[] = [];
    const currentDate = new Date();
    const yearBeforeNowDate = new Date();
    yearBeforeNowDate.setFullYear(currentDate.getFullYear() - 1);
    try {
      let { Tags, NextPageToken } = await this.#createCostExplorerClient().send(
        new GetTagsCommand({
          TimePeriod: {
            Start: yearBeforeNowDate.toISOString().slice(0, 10),
            End: currentDate.toISOString().slice(0, 10)
          }
        })
      );
      result.push(...(Tags || []));
      while (NextPageToken) {
        ({ Tags, NextPageToken } = await this.#createCostExplorerClient().send(
          new GetTagsCommand({
            NextPageToken,
            TimePeriod: {
              Start: yearBeforeNowDate.toISOString().slice(0, 10),
              End: currentDate.toISOString().slice(0, 10)
            }
          })
        ));
        result.push(...(Tags || []));
      }
    } catch (error) {
      if (`${error}`.includes('Data is not available')) {
        return { error: 'DATA_UNAVAILABLE', tags: [] };
      }
      if (`${error}`.includes('User not enabled for cost explorer')) {
        return { error: 'USER_NOT_ENABLED_FOR_COST_EXPLORER', tags: [] };
      }
      errorHandler(error as Error);
    }
    return { tags: result };
  };

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
