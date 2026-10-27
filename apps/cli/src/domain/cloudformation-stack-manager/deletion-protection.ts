import type { CloudFormationTemplate } from '@stacktape/cloudformation/resource';
import type { EnrichedStackResourceInfo } from './types';
import { ExpectedError } from '@utils/errors';

export type DeletionProtectedResource = { logicalId: string; resourceType: string; physicalId: string };

type TemplateResource = { Type?: string; DeletionPolicy?: unknown; Properties?: Record<string, unknown> };

const refTarget = (value: unknown) =>
  value && typeof value === 'object' && 'Ref' in value && typeof value.Ref === 'string' ? value.Ref : undefined;

const isOn = (value: unknown) => value === true || value === 'true';

/**
 * The deployed resources that deletion protection keeps CloudFormation from deleting with the stack. `delete` refuses
 * to start while any exists, because everything it does first (emptying buckets, scaling services down, deleting the
 * other resources) cannot be undone, and the stack would end in DELETE_FAILED with the protected resource left.
 *
 * For an RDS instance or Aurora cluster, the state AWS reports decides. When it could not be read, the deployed
 * template decides: Stacktape's deletion-protection custom resource for it (`deletionProtection: true`) or its own
 * `DeletionProtection` property. Other resource types count when the deployed template sets `DeletionProtection` or
 * `DeletionProtectionEnabled` (for example DSQL clusters, or DynamoDB tables in `cloudformationResources`).
 *
 * The template of a stack whose delete failed can no longer change, so protection turned off in AWS afterwards would
 * not show in it. For such a stack only the state AWS reports counts. A resource that CloudFormation keeps
 * (`DeletionPolicy: Retain`) is not deleted, so it never counts.
 */
export const findDeletionProtectedResources = ({
  resources,
  template,
  stackStatus
}: {
  resources: EnrichedStackResourceInfo[];
  template: Pick<CloudFormationTemplate, 'Resources'> | undefined;
  stackStatus: string | undefined;
}): DeletionProtectedResource[] => {
  const templateIsCurrent = stackStatus !== 'DELETE_FAILED';
  const templateResources = (template?.Resources || {}) as Record<string, TemplateResource>;
  const protectedByStacktape = new Set(
    Object.values(templateResources).flatMap(({ Properties }) => {
      const target = Properties?.setDatabaseDeletionProtection as
        | { instanceId?: unknown; clusterId?: unknown }
        | undefined;
      return [refTarget(target?.instanceId), refTarget(target?.clusterId)].filter((id) => id !== undefined);
    })
  );
  return resources.flatMap(
    ({ LogicalResourceId, ResourceType, PhysicalResourceId, rdsInstanceDetail, auroraClusterDetail }) => {
      if (!LogicalResourceId || !ResourceType || !PhysicalResourceId) return [];
      const deployed = templateResources[LogicalResourceId];
      if (deployed?.DeletionPolicy === 'Retain' || deployed?.DeletionPolicy === 'RetainExceptOnCreate') return [];
      const properties = deployed?.Properties || {};
      const live =
        ResourceType === 'AWS::RDS::DBInstance'
          ? rdsInstanceDetail
          : ResourceType === 'AWS::RDS::DBCluster'
            ? auroraClusterDetail
            : undefined;
      const isProtected = live
        ? !!live.DeletionProtection
        : templateIsCurrent &&
          (protectedByStacktape.has(LogicalResourceId) ||
            isOn(properties.DeletionProtection) ||
            isOn(properties.DeletionProtectionEnabled) ||
            (ResourceType === 'AWS::Cognito::UserPool' && properties.DeletionProtection === 'ACTIVE'));
      return isProtected
        ? [{ logicalId: LogicalResourceId, resourceType: ResourceType, physicalId: PhysicalResourceId }]
        : [];
    }
  );
};

/** The error `delete` stops with, before it has changed anything. */
export const getDeletionProtectionError = ({
  stackName,
  stackStatus,
  resources
}: {
  stackName: string;
  stackStatus: string | undefined;
  resources: DeletionProtectedResource[];
}) => {
  const list = resources
    .map(({ logicalId, resourceType, physicalId }) => `- ${logicalId} (${resourceType} ${physicalId})`)
    .join('\n');
  // CloudFormation does not update a stack whose delete failed, so the protection must be turned off in AWS directly.
  const hint =
    stackStatus === 'DELETE_FAILED'
      ? [
          'The stack failed to delete before, so it cannot be deployed again. Turn deletion protection off in AWS, for example with `aws rds modify-db-instance --db-instance-identifier <id> --no-deletion-protection --apply-immediately` (`modify-db-cluster --db-cluster-identifier` for Aurora), then run `stacktape delete` again.'
        ]
      : [
          'Deploy the stack with `deletionProtection: false` on these resources, then run `stacktape delete` again.',
          'For a resource in `cloudformationResources`, set its `DeletionProtection` or `DeletionProtectionEnabled` property to false.'
        ];
  return new ExpectedError(
    'STACK',
    `Unable to delete stack "${stackName}". Deletion protection is on for:\n${list}\nNothing was deleted.`,
    hint
  );
};
