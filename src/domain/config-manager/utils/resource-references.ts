import { tuiManager } from '@application-services/tui-manager';
import { stpErrors } from '@errors';
import { cfLogicalNames } from '@shared/naming/logical-names';
import { ExpectedError } from '@utils/errors';
import {
  isDevCommand,
  isResourceTypeExcludedInDevMode,
  isResourceTypeLocallyEmulatable
} from '../../../commands/dev/dev-mode-utils';
import { configManager } from '../index';

export const getReferencableParamsError = ({
  resourceName,
  referencedParam,
  referencableParams,
  directiveType
}: {
  resourceName: string;
  referencedParam: string;
  referencableParams: string[];
  directiveType: '$ResourceParam' | '$CfResourceParam';
}): ExpectedError => {
  return new ExpectedError(
    'DIRECTIVE',
    `Error in ${directiveType} directive. Parameter ${tuiManager.colorize(
      'red',
      referencedParam
    )} is not referencable on resource ${tuiManager.colorize('red', resourceName)}`,
    [
      `Referencable parameters of the resource ${tuiManager.colorize('blue', resourceName)} are: ${referencableParams
        .map((referencableParam) => tuiManager.colorize('blue', referencableParam))
        .join(', ')}`
    ]
  );
};

export const getNonExistingResourceError = ({
  resourceName,
  directiveType
}: {
  resourceName: string;
  directiveType: '$ResourceParam' | '$CfResourceParam';
}): ExpectedError => {
  return new ExpectedError(
    'DIRECTIVE',
    `Could not resolve resource ${tuiManager.colorize('yellow', resourceName)} referenced by ${tuiManager.colorize(
      'cyan',
      directiveType
    )} directive.`,
    [
      `Directive ${tuiManager.colorize('yellow', directiveType)} only works for ${
        directiveType === '$CfResourceParam'
          ? 'user defined cloudformation resources and child cloudformation resources of stacktape resources.'
          : 'stacktape resources (configured in "resources" section of the configuration file).'
      }`,
      `If you want to reference parameters of ${
        directiveType === '$ResourceParam'
          ? 'CloudFormation resource'
          : 'Stacktape resource (configured in "resources" section of the configuration file)'
      }, use ${tuiManager.colorize(
        'yellow',
        directiveType === '$ResourceParam' ? '$CfResourceParam' : '$ResourceParam'
      )} directive.`
    ]
  );
};

export const getPropsOfResourceReferencedInConfig = <T extends StpResourceType>({
  stpResourceReference,
  stpResourceType,
  referencedFrom,
  referencedFromType
}: {
  stpResourceReference: string;
  stpResourceType?: T;
  referencedFrom: string;
  referencedFromType?: StpResourceType | 'alarm';
}): ResourcePropsFromConfig<T> => {
  const { resource, restPath, validPath, fullyResolved } = configManager.findResourceInConfig({
    nameChain: stpResourceReference.split('.')
  });
  if (!fullyResolved || (stpResourceType && resource.type !== stpResourceType)) {
    throw stpErrors.e36({
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
  [...configManager.allLambdasToUpload, ...configManager.allContainerWorkloads, ...configManager.batchJobs].forEach(
    (scopingResource) => {
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
    }
  );
  return result;
};
export const ConnectToAwsServiceMacros = ['aws:ses'] as const;

export const resolveConnectToList = ({
  stpResourceNameOfReferencer,
  connectTo,
  checkingDefaults
}: {
  stpResourceNameOfReferencer: string;
  connectTo: string[];
  checkingDefaults?: boolean;
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
    if (ConnectToAwsServiceMacros.includes(referencedName as ConnectToAwsServicesMacro)) {
      result.accessToAwsServices.push(referencedName as ConnectToAwsServicesMacro);
      return;
    }
    const resource = getPropsOfResourceReferencedInConfig<StpResourceType>({
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

    if (
      resource.type === 'function' ||
      resource.type === 'multi-container-workload' ||
      resource.type === 'batch-job' ||
      resource.type === 'state-machine' ||
      resource.type === 'event-bus' ||
      resource.type === 'bucket' ||
      resource.type === 'dynamo-db-table' ||
      resource.type === 'user-auth-pool' ||
      resource.type === 'sqs-queue' ||
      resource.type === 'sns-topic' ||
      resource.type === 'open-search-domain'
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
    if (resource.type === 'upstash-redis') {
      // we do not need to do any changes to role or security groups when targeting these resources
      // these resources still can be targeted by "connectTo" for the sake of injecting env variables
      return;
    }
    throw new ExpectedError(
      'CONFIG_VALIDATION',
      `Error in ${checkingDefaults ? '' : 'resource '}${tuiManager.makeBold(
        stpResourceNameOfReferencer
      )}. ConnectTo section contains resource "${resource.name}" of type "${resource.type}".
  Resource type "${resource.type}" cannot be scoped by connectTo.`
    );
  });
  return result;
};
