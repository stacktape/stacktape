import type { ElastiCacheClient } from '@aws-sdk/client-elasticache';
import { DeleteReplicationGroupCommand, DescribeReplicationGroupsCommand } from '@aws-sdk/client-elasticache';

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
}
