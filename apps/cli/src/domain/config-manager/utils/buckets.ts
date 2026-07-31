import type { StpHostingBucket } from '@domain-services/config-manager/resolved-types/hosting-buckets';
import type { StpResourceType } from '@domain-services/config-manager/resolved-types/resources';
import { join } from 'node:path';
import { globalStateManager } from '@application-services/global-state-manager';
import { dirExists } from '@utils/fs-utils';
import { getPropsOfResourceReferencedInConfig } from './resource-references';
import { configErrors } from '../errors';

export const resolveReferenceToBucket = ({
  stpResourceReference,
  referencedFromType,
  referencedFrom
}: {
  stpResourceReference: string;
  referencedFromType?: StpResourceType;
  referencedFrom: string;
}) => {
  return getPropsOfResourceReferencedInConfig({
    stpResourceReference,
    stpResourceType: 'bucket',
    referencedFrom,
    referencedFromType
  });
};

export const validateHostingBucketConfig = ({ definition }: { definition: StpHostingBucket }) => {
  if (definition.build?.workingDirectory) {
    const absoluteWorkingDirectory = join(globalStateManager.workingDir, definition.build.workingDirectory);
    if (!dirExists(absoluteWorkingDirectory)) {
      throw configErrors.resourceDirectoryMissing({
        directoryPath: definition.build.workingDirectory,
        stpResourceName: definition.name,
        propertyName: 'build.workingDirectory',
        resolvedPath: absoluteWorkingDirectory
      });
    }
  }
};
