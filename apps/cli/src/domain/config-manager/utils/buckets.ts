import type { ConfigManager } from '../index';
import type { StpHostingBucket } from '@domain-services/config-manager/resolved-types/hosting-buckets';
import type { StpResourceType } from '@domain-services/config-manager/resolved-types/resources';
import { join } from 'node:path';
import { dirExists } from '@utils/fs-utils';
import { getPropsOfResourceReferencedInConfig } from './resource-lookup';
import { configErrors } from '../errors';

export const resolveReferenceToBucket = ({
  activeConfig,
  stpResourceReference,
  referencedFromType,
  referencedFrom
}: {
  activeConfig: ConfigManager;
  stpResourceReference: string;
  referencedFromType?: StpResourceType;
  referencedFrom: string;
}) => {
  return getPropsOfResourceReferencedInConfig({
    activeConfig: activeConfig,
    stpResourceReference,
    stpResourceType: 'bucket',
    referencedFrom,
    referencedFromType
  });
};

export const validateHostingBucketConfig = ({
  definition,
  workingDir
}: {
  definition: StpHostingBucket;
  workingDir: string;
}) => {
  if (definition.build?.workingDirectory) {
    const absoluteWorkingDirectory = join(workingDir, definition.build.workingDirectory);
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
