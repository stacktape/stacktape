import type { StpNextjsWeb } from '@domain-services/config-manager/resolved-types/nextjs-web';
import { join } from 'node:path';
import { dirExists, isFileAccessible } from '@utils/fs-utils';
import { configErrors } from '../errors';

export const validateNextjsWebConfig = ({ resource, workingDir }: { resource: StpNextjsWeb; workingDir: string }) => {
  const absoluteAppDirectory = join(workingDir, resource.appDirectory);
  if (!dirExists(absoluteAppDirectory)) {
    throw configErrors.appDirectoryMissing({
      directoryPath: resource.appDirectory,
      stpResourceName: resource.name,
      resolvedPath: absoluteAppDirectory
    });
  }
  if (
    !isFileAccessible(join(absoluteAppDirectory, 'next.config.js')) &&
    !isFileAccessible(join(absoluteAppDirectory, 'next.config.ts'))
  ) {
    throw configErrors.nextjsProjectMissing({
      directoryPath: resource.appDirectory,
      stpResourceName: resource.name
    });
  }
  if (resource.streamingEnabled && resource.useEdgeLambda) {
    throw configErrors.nextjsEdgeStreamingConflict({ stpResourceName: resource.name });
  }
  if (resource.serverLambda?.joinDefaultVpc && resource.useEdgeLambda) {
    throw configErrors.nextjsEdgeVpcConflict({ stpResourceName: resource.name });
  }
};
