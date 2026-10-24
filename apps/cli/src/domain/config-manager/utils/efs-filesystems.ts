import type { StpEfsFilesystem } from '@domain-services/config-manager/resolved-types/efs-filesystem';
import type { StpLambdaFunction } from '@domain-services/config-manager/resolved-types/functions';
import type { StpContainerWorkload } from '@domain-services/config-manager/resolved-types/multi-container-workloads';
import type { StpResource, StpResourceType } from '@domain-services/config-manager/resolved-types/resources';
import { cfLogicalNames } from '@stacktape/naming/cloudformation-logical-names';
import { configManager } from '..';
import { getVpcLambdaSecurityGroup } from './lambda-security-groups';
import { getPropsOfResourceReferencedInConfig } from './resource-lookup';

const resolveReferenceToEfsFilesystem = ({
  stpResourceReference,
  referencedFromType,
  referencedFrom
}: {
  stpResourceReference: string;
  referencedFromType?: StpResourceType;
  referencedFrom: string;
}): StpEfsFilesystem => {
  return getPropsOfResourceReferencedInConfig({
    activeConfig: configManager,
    stpResourceReference,
    stpResourceType: 'efs-filesystem',
    referencedFrom,
    referencedFromType
  });
};

export const resolveReferencesToMountedEfsFilesystems = ({
  resource
}: {
  resource: StpContainerWorkload | StpLambdaFunction;
}): StpEfsFilesystem[] => {
  const uniqueFilesystemNames = new Set<string>();

  if (resource.type === 'multi-container-workload') {
    // Treat as ContainerWorkload
    resource.containers.forEach((container) => {
      (container.volumeMounts || []).forEach((mount) => {
        if (mount.properties?.efsFilesystemName) {
          uniqueFilesystemNames.add(mount.properties.efsFilesystemName);
        }
      });
    });
  } else if (resource.type === 'function') {
    // Treat as Lambda Function
    resource.volumeMounts.forEach((mount) => {
      if (mount.type === 'efs' && mount.properties?.efsFilesystemName) {
        uniqueFilesystemNames.add(mount.properties.efsFilesystemName);
      }
    });
  }

  const resolvedFilesystems = Array.from(uniqueFilesystemNames).map((name) => {
    return resolveReferenceToEfsFilesystem({
      stpResourceReference: name,
      referencedFrom: resource.nameChain.join('.'),
      referencedFromType: resource.configParentResourceType
    });
  });

  return resolvedFilesystems;
};

export const getMountsForEfsFilesystem = ({
  efsFileSystemNameChain
}: {
  efsFileSystemNameChain: string | string[];
}): { mountingResource: StpResource; mountingResourceCfLogicalNameOfSecurityGroup?: string }[] => {
  const resourceReferenceableName =
    typeof efsFileSystemNameChain === 'string' ? efsFileSystemNameChain : efsFileSystemNameChain.join('.');
  const result: { mountingResource: StpResource; mountingResourceCfLogicalNameOfSecurityGroup?: string }[] = [];
  [...configManager.allLambdasToUpload, ...configManager.allContainerWorkloads].forEach((mountingResource) => {
    if (mountingResource.type === 'function') {
      if (
        mountingResource.volumeMounts?.some(
          (mount) => mount.type === 'efs' && mount.properties?.efsFilesystemName === resourceReferenceableName
        )
      ) {
        result.push({
          mountingResource,
          mountingResourceCfLogicalNameOfSecurityGroup: getVpcLambdaSecurityGroup({
            lambda: mountingResource,
            activeConfig: configManager
          }).cfLogicalName
        });
      }
    } else if (mountingResource.type === 'multi-container-workload') {
      const { name, containers } = mountingResource;
      containers.forEach((container) => {
        (container.volumeMounts || []).forEach((mount) => {
          if (mount.properties?.efsFilesystemName === resourceReferenceableName) {
            result.push({
              mountingResource,
              mountingResourceCfLogicalNameOfSecurityGroup: cfLogicalNames.workloadSecurityGroup(name)
            });
          }
        });
      });
    }
  });
  // Functions that share a security group need one ingress rule; EC2 rejects duplicate rules.
  return result.filter(
    (entry, index) =>
      result.findIndex(
        ({ mountingResourceCfLogicalNameOfSecurityGroup }) =>
          mountingResourceCfLogicalNameOfSecurityGroup === entry.mountingResourceCfLogicalNameOfSecurityGroup
      ) === index
  );
};
