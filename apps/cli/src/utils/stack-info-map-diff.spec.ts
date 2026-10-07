import { expect, test } from 'bun:test';
import { diffTemplate, ResourceImpact } from '@aws-cdk/cloudformation-diff';
import type { KnownCloudFormationResourceType } from '@stacktape/cloudformation/resource';
import type { StackInfoMap } from '@domain-services/stack-info/types';
import { getCriticalResourcesPotentiallyEndangeredByOperation } from './stack-info-map-diff';

const stackInfoMap = ({ withDsql }: { withDsql: boolean }): StackInfoMap => ({
  metadata: {},
  customOutputs: {},
  resources: withDsql
    ? {
        database: {
          resourceType: 'dsql-database',
          referencableParams: {},
          cloudformationChildResources: {
            DatabaseDsqlCluster: { cloudformationResourceType: 'AWS::DSQL::Cluster' }
          },
          links: {},
          outputs: {}
        }
      }
    : {}
});

test('treats removal of an Aurora DSQL cluster as a protected-resource risk', () => {
  const oldTemplate = {
    Resources: {
      DatabaseDsqlCluster: {
        Type: 'AWS::DSQL::Cluster',
        Properties: { DeletionProtectionEnabled: false }
      }
    }
  };
  const newTemplate = { Resources: {} };

  expect(
    getCriticalResourcesPotentiallyEndangeredByOperation({
      calculatedStackInfoMap: stackInfoMap({ withDsql: false }),
      deployedStackInfoMap: stackInfoMap({ withDsql: true }),
      cfTemplateDiff: diffTemplate(oldTemplate, newTemplate)
    })
  ).toEqual([
    {
      stpResourceName: 'database',
      resourceType: 'dsql-database',
      impactedCfResources: {
        DatabaseDsqlCluster: {
          cfResourceType: 'AWS::DSQL::Cluster',
          impact: ResourceImpact.WILL_DESTROY
        }
      }
    }
  ]);
});

/**
 * Every CloudFormation resource type that holds customer data must be protected: a replacement loses the data even
 * when the stack update itself succeeds. Each case replaces the resource through a change to a property that
 * CloudFormation documents as requiring replacement.
 */
const statefulReplacementCases: {
  stpResourceType: string;
  cfResourceType: KnownCloudFormationResourceType;
  before: Record<string, unknown>;
  /** Omitted: the resource disappears from the template instead, which destroys it. */
  after?: Record<string, unknown>;
}[] = [
  {
    stpResourceType: 'redis-cluster',
    cfResourceType: 'AWS::ElastiCache::ReplicationGroup',
    before: { ReplicationGroupId: 'cache-a', ReplicationGroupDescription: 'cache' },
    after: { ReplicationGroupId: 'cache-b', ReplicationGroupDescription: 'cache' }
  },
  {
    stpResourceType: 'sqs-queue',
    cfResourceType: 'AWS::SQS::Queue',
    before: { QueueName: 'jobs-a' },
    after: { QueueName: 'jobs-b' }
  },
  {
    stpResourceType: 'kinesis-stream',
    cfResourceType: 'AWS::Kinesis::Stream',
    before: { Name: 'clicks-a', ShardCount: 1 },
    after: { Name: 'clicks-b', ShardCount: 1 }
  },
  {
    stpResourceType: 'relational-database',
    cfResourceType: 'AWS::RDS::DBInstance',
    before: { DBInstanceIdentifier: 'db-a', Engine: 'postgres' },
    after: { DBInstanceIdentifier: 'db-b', Engine: 'postgres' }
  },
  {
    stpResourceType: 'bucket',
    cfResourceType: 'AWS::S3::Bucket',
    before: { BucketName: 'files-a' },
    after: { BucketName: 'files-b' }
  },
  {
    stpResourceType: 'efs-filesystem',
    cfResourceType: 'AWS::EFS::FileSystem',
    before: { Encrypted: true },
    after: { Encrypted: false }
  },
  {
    stpResourceType: 'user-auth-pool',
    cfResourceType: 'AWS::Cognito::UserPool',
    before: { UsernameAttributes: ['email'] }
  }
];

for (const { stpResourceType, cfResourceType, before, after } of statefulReplacementCases) {
  const expectedImpact = after ? ResourceImpact.WILL_REPLACE : ResourceImpact.WILL_DESTROY;
  test(`treats ${after ? 'replacement' : 'removal'} of ${cfResourceType} as a protected-resource risk`, () => {
    const logicalId = 'DataResource';
    const infoMap = (): StackInfoMap => ({
      metadata: {},
      customOutputs: {},
      resources: {
        data: {
          resourceType: stpResourceType as StackInfoMap['resources'][string]['resourceType'],
          referencableParams: {},
          cloudformationChildResources: {
            [logicalId]: { cloudformationResourceType: cfResourceType }
          },
          links: {},
          outputs: {}
        }
      }
    });
    const cfTemplateDiff = diffTemplate(
      { Resources: { [logicalId]: { Type: cfResourceType, Properties: before } } },
      { Resources: after ? { [logicalId]: { Type: cfResourceType, Properties: after } } : {} }
    );
    expect(cfTemplateDiff.resources.get(logicalId).changeImpact).toBe(expectedImpact);

    expect(
      getCriticalResourcesPotentiallyEndangeredByOperation({
        calculatedStackInfoMap: infoMap(),
        deployedStackInfoMap: infoMap(),
        cfTemplateDiff
      })
    ).toEqual([
      {
        stpResourceName: 'data',
        resourceType: stpResourceType,
        impactedCfResources: { [logicalId]: { cfResourceType, impact: expectedImpact } }
      }
    ]);
  });
}
