import { describe, expect, test } from 'bun:test';
import type { AutoScaling } from '@aws-sdk/client-auto-scaling';
import { DescribeAutoScalingGroupsCommand } from '@aws-sdk/client-auto-scaling';
import type { OpenSearchClient } from '@aws-sdk/client-opensearch';
import { DescribeInstanceTypeLimitsCommand } from '@aws-sdk/client-opensearch';
import type { RDSClient } from '@aws-sdk/client-rds';
import { DescribeDBClustersCommand, DescribeDBInstancesCommand } from '@aws-sdk/client-rds';
import { AwsAutoScaling } from '../../src/aws/auto-scaling';
import { AwsOpenSearch } from '../../src/aws/open-search';
import { AwsRds } from '../../src/aws/rds';

type AutoScalingSend = AutoScaling['send'];
type OpenSearchSend = OpenSearchClient['send'];
type RdsSend = RDSClient['send'];

const getErrorHandler =
  (message: string) =>
  (error: Error): never => {
    throw new Error(message, { cause: error });
  };

describe('AWS resource-detail lookups', () => {
  test('returns the first matching Auto Scaling group', async () => {
    let request: DescribeAutoScalingGroupsCommand | undefined;
    const autoScaling = new AwsAutoScaling({
      createClient: () =>
        ({
          send: (async (command: DescribeAutoScalingGroupsCommand) => {
            request = command;
            return { AutoScalingGroups: [{ AutoScalingGroupName: 'application' }] };
          }) as AutoScalingSend
        }) as AutoScaling,
      getErrorHandler
    });

    const group = await autoScaling.getGroup({ name: 'application' });

    expect(group?.AutoScalingGroupName).toBe('application');
    expect(request).toBeInstanceOf(DescribeAutoScalingGroupsCommand);
    expect(request?.input).toEqual({ AutoScalingGroupNames: ['application'] });
  });

  test('maps an OpenSearch version and instance type to the service input', async () => {
    let request: DescribeInstanceTypeLimitsCommand | undefined;
    const openSearch = new AwsOpenSearch({
      createClient: () =>
        ({
          send: (async (command: DescribeInstanceTypeLimitsCommand) => {
            request = command;
            return { LimitsByRole: { data: [] } };
          }) as OpenSearchSend
        }) as OpenSearchClient
    });

    await openSearch.getInstanceTypeLimits({ instanceType: 'm6g.large.search', openSearchVersion: '2.17' });

    expect(request).toBeInstanceOf(DescribeInstanceTypeLimitsCommand);
    expect(request?.input).toEqual({
      EngineVersion: 'OpenSearch_2.17',
      InstanceType: 'm6g.large.search'
    });
  });

  test('returns the first matching RDS instance and cluster', async () => {
    const requests: (DescribeDBClustersCommand | DescribeDBInstancesCommand)[] = [];
    const rds = new AwsRds({
      createClient: () =>
        ({
          send: (async (command: DescribeDBClustersCommand | DescribeDBInstancesCommand) => {
            requests.push(command);
            return command instanceof DescribeDBInstancesCommand
              ? { DBInstances: [{ DBInstanceIdentifier: 'database' }] }
              : { DBClusters: [{ DBClusterIdentifier: 'cluster' }] };
          }) as RdsSend
        }) as RDSClient,
      getErrorHandler
    });

    await expect(rds.getInstance({ identifier: 'database' })).resolves.toEqual({
      DBInstanceIdentifier: 'database'
    });
    await expect(rds.getCluster({ identifier: 'cluster' })).resolves.toEqual({
      DBClusterIdentifier: 'cluster'
    });
    expect(requests.map(({ input }) => input)).toEqual([
      { DBInstanceIdentifier: 'database' },
      { DBClusterIdentifier: 'cluster' }
    ]);
  });
});
