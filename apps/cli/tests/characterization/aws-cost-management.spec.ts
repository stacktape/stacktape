import { expect, test } from 'bun:test';
import { AwsSdkManager } from '../../src/aws/sdk-manager';
import { startLoopbackAws } from '../../scripts/operations/loopback-aws';

// MiniStack lacks these cost APIs and tag-key enumeration. Exercise the real SDK, pagination and error classification.
test('cost metadata collects all tag/budget pages and distinguishes unavailable data from denial', async () => {
  const aws = await startLoopbackAws();
  const manager = new AwsSdkManager();
  manager.init({
    endpoint: aws.endpoint,
    region: 'eu-west-1',
    credentials: { accessKeyId: 'synthetic', secretAccessKey: 'synthetic' },
    plugins: []
  });
  aws.on('tagging.GetTagKeys', ({ input }) => ({
    kind: 'json',
    body: input.PaginationToken ? { TagKeys: ['project'] } : { TagKeys: ['stage'], PaginationToken: 'tag-page-2' }
  }));
  aws.on('ce.GetTags', ({ input }) => ({
    kind: 'json',
    body: input.NextPageToken ? { Tags: ['project'] } : { Tags: ['stage'], NextPageToken: 'cost-page-2' }
  }));
  aws.on('budgets.DescribeBudgets', ({ input }) => ({
    kind: 'json',
    body:
      input.AccountId !== '111122223333'
        ? { Budgets: [] }
        : input.NextToken
          ? { Budgets: [{ BudgetName: 'second', BudgetType: 'COST', TimeUnit: 'MONTHLY' }] }
          : { Budgets: [{ BudgetName: 'first', BudgetType: 'COST', TimeUnit: 'MONTHLY' }], NextToken: 'budget-page-2' }
  }));
  try {
    expect(await manager.costManagement.listResourceTagKeys()).toEqual(['stage', 'project']);
    expect(await manager.costManagement.listCostExplorerTags()).toEqual({ tags: ['stage', 'project'] });
    expect(await manager.costManagement.listBudgets({ accountId: '111122223333' })).toEqual([
      { BudgetName: 'first', BudgetType: 'COST', TimeUnit: 'MONTHLY' },
      { BudgetName: 'second', BudgetType: 'COST', TimeUnit: 'MONTHLY' }
    ]);
    expect(await manager.costManagement.listBudgets({ accountId: '999900001111' })).toEqual([]);
    for (const [message, error] of [
      ['Data is not available for the requested time period', 'DATA_UNAVAILABLE'],
      ['User not enabled for cost explorer', 'USER_NOT_ENABLED_FOR_COST_EXPLORER']
    ] as const) {
      aws.on('ce.GetTags', () => ({ kind: 'error', code: 'DataUnavailableException', message, status: 400 }));
      expect(await manager.costManagement.listCostExplorerTags()).toEqual({ error, tags: [] });
    }
    aws.on('ce.GetTags', () => ({
      kind: 'error',
      code: 'AccessDeniedException',
      message: 'Injected cost denial',
      status: 403
    }));
    await expect(manager.costManagement.listCostExplorerTags()).rejects.toThrow('Injected cost denial');
    expect(aws.unexpected).toEqual([]);
  } finally {
    await aws.close();
  }
});
