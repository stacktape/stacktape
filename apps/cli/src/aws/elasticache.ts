import type { ElastiCacheClient } from '@aws-sdk/client-elasticache';
import {
  DeleteReplicationGroupCommand,
  DescribeReplicationGroupsCommand,
  DescribeServerlessCachesCommand
} from '@aws-sdk/client-elasticache';

export class AwsElastiCache {
  readonly #createClient: () => ElastiCacheClient;

  constructor({ createClient }: { createClient: () => ElastiCacheClient }) {
    this.#createClient = createClient;
  }

  getReplicationGroup = async ({ replicationGroupId }: { replicationGroupId: string }) => {
    const response = await this.#createClient().send(
      new DescribeReplicationGroupsCommand({ ReplicationGroupId: replicationGroupId })
    );
    return response.ReplicationGroups?.[0];
  };

  /** Whether the replication group still exists. A group that is being deleted still exists. */
  replicationGroupExists = async ({ replicationGroupId }: { replicationGroupId: string }) => {
    try {
      return !!(await this.getReplicationGroup({ replicationGroupId }));
    } catch (error) {
      if (error instanceof Error && error.name === 'ReplicationGroupNotFoundFault') return false;
      throw error;
    }
  };

  /**
   * Starts deleting a replication group and its clusters, without a final snapshot, and returns at once. AWS errors are
   * passed through unchanged.
   */
  deleteReplicationGroup = async ({ replicationGroupId }: { replicationGroupId: string }) => {
    const response = await this.#createClient().send(
      new DeleteReplicationGroupCommand({ ReplicationGroupId: replicationGroupId })
    );
    return response.ReplicationGroup;
  };

  /** Whether the serverless cache still exists. A cache that is being deleted still exists. */
  serverlessCacheExists = async ({ serverlessCacheName }: { serverlessCacheName: string }) => {
    try {
      const response = await this.#createClient().send(
        new DescribeServerlessCachesCommand({ ServerlessCacheName: serverlessCacheName })
      );
      return !!response.ServerlessCaches?.length;
    } catch (error) {
      if (error instanceof Error && error.name === 'ServerlessCacheNotFoundFault') return false;
      throw error;
    }
  };
}
