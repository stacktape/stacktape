import type { ResourcePropsFromConfig } from '@domain-services/stack-info/types';
import type { StpMongoDbAtlasCluster } from '@domain-services/config-manager/resolved-types/mongo-db-atlas-clusters';
import type {
  StpResource,
  StpResourceScopableByConnectToAffectingRole,
  StpResourceScopableByConnectToAffectingSecurityGroup,
  StpResourceType
} from '@domain-services/config-manager/resolved-types/resources';
import { CONNECT_TO_AWS_SERVICE_MACROS } from '@stacktape/config/aws-service-macros';
import { cfLogicalNames } from '@stacktape/naming/cloudformation-logical-names';
import { CliError } from '@utils/errors';
import {
  isDevCommand,
  isResourceTypeExcludedInDevMode,
  isResourceTypeLocallyEmulatable
} from '../../../commands/dev/dev-mode-utils';
import { configManager as runtimeConfigManager, type ConfigManager } from '../index';
import type { ConnectToAwsServicesMacro } from '@stacktape/config/aws-service-macros';
import { configErrors } from '../errors';

export const getPropsOfResourceReferencedInConfig = <T extends StpResourceType>({
  activeConfig = runtimeConfigManager,
  stpResourceReference,
  stpResourceType,
  referencedFrom,
  referencedFromType
}: {
  activeConfig?: Pick<ConfigManager, 'findResourceInConfig'>;
  stpResourceReference: string;
  stpResourceType?: T;
  referencedFrom: string;
  referencedFromType?: StpResourceType | 'alarm';
}): ResourcePropsFromConfig<T> => {
  const { resource, restPath, validPath, fullyResolved } = activeConfig.findResourceInConfig({
    nameChain: stpResourceReference.split('.')
  });
  if (!fullyResolved || (stpResourceType && resource.type !== stpResourceType)) {
    throw configErrors.unresolvedResourceReference({
      stpResourceName: stpResourceReference,
      stpResourceType,
      referencedFrom,
      referencedFromType,
      validResourcePath: validPath,
      invalidRestResourcePath: restPath,
      possibleNestedResources: Object.keys(resource?._nestedResources || {}),
      incorrectResourceType: stpResourceType && resource?.type !== stpResourceType
    });
  }
  return resource as ResourcePropsFromConfig<T>;
};

export const getConnectToReferencesForResource = ({
  nameChain
}: {
  nameChain: string | string[];
}): { scopingResource: StpResource; scopingCfLogicalNameOfSecurityGroup?: string }[] => {
  const resourceReferenceableName = typeof nameChain === 'string' ? nameChain : nameChain.join('.');
  const result: { scopingResource: StpResource; scopingCfLogicalNameOfSecurityGroup?: string }[] = [];
  [
    ...runtimeConfigManager.allLambdasToUpload,
    ...runtimeConfigManager.allContainerWorkloads,
    ...runtimeConfigManager.batchJobs,
    ...runtimeConfigManager.agentCoreRuntimes
  ].forEach((scopingResource) => {
    const { name, connectTo, type } = scopingResource;
    if (connectTo) {
      connectTo.forEach((scopedStpResource) => {
        if (scopedStpResource === resourceReferenceableName) {
          result.push({
            scopingResource,
            scopingCfLogicalNameOfSecurityGroup:
              type === 'batch-job'
                ? cfLogicalNames.batchInstanceDefaultSecurityGroup()
                : cfLogicalNames.workloadSecurityGroup(name)
          });
        }
      });
    }
  });
  return result;
};
export const resolveConnectToList = ({
  stpResourceNameOfReferencer,
  connectTo,
  checkingDefaults,
  activeConfig = runtimeConfigManager
}: {
  stpResourceNameOfReferencer: string;
  connectTo: string[];
  checkingDefaults?: boolean;
  activeConfig?: Pick<ConfigManager, 'findResourceInConfig'>;
}): {
  accessToResourcesRequiringRoleChanges: StpResourceScopableByConnectToAffectingRole[];
  accessToAwsServices: ConnectToAwsServicesMacro[];
  accessToResourcesPotentiallyRequiringSecurityGroupCreation: StpResourceScopableByConnectToAffectingSecurityGroup[];
  accessToAtlasMongoClusterResources: StpMongoDbAtlasCluster[];
} => {
  const result: {
    accessToResourcesRequiringRoleChanges: StpResourceScopableByConnectToAffectingRole[];
    accessToAwsServices: ConnectToAwsServicesMacro[];
    accessToResourcesPotentiallyRequiringSecurityGroupCreation: StpResourceScopableByConnectToAffectingSecurityGroup[];
    accessToAtlasMongoClusterResources: StpMongoDbAtlasCluster[];
  } = {
    accessToResourcesRequiringRoleChanges: [],
    accessToAwsServices: [],
    accessToResourcesPotentiallyRequiringSecurityGroupCreation: [],
    accessToAtlasMongoClusterResources: []
  };
  (connectTo || []).forEach((referencedName) => {
    if (CONNECT_TO_AWS_SERVICE_MACROS.includes(referencedName as ConnectToAwsServicesMacro)) {
      result.accessToAwsServices.push(referencedName as ConnectToAwsServicesMacro);
      return;
    }
    const resource = getPropsOfResourceReferencedInConfig<StpResourceType>({
      activeConfig,
      referencedFrom: stpResourceNameOfReferencer,
      stpResourceReference: referencedName
    });

    // In dev mode, skip resources that are excluded from the CloudFormation template
    // (locally emulated or locally run resources don't have CF resources created)
    if (isDevCommand()) {
      if (isResourceTypeExcludedInDevMode(resource.type)) {
        // Locally run resources (containers, frontends) - skip entirely
        return;
      }
      if (isResourceTypeLocallyEmulatable(resource.type)) {
        // Locally emulated resources (databases, redis, dynamodb) - skip unless marked as remote
        // Note: remote check is done by the caller, we just skip creating CF references here
        return;
      }
    }

    const resourceType = resource.type as StpResourceType;
    if (
      resourceType === 'function' ||
      resourceType === 'multi-container-workload' ||
      resourceType === 'batch-job' ||
      resourceType === 'state-machine' ||
      resourceType === 'event-bus' ||
      resourceType === 'bucket' ||
      resourceType === 'dynamo-db-table' ||
      resourceType === 'user-auth-pool' ||
      resourceType === 'sqs-queue' ||
      resourceType === 'sns-topic' ||
      resourceType === 'open-search-domain' ||
      resourceType === 'kinesis-stream' ||
      resourceType === 'agentcore-runtime' ||
      resourceType === 'agentcore-memory' ||
      resourceType === 'agentcore-gateway' ||
      resourceType === 'agentcore-browser' ||
      resourceType === 'agentcore-code-interpreter'
    ) {
      result.accessToResourcesRequiringRoleChanges.push(resource as StpResourceScopableByConnectToAffectingRole);
      return;
    }
    if (resource.type === 'relational-database' || resource.type === 'redis-cluster') {
      result.accessToResourcesPotentiallyRequiringSecurityGroupCreation.push(resource);
      return;
    }
    if (resource.type === 'mongo-db-atlas-cluster') {
      result.accessToAtlasMongoClusterResources.push(resource);
      return;
    }
    if (resource.type === 'hosting-bucket') {
      // A hosting bucket is a higher-level website resource. IAM access is scoped
      // to its nested S3 bucket while environment variables remain named after
      // the parent resource referenced by the user.
      result.accessToResourcesRequiringRoleChanges.push(resource._nestedResources.bucket);
      return;
    }
    if (resource.type === 'efs-filesystem') {
      // EFS access happens through an explicit volume mount, which owns the IAM
      // and network wiring. connectTo only exposes the filesystem ID and ARN.
      return;
    }
    if (resource.type === 'upstash-redis') {
      // we do not need to do any changes to role or security groups when targeting these resources
      // these resources still can be targeted by "connectTo" for the sake of injecting env variables
      return;
    }
    throw new CliError({
      category: 'CONFIG_VALIDATION',
      code: 'CONFIG_CONNECT_TO_RESOURCE_TYPE_UNSUPPORTED',
      message: `${checkingDefaults ? 'Default configuration' : `Resource \`${stpResourceNameOfReferencer}\``} uses \`connectTo\` with resource \`${resource.name}\` of type \`${resource.type}\`, which cannot be scoped by \`connectTo\`.`
    });
  });
  return result;
};
