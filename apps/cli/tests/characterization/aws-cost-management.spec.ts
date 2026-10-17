import { expect, test } from 'bun:test';
import { AwsSdkManager } from '../../src/aws/sdk-manager';
import { startLoopbackAws } from '../../scripts/operations/loopback-aws';

// MiniStack lacks the Budgets API. Exercise the real SDK and its pagination.
test('budget listing collects every page for the requested account', async () => {
  const aws = await startLoopbackAws();
  const manager = new AwsSdkManager();
  manager.init({
    endpoint: aws.endpoint,
    region: 'eu-west-1',
    credentials: { accessKeyId: 'synthetic', secretAccessKey: 'synthetic' },
    plugins: []
  });
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
    expect(await manager.costManagement.listBudgets({ accountId: '111122223333' })).toEqual([
      { BudgetName: 'first', BudgetType: 'COST', TimeUnit: 'MONTHLY' },
      { BudgetName: 'second', BudgetType: 'COST', TimeUnit: 'MONTHLY' }
    ]);
    expect(await manager.costManagement.listBudgets({ accountId: '999900001111' })).toEqual([]);
    expect(aws.unexpected).toEqual([]);
  } finally {
    await aws.close();
  }
});
