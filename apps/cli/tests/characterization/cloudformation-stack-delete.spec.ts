import { afterEach, describe, expect, spyOn, test } from 'bun:test';
import type { ReplicationGroup, ServerlessCache } from '@aws-sdk/client-elasticache';
import type { DomainStatus } from '@aws-sdk/client-opensearch';
import type { DBCluster, DBInstance } from '@aws-sdk/client-rds';
import type { EnrichedStackResourceInfo, StackDetails } from '../../src/domain/cloudformation-stack-manager/types';
import { stackManager } from '../../src/domain/cloudformation-stack-manager';
import { applicationManager } from '../../src/app/application-manager';
import { globalStateManager } from '../../src/app/global-state-manager';
import { operationReporter } from '../../src/app/operation-manager';
import { configManager } from '../../src/domain/config-manager';
import { deployedStackOverviewManager } from '../../src/domain/deployed-stack-overview-manager';
import { templateManager } from '../../src/domain/template-manager';
import { awsSdkManager } from '../../src/utils/aws-sdk-manager';
import { tuiManager } from '../../src/app/tui-manager';
import { planEarlyDeletes } from '../../src/domain/cloudformation-stack-manager/early-deletes';
import { planBackgroundDeleteChecks } from '../../src/domain/cloudformation-stack-manager/background-delete';
import { findDeletionProtectedResources } from '../../src/domain/cloudformation-stack-manager/deletion-protection';
import { executeDeleteOperation } from '../../src/commands/delete';
import { withCredentiallessSynthesisBoundary } from './synthesis-fixture';
import * as time from '../../src/utils/time';

/**
 * `delete` starts slow AWS-side work before CloudFormation's DeleteStack: it scales ECS services to 0 and disables
 * CloudFront distributions while the buckets are being emptied, and it does not hold DeleteStack until the tasks have
 * drained. A delete that never reaches CloudFormation enables the distributions again. Once CloudFormation has started
 * deleting the stack's resources, databases, caches and search domains that CloudFormation would delete without a
 * snapshot, and load balancers, are deleted at once instead of after the workloads that reference them. A delete that
 * CloudFormation cancels (another stack imports an output) deletes nothing.
 */

const stackName = 'delete-test';
const serviceArn = 'arn:aws:ecs:eu-west-1:123456789012:service/delete-test-cluster/web';
const distributionId = 'E2DISTRIBUTION';

const resource = (
  ResourceType: string,
  PhysicalResourceId: string,
  LogicalResourceId = ResourceType.replaceAll(':', '')
) =>
  ({
    ResourceType,
    PhysicalResourceId,
    LogicalResourceId
  }) as EnrichedStackResourceInfo;

const deferred = () => {
  let resolve!: () => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

const settle = async () => {
  for (let turn = 0; turn < 20; turn++) await Promise.resolve();
};

type MonitorOptions = NonNullable<Parameters<typeof stackManager.monitorStack>[3]>;
/** Replaces the fixture's CloudFormation monitoring for one test. */
const monitorThat = (behavior: (options: MonitorOptions) => unknown) =>
  (stackManager.monitorStack as unknown as ReturnType<typeof spyOn>).mockImplementation(async (...args: unknown[]) =>
    behavior((args[3] ?? {}) as MonitorOptions)
  );

const withDeleteFixture = async (
  resources: EnrichedStackResourceInfo[],
  run: (fixture: {
    calls: string[];
    warnings: string[];
    runCleanUpHooks: (outcome?: { success: boolean; interrupted?: boolean }) => Promise<void>;
  }) => Promise<void>,
  {
    deletionPolicies = {},
    properties = {},
    liveInstances = {},
    liveClusters = {},
    liveReplicationGroups = {},
    liveServerlessCaches = {},
    liveDomains = {},
    liveLoadBalancers = {},
    priorEvents = [],
    currentTemplate,
    currentResources,
    stackRoleArn
  }: {
    deletionPolicies?: Record<string, string>;
    properties?: Record<string, Record<string, unknown>>;
    liveInstances?: Record<string, Partial<DBInstance>>;
    liveClusters?: Record<string, Partial<DBCluster>>;
    liveReplicationGroups?: Record<string, Partial<ReplicationGroup>>;
    liveServerlessCaches?: Record<string, Partial<ServerlessCache>>;
    liveDomains?: Record<string, Partial<DomainStatus>>;
    liveLoadBalancers?: Record<string, { deletionProtection: boolean }>;
    /** The stack's events before DeleteStack; an Error when they cannot be read. */
    priorEvents?: { Timestamp: Date }[] | Error;
    /** The template CloudFormation reports once the delete has started, when it differs from the one loaded first. */
    currentTemplate?: unknown;
    /** The resources CloudFormation lists once the delete has started, when they differ from the ones loaded first. */
    currentResources?: EnrichedStackResourceInfo[];
    stackRoleArn?: string;
  } = {}
) => {
  await withCredentiallessSynthesisBoundary(async () => {
    operationReporter.setSilentMode(true);
    globalStateManager.rawCommands = ['delete'];
    globalStateManager.rawArgs = { region: 'eu-west-1' };
    const calls: string[] = [];
    const warnings: string[] = [];
    const hooks: ((args: { success: boolean; interrupted?: boolean }) => Promise<unknown>)[] = [];
    const spies: { mockRestore: () => void }[] = [
      spyOn(applicationManager, 'registerCleanUpHook').mockImplementation((hook) => {
        hooks.push(hook as (typeof hooks)[number]);
      }),
      spyOn(awsSdkManager.ecs, 'startRollingUpdate').mockImplementation(async ({ service, desiredCount }) => {
        calls.push(`ecs:scale ${service} ${desiredCount}`);
        return { deploymentId: undefined };
      }),
      spyOn(awsSdkManager.ecs, 'getService').mockImplementation(async () => {
        calls.push('ecs:describe');
        return { runningCount: 1 } as Awaited<ReturnType<typeof awsSdkManager.ecs.getService>>;
      }),
      spyOn(awsSdkManager.cloudFront, 'setDistributionEnabled').mockImplementation(
        async ({ distributionId: id, enabled }) => {
          calls.push(`cloudfront:${enabled ? 'enable' : 'disable'} ${id}`);
          return true;
        }
      ),
      spyOn(awsSdkManager.cloudFormation, 'getEvents').mockImplementation(async () => {
        if (priorEvents instanceof Error) throw priorEvents;
        return priorEvents as never;
      }),
      spyOn(awsSdkManager.lambda, 'functionUrlExists').mockResolvedValue(true),
      spyOn(awsSdkManager.lambda, 'deleteFunctionUrl').mockImplementation(async ({ functionName, qualifier }) => {
        calls.push(`lambda:delete-url ${functionName}${qualifier ? ` (${qualifier})` : ''}`);
      }),
      spyOn(awsSdkManager.cloudFormation, 'delete').mockImplementation(async (name, { express }) => {
        calls.push(`cloudformation:delete ${name}${express ? ' (express mode)' : ''}`);
        return {} as never;
      }),
      // CloudFormation starts deleting resources right away unless a test says otherwise.
      spyOn(stackManager, 'monitorStack').mockImplementation(async (_action, _stackId, _onProgress, options) => {
        options?.onResourceDeletesStarted?.();
        calls.push('cloudformation:monitor');
        return {};
      }),
      spyOn(awsSdkManager.loadBalancers, 'getLoadBalancer').mockImplementation(
        async ({ loadBalancerArn }) =>
          liveLoadBalancers[loadBalancerArn] as Awaited<ReturnType<typeof awsSdkManager.loadBalancers.getLoadBalancer>>
      ),
      spyOn(awsSdkManager.loadBalancers, 'deleteLoadBalancer').mockImplementation(async ({ loadBalancerArn }) => {
        calls.push(`elb:delete ${loadBalancerArn}`);
      }),
      spyOn(awsSdkManager.rds, 'getInstance').mockImplementation(
        async ({ identifier }) => liveInstances[identifier] as DBInstance
      ),
      spyOn(awsSdkManager.rds, 'getCluster').mockImplementation(
        async ({ identifier }) => liveClusters[identifier] as DBCluster
      ),
      spyOn(awsSdkManager.rds, 'deleteInstance').mockImplementation(async (input) => {
        calls.push(`rds:delete ${JSON.stringify(input)}`);
        return {};
      }),
      spyOn(awsSdkManager.elastiCache, 'getReplicationGroup').mockImplementation(
        async ({ replicationGroupId }) => liveReplicationGroups[replicationGroupId] as ReplicationGroup
      ),
      spyOn(awsSdkManager.elastiCache, 'deleteReplicationGroup').mockImplementation(async ({ replicationGroupId }) => {
        calls.push(`elasticache:delete ${replicationGroupId}`);
        return {};
      }),
      spyOn(awsSdkManager.elastiCache, 'getServerlessCache').mockImplementation(
        async ({ serverlessCacheName }) => liveServerlessCaches[serverlessCacheName] as ServerlessCache
      ),
      spyOn(awsSdkManager.elastiCache, 'deleteServerlessCache').mockImplementation(async ({ serverlessCacheName }) => {
        calls.push(`elasticache:delete-serverless ${serverlessCacheName}`);
        return {};
      }),
      spyOn(awsSdkManager.openSearch, 'getDomain').mockImplementation(
        async ({ domainName }) => liveDomains[domainName] as DomainStatus
      ),
      spyOn(awsSdkManager.openSearch, 'deleteDomain').mockImplementation(async ({ domainName }) => {
        calls.push(`opensearch:delete ${domainName}`);
        return {} as DomainStatus;
      }),
      spyOn(tuiManager, 'warn').mockImplementation((message: string) => {
        warnings.push(message);
      }),
      spyOn(tuiManager, 'info').mockImplementation(() => {}),
      // AWS's clock, read before DeleteStack.
      spyOn(time, 'getAwsSynchronizedTime').mockResolvedValue(new Date('2026-10-29T12:00:00Z'))
    ];
    // A delete without a CloudFormation role in the config or the stack metadata.
    Object.defineProperty(configManager, 'deploymentConfig', { configurable: true, get: () => undefined });
    spies.push(spyOn(deployedStackOverviewManager, 'getStackMetadata').mockReturnValue(undefined));
    stackManager.existingStackResources = resources;
    // The deployed template: CloudFormation deletes each resource with the stack unless a DeletionPolicy says otherwise.
    templateManager.oldTemplate = {
      Resources: Object.fromEntries(
        resources.map(({ LogicalResourceId, ResourceType }) => [
          LogicalResourceId,
          {
            Type: ResourceType,
            ...(deletionPolicies[LogicalResourceId] ? { DeletionPolicy: deletionPolicies[LogicalResourceId] } : {}),
            ...(properties[LogicalResourceId] ? { Properties: properties[LogicalResourceId] } : {})
          }
        ])
      )
    } as typeof templateManager.oldTemplate;
    // What CloudFormation is deleting, read again once DeleteStack is accepted.
    spies.push(
      spyOn(awsSdkManager.cloudFormation, 'getTemplate').mockImplementation(
        async () => (currentTemplate ?? templateManager.oldTemplate) as never
      ),
      spyOn(awsSdkManager.cloudFormation, 'getResources').mockImplementation(
        async () =>
          (currentResources ?? resources).map(({ LogicalResourceId, ResourceType, PhysicalResourceId }) => ({
            LogicalResourceId,
            ResourceType,
            PhysicalResourceId,
            ResourceStatus: 'DELETE_IN_PROGRESS'
          })) as never
      )
    );
    stackManager.existingStackDetails = {
      StackName: stackName,
      StackId: stackName,
      StackStatus: 'UPDATE_COMPLETE',
      ...(stackRoleArn && { RoleARN: stackRoleArn }),
      CreationTime: new Date('2026-10-01'),
      stackOutput: {}
    } as StackDetails;
    try {
      await run({
        calls,
        warnings,
        runCleanUpHooks: async (outcome = { success: false }) => {
          for (const hook of hooks) await hook(outcome);
        }
      });
    } finally {
      for (const spy of spies) spy.mockRestore();
      delete (configManager as { deploymentConfig?: unknown }).deploymentConfig;
      stackManager.existingStackResources = [];
      templateManager.oldTemplate = undefined;
    }
  });
};

describe('stack delete', () => {
  afterEach(() => {
    stackManager.existingStackResources = [];
  });

  test('scales ECS down and disables CloudFront while the buckets are emptied, then deletes without a drain wait', async () => {
    await withDeleteFixture(
      [resource('AWS::ECS::Service', serviceArn), resource('AWS::CloudFront::Distribution', distributionId)],
      async ({ calls, runCleanUpHooks }) => {
        const emptying = deferred();
        const deleting = stackManager.deleteStack({ beforeDelete: () => emptying.promise });
        await settle();
        // Both started while emptying is still running, and CloudFormation has not been asked yet.
        expect(calls).toEqual(
          expect.arrayContaining([`ecs:scale ${serviceArn} 0`, `cloudfront:disable ${distributionId}`])
        );
        expect(calls.some((call) => call.startsWith('cloudformation:'))).toBe(false);

        emptying.resolve();
        await deleting;
        expect(calls.slice(-2)).toEqual([expect.stringMatching(/^cloudformation:delete /), 'cloudformation:monitor']);
        // DeleteStack does not wait for the tasks to drain: CloudFormation's service delete does that.
        expect(calls).not.toContain('ecs:describe');

        // The delete reached CloudFormation, so nothing is enabled again.
        await runCleanUpHooks();
        expect(calls.filter((call) => call.startsWith('cloudfront:enable'))).toEqual([]);
      }
    );
  });

  test('enables the distribution again when the delete never reaches CloudFormation', async () => {
    await withDeleteFixture(
      [resource('AWS::CloudFront::Distribution', distributionId)],
      async ({ calls, runCleanUpHooks }) => {
        const emptying = deferred();
        const deleting = stackManager.deleteStack({ beforeDelete: () => emptying.promise });
        await settle();
        emptying.reject(new Error('AccessDenied while emptying the bucket'));
        await expect(deleting).rejects.toThrow('AccessDenied while emptying the bucket');
        expect(calls.some((call) => call.startsWith('cloudformation:'))).toBe(false);

        await runCleanUpHooks();
        expect(calls).toContain(`cloudfront:enable ${distributionId}`);
      }
    );
  });

  test('a stack without services or distributions goes straight to CloudFormation', async () => {
    await withDeleteFixture([resource('AWS::S3::Bucket', 'delete-test-bucket')], async ({ calls }) => {
      let emptied = false;
      await stackManager.deleteStack({
        beforeDelete: async () => {
          emptied = true;
        }
      });
      expect(emptied).toBe(true);
      // Express mode: CloudFormation still waits for the slow deletes, but not for queues, topics, rules or listeners.
      expect(calls).toEqual([
        expect.stringMatching(/^cloudformation:delete .+ \(express mode\)$/),
        'cloudformation:monitor'
      ]);
    });
  });

  test('a failed disable leaves the distribution to CloudFormation and still deletes the stack', async () => {
    await withDeleteFixture(
      [resource('AWS::CloudFront::Distribution', distributionId)],
      async ({ calls, runCleanUpHooks }) => {
        (awsSdkManager.cloudFront.setDistributionEnabled as unknown as ReturnType<typeof spyOn>).mockImplementation(
          async () => {
            throw new Error('AccessDenied: cloudfront:UpdateDistribution');
          }
        );
        await stackManager.deleteStack();
        expect(calls).toEqual([expect.stringMatching(/^cloudformation:delete /), 'cloudformation:monitor']);
        await runCleanUpHooks();
        expect(calls).toHaveLength(2);
      }
    );
  });
  test('a distribution or service the stack retains keeps running', async () => {
    const service = resource('AWS::ECS::Service', serviceArn);
    const distribution = resource('AWS::CloudFront::Distribution', distributionId);
    await withDeleteFixture(
      [service, distribution],
      async ({ calls }) => {
        await stackManager.deleteStack();
        expect(calls).toEqual([expect.stringMatching(/^cloudformation:delete /), 'cloudformation:monitor']);
      },
      {
        deletionPolicies: {
          [service.LogicalResourceId]: 'Retain',
          [distribution.LogicalResourceId]: 'RetainExceptOnCreate'
        }
      }
    );
  });

  test('a failed DeleteStack request enables the distribution again', async () => {
    await withDeleteFixture(
      [resource('AWS::CloudFront::Distribution', distributionId)],
      async ({ calls, runCleanUpHooks }) => {
        (awsSdkManager.cloudFormation.delete as unknown as ReturnType<typeof spyOn>).mockImplementation(async () => {
          throw new Error('Stack is in UPDATE_IN_PROGRESS state and can not be deleted');
        });
        await expect(stackManager.deleteStack()).rejects.toThrow('can not be deleted');
        await runCleanUpHooks();
        expect(calls).toEqual([`cloudfront:disable ${distributionId}`, `cloudfront:enable ${distributionId}`]);
      }
    );
  });
});

describe('early database and cache deletes', () => {
  const plan = (
    resources: Record<
      string,
      { type: string; physicalId?: string; deletionPolicy?: string; properties?: Record<string, unknown> }
    >
  ) =>
    planEarlyDeletes({
      resources: Object.entries(resources).map(([LogicalResourceId, { type, physicalId }]) => ({
        LogicalResourceId,
        ResourceType: type,
        PhysicalResourceId: physicalId ?? LogicalResourceId.toLowerCase()
      })),
      template: {
        Resources: Object.fromEntries(
          Object.entries(resources).map(([logicalId, { type, deletionPolicy, properties }]) => [
            logicalId,
            {
              Type: type,
              ...(deletionPolicy && { DeletionPolicy: deletionPolicy }),
              ...(properties && { Properties: properties })
            }
          ])
        )
      } as never
    }).map((item) => item.logicalId);

  const instance = 'AWS::RDS::DBInstance';
  const cluster = 'AWS::RDS::DBCluster';
  const cache = 'AWS::ElastiCache::ReplicationGroup';
  const serverlessCache = 'AWS::ElastiCache::ServerlessCache';
  const domain = 'AWS::OpenSearchService::Domain';
  const loadBalancer = 'AWS::ElasticLoadBalancingV2::LoadBalancer';

  test.each([
    ['a standalone instance with DeletionPolicy Delete', { Db: { type: instance, deletionPolicy: 'Delete' } }, ['Db']],
    // CloudFormation's default for a standalone instance is Snapshot.
    ['a standalone instance without a DeletionPolicy', { Db: { type: instance } }, []],
    ['a standalone instance with Snapshot', { Db: { type: instance, deletionPolicy: 'Snapshot' } }, []],
    ['a standalone instance with Retain', { Db: { type: instance, deletionPolicy: 'Retain' } }, []],
    [
      'a standalone instance with RetainExceptOnCreate',
      { Db: { type: instance, deletionPolicy: 'RetainExceptOnCreate' } },
      []
    ],
    [
      'a primary with a read replica, and the replica',
      {
        Db: { type: instance, deletionPolicy: 'Delete' },
        Replica: { type: instance, deletionPolicy: 'Delete', properties: { SourceDBInstanceIdentifier: { Ref: 'Db' } } }
      },
      []
    ],
    [
      'an instance whose DeleteAutomatedBackups is not a literal',
      {
        Db: {
          type: instance,
          deletionPolicy: 'Delete',
          properties: { DeleteAutomatedBackups: { 'Fn::If': ['Prod', false, true] } }
        }
      },
      []
    ],
    [
      'the instances of an Aurora cluster with DeletionPolicy Delete',
      {
        Cluster: { type: cluster, deletionPolicy: 'Delete' },
        Writer: { type: instance, deletionPolicy: 'Delete', properties: { DBClusterIdentifier: { Ref: 'Cluster' } } },
        Reader: { type: instance, properties: { DBClusterIdentifier: { Ref: 'Cluster' } } }
      },
      ['Writer', 'Reader']
    ],
    [
      'an Aurora instance of a cluster without a DeletionPolicy (Snapshot)',
      {
        Cluster: { type: cluster },
        Writer: { type: instance, deletionPolicy: 'Delete', properties: { DBClusterIdentifier: { Ref: 'Cluster' } } }
      },
      []
    ],
    [
      'an Aurora instance of a retained cluster',
      {
        Cluster: { type: cluster, deletionPolicy: 'Retain' },
        Writer: { type: instance, deletionPolicy: 'Delete', properties: { DBClusterIdentifier: { Ref: 'Cluster' } } }
      },
      []
    ],
    [
      'an Aurora instance that is retained itself',
      {
        Cluster: { type: cluster, deletionPolicy: 'Delete' },
        Writer: { type: instance, deletionPolicy: 'Retain', properties: { DBClusterIdentifier: { Ref: 'Cluster' } } }
      },
      []
    ],
    [
      'an Aurora instance of a global cluster',
      {
        Cluster: { type: cluster, deletionPolicy: 'Delete', properties: { GlobalClusterIdentifier: 'global' } },
        Writer: { type: instance, properties: { DBClusterIdentifier: { Ref: 'Cluster' } } }
      },
      []
    ],
    [
      'an Aurora instance of a cluster outside the stack',
      { Writer: { type: instance, deletionPolicy: 'Delete', properties: { DBClusterIdentifier: 'other-cluster' } } },
      []
    ],
    ['a replication group without a DeletionPolicy (Delete)', { Cache: { type: cache } }, ['Cache']],
    ['a replication group with Snapshot', { Cache: { type: cache, deletionPolicy: 'Snapshot' } }, []],
    ['a replication group with Retain', { Cache: { type: cache, deletionPolicy: 'Retain' } }, []],
    [
      'a replication group in a global datastore',
      { Cache: { type: cache, properties: { GlobalReplicationGroupId: 'global' } } },
      []
    ],
    ['a serverless cache without a DeletionPolicy (Delete)', { Cache: { type: serverlessCache } }, ['Cache']],
    ['a retained serverless cache', { Cache: { type: serverlessCache, deletionPolicy: 'Retain' } }, []],
    [
      'a serverless cache with a final snapshot',
      { Cache: { type: serverlessCache, properties: { FinalSnapshotName: 'final' } } },
      []
    ],
    ['a resource without a physical ID', { Db: { type: instance, deletionPolicy: 'Delete', physicalId: '' } }, []],
    ['an OpenSearch domain without a DeletionPolicy (Delete)', { Search: { type: domain } }, ['Search']],
    ['a retained OpenSearch domain', { Search: { type: domain, deletionPolicy: 'Retain' } }, []],
    [
      'a stack with a before:delete deployment script, which may still read the data',
      {
        Db: { type: instance, deletionPolicy: 'Delete' },
        ExportScriptCustomResource: {
          type: 'AWS::CloudFormation::CustomResource',
          properties: {
            ServiceToken: { 'Fn::GetAtt': ['StacktapeServiceLambdaCustomResourceFunction', 'Arn'] },
            scriptFunction: { functionName: { Ref: 'ExportFunction' }, triggerType: 'before:delete' }
          }
        }
      },
      []
    ],
    [
      'a stack with an after:deploy script and Stacktape-internal custom resources',
      {
        Db: { type: instance, deletionPolicy: 'Delete' },
        SeedScriptCustomResource: {
          type: 'AWS::CloudFormation::CustomResource',
          properties: {
            ServiceToken: { 'Fn::GetAtt': ['StacktapeServiceLambdaCustomResourceFunction', 'Arn'] },
            scriptFunction: { functionName: { Ref: 'SeedFunction' }, triggerType: 'after:deploy' }
          }
        },
        StpSensitiveDataCustomResource: {
          type: 'AWS::CloudFormation::CustomResource',
          properties: { ServiceToken: { 'Fn::GetAtt': 'StacktapeServiceLambdaCustomResourceFunction.Arn' } }
        }
      },
      ['Db']
    ],
    [
      'a stack with queues, a queue policy and a rule the service Lambda created',
      {
        Lb: { type: loadBalancer },
        ...Object.fromEntries(
          [
            ['Queue', 'Custom::StpSqsQueue', 'sqsQueue'],
            ['QueuePolicy', 'Custom::StpSqsQueuePolicy', 'sqsQueuePolicy'],
            ['Rule', 'Custom::StpEventsRule', 'eventsRule']
          ].map(([logicalId, type, resolver]) => [
            logicalId,
            {
              type,
              properties: {
                ServiceToken: { 'Fn::GetAtt': ['StacktapeServiceLambdaCustomResourceFunction', 'Arn'] },
                [resolver]: {}
              }
            }
          ])
        )
      },
      ['Lb']
    ],
    [
      "a stack with a custom resource of the user's own",
      {
        Cache: { type: cache },
        Backup: { type: 'Custom::Backup', properties: { ServiceToken: { 'Fn::GetAtt': ['BackupFunction', 'Arn'] } } }
      },
      []
    ],
    [
      'an Aurora cluster itself, which CloudFormation still deletes',
      { Cluster: { type: cluster, deletionPolicy: 'Delete' } },
      []
    ],
    ['a load balancer without a DeletionPolicy (Delete)', { Lb: { type: loadBalancer } }, ['Lb']],
    ['a function URL without a DeletionPolicy (Delete)', { ApiUrl: { type: 'AWS::Lambda::Url' } }, ['ApiUrl']],
    ['a retained function URL', { ApiUrl: { type: 'AWS::Lambda::Url', deletionPolicy: 'Retain' } }, []],
    ['a retained load balancer', { Lb: { type: loadBalancer, deletionPolicy: 'Retain' } }, []],
    [
      'a load balancer with listeners, rules, a certificate, a firewall, DNS records and the default domain',
      {
        Lb: { type: loadBalancer },
        Listener: { type: 'AWS::ElasticLoadBalancingV2::Listener', properties: { LoadBalancerArn: { Ref: 'Lb' } } },
        Rule: { type: 'AWS::ElasticLoadBalancingV2::ListenerRule', properties: { ListenerArn: { Ref: 'Listener' } } },
        Cert: {
          type: 'AWS::ElasticLoadBalancingV2::ListenerCertificate',
          properties: { ListenerArn: { Ref: 'Listener' } }
        },
        Firewall: { type: 'AWS::WAFv2::WebACLAssociation', properties: { ResourceArn: { Ref: 'Lb' } } },
        Record: {
          type: 'AWS::Route53::RecordSet',
          properties: { AliasTarget: { DNSName: { 'Fn::GetAtt': ['Lb', 'DNSName'] } } }
        },
        Domain: {
          type: 'AWS::CloudFormation::CustomResource',
          properties: {
            ServiceToken: { 'Fn::GetAtt': ['StacktapeServiceLambdaCustomResourceFunction', 'Arn'] },
            defaultDomain: { targetInfo: { domainName: { 'Fn::Sub': '${Lb.DNSName}' } } }
          }
        }
      },
      ['Lb']
    ],
    [
      'a load balancer an API Gateway VPC link targets, whose delete was not measured without it',
      {
        Lb: { type: loadBalancer },
        Link: { type: 'AWS::ApiGateway::VpcLink', properties: { TargetArns: [{ Ref: 'Lb' }] } }
      },
      []
    ],
    [
      'a load balancer whose listener an unknown resource references',
      {
        Lb: { type: loadBalancer },
        Listener: { type: 'AWS::ElasticLoadBalancingV2::Listener', properties: { LoadBalancerArn: { Ref: 'Lb' } } },
        Accelerator: {
          type: 'AWS::GlobalAccelerator::EndpointGroup',
          properties: { ListenerArn: { 'Fn::Sub': ['${Arn}', { Arn: { Ref: 'Listener' } }] } }
        }
      },
      []
    ]
  ])('%s', (_name, resources, expected) => {
    expect(plan(resources as Parameters<typeof plan>[0])).toEqual(expected as string[]);
  });

  test('a resource missing from the deployed template is left alone', () => {
    expect(
      planEarlyDeletes({
        resources: [{ LogicalResourceId: 'Db', ResourceType: instance, PhysicalResourceId: 'db' }],
        template: undefined
      })
    ).toEqual([]);
  });

  const db = resource('AWS::RDS::DBInstance', 'stack-db', 'DatabaseDbInstance');
  const redis = resource('AWS::ElastiCache::ReplicationGroup', 'stack-cache', 'CacheReplicationGroup');
  const auroraCluster = resource('AWS::RDS::DBCluster', 'stack-aurora', 'DatabaseDbCluster');
  const auroraInstance = resource('AWS::RDS::DBInstance', 'stack-aurora-0', 'DatabaseDbInstance0');
  const search = resource('AWS::OpenSearchService::Domain', 'stack-search', 'SearchDomain');
  const serverless = resource('AWS::ElastiCache::ServerlessCache', 'stack-sessions', 'SessionsServerlessCache');
  const available = {
    liveDomains: { 'stack-search': { Deleted: false, Processing: false } },
    liveInstances: {
      'stack-db': { DBInstanceStatus: 'available', DeletionProtection: false },
      'stack-aurora-0': { DBInstanceStatus: 'available', DBClusterIdentifier: 'stack-aurora' }
    },
    liveClusters: { 'stack-aurora': { Status: 'available', DeletionProtection: false } },
    liveReplicationGroups: { 'stack-cache': { Status: 'available' } },
    liveServerlessCaches: { 'stack-sessions': { Status: 'available' } }
  };
  // Stacktape sets DeletionPolicy Delete on its database instances and clusters.
  const deletionPolicies = { DatabaseDbInstance: 'Delete', DatabaseDbCluster: 'Delete' };
  const auroraMember = { DatabaseDbInstance0: { DBClusterIdentifier: { Ref: 'DatabaseDbCluster' } } };

  test('deletes databases and caches right after CloudFormation accepted DeleteStack, without final snapshots', async () => {
    await withDeleteFixture(
      [db, redis, serverless, auroraCluster, auroraInstance, search],
      async ({ calls, warnings, runCleanUpHooks }) => {
        await stackManager.deleteStack();
        expect(calls[0]).toMatch(/^cloudformation:delete /);
        expect(calls.slice(1).sort()).toEqual(
          [
            'cloudformation:monitor',
            'opensearch:delete stack-search',
            `rds:delete ${JSON.stringify({ identifier: 'stack-db', skipFinalSnapshot: true })}`,
            `rds:delete ${JSON.stringify({ identifier: 'stack-aurora-0' })}`,
            'elasticache:delete stack-cache',
            'elasticache:delete-serverless stack-sessions'
          ].sort()
        );
        // A successful delete says nothing more about them.
        await runCleanUpHooks({ success: true });
        expect(warnings).toEqual([]);
      },
      { ...available, deletionPolicies, properties: auroraMember }
    );
  });

  test('passes the template DeleteAutomatedBackups on, as CloudFormation does', async () => {
    await withDeleteFixture(
      [db],
      async ({ calls }) => {
        await stackManager.deleteStack();
        expect(calls).toContain(
          `rds:delete ${JSON.stringify({ identifier: 'stack-db', skipFinalSnapshot: true, deleteAutomatedBackups: false })}`
        );
      },
      { ...available, deletionPolicies, properties: { DatabaseDbInstance: { DeleteAutomatedBackups: false } } }
    );
  });

  test('leaves protected, busy and replicated resources to CloudFormation', async () => {
    await withDeleteFixture(
      [db, redis, auroraCluster, auroraInstance, search],
      async ({ calls }) => {
        await stackManager.deleteStack();
        expect(calls).toEqual([expect.stringMatching(/^cloudformation:delete /), 'cloudformation:monitor']);
      },
      {
        deletionPolicies,
        properties: auroraMember,
        liveInstances: {
          // Stacktape's `deletionProtection` turns this on through a custom resource.
          'stack-db': { DBInstanceStatus: 'available', DeletionProtection: true },
          'stack-aurora-0': { DBInstanceStatus: 'available', DBClusterIdentifier: 'stack-aurora' }
        },
        liveClusters: { 'stack-aurora': { Status: 'available', DeletionProtection: true } },
        liveReplicationGroups: { 'stack-cache': { Status: 'modifying' } },
        liveDomains: { 'stack-search': { Deleted: false, Processing: true } }
      }
    );
    await withDeleteFixture(
      [db],
      async ({ calls }) => {
        await stackManager.deleteStack();
        expect(calls.some((call) => call.startsWith('rds:'))).toBe(false);
      },
      {
        deletionPolicies,
        liveInstances: { 'stack-db': { DBInstanceStatus: 'available', ReadReplicaDBInstanceIdentifiers: ['replica'] } }
      }
    );
  });

  test('a delete CloudFormation cancels before deleting any resource deletes no database', async () => {
    await withDeleteFixture(
      [db, redis],
      async ({ calls, warnings, runCleanUpHooks }) => {
        // Measured: DeleteStack is accepted, then CloudFormation cancels the delete about a second later.
        monitorThat(() => {
          throw new Error('Delete canceled. Cannot delete export X as it is in use by other-stack.');
        });
        await expect(stackManager.deleteStack()).rejects.toThrow('Delete canceled');
        await runCleanUpHooks();
        expect(calls).toEqual([expect.stringMatching(/^cloudformation:delete /)]);
        expect(warnings).toEqual([]);
      },
      { ...available, deletionPolicies }
    );
  });

  test('deletes a load balancer early unless it is protected or gone, and does not warn about it', async () => {
    const lb = (name: string) =>
      resource(
        'AWS::ElasticLoadBalancingV2::LoadBalancer',
        `arn:aws:elasticloadbalancing:eu-west-1:123456789012:loadbalancer/app/${name}/1`,
        name
      );
    await withDeleteFixture(
      [lb('Live'), lb('Protected'), lb('Gone')],
      async ({ calls, warnings, runCleanUpHooks }) => {
        monitorThat(({ onResourceDeletesStarted }) => {
          onResourceDeletesStarted?.();
          throw new Error('DELETE_FAILED');
        });
        await expect(stackManager.deleteStack()).rejects.toThrow('DELETE_FAILED');
        await runCleanUpHooks();
        expect(calls.filter((call) => call.startsWith('elb:'))).toEqual([
          'elb:delete arn:aws:elasticloadbalancing:eu-west-1:123456789012:loadbalancer/app/Live/1'
        ]);
        // A load balancer holds no data, so a failed delete says nothing about it.
        expect(warnings).toEqual([]);
      },
      {
        liveLoadBalancers: {
          'arn:aws:elasticloadbalancing:eu-west-1:123456789012:loadbalancer/app/Live/1': { deletionProtection: false },
          'arn:aws:elasticloadbalancing:eu-west-1:123456789012:loadbalancer/app/Protected/1': {
            deletionProtection: true
          }
        }
      }
    );
  });

  test('asks the monitor to finish in the background only when the caller allows it', async () => {
    for (const finishInBackground of [false, true]) {
      await withDeleteFixture([db], async () => {
        let asked: boolean | undefined;
        monitorThat(({ canFinishDeleteInBackground }) => {
          asked = !!canFinishDeleteInBackground;
          return {};
        });
        await stackManager.deleteStack({ finishInBackground });
        expect(asked).toBe(finishInBackground);
      });
    }
  });

  test("decides from CloudFormation's current resource list and live checks what can finish in the background", async () => {
    const decide = async (
      live: { LogicalResourceId: string; ResourceType: string; ResourceStatus: string }[],
      { tasksRunning = false, bucketEmpty = true } = {}
    ) => {
      let decision: unknown;
      await withDeleteFixture([], async () => {
        const spies = [
          spyOn(awsSdkManager.cloudFormation, 'getResources').mockResolvedValue(
            live.map((item) => ({ ...item, PhysicalResourceId: `${item.LogicalResourceId}-id` })) as never
          ),
          spyOn(awsSdkManager.ecs, 'serviceHasUnstoppedTasks').mockResolvedValue(tasksRunning),
          spyOn(awsSdkManager.cloudFront, 'isDistributionDisabled').mockResolvedValue(true),
          spyOn(awsSdkManager.loadBalancers, 'exists').mockResolvedValue(false),
          spyOn(awsSdkManager.s3, 'isBucketEmpty').mockResolvedValue(bucketEmpty),
          spyOn(awsSdkManager.rds, 'instanceExists').mockResolvedValue(true)
        ];
        try {
          monitorThat(async ({ canFinishDeleteInBackground }) => {
            // The events show only the network and the service as pending.
            decision = await canFinishDeleteInBackground?.([
              { logicalId: 'StpVpc', resourceType: 'AWS::EC2::VPC', physicalId: 'StpVpc-id' },
              { logicalId: 'ApiService', resourceType: 'AWS::ECS::Service', physicalId: 'ApiService-id' }
            ]);
            return {};
          });
          await stackManager.deleteStack({ finishInBackground: true });
        } finally {
          for (const spy of spies) spy.mockRestore();
        }
      });
      return decision as { logicalId: string }[] | undefined;
    };
    const network = [
      { LogicalResourceId: 'StpVpc', ResourceType: 'AWS::EC2::VPC', ResourceStatus: 'DELETE_IN_PROGRESS' },
      { LogicalResourceId: 'ApiService', ResourceType: 'AWS::ECS::Service', ResourceStatus: 'DELETE_IN_PROGRESS' },
      { LogicalResourceId: 'Queue', ResourceType: 'AWS::SQS::Queue', ResourceStatus: 'DELETE_COMPLETE' },
      { LogicalResourceId: 'Logs', ResourceType: 'AWS::S3::Bucket', ResourceStatus: 'DELETE_SKIPPED' }
    ];
    expect((await decide(network))?.map(({ logicalId }) => logicalId)).toEqual(['StpVpc', 'ApiService']);
    // A task that has not stopped yet still runs (and costs).
    expect(await decide(network, { tasksRunning: true })).toBeUndefined();
    // A database a failed deploy left in CREATE_FAILED is missing from the events' view, but CloudFormation deletes it
    // (and it still exists).
    expect(
      await decide([
        ...network,
        { LogicalResourceId: 'Db', ResourceType: 'AWS::RDS::DBInstance', ResourceStatus: 'CREATE_FAILED' }
      ])
    ).toBeUndefined();
    // A failure CloudFormation already reports, before its event reached the monitor.
    expect(
      await decide([
        ...network,
        { LogicalResourceId: 'StpSubnet', ResourceType: 'AWS::EC2::Subnet', ResourceStatus: 'DELETE_FAILED' }
      ])
    ).toBeUndefined();
    // `delete` empties the stack's buckets first; a bucket that is empty again costs nothing.
    const site = {
      LogicalResourceId: 'SiteBucket',
      ResourceType: 'AWS::S3::Bucket',
      ResourceStatus: 'DELETE_IN_PROGRESS'
    };
    expect((await decide([...network, site]))?.map(({ logicalId }) => logicalId)).toContain('SiteBucket');
    expect(await decide([...network, site], { bucketEmpty: false })).toBeUndefined();
  });

  test("monitors only events newer than the stack's newest event before the request", async () => {
    const previousAttemptFailedAt = new Date('2026-10-29T11:59:59.500Z');
    for (const [priorEvents, expected] of [
      // An attempt that failed half a second before the request (AWS's clock reads 12:00:00).
      [
        [{ Timestamp: new Date('2026-10-29T11:59:50Z') }, { Timestamp: previousAttemptFailedAt }],
        previousAttemptFailedAt
      ],
      // Nothing recent: anything older than the monitor's window is never read.
      [[], new Date('2026-10-29T11:59:58Z')]
    ] as const) {
      await withDeleteFixture(
        [db],
        async () => {
          let startedAfter: Date | undefined;
          monitorThat((options) => {
            startedAfter = options.startedAfter;
            return {};
          });
          await stackManager.deleteStack();
          expect(startedAfter).toEqual(expected);
        },
        { ...available, deletionPolicies, priorEvents: [...priorEvents] }
      );
    }
  });

  test('deletes nothing itself when the stack events before the request cannot be read', async () => {
    await withDeleteFixture(
      [db, redis],
      async ({ calls }) => {
        await stackManager.deleteStack();
        expect(calls).toEqual([expect.stringMatching(/^cloudformation:delete /), 'cloudformation:monitor']);
      },
      { ...available, deletionPolicies, priorEvents: new Error('Throttling: Rate exceeded') }
    );
  });

  test('deletes a function URL early, so the function stops answering direct calls', async () => {
    await withDeleteFixture(
      [resource('AWS::Lambda::Url', 'arn:aws:lambda:eu-west-1:123456789012:function:stack-api:live', 'ApiUrl')],
      async ({ calls }) => {
        await stackManager.deleteStack();
        expect(calls).toContain('lambda:delete-url arn:aws:lambda:eu-west-1:123456789012:function:stack-api (live)');
      }
    );
  });

  test('a refused DeleteStack request deletes no database', async () => {
    await withDeleteFixture(
      [db, redis],
      async ({ calls, warnings, runCleanUpHooks }) => {
        (awsSdkManager.cloudFormation.delete as unknown as ReturnType<typeof spyOn>).mockImplementation(async () => {
          throw new Error('Stack cannot be deleted while TerminationProtection is enabled');
        });
        await expect(stackManager.deleteStack()).rejects.toThrow('TerminationProtection');
        await runCleanUpHooks();
        expect(calls).toEqual([]);
        expect(warnings).toEqual([]);
      },
      { ...available, deletionPolicies }
    );
  });

  test('names the deleted resources when CloudFormation then fails or the user stops watching', async () => {
    for (const interrupted of [false, true]) {
      await withDeleteFixture(
        [db, redis],
        async ({ warnings, runCleanUpHooks }) => {
          monitorThat(({ onResourceDeletesStarted }) => {
            onResourceDeletesStarted?.();
            throw new Error('DELETE_FAILED');
          });
          await expect(stackManager.deleteStack()).rejects.toThrow('DELETE_FAILED');
          await runCleanUpHooks({ success: false, interrupted });
          expect(warnings).toHaveLength(1);
          expect(warnings[0]).toContain('DatabaseDbInstance (RDS DB instance stack-db)');
          expect(warnings[0]).toContain('CacheReplicationGroup (ElastiCache replication group stack-cache)');
          expect(warnings[0]).toContain(interrupted ? 'keeps deleting the stack' : 'did not finish');
        },
        { ...available, deletionPolicies }
      );
    }
  });

  test('a database CloudFormation started deleting first is not reported as deleted by Stacktape', async () => {
    await withDeleteFixture(
      [db],
      async ({ calls, warnings, runCleanUpHooks }) => {
        (awsSdkManager.rds.deleteInstance as unknown as ReturnType<typeof spyOn>).mockImplementation(async () => {
          throw new Error('InvalidDBInstanceState: Instance stack-db is already being deleted.');
        });
        monitorThat(({ onResourceDeletesStarted }) => {
          onResourceDeletesStarted?.();
          throw new Error('DELETE_FAILED');
        });
        await expect(stackManager.deleteStack()).rejects.toThrow('DELETE_FAILED');
        await runCleanUpHooks();
        expect(calls).toEqual([expect.stringMatching(/^cloudformation:delete /)]);
        expect(warnings).toEqual([]);
      },
      { ...available, deletionPolicies }
    );
  });

  test('a stack deleted through a CloudFormation service role keeps its data stores for CloudFormation', async () => {
    await withDeleteFixture(
      [db, redis],
      async ({ calls }) => {
        await stackManager.deleteStack();
        expect(calls).toEqual([expect.stringMatching(/^cloudformation:delete /), 'cloudformation:monitor']);
      },
      { ...available, deletionPolicies, stackRoleArn: 'arn:aws:iam::123456789012:role/CloudFormationDeployRole' }
    );
  });

  test('plans from the template CloudFormation is deleting, not the one loaded before the prompt', async () => {
    await withDeleteFixture(
      [db],
      async ({ calls }) => {
        await stackManager.deleteStack();
        expect(calls.some((call) => call.startsWith('rds:'))).toBe(false);
      },
      {
        ...available,
        deletionPolicies,
        // A deploy between loading the stack and the DeleteStack request switched the database to Retain.
        currentTemplate: {
          Resources: { DatabaseDbInstance: { Type: 'AWS::RDS::DBInstance', DeletionPolicy: 'Retain' } }
        }
      }
    );
  });

  test('deletes the resource CloudFormation lists now, not one a deploy before the request replaced and kept', async () => {
    await withDeleteFixture(
      [serverless],
      async ({ calls }) => {
        await stackManager.deleteStack();
        expect(calls.filter((call) => call.startsWith('elasticache:'))).toEqual([
          'elasticache:delete-serverless stack-sessions-2'
        ]);
      },
      {
        liveServerlessCaches: {
          'stack-sessions': { Status: 'available' },
          'stack-sessions-2': { Status: 'available' }
        },
        // The replaced cache was kept (UpdateReplacePolicy Retain); CloudFormation now deletes its replacement.
        currentResources: [resource('AWS::ElastiCache::ServerlessCache', 'stack-sessions-2', 'SessionsServerlessCache')]
      }
    );
  });

  test('Ctrl+C while the DeleteStack request was in flight starts no deletes', async () => {
    await withDeleteFixture(
      [db],
      async ({ calls }) => {
        (awsSdkManager.cloudFormation.delete as unknown as ReturnType<typeof spyOn>).mockImplementation(async () => {
          applicationManager.isInterrupted = true;
          return {} as never;
        });
        try {
          await stackManager.deleteStack();
        } finally {
          applicationManager.isInterrupted = false;
        }
        expect(calls.some((call) => call.startsWith('rds:'))).toBe(false);
      },
      { ...available, deletionPolicies }
    );
  });
});

describe('finishing a delete in the background', () => {
  const stacktapeCustomResource = (properties: Record<string, unknown>) => ({
    Type: 'AWS::CloudFormation::CustomResource',
    Properties: {
      ServiceToken: { 'Fn::GetAtt': ['StacktapeServiceLambdaCustomResourceFunction', 'Arn'] },
      ...properties
    }
  });
  test.each<{ name: string; pending: [string, string][]; template?: Record<string, unknown>; expected: unknown }>([
    {
      name: 'the empty network, roles, logs and a VPC function releasing its network interfaces',
      pending: [
        ['StpVpc', 'AWS::EC2::VPC'],
        ['StpPublicSubnet0', 'AWS::EC2::Subnet'],
        ['WorkerFunction', 'AWS::Lambda::Function'],
        ['WorkerRole', 'AWS::IAM::Role'],
        ['ApiLogGroup', 'AWS::Logs::LogGroup'],
        ['StpDiscoveryService', 'AWS::ServiceDiscovery::PrivateDnsNamespace']
      ],
      expected: []
    },
    {
      name: 'an ECS service, a distribution and a load balancer need live checks',
      pending: [
        ['ApiService', 'AWS::ECS::Service'],
        ['SiteCdn', 'AWS::CloudFront::Distribution'],
        ['ApiLoadBalancer', 'AWS::ElasticLoadBalancingV2::LoadBalancer']
      ],
      expected: [
        { kind: 'ecs-service-stopped', serviceArn: 'ApiService-id' },
        { kind: 'distribution-disabled', distributionId: 'SiteCdn-id' },
        { kind: 'load-balancer-gone', loadBalancerArn: 'ApiLoadBalancer-id' }
      ]
    },
    {
      name: "Stacktape's edge function and default domain custom resources",
      pending: [
        ['EdgeLambda', 'AWS::CloudFormation::CustomResource'],
        ['Domain', 'AWS::CloudFormation::CustomResource']
      ],
      template: {
        EdgeLambda: stacktapeCustomResource({ edgeLambda: {} }),
        Domain: stacktapeCustomResource({ defaultDomain: {} })
      },
      expected: []
    },
    {
      name: 'a database instance and a cache, billed until they are gone',
      pending: [
        ['Db', 'AWS::RDS::DBInstance'],
        ['Cache', 'AWS::ElastiCache::ReplicationGroup']
      ],
      expected: [
        { kind: 'db-instance-gone', instanceId: 'Db-id' },
        { kind: 'replication-group-gone', replicationGroupId: 'Cache-id' }
      ]
    },
    { name: 'an Aurora cluster', pending: [['Cluster', 'AWS::RDS::DBCluster']], expected: undefined },
    { name: 'a NAT gateway', pending: [['Nat', 'AWS::EC2::NatGateway']], expected: undefined },
    {
      name: 'a serverless cache, billed until it is gone, and its users',
      pending: [
        ['Cache', 'AWS::ElastiCache::ServerlessCache'],
        ['CacheUserGroup', 'AWS::ElastiCache::UserGroup'],
        ['CacheUser', 'AWS::ElastiCache::User']
      ],
      expected: [{ kind: 'serverless-cache-gone', serverlessCacheName: 'Cache-id' }]
    },
    { name: 'a queue, billed per request', pending: [['Queue', 'AWS::SQS::Queue']], expected: [] },
    ...[
      ['Custom::StpSqsQueue', 'sqsQueue'],
      ['Custom::StpSqsQueuePolicy', 'sqsQueuePolicy'],
      ['Custom::StpEventsRule', 'eventsRule']
    ].map(([type, resolver]) => ({
      name: `a ${type} the service Lambda deletes within seconds`,
      pending: [['Created', type]] as [string, string][],
      template: { Created: { ...stacktapeCustomResource({ [resolver]: {} }), Type: type } },
      expected: undefined
    })),
    {
      name: 'a topic, which can still invoke its subscribers',
      pending: [['Topic', 'AWS::SNS::Topic']],
      expected: undefined
    },
    {
      name: 'a bucket and a function URL behind a disabled distribution',
      pending: [
        ['SiteBucket', 'AWS::S3::Bucket'],
        ['ApiUrl', 'AWS::Lambda::Url']
      ],
      expected: [
        { kind: 'bucket-empty', bucketName: 'SiteBucket-id' },
        { kind: 'function-url-gone', functionArn: 'ApiUrl-id' }
      ]
    },
    {
      name: 'an interface VPC endpoint, billed per hour',
      pending: [['Endpoint', 'AWS::EC2::VPCEndpoint']],
      template: { Endpoint: { Type: 'AWS::EC2::VPCEndpoint', Properties: { VpcEndpointType: 'Interface' } } },
      expected: undefined
    },
    {
      name: 'a gateway VPC endpoint',
      pending: [['Endpoint', 'AWS::EC2::VPCEndpoint']],
      template: { Endpoint: { Type: 'AWS::EC2::VPCEndpoint', Properties: {} } },
      expected: []
    },
    {
      name: 'a before:delete deployment script',
      pending: [['Script', 'AWS::CloudFormation::CustomResource']],
      template: { Script: stacktapeCustomResource({ scriptFunction: { triggerType: 'before:delete' } }) },
      expected: undefined
    },
    {
      name: "a custom resource of the user's own",
      pending: [['Backup', 'Custom::Backup']],
      template: { Backup: { Type: 'Custom::Backup', Properties: { ServiceToken: 'arn:aws:lambda:backup' } } },
      expected: undefined
    },
    {
      name: 'a Stacktape custom resource that force-deletes an auto scaling group',
      pending: [['ForceDelete', 'AWS::CloudFormation::CustomResource']],
      template: { ForceDelete: stacktapeCustomResource({ forceDeleteAsg: {} }) },
      expected: undefined
    }
  ])('$name', ({ pending, template = {}, expected }) => {
    expect(
      planBackgroundDeleteChecks({
        pending: pending.map(([logicalId, resourceType]) => ({
          logicalId,
          resourceType,
          physicalId: `${logicalId}-id`
        })),
        template: { Resources: template } as never
      })
    ).toEqual(expected as never);
  });
});

describe('deletion protection', () => {
  const db = (overrides: Partial<EnrichedStackResourceInfo> = {}) =>
    ({
      ...resource('AWS::RDS::DBInstance', 'project-prod-db', 'DatabaseDbInstance'),
      ...overrides
    }) as EnrichedStackResourceInfo;
  const protectionCustomResource = (target: Record<string, unknown>) => ({
    Type: 'AWS::CloudFormation::CustomResource',
    Properties: { ServiceToken: 'arn', setDatabaseDeletionProtection: target }
  });

  test.each<{
    name: string;
    resources: EnrichedStackResourceInfo[];
    template: Record<string, unknown>;
    stackStatus?: string;
    expected: string[];
  }>([
    {
      name: 'AWS reports protection on an RDS instance',
      resources: [db({ rdsInstanceDetail: { DeletionProtection: true } })],
      template: { DatabaseDbInstance: { Type: 'AWS::RDS::DBInstance' } },
      expected: ['DatabaseDbInstance']
    },
    {
      name: 'AWS reports protection on an Aurora cluster',
      resources: [
        {
          ...resource('AWS::RDS::DBCluster', 'project-prod-aurora', 'AuroraDbCluster'),
          auroraClusterDetail: { DeletionProtection: true }
        } as EnrichedStackResourceInfo
      ],
      template: { AuroraDbCluster: { Type: 'AWS::RDS::DBCluster' } },
      expected: ['AuroraDbCluster']
    },
    {
      name: "Stacktape's custom resource protects a database whose details could not be read",
      resources: [db()],
      template: {
        DatabaseDbInstance: { Type: 'AWS::RDS::DBInstance' },
        DatabaseDeletionProtectionCustomResource: protectionCustomResource({
          instanceId: { Ref: 'DatabaseDbInstance' }
        })
      },
      expected: ['DatabaseDbInstance']
    },
    {
      name: 'AWS reporting protection off wins over the custom resource in the template',
      resources: [db({ rdsInstanceDetail: { DeletionProtection: false } })],
      template: {
        DatabaseDbInstance: { Type: 'AWS::RDS::DBInstance' },
        DatabaseDeletionProtectionCustomResource: protectionCustomResource({
          instanceId: { Ref: 'DatabaseDbInstance' }
        })
      },
      expected: []
    },
    {
      name: 'a stack whose delete failed: protection turned off in AWS does not show in its template',
      resources: [resource('AWS::DSQL::Cluster', 'abc123', 'LedgerDsqlCluster')],
      template: { LedgerDsqlCluster: { Type: 'AWS::DSQL::Cluster', Properties: { DeletionProtectionEnabled: true } } },
      stackStatus: 'DELETE_FAILED',
      expected: []
    },
    {
      name: 'a stack whose delete failed still counts what AWS reports',
      resources: [db({ rdsInstanceDetail: { DeletionProtection: true } })],
      template: { DatabaseDbInstance: { Type: 'AWS::RDS::DBInstance' } },
      stackStatus: 'DELETE_FAILED',
      expected: ['DatabaseDbInstance']
    },
    {
      name: 'a DSQL cluster with DeletionProtectionEnabled',
      resources: [resource('AWS::DSQL::Cluster', 'abc123', 'LedgerDsqlCluster')],
      template: { LedgerDsqlCluster: { Type: 'AWS::DSQL::Cluster', Properties: { DeletionProtectionEnabled: true } } },
      expected: ['LedgerDsqlCluster']
    },
    {
      name: 'a DSQL cluster without protection',
      resources: [resource('AWS::DSQL::Cluster', 'abc123', 'LedgerDsqlCluster')],
      template: { LedgerDsqlCluster: { Type: 'AWS::DSQL::Cluster', Properties: { DeletionProtectionEnabled: false } } },
      expected: []
    },
    {
      name: 'an unprotected database',
      resources: [db({ rdsInstanceDetail: { DeletionProtection: false } })],
      template: { DatabaseDbInstance: { Type: 'AWS::RDS::DBInstance' } },
      expected: []
    },
    {
      name: 'a protected database that CloudFormation retains',
      resources: [db({ rdsInstanceDetail: { DeletionProtection: true } })],
      template: { DatabaseDbInstance: { Type: 'AWS::RDS::DBInstance', DeletionPolicy: 'Retain' } },
      expected: []
    }
  ])('$name', ({ resources, template, stackStatus = 'UPDATE_COMPLETE', expected }) => {
    expect(
      findDeletionProtectedResources({ resources, template: { Resources: template } as never, stackStatus }).map(
        ({ logicalId }) => logicalId
      )
    ).toEqual(expected);
  });

  const runDelete = async ({
    resources,
    stackStatus = 'UPDATE_COMPLETE',
    deleteResult
  }: {
    resources: EnrichedStackResourceInfo[];
    stackStatus?: string;
    deleteResult?: Awaited<ReturnType<Parameters<typeof executeDeleteOperation>[0]['stack']['deleteStack']>>;
  }) => {
    const calls: string[] = [];
    const infos: string[] = [];
    const error = await executeDeleteOperation({
      config: { config: {}, hooks: [] } as never,
      deploymentArtifacts: {
        artifactStoreIsStackResource: true,
        deleteAllArtifacts: async () => calls.push('artifacts:delete'),
        deleteArtifactStore: async () => calls.push('artifact-store:delete')
      },
      deployedTemplate: { Resources: { DatabaseDbInstance: { Type: 'AWS::RDS::DBInstance' } } } as never,
      lifecycle: {
        registerHooks: async () => {
          calls.push('hooks:register');
        },
        processHooks: async () => {
          calls.push('hooks:run');
        }
      } as never,
      notification: { sendDeploymentNotification: async () => calls.push('notify') } as never,
      progress: { setPhase: () => {} } as never,
      stack: {
        deleteStack: async ({ finishInBackground }) => {
          calls.push(`stack:delete${finishInBackground ? ' (may finish in background)' : ''}`);
          return deleteResult;
        },
        existingStackDetails: { StackStatus: stackStatus },
        existingStackResources: resources
      },
      stackName: 'project-prod',
      finishInBackground: true,
      tui: {
        colorize: (_color: string, text: string) => text,
        info: (message: string) => infos.push(message),
        setPendingCompletion: () => {}
      } as never
    }).then(
      () => undefined,
      (err: Error) => err
    );
    return { calls, error, infos };
  };

  test('delete refuses before anything runs or is deleted, and says how to turn protection off', async () => {
    const { calls, error } = await runDelete({ resources: [db({ rdsInstanceDetail: { DeletionProtection: true } })] });
    expect(calls).toEqual([]);
    expect(error?.message).toContain('DatabaseDbInstance');
    expect(String((error as { hints?: unknown })?.hints)).toContain('deletionProtection: false');
  });

  test('a stack that failed to delete is told to turn protection off in AWS, since it cannot be deployed', async () => {
    const { calls, error } = await runDelete({
      resources: [db({ rdsInstanceDetail: { DeletionProtection: true } })],
      stackStatus: 'DELETE_FAILED'
    });
    expect(calls).toEqual([]);
    expect(String((error as { hints?: unknown })?.hints)).toContain('--no-deletion-protection');
  });

  test('an unprotected stack is deleted', async () => {
    const { calls, error } = await runDelete({ resources: [db({ rdsInstanceDetail: { DeletionProtection: false } })] });
    expect(error).toBeUndefined();
    expect(calls).toContain('stack:delete (may finish in background)');
  });

  test('says what AWS still removes in the background and what a later deploy or delete does about it', async () => {
    const { infos } = await runDelete({
      resources: [],
      deleteResult: {
        deletionContinuesInBackground: [
          { logicalId: 'ApiService', resourceType: 'AWS::ECS::Service' },
          { logicalId: 'StpVpc', resourceType: 'AWS::EC2::VPC' }
        ]
      }
    });
    expect(infos).toHaveLength(1);
    expect(infos[0]).toContain('2 resources that cost nothing: ApiService, StpVpc');
    expect(infos[0]).toContain('A deploy of this stage waits');
    expect(infos[0]).toContain('next delete retries');
  });
});
