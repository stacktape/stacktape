import { join } from 'node:path';
import { globalStateManager } from '@application-services/global-state-manager';
import { stpErrors } from '@errors';
import { dirExists, isFileAccessible } from '@shared/utils/fs-utils';

export const validateNextjsWebConfig = ({ resource }: { resource: StpNextjsWeb }) => {
  const absoluteAppDirectory = join(globalStateManager.workingDir, resource.appDirectory);
  if (!dirExists(absoluteAppDirectory)) {
    throw stpErrors.e106({ directoryPath: resource.appDirectory, stpResourceName: resource.name });
  }
  if (
    !isFileAccessible(join(absoluteAppDirectory, 'next.config.js')) &&
    !isFileAccessible(join(absoluteAppDirectory, 'next.config.ts'))
  ) {
    throw stpErrors.e107({ directoryPath: resource.appDirectory, stpResourceName: resource.name });
  }
  if (resource.streamingEnabled && resource.useEdgeLambda) {
    throw stpErrors.e105({ stpResourceName: resource.name });
  }
  if (resource.serverLambda?.joinDefaultVpc && resource.useEdgeLambda) {
    throw stpErrors.e124({ stpResourceName: resource.name });
  }
};
