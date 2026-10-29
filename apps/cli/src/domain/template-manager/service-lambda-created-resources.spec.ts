import { describe, expect, test } from 'bun:test';
import type { CloudFormationTemplate } from '@stacktape/cloudformation/resource';
import {
  createNewQueuesAndRulesThroughServiceLambda,
  keepServiceLambdaCodeForRollback,
  SERVICE_LAMBDA_CREATED_RESOURCES_POLICY_NAME
} from './service-lambda-created-resources';

const stackName = 'app-prod';
const serviceToken = { 'Fn::GetAtt': ['StacktapeServiceLambdaCustomResourceFunction', 'Arn'] };

const buildTemplate = (): CloudFormationTemplate =>
  ({
    Resources: {
      StacktapeServiceLambdaRole: {
        Type: 'AWS::IAM::Role',
        Properties: { Policies: [{ PolicyName: 'base', PolicyDocument: { Version: '2012-10-17', Statement: [] } }] }
      },
      StacktapeServiceLambdaCustomResourceFunction: { Type: 'AWS::Lambda::Function', Properties: {} },
      DlqQueue: { Type: 'AWS::SQS::Queue', Properties: { QueueName: 'app-prod-dlq' } },
      JobsQueue: {
        Type: 'AWS::SQS::Queue',
        Properties: {
          QueueName: 'app-prod-jobs',
          VisibilityTimeout: 60,
          RedrivePolicy: { deadLetterTargetArn: { 'Fn::GetAtt': ['DlqQueue', 'Arn'] }, maxReceiveCount: 3 }
        }
      },
      JobsQueuePolicy: {
        Type: 'AWS::SQS::QueuePolicy',
        Properties: {
          Queues: [{ Ref: 'JobsQueue' }],
          PolicyDocument: {
            Version: '2012-10-17',
            Statement: [
              {
                Effect: 'Allow',
                Principal: { Service: 'events.amazonaws.com' },
                Action: ['sqs:SendMessage'],
                Resource: [{ 'Fn::GetAtt': ['JobsQueue', 'Arn'] }],
                Condition: { ArnEquals: { 'aws:SourceArn': { 'Fn::GetAtt': ['JobsEvent0Rule', 'Arn'] } } }
              }
            ]
          }
        }
      },
      JobsEvent0Rule: {
        Type: 'AWS::Events::Rule',
        Properties: {
          State: 'ENABLED',
          EventPattern: { source: ['app'], detail: { count: [{ numeric: ['>', 5] }], ok: [true] } },
          Targets: [{ Arn: { 'Fn::GetAtt': ['JobsQueue', 'Arn'] }, Id: 'jobs-target' }]
        }
      },
      WorkerEvent0Rule: {
        Type: 'AWS::Events::Rule',
        Properties: { State: 'ENABLED', ScheduleExpression: 'rate(1 hour)', Targets: [{ Arn: 'arn:fn', Id: 't' }] }
      },
      WorkerRole: {
        Type: 'AWS::IAM::Role',
        Properties: {
          Policies: [
            {
              PolicyName: 'access',
              PolicyDocument: {
                Version: '2012-10-17',
                Statement: [
                  { Effect: 'Allow', Action: ['sqs:SendMessage'], Resource: [{ 'Fn::GetAtt': ['JobsQueue', 'Arn'] }] }
                ]
              }
            }
          ]
        }
      },
      WorkerEvent0EventSourceMapping: {
        Type: 'AWS::Lambda::EventSourceMapping',
        Properties: { EventSourceArn: { 'Fn::GetAtt': ['JobsQueue', 'Arn'] } }
      },
      EcsScheduleRule: {
        Type: 'AWS::Events::Rule',
        Properties: {
          ScheduleExpression: 'rate(1 day)',
          Targets: [{ Arn: 'arn:cluster', Id: 'e', RoleArn: 'arn:role' }]
        }
      },
      UserQueue: { Type: 'AWS::SQS::Queue', Properties: { QueueName: 'app-prod-user' } }
    }
  }) as unknown as CloudFormationTemplate;

const run = ({
  template = buildTemplate(),
  deployedTypes = new Map<string, string>()
}: { template?: CloudFormationTemplate; deployedTypes?: Map<string, string> } = {}) => {
  const converted = createNewQueuesAndRulesThroughServiceLambda({
    template,
    deployedTypes,
    stacktapeLogicalNames: new Set(Object.keys(template.Resources).filter((id) => id !== 'UserQueue')),
    stackName,
    serviceLambdaLogicalName: 'StacktapeServiceLambdaCustomResourceFunction',
    serviceLambdaRoleLogicalName: 'StacktapeServiceLambdaRole',
    tags: [{ Key: 'stp:stack-name', Value: stackName }]
  });
  return { template, converted, resources: template.Resources as Record<string, any> };
};

const createdResourcesPolicy = (resources: Record<string, any>) =>
  resources.StpServiceLambdaCreatedResourcesPolicy?.Properties;

describe('createNewQueuesAndRulesThroughServiceLambda', () => {
  test('a new stack gets its queues, queue policies and rules from the service Lambda with the same properties', () => {
    const { converted, resources } = run();
    expect(converted).toEqual({
      queues: ['DlqQueue', 'JobsQueue'],
      queuePolicies: ['JobsQueuePolicy'],
      rules: ['JobsEvent0Rule', 'WorkerEvent0Rule']
    });
    expect(resources.JobsQueue).toEqual({
      Type: 'Custom::StpSqsQueue',
      Properties: {
        ServiceToken: serviceToken,
        sqsQueue: {
          QueueName: 'app-prod-jobs',
          VisibilityTimeout: 60,
          RedrivePolicy: { deadLetterTargetArn: { 'Fn::GetAtt': ['DlqQueue', 'Arn'] }, maxReceiveCount: 3 }
        }
      },
      DependsOn: ['StpServiceLambdaCreatedResourcesPolicy']
    });
    expect(resources.WorkerEvent0Rule.Properties.eventsRule).toEqual({
      State: 'ENABLED',
      ScheduleExpression: 'rate(1 hour)',
      Targets: [{ Arn: 'arn:fn', Id: 't' }],
      Name: 'app-prod-WorkerEvent0Rule',
      Tags: [{ Key: 'stp:stack-name', Value: stackName }]
    });
  });

  test('event patterns and queue policies travel as JSON text, so numbers and booleans keep their type', () => {
    const { resources } = run();
    // No reference in the pattern: plain JSON text.
    expect(JSON.parse(resources.JobsEvent0Rule.Properties.eventsRule.EventPattern)).toEqual({
      source: ['app'],
      detail: { count: [{ numeric: ['>', 5] }], ok: [true] }
    });
    // References become Fn::Sub placeholders in the text.
    const policy = resources.JobsQueuePolicy.Properties.sqsQueuePolicy.PolicyDocument['Fn::Sub'];
    expect(JSON.parse(policy[0]).Statement[0].Resource).toEqual(['${sub0}']);
    expect(policy[1]).toEqual({
      sub0: { 'Fn::GetAtt': ['JobsQueue', 'Arn'] },
      sub1: { 'Fn::GetAtt': ['JobsEvent0Rule', 'Arn'] }
    });
    expect(resources.JobsQueuePolicy.Properties.sqsQueuePolicy.Queues).toEqual([{ Ref: 'JobsQueue' }]);
  });

  test('roles name new queues by ARN so they do not wait for the queue; event source mappings still reference it', () => {
    const { resources } = run();
    expect(resources.WorkerRole.Properties.Policies[0].PolicyDocument.Statement[0].Resource).toEqual([
      { 'Fn::Sub': 'arn:${AWS::Partition}:sqs:${AWS::Region}:${AWS::AccountId}:app-prod-jobs' }
    ]);
    expect(resources.WorkerEvent0EventSourceMapping.Properties.EventSourceArn).toEqual({
      'Fn::GetAtt': ['JobsQueue', 'Arn']
    });
  });

  test('the service Lambda may manage only queues and rules named after the stack, through a separate policy', () => {
    const { resources } = run();
    const policy = createdResourcesPolicy(resources);
    expect(policy.PolicyName).toBe(SERVICE_LAMBDA_CREATED_RESOURCES_POLICY_NAME);
    expect(policy.Roles).toEqual([{ Ref: 'StacktapeServiceLambdaRole' }]);
    expect(policy.PolicyDocument.Statement.map(({ Resource }: { Resource: unknown }) => Resource)).toEqual([
      [{ 'Fn::Sub': 'arn:${AWS::Partition}:sqs:${AWS::Region}:${AWS::AccountId}:app-prod-*' }],
      [
        { 'Fn::Sub': 'arn:${AWS::Partition}:events:${AWS::Region}:${AWS::AccountId}:rule/app-prod-*' },
        { 'Fn::Sub': 'arn:${AWS::Partition}:events:${AWS::Region}:${AWS::AccountId}:rule/*/app-prod-*' }
      ]
    ]);
    expect(JSON.stringify(policy)).not.toContain('iam:PassRole');
    // The role itself does not change.
    expect(resources.StacktapeServiceLambdaRole).toEqual(buildTemplate().Resources.StacktapeServiceLambdaRole as any);
  });

  test('user CloudFormation resources and rules whose targets need a role keep their CloudFormation type', () => {
    const { resources } = run();
    expect(resources.UserQueue.Type).toBe('AWS::SQS::Queue');
    expect(resources.EcsScheduleRule.Type).toBe('AWS::Events::Rule');
  });

  test('resources deployed with their CloudFormation type keep it and are referenced as before', () => {
    const before = buildTemplate();
    const deployedTypes = new Map(Object.entries(before.Resources).map(([id, { Type }]) => [id, Type as string]));
    const { converted, resources } = run({ deployedTypes });
    expect(converted).toEqual({ queues: [], queuePolicies: [], rules: [] });
    expect(resources).toEqual(buildTemplate().Resources as Record<string, any>);
    expect(createdResourcesPolicy(resources)).toBeUndefined();
  });

  test('a queue added to a deployed stack is converted; its deployed dead-letter queue keeps its form', () => {
    const deployedTypes = new Map([
      ['DlqQueue', 'AWS::SQS::Queue'],
      ['WorkerEvent0Rule', 'AWS::Events::Rule']
    ]);
    const { converted, resources } = run({ deployedTypes });
    expect(converted.queues).toEqual(['JobsQueue']);
    expect(resources.DlqQueue.Type).toBe('AWS::SQS::Queue');
    expect(resources.WorkerEvent0Rule.Type).toBe('AWS::Events::Rule');
  });

  test('without converted resources there is no policy; CloudFormation deletes removed ones before the policy', () => {
    const template = buildTemplate();
    for (const id of ['DlqQueue', 'JobsQueue', 'JobsQueuePolicy', 'JobsEvent0Rule', 'WorkerEvent0Rule']) {
      delete (template.Resources as Record<string, unknown>)[id];
    }
    const { resources } = run({ template });
    expect(createdResourcesPolicy(resources)).toBeUndefined();
  });

  test('a converted queue that no longer qualifies stops the deploy instead of being replaced', () => {
    const template = buildTemplate();
    (template.Resources.JobsQueue.Properties as Record<string, unknown>).QueueName = 'shared-jobs';
    expect(() => run({ template, deployedTypes: new Map([['JobsQueue', 'Custom::StpSqsQueue']]) })).toThrow(
      /would replace the queue/
    );
    // A new queue with such a name just keeps the CloudFormation form.
    const fresh = buildTemplate();
    (fresh.Resources.JobsQueue.Properties as Record<string, unknown>).QueueName = 'shared-jobs';
    const { resources } = run({ template: fresh });
    expect(resources.JobsQueue.Type).toBe('AWS::SQS::Queue');
    expect(resources.JobsQueuePolicy.Type).toBe('AWS::SQS::QueuePolicy');
  });

  test('properties the service Lambda does not apply keep the CloudFormation form', () => {
    const template = buildTemplate();
    (template.Resources.DlqQueue.Properties as Record<string, unknown>).SomethingNew = 'x';
    (template.Resources.WorkerEvent0Rule.Properties as Record<string, unknown>).RoleArn = 'arn:role';
    (template.Resources.JobsQueuePolicy.Properties as Record<string, any>).PolicyDocument.Statement[0].Condition = {
      StringEquals: { 'aws:PrincipalTag/team': '${aws:PrincipalTag/team}' },
      ArnEquals: { 'aws:SourceArn': { 'Fn::GetAtt': ['JobsEvent0Rule', 'Arn'] } }
    };
    const { resources } = run({ template });
    expect(resources.DlqQueue.Type).toBe('AWS::SQS::Queue');
    expect(resources.WorkerEvent0Rule.Type).toBe('AWS::Events::Rule');
    expect(resources.JobsQueuePolicy.Type).toBe('AWS::SQS::QueuePolicy');
  });

  test('a stack name too long for a rule name keeps the CloudFormation form', () => {
    const longStackName = `a${'b'.repeat(60)}`;
    const template = buildTemplate();
    const converted = createNewQueuesAndRulesThroughServiceLambda({
      template,
      deployedTypes: new Map(),
      stacktapeLogicalNames: new Set(['WorkerEvent0Rule']),
      stackName: longStackName,
      serviceLambdaLogicalName: 'StacktapeServiceLambdaCustomResourceFunction',
      serviceLambdaRoleLogicalName: 'StacktapeServiceLambdaRole',
      tags: []
    });
    expect(converted.rules).toEqual([]);
  });

  test('references that may not resolve to an identifier keep the CloudFormation form', () => {
    const template = buildTemplate();
    const rule = template.Resources.JobsEvent0Rule.Properties as Record<string, any>;
    rule.EventPattern.detail.count = [{ numeric: ['>', { 'Fn::If': ['IsProd', 5, 10] }] }];
    const policy = template.Resources.JobsQueuePolicy.Properties as Record<string, any>;
    policy.PolicyDocument.Statement[0].Condition = {
      StringEquals: { 'aws:SourceAccount': { Ref: 'TenantParameter' } }
    };
    const { resources } = run({ template });
    expect(resources.JobsEvent0Rule.Type).toBe('AWS::Events::Rule');
    expect(resources.JobsQueuePolicy.Type).toBe('AWS::SQS::QueuePolicy');
  });

  test('a queue the service Lambda created refuses a new name before anything is deployed', () => {
    const template = buildTemplate();
    (template.Resources.JobsQueue.Properties as Record<string, unknown>).QueueName = 'app-prod-jobs.fifo';
    expect(() =>
      createNewQueuesAndRulesThroughServiceLambda({
        template,
        deployedTypes: new Map([['JobsQueue', 'Custom::StpSqsQueue']]),
        deployedQueueNames: new Map([['JobsQueue', 'app-prod-jobs']]),
        stacktapeLogicalNames: new Set(['JobsQueue']),
        stackName,
        serviceLambdaLogicalName: 'StacktapeServiceLambdaCustomResourceFunction',
        serviceLambdaRoleLogicalName: 'StacktapeServiceLambdaRole',
        tags: []
      })
    ).toThrow(/would get a new name/);
  });
});

describe('keepServiceLambdaCodeForRollback', () => {
  const serviceLambda = (key: string) => ({
    Type: 'AWS::Lambda::Function',
    Properties: { Code: { S3Bucket: 'b', S3Key: key }, Tags: [{ Key: 'stp:code-digest', Value: key }] }
  });
  const queue = {
    Type: 'Custom::StpSqsQueue',
    Properties: { ServiceToken: serviceToken, sqsQueue: { QueueName: 'app-prod-jobs' } }
  };
  const templates = (deployedResources: Record<string, unknown>, rollbackResources: Record<string, unknown>) => ({
    deployedTemplate: {
      Resources: { StacktapeServiceLambdaCustomResourceFunction: serviceLambda('new.zip'), ...deployedResources }
    } as unknown as CloudFormationTemplate,
    rollbackTemplate: {
      Resources: { StacktapeServiceLambdaCustomResourceFunction: serviceLambda('old.zip'), ...rollbackResources }
    } as unknown as CloudFormationTemplate
  });

  test('keeps the deployed code when the rollback removes resources only that code can delete', () => {
    const { deployedTemplate, rollbackTemplate } = templates({ JobsQueue: queue }, {});
    expect(
      keepServiceLambdaCodeForRollback({
        rollbackTemplate,
        deployedTemplate,
        serviceLambdaLogicalName: 'StacktapeServiceLambdaCustomResourceFunction'
      })
    ).toBe(true);
    expect(rollbackTemplate.Resources.StacktapeServiceLambdaCustomResourceFunction).toEqual(serviceLambda('new.zip'));
  });

  test('restores the release code when the rollback keeps every service Lambda resource', () => {
    const { deployedTemplate, rollbackTemplate } = templates({ JobsQueue: queue }, { JobsQueue: queue });
    expect(
      keepServiceLambdaCodeForRollback({
        rollbackTemplate,
        deployedTemplate,
        serviceLambdaLogicalName: 'StacktapeServiceLambdaCustomResourceFunction'
      })
    ).toBe(false);
    expect(rollbackTemplate.Resources.StacktapeServiceLambdaCustomResourceFunction).toEqual(serviceLambda('old.zip'));
  });
});
