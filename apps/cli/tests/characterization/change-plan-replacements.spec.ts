/**
 * How the deploy change plan counts a Stacktape resource whose CloudFormation children the update replaces. The two
 * stacks are synthesized from real configs and compared with the same local template diff `deploy` uses.
 */
import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { buildDeploymentChangePlan, formatDeploymentChangePlanSummary } from '@domain-services/deployment-change-plan';
import { serialize } from '@utils/misc';
import { ResourceImpact } from '@aws-cdk/cloudformation-diff';
import { cfLogicalNames } from '@stacktape/naming/cloudformation-logical-names';
import { getCriticalResourcesPotentiallyEndangeredByOperation } from '@utils/stack-info-map-diff';
import { Bucket, DynamoDbTable, UserAuthPool, defineConfig } from '@stacktape/config-authoring';
import { describe, expect, test } from 'bun:test';
import { join } from 'node:path';
import { buildPreviewResourceChanges, getNormalizedPreviewTemplateDiff } from '../../src/commands/diff/utils';
import { synthesizeFixture } from './synthesis-fixture';

type StackOptions = { partitionKey: string; versioning: boolean; generateClientSecret: boolean };

const compileStack = ({ partitionKey, versioning, generateClientSecret }: StackOptions) =>
  defineConfig(() => {
    const records = new DynamoDbTable({ primaryKey: { partitionKey: { name: partitionKey, type: 'string' } } });
    const files = new Bucket({ versioning });
    const users = new UserAuthPool({ generateClientSecret });
    return { resources: { records, files, users } };
  })({
    projectName: 'characterization',
    stage: 'baseline',
    region: 'eu-west-1',
    cliArgs: {} as any,
    command: 'synth',
    awsProfile: '',
    user: { id: 'test-user', name: 'Test User', email: 'test@example.com' }
  });

const synthesizeStack = async (options: StackOptions) => {
  const template = await synthesizeFixture({
    compiledConfig: compileStack(options),
    workingDir: join(import.meta.dir, 'fixtures', 'dense-application')
  });
  return { template, stackInfoMap: serialize(calculatedStackOverviewManager.stackInfoMap) };
};

const planUpdate = async (deployedOptions: StackOptions, nextOptions: StackOptions) => {
  const deployed = await synthesizeStack(deployedOptions);
  const next = await synthesizeStack(nextOptions);
  const cfTemplateDiff = getNormalizedPreviewTemplateDiff({
    oldTemplate: deployed.template,
    newTemplate: next.template
  });
  const stackInfoMaps = {
    calculatedStackInfoMap: next.stackInfoMap,
    deployedStackInfoMap: deployed.stackInfoMap,
    cfTemplateDiff
  };
  const plan = buildDeploymentChangePlan({
    cliVersion: '4.0.0-test',
    target: {
      awsAccountId: '123456789999',
      region: 'eu-west-1',
      projectName: 'characterization',
      stage: 'baseline',
      stackName: 'characterization-baseline'
    },
    action: 'update',
    changeEvidence: 'local-template-diff',
    deploymentVersion: 'v000002',
    stackId: 'arn:aws:cloudformation:eu-west-1:123456789999:stack/characterization-baseline/id',
    previousDeploymentVersion: 'v000001',
    previousTemplate: deployed.template,
    template: next.template,
    artifacts: [],
    resourceChanges: buildPreviewResourceChanges({ ...stackInfoMaps, changes: [] }),
    dangerousResources: getCriticalResourcesPotentiallyEndangeredByOperation(stackInfoMaps),
    createdAt: new Date(0)
  });
  return { plan, cfTemplateDiff };
};

const baseline: StackOptions = { partitionKey: 'id', versioning: false, generateClientSecret: false };

const actionsOf = (plan: Awaited<ReturnType<typeof planUpdate>>['plan']) =>
  Object.fromEntries(plan.stacktapeResourceChanges.map(({ resourceName, action }) => [resourceName, action]));

describe('change plan replacements', () => {
  test('a new DynamoDB partition key replaces the table and is reported as a replacement', async () => {
    const { plan } = await planUpdate(baseline, { ...baseline, partitionKey: 'tenantId' });

    expect(actionsOf(plan)).toEqual({ records: 'replace' });
    expect(plan.summary).toEqual({ creates: 0, updates: 0, deletes: 0, replacements: 1, dangerousChanges: 1 });
    expect(plan.safety.protectedResourceChanges).toMatchObject([
      { resourceName: 'records', cloudformationResourceType: 'AWS::DynamoDB::GlobalTable', impact: 'WILL_REPLACE' }
    ]);
    expect(formatDeploymentChangePlanSummary(plan)).toStartWith(
      'Infrastructure changes: 1 resource to replace · 1 change affects a protected resource (plan '
    );
  });

  test('enabling bucket versioning updates the bucket in place', async () => {
    const { plan } = await planUpdate(baseline, { ...baseline, versioning: true });

    expect(actionsOf(plan)).toEqual({ files: 'update' });
    expect(plan.summary).toEqual({ creates: 0, updates: 1, deletes: 0, replacements: 0, dangerousChanges: 0 });
  });

  test('replacing a user pool client keeps the user pool an update', async () => {
    const { plan, cfTemplateDiff } = await planUpdate(baseline, { ...baseline, generateClientSecret: true });

    expect(cfTemplateDiff.resources.get(cfLogicalNames.userPoolClient('users')).changeImpact).toBe(
      ResourceImpact.WILL_REPLACE
    );

    expect(plan.stacktapeResourceChanges).toMatchObject([
      {
        resourceName: 'users',
        action: 'update',
        highlights: expect.arrayContaining(['Cognito::UserPoolClient: GenerateSecret'])
      }
    ]);
    expect(plan.summary).toEqual({ creates: 0, updates: 1, deletes: 0, replacements: 0, dangerousChanges: 0 });
  });
});
