import { join } from 'node:path';
import { globalStateManager } from '@application-services/global-state-manager';
import { stpErrors } from '@errors';
import { dirExists } from '@shared/utils/fs-utils';

type SsrWebResource = StpAstroWeb | StpNuxtWeb | StpSvelteKitWeb | StpSolidStartWeb | StpTanStackWeb | StpRemixWeb;

export const validateSsrWebConfig = ({ resource }: { resource: SsrWebResource }) => {
  const appDirectory = resource.appDirectory || '.';
  const absoluteAppDirectory = join(globalStateManager.workingDir, appDirectory);

  if (!dirExists(absoluteAppDirectory)) {
    throw stpErrors.e106({ directoryPath: appDirectory, stpResourceName: resource.name });
  }
};
