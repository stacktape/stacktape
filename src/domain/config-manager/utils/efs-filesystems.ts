import { cfLogicalNames } from '@shared/naming/logical-names';
import { configManager } from '..';
import { getPropsOfResourceReferencedInConfig } from './resource-references';

export const resolveReferenceToEfsFilesystem = ({
  stpResourceReference,
  referencedFromType,
  referencedFrom
}: {
  stpResourceReference: string;
  referencedFromType?: StpResourceType;
  referencedFrom: string;
}): StpEfsFilesystem => {
  return getPropsOfResourceReferencedInConfig({
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
      if (mount.properties?.efsFilesystemName) {
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
      const { name, volumeMounts } = mountingResource;
      if (volumeMounts) {
        volumeMounts.forEach((mount) => {
          if (mount.properties?.efsFilesystemName === resourceReferenceableName) {
            result.push({
              mountingResource,
              mountingResourceCfLogicalNameOfSecurityGroup: cfLogicalNames.workloadSecurityGroup(name)
            });
          }
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
  return result;
};
