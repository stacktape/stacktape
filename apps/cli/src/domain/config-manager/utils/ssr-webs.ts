import type { StpAstroWeb } from '@domain-services/config-manager/resolved-types/astro-web';
import type { StpNuxtWeb } from '@domain-services/config-manager/resolved-types/nuxt-web';
import type { StpRemixWeb } from '@domain-services/config-manager/resolved-types/remix-web';
import type { StpSolidStartWeb } from '@domain-services/config-manager/resolved-types/solidstart-web';
import type { StpSvelteKitWeb } from '@domain-services/config-manager/resolved-types/sveltekit-web';
import type { StpTanStackWeb } from '@domain-services/config-manager/resolved-types/tanstack-web';
import { join } from 'node:path';
import { dirExists } from '@utils/fs-utils';
import { configErrors } from '../errors';

type SsrWebResource = StpAstroWeb | StpNuxtWeb | StpSvelteKitWeb | StpSolidStartWeb | StpTanStackWeb | StpRemixWeb;

export const validateSsrWebConfig = ({ resource, workingDir }: { resource: SsrWebResource; workingDir: string }) => {
  const appDirectory = resource.appDirectory || '.';
  const absoluteAppDirectory = join(workingDir, appDirectory);

  if (!dirExists(absoluteAppDirectory)) {
    throw configErrors.appDirectoryMissing({
      directoryPath: appDirectory,
      stpResourceName: resource.name,
      resolvedPath: absoluteAppDirectory
    });
  }
};
