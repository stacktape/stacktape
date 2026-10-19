// Read-only audit of exact resources saved by an owned run, including capacity
// resources created by an older runner before it gained these cleanup checks.
import { readFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { LambdaClient, GetFunctionCommand, ListEventSourceMappingsCommand } from '@aws-sdk/client-lambda';
import { IAMClient, GetRoleCommand } from '@aws-sdk/client-iam';
import { EventBridgeClient, DescribeRuleCommand } from '@aws-sdk/client-eventbridge';
import { CloudWatchClient, DescribeAlarmsCommand } from '@aws-sdk/client-cloudwatch';
import { ECSClient, ListTaskDefinitionsCommand } from '@aws-sdk/client-ecs';
import { awsResourceNames } from '@stacktape/naming/aws-resource-names';
import { z } from 'zod';
import { clients, guard, save } from './run';

const main = async () => {
  await guard();
  const directory = resolve(process.argv[2]!);
  const state = z
    .object({
      account: z.literal('597581086285'),
      region: z.literal('eu-west-1'),
      profile: z.literal('stacktape-e2e'),
      resources: z.array(
        z.object({
          name: z.string().regex(/^v4swap-/),
          phase3: z.boolean().optional(),
          inventory: z.array(z.object({ type: z.string(), id: z.string() })).optional()
        })
      )
    })
    .parse(JSON.parse(await readFile(join(directory, 'state.json'), 'utf8')));
  const lambda = new LambdaClient(clients),
    iam = new IAMClient(clients),
    events = new EventBridgeClient(clients),
    cloudwatch = new CloudWatchClient(clients),
    ecs = new ECSClient(clients);
  const absent = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
      return false;
    } catch (error) {
      if (error instanceof Error && /ResourceNotFound|NoSuchEntity/.test(error.name)) return true;
      throw error;
    }
  };
  const audit = [];
  for (const owned of state.resources) {
    const remaining: string[] = [];
    const family = awsResourceNames.ecsTaskDefinitionFamily('api', `${owned.name}-bench`);
    for (const status of ['ACTIVE', 'INACTIVE', 'DELETE_IN_PROGRESS'] as const) {
      let nextToken: string | undefined;
      do {
        const page = await ecs.send(new ListTaskDefinitionsCommand({ familyPrefix: family, status, nextToken }));
        remaining.push(
          ...(page.taskDefinitionArns ?? []).filter((arn) => arn.split('/').at(-1)?.split(':')[0] === family)
        );
        nextToken = page.nextToken;
      } while (nextToken);
    }
    let capacity: unknown;
    if (owned.phase3) {
      const functionName = `${owned.name}-capacity`;
      const functionAbsent = await absent(() => lambda.send(new GetFunctionCommand({ FunctionName: functionName })));
      const mappings =
        (await lambda.send(new ListEventSourceMappingsCommand({ FunctionName: functionName }))).EventSourceMappings ??
        [];
      const inventory = (owned.inventory ?? []).filter((item) => item.id.includes('SwapCapacity'));
      const roles = await Promise.all(
        inventory
          .filter((item) => item.type === 'AWS::IAM::Role')
          .map(async (item) => ({
            name: item.id,
            absent: await absent(() => iam.send(new GetRoleCommand({ RoleName: item.id })))
          }))
      );
      const rules = await Promise.all(
        inventory
          .filter((item) => item.type === 'AWS::Events::Rule')
          .map(async (item) => ({
            name: item.id,
            absent: await absent(() => events.send(new DescribeRuleCommand({ Name: item.id })))
          }))
      );
      const alarmNames = inventory.filter((item) => item.type === 'AWS::CloudWatch::Alarm').map((item) => item.id);
      const alarms = alarmNames.length
        ? ((await cloudwatch.send(new DescribeAlarmsCommand({ AlarmNames: alarmNames }))).MetricAlarms ?? [])
        : [];
      capacity = {
        functionAbsent,
        streamMappingsAbsent: !mappings.length,
        roles,
        rules,
        alarmsAbsent: !alarms.length,
        verified:
          functionAbsent &&
          !mappings.length &&
          roles.every((role) => role.absent) &&
          rules.every((rule) => rule.absent) &&
          !alarms.length
      };
    }
    audit.push({
      name: owned.name,
      remainingTaskDefinitions: remaining,
      taskDefinitionsAbsent: remaining.length === 0,
      capacity
    });
  }
  await save(join(directory, 'capacity-resource-audit.json'), {
    readOnly: true,
    account: state.account,
    region: state.region,
    audit
  });
  console.log(JSON.stringify({ directory, audit }));
};
if (import.meta.main)
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
