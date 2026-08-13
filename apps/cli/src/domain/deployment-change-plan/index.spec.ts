import { describe, expect, test } from 'bun:test';
import { ResourceImpact } from '@aws-cdk/cloudformation-diff';
import { buildDeploymentChangePlan, formatDeploymentChangePlanSummary } from '.';

const newTemplate = {
  Resources: {
    Database: { Type: 'AWS::DynamoDB::Table', Properties: { BillingMode: 'PROVISIONED' } },
    Function: { Type: 'AWS::Lambda::Function', Properties: { Runtime: 'nodejs24.x' } }
  }
};

const makeInput = (): Parameters<typeof buildDeploymentChangePlan>[0] => ({
  cliVersion: '4.0.0-test',
  target: {
    awsAccountId: '123456789012',
    region: 'eu-west-1',
    projectName: 'orders',
    stage: 'production',
    stackName: 'orders-production'
  },
  action: 'update' as const,
  changeEvidence: 'local-template-diff' as const,
  deploymentVersion: 'v000003',
  stackId: 'arn:aws:cloudformation:eu-west-1:123456789012:stack/orders-production/id',
  previousDeploymentVersion: 'v000002',
  previousTemplate: {
    Resources: {
      Database: { Type: 'AWS::DynamoDB::Table', Properties: { BillingMode: 'PAY_PER_REQUEST' } }
    }
  },
  template: newTemplate,
  artifacts: [
    { jobName: 'worker', digest: 'worker-digest', skipped: false, size: 20 },
    { jobName: 'api', digest: 'api-digest', skipped: true, size: null }
  ],
  resourceChanges: [
    {
      resourceName: 'function',
      resourceType: 'function',
      action: 'create' as const,
      highlights: ['Lambda::Function added'],
      willReplace: [],
      mayReplace: [],
      changedChildCount: 1
    },
    {
      resourceName: 'database',
      resourceType: 'dynamo-db-table',
      action: 'update' as const,
      highlights: ['DynamoDB::Table: BillingMode'],
      willReplace: [],
      mayReplace: [],
      changedChildCount: 1
    }
  ],
  dangerousResources: [
    {
      stpResourceName: 'database',
      resourceType: 'dynamo-db-table',
      impactedCfResources: {
        Database: {
          cfResourceType: 'AWS::DynamoDB::Table',
          impact: ResourceImpact.WILL_REPLACE
        }
      }
    }
  ],
  createdAt: new Date('2026-08-09T12:00:00.000Z')
});

describe('deployment change plan', () => {
  test('builds a versioned plan that omits template property values', () => {
    const first = buildDeploymentChangePlan(makeInput());
    const reordered = makeInput();
    reordered.artifacts.reverse();
    reordered.resourceChanges.reverse();
    reordered.dangerousResources[0].impactedCfResources = {
      Database: reordered.dangerousResources[0].impactedCfResources.Database
    };
    reordered.createdAt = new Date('2026-08-09T13:00:00.000Z');
    const second = buildDeploymentChangePlan(reordered);

    expect(first.planId).toBe(second.planId);
    expect(first.createdAt).not.toBe(second.createdAt);
    expect(first.candidate.workloadBuilds.map(({ jobName }) => jobName)).toEqual(['api', 'worker']);
    expect(first.stacktapeResourceChanges.map(({ resourceName }) => resourceName)).toEqual(['database', 'function']);
    expect(first.candidate.semanticTemplateDigest).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(JSON.stringify(first)).not.toContain('PROVISIONED');
  });

  test('changes the plan ID when an execution-relevant field changes', () => {
    const original = buildDeploymentChangePlan(makeInput()).planId;

    for (const mutate of [
      (input: ReturnType<typeof makeInput>) => (input.target.region = 'us-east-1'),
      (input: ReturnType<typeof makeInput>) => (input.stackId = `${input.stackId}-recreated`),
      (input: ReturnType<typeof makeInput>) =>
        (input.previousTemplate = { Resources: { PreviousQueue: { Type: 'AWS::SQS::Queue' } } }),
      (input: ReturnType<typeof makeInput>) => (input.artifacts[0].digest = 'changed'),
      (input: ReturnType<typeof makeInput>) => (input.resourceChanges[0].action = 'replace'),
      (input: ReturnType<typeof makeInput>) =>
        (input.template = { Resources: { ...input.template.Resources, Queue: { Type: 'AWS::SQS::Queue' } } })
    ]) {
      const changed = makeInput();
      mutate(changed);
      expect(buildDeploymentChangePlan(changed).planId).not.toBe(original);
    }
  });

  test('sorts and binds protected-resource risks', () => {
    const input = makeInput();
    input.dangerousResources.push({
      stpResourceName: 'archive',
      resourceType: 'bucket',
      impactedCfResources: {
        ArchiveBucket: { cfResourceType: 'AWS::S3::Bucket', impact: ResourceImpact.WILL_DESTROY }
      }
    });

    const plan = buildDeploymentChangePlan(input);

    expect(plan.safety.hasProtectedResourceRisk).toBe(true);
    expect(plan.safety.protectedResourceChanges.map(({ resourceName }) => resourceName)).toEqual([
      'archive',
      'database'
    ]);
    expect(formatDeploymentChangePlanSummary(plan)).toContain('2 protected-resource risks');
  });

  test('does not require approval for ordinary changes', () => {
    const input = makeInput();
    input.dangerousResources = [];

    const plan = buildDeploymentChangePlan(input);

    expect(plan.safety).toMatchObject({ hasProtectedResourceRisk: false, protectedResourceChanges: [] });
    expect(formatDeploymentChangePlanSummary(plan)).toBe(
      `Change plan ${plan.planId.slice(7, 19)} · 1 create, 1 update, 0 delete, 0 replace · 2 workload builds`
    );
  });

  test('ignores diagnostic cache reuse and producer version in the plan ID', () => {
    const original = buildDeploymentChangePlan(makeInput()).planId;
    const changed = makeInput();
    changed.artifacts.forEach((artifact) => (artifact.skipped = !artifact.skipped));
    changed.cliVersion = '4.1.0-test';

    expect(buildDeploymentChangePlan(changed).planId).toBe(original);
  });

  test('uses locale-independent ordinal ordering', () => {
    const input = makeInput();
    input.artifacts = ['a', 'A', '1', '_'].map((jobName) => ({
      jobName,
      digest: `${jobName}-digest`,
      skipped: false,
      size: 1
    }));

    expect(buildDeploymentChangePlan(input).candidate.workloadBuilds.map(({ jobName }) => jobName)).toEqual([
      '1',
      'A',
      '_',
      'a'
    ]);
  });

  test('fails closed when an update has no deployed stack identity', () => {
    const input = makeInput();
    delete input.stackId;

    expect(() => buildDeploymentChangePlan(input)).toThrow('requires the deployed CloudFormation stack ID');
  });

  test('fails closed when an update has no previous template identity', () => {
    const input = makeInput();
    delete input.previousTemplate;

    expect(() => buildDeploymentChangePlan(input)).toThrow('requires the previously deployed CloudFormation template');
  });
});
