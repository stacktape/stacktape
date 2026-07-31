import type { StpConvex } from '@domain-services/config-manager/resolved-types/convex';
/**
 * Convex config preprocessing.
 *
 * Validation for the synthesized self-hosted Convex resource.
 */

import { isAbsolute, join } from 'node:path';
import { globalStateManager } from '@application-services/global-state-manager';
import { tuiManager } from '@application-services/tui-manager';
import { dirExists, isFileAccessible } from '@utils/fs-utils';
import { CliError } from '@utils/errors';

// Default pinned Convex images. Bump deliberately after testing Convex's
// self-hosted migration path against a real Stacktape deployment.
export const DEFAULT_CONVEX_BACKEND_IMAGE =
  'ghcr.io/get-convex/convex-backend@sha256:122da352b12b216a017a1fb45c6a467f41a5b746158b47aecd1fe12f9f74edb0';

export const DEFAULT_CONVEX_DASHBOARD_IMAGE =
  'ghcr.io/get-convex/convex-dashboard@sha256:26bd4a89b097c5dd89e78d194a6b79c5c1b8cb1d02801b9946a9eb7b716e18dd';

export const getConvexSecretName = ({ nameChain }: { nameChain: string[] }) =>
  `stp/${globalStateManager.region}/${globalStateManager.targetStack.stackName}/${nameChain.join('.')}`;

export const validateConvexConfig = ({ resource }: { resource: StpConvex }) => {
  const absoluteAppDirectory = isAbsolute(resource.appDirectory)
    ? resource.appDirectory
    : join(globalStateManager.workingDir, resource.appDirectory);

  if (!dirExists(absoluteAppDirectory)) {
    throw new CliError({
      category: 'CONFIG',
      code: 'CONFIG_CONVEX_APP_DIRECTORY_MISSING',
      message: `Convex resource \`${resource.name}\` uses missing app directory \`${resource.appDirectory}\` (resolved to \`${absoluteAppDirectory}\`).`,
      hints: 'Create a `convex/` directory containing your Convex functions, or update `appDirectory`.'
    });
  }

  if (!isFileAccessible(join(absoluteAppDirectory, 'schema.ts'))) {
    tuiManager.warn(
      `Convex resource '${resource.name}' has no schema.ts in '${resource.appDirectory}'. This is valid for schema-less apps, but make sure the directory contains your Convex functions.`
    );
  }

  const customDomains = resource.customDomains;
  if (customDomains) {
    const missingRequiredOrigins = [
      !customDomains.cloud && 'customDomains.cloud',
      !customDomains.site && 'customDomains.site',
      resource.dashboard?.enabled !== false && !customDomains.dashboard && 'customDomains.dashboard'
    ].filter(Boolean);
    if (missingRequiredOrigins.length) {
      throw new CliError({
        category: 'CONFIG',
        code: 'CONFIG_CONVEX_CUSTOM_DOMAIN_MISSING',
        message: `Convex resource \`${resource.name}\` is missing ${missingRequiredOrigins.map((name) => `\`${name}\``).join(', ')}.`,
        hints: 'Provide separate cloud and site domains, plus a dashboard domain when the Convex dashboard is enabled.'
      });
    }
    if (resource.dashboard?.enabled === false && customDomains.dashboard) {
      throw new CliError({
        category: 'CONFIG',
        code: 'CONFIG_CONVEX_DASHBOARD_DOMAIN_UNUSED',
        message: `Convex resource \`${resource.name}\` sets \`customDomains.dashboard\` while \`dashboard.enabled\` is false.`,
        hints: 'Remove `customDomains.dashboard` or enable the Convex dashboard.'
      });
    }
  }

  if (resource.functionsDeployment?.workingDirectory) {
    const absoluteWorkingDirectory = isAbsolute(resource.functionsDeployment.workingDirectory)
      ? resource.functionsDeployment.workingDirectory
      : join(globalStateManager.workingDir, resource.functionsDeployment.workingDirectory);
    if (!dirExists(absoluteWorkingDirectory)) {
      throw new CliError({
        category: 'CONFIG',
        code: 'CONFIG_CONVEX_FUNCTIONS_DIRECTORY_MISSING',
        message: `Convex resource \`${resource.name}\` uses missing functions directory \`${resource.functionsDeployment.workingDirectory}\` (resolved to \`${absoluteWorkingDirectory}\`).`,
        hints: 'Create the directory or remove `functionsDeployment.workingDirectory`.'
      });
    }
  }

  if (resource.dashboard?.enabled !== false && !resource.dashboard?.allowedIpRanges?.length) {
    tuiManager.warn(
      `Convex dashboard for '${resource.name}' is internet-reachable. Set dashboard.allowedIpRanges to restrict access in production.`
    );
  }
};
