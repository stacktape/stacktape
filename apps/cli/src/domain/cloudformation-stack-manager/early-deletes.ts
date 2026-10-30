import type { DBInstance } from '@aws-sdk/client-rds';
import type { CloudFormationTemplate } from '@stacktape/cloudformation/resource';
import { cfLogicalNames } from '@stacktape/naming/cloudformation-logical-names';
import { awsSdkManager } from '@utils/aws-sdk-manager';

/**
 * Databases, caches, search domains and load balancers take minutes to delete, and CloudFormation starts deleting one
 * only after every workload that references it is gone (an ECS service takes 2-3 minutes). A DynamoDB table deletes in
 * seconds, but a container's task definition references it, so it waits for the ECS service as well. A function URL
 * waits for the distribution in front of it, and keeps running the function for direct callers until then. On a stack
 * delete that order protects nothing, so once CloudFormation has started deleting the stack's resources, `delete` starts
 * these deletes itself and CloudFormation finds them already deleting or gone (measured for DynamoDB tables in both
 * states).
 *
 * A resource qualifies only when CloudFormation would delete it the same way: its DeletionPolicy deletes it without a
 * snapshot, AWS deletion protection is off, and it is not part of a read-replica or global setup. Anything else stays
 * with CloudFormation. Nothing qualifies in a stack that runs user code while it is being deleted (a `before:delete`
 * deployment script or a custom resource of the user's own): that code may still need to read or export the data, or
 * call the application through its load balancer or function URL.
 */
export type EarlyDelete =
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
  | { kind: 'opensearch-domain'; logicalId: string; domainName: string }
  /** A DynamoDB table in this region only; tables with replicas in other regions stay with CloudFormation. */
  | { kind: 'dynamodb-table'; logicalId: string; tableName: string }
  /** Deleting a load balancer deletes its listeners and rules too. Its target groups stay with CloudFormation. */
  | { kind: 'load-balancer'; logicalId: string; loadBalancerArn: string }
  /**
   * A function URL runs the function for anyone who calls it. CloudFormation deletes one only after the distribution in
   * front of it, minutes later.
   */
  | { kind: 'function-url'; logicalId: string; functionArn: string };

/** Load balancers and function URLs hold no data; a failed stack delete that already removed one loses nothing. */
export const isDataStoreDelete = (item: EarlyDelete) => item.kind !== 'load-balancer' && item.kind !== 'function-url';

/** The function name and alias of a function URL's physical ID, the (possibly qualified) function ARN. */
export const functionUrlTarget = (functionArn: string) => {
  const [functionName, qualifier] = functionArn.split(':').slice(6);
  return { functionName: functionArn.split(':').slice(0, 7).join(':'), qualifier, name: functionName };
};

type StackResource = { LogicalResourceId?: string; ResourceType?: string; PhysicalResourceId?: string };
type TemplateResource = {
  Type?: string;
  DeletionPolicy?: unknown;
  Properties?: Record<string, unknown>;
};

const refTarget = (value: unknown) =>
  value && typeof value === 'object' && 'Ref' in value && typeof value.Ref === 'string' ? value.Ref : undefined;

/** The logical IDs a template value references through `Ref`, `Fn::GetAtt` or `Fn::Sub`. */
const referencedLogicalIds = (value: unknown, found = new Set<string>()): Set<string> => {
  if (Array.isArray(value)) {
    for (const item of value) referencedLogicalIds(item, found);
  } else if (value && typeof value === 'object') {
    for (const [key, nested] of Object.entries(value)) {
      if (key === 'Ref' && typeof nested === 'string') found.add(nested);
      else if (key === 'Fn::GetAtt') {
        const target = Array.isArray(nested)
          ? nested[0]
          : typeof nested === 'string'
            ? nested.split('.')[0]
            : undefined;
        if (typeof target === 'string') found.add(target);
        else referencedLogicalIds(nested, found);
      } else if (key === 'Fn::Sub') {
        const [text, variables] = Array.isArray(nested) ? nested : [nested];
        if (typeof text === 'string') {
          for (const [, name] of text.matchAll(/\$\{([^}.!]+)[^}]*\}/g)) found.add(name);
        }
        referencedLogicalIds(variables, found);
      } else referencedLogicalIds(nested, found);
    }
  }
  return found;
};

/**
 * Resources CloudFormation deletes without an error when the load balancer is already gone: measured for listeners,
 * listener rules, listener certificates and firewall associations; the others do not call the load balancer on delete.
 * Any other resource that references the load balancer or one of its listeners keeps the load balancer with
 * CloudFormation.
 */
const DELETED_SAFELY_WITHOUT_LOAD_BALANCER = new Set([
  'AWS::ElasticLoadBalancingV2::Listener',
  'AWS::ElasticLoadBalancingV2::ListenerRule',
  'AWS::ElasticLoadBalancingV2::ListenerCertificate',
  'AWS::WAFv2::WebACLAssociation',
  'AWS::Route53::RecordSet',
  'AWS::Route53::RecordSetGroup',
  'AWS::CloudWatch::Alarm',
  'AWS::Lambda::Function',
  'AWS::ECS::TaskDefinition',
  'AWS::CloudFront::Distribution',
  'AWS::ApiGatewayV2::Integration',
  'AWS::CloudFormation::CustomResource'
]);

const loadBalancerDeletesSafely = (logicalId: string, templateResources: Record<string, TemplateResource>) => {
  const listeners = Object.entries(templateResources)
    .filter(
      ([, { Type, Properties }]) =>
        Type === 'AWS::ElasticLoadBalancingV2::Listener' && referencedLogicalIds(Properties).has(logicalId)
    )
    .map(([listenerId]) => listenerId);
  const owned = new Set([logicalId, ...listeners]);
  return Object.entries(templateResources).every(
    ([otherId, { Type, Properties }]) =>
      owned.has(otherId) ||
      ![...referencedLogicalIds(Properties)].some((id) => owned.has(id)) ||
      (Type !== undefined && (DELETED_SAFELY_WITHOUT_LOAD_BALANCER.has(Type) || Type.startsWith('Custom::')))
  );
};

/**
 * Custom resources of Stacktape's own service function run no user code on delete, except `before:delete` deployment
 * scripts. Every other custom resource is the user's, with a Delete handler that can do anything.
 */
export const runsUserCodeOnDelete = ({ Type, Properties }: TemplateResource) => {
  if (Type !== 'AWS::CloudFormation::CustomResource' && !Type?.startsWith('Custom::')) return false;
  const serviceToken = Properties?.ServiceToken as { 'Fn::GetAtt'?: unknown } | undefined;
  const getAtt = serviceToken?.['Fn::GetAtt'];
  const target = Array.isArray(getAtt) ? getAtt[0] : typeof getAtt === 'string' ? getAtt.split('.')[0] : undefined;
  const isStacktapeService = target === cfLogicalNames.lambda('stacktapeServiceLambda', true);
  const scriptFunction = Properties?.scriptFunction as { triggerType?: unknown } | undefined;
  return !isStacktapeService || scriptFunction?.triggerType === 'before:delete';
};

/** The deployed template's resources that CloudFormation can delete early, from the template alone. */
export const planEarlyDeletes = ({
  resources,
  template
}: {
  resources: StackResource[];
  template: Pick<CloudFormationTemplate, 'Resources'> | undefined;
}): EarlyDelete[] => {
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

  return resources.flatMap(({ LogicalResourceId: logicalId, ResourceType, PhysicalResourceId }): EarlyDelete[] => {
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

    if (ResourceType === 'AWS::OpenSearchService::Domain') {
      // The default policy is Delete; OpenSearch domains support no Snapshot policy.
      if (deployed.DeletionPolicy !== undefined && deployed.DeletionPolicy !== 'Delete') return [];
      return [{ kind: 'opensearch-domain', logicalId, domainName: PhysicalResourceId }];
    }

    if (ResourceType === 'AWS::DynamoDB::Table' || ResourceType === 'AWS::DynamoDB::GlobalTable') {
      // The default policy is Delete, without a backup. A global table with replicas in other regions stays with
      // CloudFormation, which removes the replicas first; so does a table with deletion protection.
      const replicas = properties.Replicas;
      const unprotected = (value: unknown) => value === undefined || value === false;
      if (
        (deployed.DeletionPolicy !== undefined && deployed.DeletionPolicy !== 'Delete') ||
        !unprotected(properties.DeletionProtectionEnabled) ||
        (ResourceType === 'AWS::DynamoDB::GlobalTable' &&
          (!Array.isArray(replicas) ||
            replicas.length !== 1 ||
            !unprotected((replicas[0] as { DeletionProtectionEnabled?: unknown })?.DeletionProtectionEnabled)))
      ) {
        return [];
      }
      return [{ kind: 'dynamodb-table', logicalId, tableName: PhysicalResourceId }];
    }

    if (ResourceType === 'AWS::ElasticLoadBalancingV2::LoadBalancer') {
      // The default policy is Delete.
      if (
        (deployed.DeletionPolicy !== undefined && deployed.DeletionPolicy !== 'Delete') ||
        !loadBalancerDeletesSafely(logicalId, templateResources)
      ) {
        return [];
      }
      return [{ kind: 'load-balancer', logicalId, loadBalancerArn: PhysicalResourceId }];
    }

    if (ResourceType === 'AWS::Lambda::Url') {
      // The default policy is Delete.
      if (deployed.DeletionPolicy !== undefined && deployed.DeletionPolicy !== 'Delete') return [];
      return [{ kind: 'function-url', logicalId, functionArn: PhysicalResourceId }];
    }
    return [];
  });
};

export const describeEarlyDelete = (item: EarlyDelete) => {
  if (item.kind === 'function-url') {
    return `${item.logicalId} (URL of function ${functionUrlTarget(item.functionArn).name})`;
  }
  if (item.kind === 'load-balancer') {
    return `${item.logicalId} (load balancer ${item.loadBalancerArn.split('/').slice(-2, -1)[0]})`;
  }
  if (item.kind === 'elasticache-replication-group') {
    return `${item.logicalId} (ElastiCache replication group ${item.replicationGroupId})`;
  }
  if (item.kind === 'opensearch-domain') {
    return `${item.logicalId} (OpenSearch domain ${item.domainName})`;
  }
  if (item.kind === 'dynamodb-table') {
    return `${item.logicalId} (DynamoDB table ${item.tableName})`;
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
export const startEarlyDeletes = async ({
  items,
  onDebug
}: {
  items: EarlyDelete[];
  onDebug: (message: string) => void;
}) => {
  const started: EarlyDelete[] = [];
  await Promise.all(
    items.map(async (item) => {
      try {
        if (item.kind === 'rds-instance') {
          const instance = await awsSdkManager.rds.getInstance({ identifier: item.instanceId });
          if (!isStandaloneInstanceDeletable(instance)) {
            onDebug(`Leaving ${describeEarlyDelete(item)} to CloudFormation: its current state does not allow it.`);
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
            onDebug(`Leaving ${describeEarlyDelete(item)} to CloudFormation: its current state does not allow it.`);
            return;
          }
          await awsSdkManager.rds.deleteInstance({ identifier: item.instanceId });
        } else if (item.kind === 'function-url') {
          const { functionName, qualifier } = functionUrlTarget(item.functionArn);
          if (!(await awsSdkManager.lambda.functionUrlExists({ functionName, qualifier }))) {
            onDebug(`Leaving ${describeEarlyDelete(item)} to CloudFormation: it no longer exists.`);
            return;
          }
          await awsSdkManager.lambda.deleteFunctionUrl({ functionName, qualifier });
        } else if (item.kind === 'load-balancer') {
          const loadBalancer = await awsSdkManager.loadBalancers.getLoadBalancer({
            loadBalancerArn: item.loadBalancerArn
          });
          if (!loadBalancer || loadBalancer.deletionProtection) {
            onDebug(`Leaving ${describeEarlyDelete(item)} to CloudFormation: its current state does not allow it.`);
            return;
          }
          await awsSdkManager.loadBalancers.deleteLoadBalancer({ loadBalancerArn: item.loadBalancerArn });
        } else if (item.kind === 'dynamodb-table') {
          const table = await awsSdkManager.dynamoDb.getTable({ tableName: item.tableName });
          if (
            !table ||
            table.TableStatus !== 'ACTIVE' ||
            table.DeletionProtectionEnabled ||
            table.Replicas?.length ||
            table.GlobalTableVersion
          ) {
            onDebug(`Leaving ${describeEarlyDelete(item)} to CloudFormation: its current state does not allow it.`);
            return;
          }
          await awsSdkManager.dynamoDb.deleteTable({ tableName: item.tableName });
        } else if (item.kind === 'opensearch-domain') {
          const domain = await awsSdkManager.openSearch.getDomain({ domainName: item.domainName });
          if (!domain || domain.Deleted || domain.Processing || domain.UpgradeProcessing) {
            onDebug(`Leaving ${describeEarlyDelete(item)} to CloudFormation: its current state does not allow it.`);
            return;
          }
          await awsSdkManager.openSearch.deleteDomain({ domainName: item.domainName });
        } else {
          const group = await awsSdkManager.elastiCache.getReplicationGroup({
            replicationGroupId: item.replicationGroupId
          });
          if (!group || group.Status !== 'available' || group.GlobalReplicationGroupInfo?.GlobalReplicationGroupId) {
            onDebug(`Leaving ${describeEarlyDelete(item)} to CloudFormation: its current state does not allow it.`);
            return;
          }
          await awsSdkManager.elastiCache.deleteReplicationGroup({ replicationGroupId: item.replicationGroupId });
        }
        started.push(item);
      } catch (err) {
        // Includes a resource that CloudFormation started deleting first, and missing permissions.
        onDebug(`Leaving ${describeEarlyDelete(item)} to CloudFormation: ${err}`);
      }
    })
  );
  return started;
};
