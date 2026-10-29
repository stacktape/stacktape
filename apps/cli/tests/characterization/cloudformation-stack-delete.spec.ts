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
import { planEarlyDataStoreDeletes } from '../../src/domain/cloudformation-stack-manager/early-data-store-deletes';
import { findDeletionProtectedResources } from '../../src/domain/cloudformation-stack-manager/deletion-protection';
import { executeDeleteOperation } from '../../src/commands/delete';
import { withCredentiallessSynthesisBoundary } from './synthesis-fixture';

/**
 * `delete` starts slow AWS-side work before CloudFormation's DeleteStack: it scales ECS services to 0 and disables
 * CloudFront distributions while the buckets are being emptied, and it does not hold DeleteStack until the tasks have
 * drained. A delete that never reaches CloudFormation enables the distributions again. Once CloudFormation has accepted
 * the DeleteStack request, databases, caches and search domains that CloudFormation would delete without a snapshot are deleted at once
 * instead of after the workloads that reference them.
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
    currentTemplate,
    stackRoleArn
  }: {
    deletionPolicies?: Record<string, string>;
    properties?: Record<string, Record<string, unknown>>;
    liveInstances?: Record<string, Partial<DBInstance>>;
    liveClusters?: Record<string, Partial<DBCluster>>;
    liveReplicationGroups?: Record<string, Partial<ReplicationGroup>>;
    liveServerlessCaches?: Record<string, Partial<ServerlessCache>>;
    liveDomains?: Record<string, Partial<DomainStatus>>;
    /** The template CloudFormation reports once the delete has started, when it differs from the one loaded first. */
    currentTemplate?: unknown;
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
      spyOn(awsSdkManager.cloudFormation, 'delete').mockImplementation(async (name, { express }) => {
        calls.push(`cloudformation:delete ${name}${express ? ' (express mode)' : ''}`);
        return {} as never;
      }),
      spyOn(stackManager, 'monitorStack').mockImplementation(async () => {
        calls.push('cloudformation:monitor');
        return {};
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
      spyOn(tuiManager, 'info').mockImplementation(() => {})
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
    planEarlyDataStoreDeletes({
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
    ]
  ])('%s', (_name, resources, expected) => {
    expect(plan(resources as Parameters<typeof plan>[0])).toEqual(expected as string[]);
  });

  test('a resource missing from the deployed template is left alone', () => {
    expect(
      planEarlyDataStoreDeletes({
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
          (stackManager.monitorStack as unknown as ReturnType<typeof spyOn>).mockImplementation(async () => {
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
        (stackManager.monitorStack as unknown as ReturnType<typeof spyOn>).mockImplementation(async () => {
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
    stackStatus = 'UPDATE_COMPLETE'
  }: {
    resources: EnrichedStackResourceInfo[];
    stackStatus?: string;
  }) => {
    const calls: string[] = [];
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
        deleteStack: async () => calls.push('stack:delete'),
        existingStackDetails: { StackStatus: stackStatus },
        existingStackResources: resources
      },
      stackName: 'project-prod',
      tui: { colorize: (_color: string, text: string) => text, info: () => {}, setPendingCompletion: () => {} } as never
    }).then(
      () => undefined,
      (err: Error) => err
    );
    return { calls, error };
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
    expect(calls).toContain('stack:delete');
  });
});
