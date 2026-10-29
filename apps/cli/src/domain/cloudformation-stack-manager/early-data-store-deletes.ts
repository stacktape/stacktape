import type { DBInstance } from '@aws-sdk/client-rds';
import type { CloudFormationTemplate } from '@stacktape/cloudformation/resource';
import { cfLogicalNames } from '@stacktape/naming/cloudformation-logical-names';
import { awsSdkManager } from '@utils/aws-sdk-manager';

/**
 * Databases, caches and search domains take minutes to delete, and CloudFormation starts deleting one only after every workload that
 * references its endpoint is gone. On a stack delete that order protects nothing, so once CloudFormation has accepted
 * the DeleteStack request, `delete` starts these deletes itself and CloudFormation finds them already deleting or gone.
 *
 * A resource qualifies only when CloudFormation would delete it the same way: its DeletionPolicy deletes it without a
 * snapshot, AWS deletion protection is off, and it is not part of a read-replica or global setup. Anything else stays
 * with CloudFormation. Nothing qualifies in a stack that runs user code while it is being deleted (a `before:delete`
 * deployment script or a custom resource of the user's own): that code may still need to read or export the data.
 */
export type EarlyDataStoreDelete =
  | {
      kind: 'rds-instance';
      logicalId: string;
      instanceId: string;
      /** The deployed template's `DeleteAutomatedBackups`; CloudFormation passes it to the delete. */
      deleteAutomatedBackups?: boolean;
    }
  | {
      /** Deleting the instances leaves the data in the cluster, which CloudFormation deletes as before. */
      kind: 'aurora-instance';
      logicalId: string;
      instanceId: string;
      clusterId: string;
    }
  | { kind: 'elasticache-replication-group'; logicalId: string; replicationGroupId: string }
  | { kind: 'elasticache-serverless-cache'; logicalId: string; serverlessCacheName: string }
  | { kind: 'opensearch-domain'; logicalId: string; domainName: string };

type StackResource = { LogicalResourceId?: string; ResourceType?: string; PhysicalResourceId?: string };
type TemplateResource = {
  Type?: string;
  DeletionPolicy?: unknown;
  Properties?: Record<string, unknown>;
};

const refTarget = (value: unknown) =>
  value && typeof value === 'object' && 'Ref' in value && typeof value.Ref === 'string' ? value.Ref : undefined;

/**
 * Custom resources of Stacktape's own service function run no user code on delete, except `before:delete` deployment
 * scripts. Every other custom resource is the user's, with a Delete handler that can do anything.
 */
const runsUserCodeOnDelete = ({ Type, Properties }: TemplateResource) => {
  if (Type !== 'AWS::CloudFormation::CustomResource' && !Type?.startsWith('Custom::')) return false;
  const serviceToken = Properties?.ServiceToken as { 'Fn::GetAtt'?: unknown } | undefined;
  const getAtt = serviceToken?.['Fn::GetAtt'];
  const target = Array.isArray(getAtt) ? getAtt[0] : typeof getAtt === 'string' ? getAtt.split('.')[0] : undefined;
  const isStacktapeService = target === cfLogicalNames.lambda('stacktapeServiceLambda', true);
  const scriptFunction = Properties?.scriptFunction as { triggerType?: unknown } | undefined;
  return !isStacktapeService || scriptFunction?.triggerType === 'before:delete';
};

/** The deployed template's resources that CloudFormation can delete early, from the template alone. */
export const planEarlyDataStoreDeletes = ({
  resources,
  template
}: {
  resources: StackResource[];
  template: Pick<CloudFormationTemplate, 'Resources'> | undefined;
}): EarlyDataStoreDelete[] => {
  const templateResources = (template?.Resources || {}) as Record<string, TemplateResource>;
  if (Object.values(templateResources).some(runsUserCodeOnDelete)) return [];
  const physicalIds = new Map(
    resources
      .filter(({ LogicalResourceId, PhysicalResourceId }) => LogicalResourceId && PhysicalResourceId)
      .map(({ LogicalResourceId, PhysicalResourceId }) => [LogicalResourceId, PhysicalResourceId])
  );
  const replicaSources = new Set(
    Object.values(templateResources)
      .filter(({ Type }) => Type === 'AWS::RDS::DBInstance')
      .map(({ Properties }) => Properties?.SourceDBInstanceIdentifier)
      .filter((source) => source !== undefined)
      .map((source) => refTarget(source) ?? '*')
  );

  return resources.flatMap(
    ({ LogicalResourceId: logicalId, ResourceType, PhysicalResourceId }): EarlyDataStoreDelete[] => {
      const deployed = logicalId ? templateResources[logicalId] : undefined;
      if (!logicalId || !PhysicalResourceId || !deployed || deployed.Type !== ResourceType) return [];
      const properties = deployed.Properties || {};

      if (ResourceType === 'AWS::RDS::DBInstance') {
        const clusterLogicalId = refTarget(properties.DBClusterIdentifier);
        if (properties.DBClusterIdentifier !== undefined) {
          // An Aurora instance. CloudFormation deletes it without a snapshot unless its own policy says otherwise; the
          // cluster's policy (default Snapshot) decides about the data, so it must be an explicit Delete as well.
          const cluster = clusterLogicalId ? templateResources[clusterLogicalId] : undefined;
          const clusterId = clusterLogicalId && physicalIds.get(clusterLogicalId);
          if (
            !cluster ||
            !clusterId ||
            cluster.Type !== 'AWS::RDS::DBCluster' ||
            cluster.DeletionPolicy !== 'Delete' ||
            cluster.Properties?.GlobalClusterIdentifier !== undefined ||
            (deployed.DeletionPolicy !== undefined && deployed.DeletionPolicy !== 'Delete')
          ) {
            return [];
          }
          return [{ kind: 'aurora-instance', logicalId, instanceId: PhysicalResourceId, clusterId }];
        }
        // A standalone instance's default policy is Snapshot, so only an explicit Delete means no final snapshot.
        const deleteAutomatedBackups = properties.DeleteAutomatedBackups;
        if (
          deployed.DeletionPolicy !== 'Delete' ||
          properties.SourceDBInstanceIdentifier !== undefined ||
          replicaSources.has(logicalId) ||
          replicaSources.has('*') ||
          (deleteAutomatedBackups !== undefined && typeof deleteAutomatedBackups !== 'boolean')
        ) {
          return [];
        }
        return [
          {
            kind: 'rds-instance',
            logicalId,
            instanceId: PhysicalResourceId,
            ...(typeof deleteAutomatedBackups === 'boolean' && { deleteAutomatedBackups })
          }
        ];
      }

      if (ResourceType === 'AWS::ElastiCache::ReplicationGroup') {
        // The default policy is Delete, without a final snapshot.
        if (
          (deployed.DeletionPolicy !== undefined && deployed.DeletionPolicy !== 'Delete') ||
          properties.GlobalReplicationGroupId !== undefined
        ) {
          return [];
        }
        return [{ kind: 'elasticache-replication-group', logicalId, replicationGroupId: PhysicalResourceId }];
      }

      if (ResourceType === 'AWS::ElastiCache::ServerlessCache') {
        // The default policy is Delete; a final snapshot is taken only when `FinalSnapshotName` is set.
        if (
          (deployed.DeletionPolicy !== undefined && deployed.DeletionPolicy !== 'Delete') ||
          properties.FinalSnapshotName !== undefined
        ) {
          return [];
        }
        return [{ kind: 'elasticache-serverless-cache', logicalId, serverlessCacheName: PhysicalResourceId }];
      }

      if (ResourceType === 'AWS::OpenSearchService::Domain') {
        // The default policy is Delete; OpenSearch domains support no Snapshot policy.
        if (deployed.DeletionPolicy !== undefined && deployed.DeletionPolicy !== 'Delete') return [];
        return [{ kind: 'opensearch-domain', logicalId, domainName: PhysicalResourceId }];
      }
      return [];
    }
  );
};

export const describeEarlyDataStoreDelete = (item: EarlyDataStoreDelete) => {
  if (item.kind === 'elasticache-replication-group') {
    return `${item.logicalId} (ElastiCache replication group ${item.replicationGroupId})`;
  }
  if (item.kind === 'elasticache-serverless-cache') {
    return `${item.logicalId} (ElastiCache serverless cache ${item.serverlessCacheName})`;
  }
  if (item.kind === 'opensearch-domain') {
    return `${item.logicalId} (OpenSearch domain ${item.domainName})`;
  }
  return `${item.logicalId} (${item.kind === 'aurora-instance' ? 'Aurora DB instance' : 'RDS DB instance'} ${item.instanceId})`;
};

const isStandaloneInstanceDeletable = (instance: DBInstance | undefined) =>
  !!instance &&
  (instance.DBInstanceStatus === 'available' || instance.DBInstanceStatus === 'stopped') &&
  !instance.DeletionProtection &&
  !instance.DBClusterIdentifier &&
  !instance.ReadReplicaSourceDBInstanceIdentifier &&
  !instance.ReadReplicaDBInstanceIdentifiers?.length &&
  !instance.ReadReplicaDBClusterIdentifiers?.length;

/**
 * Checks each planned resource's current state in AWS and starts deleting the ones that still qualify. Resolves to the
 * resources whose deletion this call started. Best effort: a resource it cannot check or delete stays with
 * CloudFormation, which deletes it as before.
 */
export const startEarlyDataStoreDeletes = async ({
  items,
  onDebug
}: {
  items: EarlyDataStoreDelete[];
  onDebug: (message: string) => void;
}) => {
  const started: EarlyDataStoreDelete[] = [];
  await Promise.all(
    items.map(async (item) => {
      try {
        if (item.kind === 'rds-instance') {
          const instance = await awsSdkManager.rds.getInstance({ identifier: item.instanceId });
          if (!isStandaloneInstanceDeletable(instance)) {
            onDebug(
              `Leaving ${describeEarlyDataStoreDelete(item)} to CloudFormation: its current state does not allow it.`
            );
            return;
          }
          await awsSdkManager.rds.deleteInstance({
            identifier: item.instanceId,
            skipFinalSnapshot: true,
            deleteAutomatedBackups: item.deleteAutomatedBackups
          });
        } else if (item.kind === 'aurora-instance') {
          const [cluster, instance] = await Promise.all([
            awsSdkManager.rds.getCluster({ identifier: item.clusterId }),
            awsSdkManager.rds.getInstance({ identifier: item.instanceId })
          ]);
          if (
            !cluster ||
            cluster.DeletionProtection ||
            cluster.Status !== 'available' ||
            !instance ||
            instance.DBClusterIdentifier !== item.clusterId ||
            instance.DBInstanceStatus !== 'available' ||
            instance.DeletionProtection
          ) {
            onDebug(
              `Leaving ${describeEarlyDataStoreDelete(item)} to CloudFormation: its current state does not allow it.`
            );
            return;
          }
          await awsSdkManager.rds.deleteInstance({ identifier: item.instanceId });
        } else if (item.kind === 'opensearch-domain') {
          const domain = await awsSdkManager.openSearch.getDomain({ domainName: item.domainName });
          if (!domain || domain.Deleted || domain.Processing || domain.UpgradeProcessing) {
            onDebug(
              `Leaving ${describeEarlyDataStoreDelete(item)} to CloudFormation: its current state does not allow it.`
            );
            return;
          }
          await awsSdkManager.openSearch.deleteDomain({ domainName: item.domainName });
        } else if (item.kind === 'elasticache-serverless-cache') {
          const cache = await awsSdkManager.elastiCache.getServerlessCache({
            serverlessCacheName: item.serverlessCacheName
          });
          if (!cache || cache.Status !== 'available') {
            onDebug(
              `Leaving ${describeEarlyDataStoreDelete(item)} to CloudFormation: its current state does not allow it.`
            );
            return;
          }
          await awsSdkManager.elastiCache.deleteServerlessCache({ serverlessCacheName: item.serverlessCacheName });
        } else {
          const group = await awsSdkManager.elastiCache.getReplicationGroup({
            replicationGroupId: item.replicationGroupId
          });
          if (!group || group.Status !== 'available' || group.GlobalReplicationGroupInfo?.GlobalReplicationGroupId) {
            onDebug(
              `Leaving ${describeEarlyDataStoreDelete(item)} to CloudFormation: its current state does not allow it.`
            );
            return;
          }
          await awsSdkManager.elastiCache.deleteReplicationGroup({ replicationGroupId: item.replicationGroupId });
        }
        started.push(item);
      } catch (err) {
        // Includes a resource that CloudFormation started deleting first, and missing permissions.
        onDebug(`Leaving ${describeEarlyDataStoreDelete(item)} to CloudFormation: ${err}`);
      }
    })
  );
  return started;
};
