import { describe, expect, test } from 'bun:test';
import type { BudgetsClient } from '@aws-sdk/client-budgets';
import { BudgetType, DescribeBudgetsCommand, TimeUnit } from '@aws-sdk/client-budgets';
import type { CostExplorerClient } from '@aws-sdk/client-cost-explorer';
import { GetTagsCommand } from '@aws-sdk/client-cost-explorer';
import type { ResourceGroupsTaggingAPIClient } from '@aws-sdk/client-resource-groups-tagging-api';
import { GetTagKeysCommand } from '@aws-sdk/client-resource-groups-tagging-api';
import { AwsCostManagement } from '../../src/aws/cost-management';

type BudgetsSend = BudgetsClient['send'];
type CostExplorerSend = CostExplorerClient['send'];
type ResourceTaggingSend = ResourceGroupsTaggingAPIClient['send'];

const costManagementWith = ({
  budgetsSend = (async () => ({})) as BudgetsSend,
  costExplorerSend = (async () => ({})) as CostExplorerSend,
  resourceTaggingSend = (async () => ({})) as ResourceTaggingSend,
  onError = (message: string, error: Error): never => {
    throw new Error(message, { cause: error });
  }
}: {
  budgetsSend?: BudgetsSend;
  costExplorerSend?: CostExplorerSend;
  resourceTaggingSend?: ResourceTaggingSend;
  onError?: (message: string, error: Error) => never;
}) =>
  new AwsCostManagement({
    createBudgetsClient: () => ({ send: budgetsSend }) as BudgetsClient,
    createCostExplorerClient: () => ({ send: costExplorerSend }) as CostExplorerClient,
    createResourceTaggingClient: () => ({ send: resourceTaggingSend }) as ResourceGroupsTaggingAPIClient,
    getErrorHandler: (message) => (error) => onError(message, error)
  });

describe('AWS cost management operations', () => {
  test('paginates regional resource tag keys with the resource tagging token', async () => {
    const requests: GetTagKeysCommand[] = [];
    const costManagement = costManagementWith({
      resourceTaggingSend: (async (command: GetTagKeysCommand) => {
        requests.push(command);
        return command.input.PaginationToken
          ? { TagKeys: ['project'], PaginationToken: undefined }
          : { TagKeys: ['stage'], PaginationToken: 'page-2' };
      }) as ResourceTaggingSend
    });

    await expect(costManagement.listResourceTagKeys()).resolves.toEqual(['stage', 'project']);
    expect(requests.map(({ input }) => input)).toEqual([{}, { PaginationToken: 'page-2' }]);
  });

  test('uses the trailing year and Cost Explorer page token when listing cost tags', async () => {
    const requests: GetTagsCommand[] = [];
    const currentDate = new Date();
    const yearBeforeCurrentDate = new Date();
    yearBeforeCurrentDate.setFullYear(currentDate.getFullYear() - 1);
    const costManagement = costManagementWith({
      costExplorerSend: (async (command: GetTagsCommand) => {
        requests.push(command);
        return command.input.NextPageToken
          ? { Tags: ['project'], NextPageToken: undefined }
          : { Tags: ['stage'], NextPageToken: 'page-2' };
      }) as CostExplorerSend
    });

    await expect(costManagement.listCostExplorerTags()).resolves.toEqual({ tags: ['stage', 'project'] });
    expect(requests.map(({ input }) => input)).toEqual([
      {
        TimePeriod: {
          End: currentDate.toISOString().slice(0, 10),
          Start: yearBeforeCurrentDate.toISOString().slice(0, 10)
        }
      },
      {
        NextPageToken: 'page-2',
        TimePeriod: {
          End: currentDate.toISOString().slice(0, 10),
          Start: yearBeforeCurrentDate.toISOString().slice(0, 10)
        }
      }
    ]);
  });

  test('keeps known Cost Explorer availability failures actionable and delegates unknown failures', async () => {
    const unavailable = costManagementWith({
      costExplorerSend: (async () => {
        throw new Error('Data is not available for the requested time period');
      }) as CostExplorerSend
    });
    const disabled = costManagementWith({
      costExplorerSend: (async () => {
        throw new Error('User not enabled for cost explorer');
      }) as CostExplorerSend
    });
    const delegatedErrors: { error: Error; message: string }[] = [];
    const unknown = costManagementWith({
      costExplorerSend: (async () => {
        throw new Error('Access denied');
      }) as CostExplorerSend,
      onError: (message, error) => {
        delegatedErrors.push({ error, message });
        throw error;
      }
    });

    await expect(unavailable.listCostExplorerTags()).resolves.toEqual({ error: 'DATA_UNAVAILABLE', tags: [] });
    await expect(disabled.listCostExplorerTags()).resolves.toEqual({
      error: 'USER_NOT_ENABLED_FOR_COST_EXPLORER',
      tags: []
    });
    await expect(unknown.listCostExplorerTags()).rejects.toThrow('Access denied');
    expect(delegatedErrors).toEqual([
      {
        error: expect.any(Error),
        message: 'Could not fetch information about tags usable for budget'
      }
    ]);
  });

  test('paginates account budgets and removes absent entries', async () => {
    const requests: DescribeBudgetsCommand[] = [];
    const costManagement = costManagementWith({
      budgetsSend: (async (command: DescribeBudgetsCommand) => {
        requests.push(command);
        return command.input.NextToken
          ? {
              Budgets: [{ BudgetName: 'second', BudgetType: BudgetType.Cost, TimeUnit: TimeUnit.MONTHLY }],
              NextToken: undefined
            }
          : {
              Budgets: [{ BudgetName: 'first', BudgetType: BudgetType.Cost, TimeUnit: TimeUnit.MONTHLY }, undefined],
              NextToken: 'page-2'
            };
      }) as BudgetsSend
    });

    await expect(costManagement.listBudgets({ accountId: '123456789012' })).resolves.toEqual([
      { BudgetName: 'first', BudgetType: 'COST', TimeUnit: 'MONTHLY' },
      { BudgetName: 'second', BudgetType: 'COST', TimeUnit: 'MONTHLY' }
    ]);
    expect(requests.map(({ input }) => input)).toEqual([
      { AccountId: '123456789012' },
      { AccountId: '123456789012', NextToken: 'page-2' }
    ]);
  });
});
