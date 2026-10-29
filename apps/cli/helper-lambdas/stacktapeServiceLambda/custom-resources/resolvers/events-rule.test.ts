import { afterEach, beforeEach, describe, expect, spyOn, test } from 'bun:test';
import { EventBridgeClient } from '@aws-sdk/client-eventbridge';
import { eventsRule, toTarget } from './events-rule';

type Command = { constructor: { name: string }; input: Record<string, any> };

const awsError = (name: string) => Object.assign(new Error(name), { name });

describe('toTarget', () => {
  test('CloudFormation strings become the numbers PutTargets expects', () => {
    expect(
      toTarget({
        Id: 't',
        Arn: 'arn:q',
        RetryPolicy: { MaximumRetryAttempts: '2', MaximumEventAgeInSeconds: '3600' },
        SqsParameters: { MessageGroupId: 'g' },
        DeadLetterConfig: { Arn: 'arn:dlq' },
        InputTransformer: { InputPathsMap: { a: '$.a' }, InputTemplate: '{"a":<a>}' }
      })
    ).toEqual({
      Id: 't',
      Arn: 'arn:q',
      RetryPolicy: { MaximumRetryAttempts: 2, MaximumEventAgeInSeconds: 3600 },
      SqsParameters: { MessageGroupId: 'g' },
      DeadLetterConfig: { Arn: 'arn:dlq' },
      InputTransformer: { InputPathsMap: { a: '$.a' }, InputTemplate: '{"a":<a>}' }
    });
  });
});

describe('eventsRule', () => {
  const calls: { name: string; input: Record<string, any> }[] = [];
  let targets: string[] = [];
  let ruleExists = false;
  let failPutTargets = false;
  let stub: { mockRestore: () => void };

  beforeEach(() => {
    calls.length = 0;
    targets = [];
    ruleExists = false;
    failPutTargets = false;
    stub = spyOn(EventBridgeClient.prototype, 'send').mockImplementation((async (command: Command) => {
      const name = command.constructor.name.replace('Command', '');
      calls.push({ name, input: command.input });
      const bus = command.input.EventBusName ? `${command.input.EventBusName}/` : '';
      switch (name) {
        case 'DescribeRule':
          if (!ruleExists) throw awsError('ResourceNotFoundException');
          return { Name: command.input.Name };
        case 'PutRule':
          ruleExists = true;
          return { RuleArn: `arn:aws:events:eu-west-1:1:rule/${bus}${command.input.Name}` };
        case 'ListTargetsByRule':
          if (!ruleExists) throw awsError('ResourceNotFoundException');
          return { Targets: targets.map((Id) => ({ Id })) };
        case 'PutTargets':
          if (failPutTargets) return { FailedEntryCount: 1, FailedEntries: [{ TargetId: 't', ErrorMessage: 'bad' }] };
          targets.push(...command.input.Targets.map(({ Id }: { Id: string }) => Id));
          return { FailedEntryCount: 0 };
        case 'RemoveTargets':
          targets = targets.filter((id) => !command.input.Ids.includes(id));
          return { FailedEntryCount: 0 };
        case 'DeleteRule':
          ruleExists = false;
          return {};
        case 'ListTagsForResource':
          return { Tags: [{ Key: 'old', Value: '1' }] };
        default:
          return {};
      }
    }) as any);
  });
  afterEach(() => stub.mockRestore());

  const props = {
    Name: 'app-prod-WorkerEvent0Rule',
    State: 'ENABLED',
    EventPattern: '{"detail":{"n":[{"numeric":[">",5]}]}}',
    Targets: [{ Id: 'a', Arn: 'arn:fn' }],
    Tags: [{ Key: 'stp:stack-name', Value: 'app-prod' }]
  };

  test('create applies the rule and its targets and returns the Ref value and Arn of AWS::Events::Rule', async () => {
    expect(await eventsRule(props, undefined, 'Create')).toEqual({
      physicalResourceId: 'app-prod-WorkerEvent0Rule',
      data: { Arn: 'arn:aws:events:eu-west-1:1:rule/app-prod-WorkerEvent0Rule' }
    });
    expect(calls.find(({ name }) => name === 'PutRule')?.input).toEqual({
      Name: 'app-prod-WorkerEvent0Rule',
      State: 'ENABLED',
      EventPattern: '{"detail":{"n":[{"numeric":[">",5]}]}}',
      Tags: [{ Key: 'stp:stack-name', Value: 'app-prod' }]
    });
    expect(targets).toEqual(['a']);
  });

  test('a rule on another bus is identified as <bus>|<name>', async () => {
    const result = await eventsRule({ ...props, EventBusName: 'orders' }, undefined, 'Create');
    expect(result.physicalResourceId).toBe('orders|app-prod-WorkerEvent0Rule');
    await eventsRule({ ...props, EventBusName: 'orders' }, undefined, 'Delete', result.physicalResourceId);
    expect(calls.at(-1)).toEqual({
      name: 'DeleteRule',
      input: { Name: 'app-prod-WorkerEvent0Rule', EventBusName: 'orders' }
    });
  });

  test('a bus named by ARN, as templates reference a bus of the same stack, is used by name', async () => {
    const result = await eventsRule(
      { ...props, EventBusName: 'arn:aws:events:eu-west-1:1:event-bus/orders' },
      undefined,
      'Create'
    );
    expect(result.physicalResourceId).toBe('orders|app-prod-WorkerEvent0Rule');
    expect(calls.find(({ name }) => name === 'PutRule')?.input.EventBusName).toBe('orders');
  });

  test('a failed target removes the rule it created and names it, so a rollback can delete it too', async () => {
    failPutTargets = true;
    const error = await eventsRule(props, undefined, 'Create').catch((caught) => caught);
    expect(String(error)).toMatch(/t: bad/);
    expect(error.physicalResourceId).toBe('app-prod-WorkerEvent0Rule');
    expect(ruleExists).toBe(false);
  });

  test('create does not take over an existing rule', async () => {
    ruleExists = true;
    targets = ['foreign'];
    await expect(eventsRule(props, undefined, 'Create')).rejects.toThrow(/already exists/);
    expect(calls.map(({ name }) => name)).toEqual(['DescribeRule']);
    expect(targets).toEqual(['foreign']);
  });

  test('update replaces the targets and tags in place', async () => {
    await eventsRule(props, undefined, 'Create');
    const next = { ...props, Targets: [{ Id: 'b', Arn: 'arn:fn2' }] };
    const result = await eventsRule(next, props, 'Update', 'app-prod-WorkerEvent0Rule');
    expect(result.physicalResourceId).toBe('app-prod-WorkerEvent0Rule');
    expect(targets).toEqual(['b']);
    expect(calls.find(({ name }) => name === 'UntagResource')?.input.TagKeys).toEqual(['old']);
  });

  test('a new event bus creates a new rule; CloudFormation then deletes the old one', async () => {
    const result = await eventsRule({ ...props, EventBusName: 'orders' }, props, 'Update', 'app-prod-WorkerEvent0Rule');
    expect(result.physicalResourceId).toBe('orders|app-prod-WorkerEvent0Rule');
    expect(calls.some(({ name }) => name === 'DeleteRule')).toBe(false);
  });

  test('delete removes targets and the rule, tolerates a missing rule and ignores a failed create', async () => {
    await eventsRule(props, undefined, 'Create');
    await eventsRule(props, undefined, 'Delete', 'app-prod-WorkerEvent0Rule');
    expect(ruleExists).toBe(false);
    await eventsRule(props, undefined, 'Delete', 'app-prod-WorkerEvent0Rule');
    calls.length = 0;
    await eventsRule(props, undefined, 'Delete', 'stpservicecustomresource');
    expect(calls).toEqual([]);
  });
});
