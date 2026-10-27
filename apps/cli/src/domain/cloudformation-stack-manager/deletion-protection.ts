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
 * A database counts as protected when AWS reports protection on, when the deployed template sets it, or when the
 * template contains Stacktape's deletion-protection custom resource for it (`deletionProtection: true`), so a database
 * whose details could not be read is still counted. Other resource types count when the deployed template sets
 * `DeletionProtection` or `DeletionProtectionEnabled` (for example DSQL clusters and DynamoDB tables in
 * `cloudformationResources`). A resource that CloudFormation keeps (`DeletionPolicy: Retain`) is not deleted, so it
 * does not count.
 */
export const findDeletionProtectedResources = ({
  resources,
  template
}: {
  resources: EnrichedStackResourceInfo[];
  template: Pick<CloudFormationTemplate, 'Resources'> | undefined;
}): DeletionProtectedResource[] => {
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
      const isProtected =
        protectedByStacktape.has(LogicalResourceId) ||
        isOn(properties.DeletionProtection) ||
        isOn(properties.DeletionProtectionEnabled) ||
        (ResourceType === 'AWS::Cognito::UserPool' && properties.DeletionProtection === 'ACTIVE') ||
        (ResourceType === 'AWS::RDS::DBInstance' && !!rdsInstanceDetail?.DeletionProtection) ||
        (ResourceType === 'AWS::RDS::DBCluster' && !!auroraClusterDetail?.DeletionProtection);
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
