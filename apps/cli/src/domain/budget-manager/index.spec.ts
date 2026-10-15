import { createServer } from 'node:http';
import { afterEach, beforeEach, expect, mock, spyOn, test } from 'bun:test';
import { budgetManager } from './index';
import { awsSdkManager } from '@utils/aws-sdk-manager';
import { globalStateManager } from '@application-services/global-state-manager';
import { operationReporter } from '@application-services/operation-manager';
import { resetDomainServiceInitialization } from '@utils/decorators';

const environment = { ...process.env };

beforeEach(() => {
  process.env.AWS_IGNORE_CONFIGURED_ENDPOINT_URLS = 'false';
  resetDomainServiceInitialization();
  operationReporter.setSilentMode(true);
  awsSdkManager.init({ credentials: { accessKeyId: 'test', secretAccessKey: 'test' }, region: 'eu-west-1' });
  globalStateManager.localTargetAwsAccount = {
    awsAccountId: '123456789012'
  } as typeof globalStateManager.targetAwsAccount;
});

afterEach(() => {
  mock.restore();
  for (const name of [
    'AWS_ENDPOINT_URL',
    'AWS_ENDPOINT_URL_CLOUDFORMATION',
    'AWS_IGNORE_CONFIGURED_ENDPOINT_URLS',
    'STP_SKIP_COST_DISCOVERY'
  ]) {
    if (environment[name] === undefined) delete process.env[name];
    else process.env[name] = environment[name];
  }
});

const discovery = () => ({
  budgets: spyOn(awsSdkManager.costManagement, 'listBudgets').mockResolvedValue([
    { BudgetName: 'existing', TimeUnit: 'MONTHLY', BudgetType: 'COST' }
  ])
});

test('cannot skip discovery when endpoint overrides are disabled or a service points at AWS', async () => {
  process.env.AWS_ENDPOINT_URL = 'http://localhost:4566';
  process.env.STP_SKIP_COST_DISCOVERY = '1';
  discovery();
  process.env.AWS_IGNORE_CONFIGURED_ENDPOINT_URLS = 'true';
  await expect(budgetManager.init()).rejects.toMatchObject({ code: 'LOCAL_COST_DISCOVERY_ONLY' });
  process.env.AWS_IGNORE_CONFIGURED_ENDPOINT_URLS = 'false';
  process.env.AWS_ENDPOINT_URL_CLOUDFORMATION = 'https://cloudformation.eu-west-1.amazonaws.com';
  await expect(budgetManager.init()).rejects.toMatchObject({ code: 'LOCAL_COST_DISCOVERY_ONLY' });
  process.env.AWS_ENDPOINT_URL_CLOUDFORMATION = 'http://127.0.0.1:4566';
  await expect(budgetManager.init()).resolves.toBeUndefined();
});

test.each(['http://127.0.0.1:4566', 'http://localhost:4566/', 'https://[::1]:4566', 'http://127.0.0.2'])(
  'explicit local opt-in skips discovery and standalone budget reload: %s',
  async (endpoint) => {
    process.env.AWS_ENDPOINT_URL = endpoint;
    process.env.STP_SKIP_COST_DISCOVERY = '1';
    discovery();
    budgetManager.budgets = [{ BudgetName: 'stale', TimeUnit: 'MONTHLY', BudgetType: 'COST' }];
    await budgetManager.init();
    await budgetManager.loadBudgets();
    expect(budgetManager.budgets).toEqual([]);
  }
);

test.each([
  undefined,
  'https://cloudformation.eu-west-1.amazonaws.com',
  'http://localhost.example.com:4566',
  'http://127.example.com:4566',
  'http://127.0.0.1.example.com:4566',
  'http://192.168.1.1:4566',
  'invalid'
])('rejects cost-discovery opt-in without a loopback endpoint: %s', async (endpoint) => {
  if (endpoint === undefined) delete process.env.AWS_ENDPOINT_URL;
  else process.env.AWS_ENDPOINT_URL = endpoint;
  process.env.STP_SKIP_COST_DISCOVERY = '1';
  discovery();
  await expect(budgetManager.init()).rejects.toMatchObject({ code: 'LOCAL_COST_DISCOVERY_ONLY' });
  await expect(budgetManager.loadBudgets()).rejects.toMatchObject({ code: 'LOCAL_COST_DISCOVERY_ONLY' });
});

test.each([undefined, '0', 'true'])('keeps normal AWS discovery without the exact opt-in: %s', async (value) => {
  delete process.env.AWS_ENDPOINT_URL;
  if (value === undefined) delete process.env.STP_SKIP_COST_DISCOVERY;
  else process.env.STP_SKIP_COST_DISCOVERY = value;
  discovery();
  await budgetManager.init();
  expect(budgetManager.budgets).toEqual([{ BudgetName: 'existing', TimeUnit: 'MONTHLY', BudgetType: 'COST' }]);
});

test('invalid local discovery settings are rejected before the real SDK reaches a provider', async () => {
  const received: string[] = [];
  const provider = createServer(async (request, response) => {
    const chunks: Buffer[] = [];
    for await (const chunk of request) chunks.push(Buffer.from(chunk));
    received.push(Buffer.concat(chunks).toString());
    response.setHeader('content-type', 'application/x-amz-json-1.1');
    response.end(JSON.stringify({ TagKeys: [], Tags: [], Budgets: [] }));
  });
  await new Promise<void>((ready) => provider.listen(0, '127.0.0.1', ready));
  try {
    const endpoint = `http://127.0.0.1:${(provider.address() as { port: number }).port}`;
    awsSdkManager.init({
      credentials: { accessKeyId: 'test', secretAccessKey: 'test' },
      region: 'eu-west-1',
      endpoint
    });
    process.env.AWS_ENDPOINT_URL = endpoint;
    process.env.STP_SKIP_COST_DISCOVERY = '1';
    process.env.AWS_ENDPOINT_URL_CLOUDFORMATION = 'https://cloudformation.eu-west-1.amazonaws.com';
    await expect(budgetManager.init()).rejects.toMatchObject({ code: 'LOCAL_COST_DISCOVERY_ONLY' });
    expect(received).toEqual([]);
  } finally {
    await new Promise<void>((done, reject) =>
      provider.close((error) => {
        if (error) reject(error);
        else done();
      })
    );
  }
});
