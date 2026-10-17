import { stpErrors } from '@errors';
import { configManager } from '@domain-services/config-manager';
import { stackMetadataNames } from '@stacktape/naming/stack-metadata-names';
import { getNumericVersion } from '@utils/versioning';

import { initializeRollbackOperation } from '../_utils/initialization';
import { recordSourceMapActivation, recordSourceMapsBeforeSwitch } from '../_utils/source-map-manifest';

type RollbackOperation = Awaited<ReturnType<typeof initializeRollbackOperation>>;

type RollbackSpinner = {
  error: (text: string) => void;
  success: ({ text }: { text: string }) => void;
};

type RollbackExecutionOperation = {
  args: Pick<RollbackOperation['args'], 'listVersions' | 'rollbackSteps' | 'targetVersion'>;
  deployedStackOverview: Pick<RollbackOperation['deployedStackOverview'], 'getStackMetadata'>;
  deploymentArtifacts: Pick<
    RollbackOperation['deploymentArtifacts'],
    | 'availablePreviousVersions'
    | 'prepareRollbackTemplate'
    | 'restoreBucketSyncFromManifest'
    | 'tagRestoredFunctions'
    | 'verifyArtifactsForVersion'
  >;
  progress: Pick<RollbackOperation['progress'], 'setPhase'>;
  stack: {
    deployStackForRollback: (templateUrl: string) => Promise<unknown>;
    lastVersion: string;
    nextVersion: string;
  };
  stackName: string;
  tui: {
    createSpinner: ({ text }: { text: string }) => RollbackSpinner;
    info: (message: string) => void;
    prettyStackName: (stackName: string) => string;
    warn: (message: string) => void;
  };
};

const listAvailableVersions = async ({
  deploymentArtifacts,
  stack,
  tui
}: Pick<RollbackExecutionOperation, 'deploymentArtifacts' | 'stack' | 'tui'>) => {
  const versions = deploymentArtifacts.availablePreviousVersions.sort();
  const currentVersion = stack.lastVersion;
  if (!versions.length) {
    tui.info('No previous deployment versions found.');
    return null;
  }
  tui.info(`Current version: ${currentVersion || 'unknown'}`);
  tui.info(`Available versions to rollback to:`);
  for (const version of versions) {
    const isCurrent = version === currentVersion;
    tui.info(`  ${version}${isCurrent ? ' (current)' : ''}`);
  }
  return null;
};

const resolveTargetVersion = ({
  args,
  deploymentArtifacts,
  stack
}: Pick<RollbackExecutionOperation, 'args' | 'deploymentArtifacts' | 'stack'>): string => {
  const { targetVersion: versionArg, rollbackSteps } = args;

  if (versionArg) {
    return versionArg as string;
  }

  const currentVersion = stack.lastVersion;

  if (!currentVersion) {
    throw stpErrors.e999({
      message: 'Cannot determine current deployment version. The stack may not have been deployed with Stacktape.',
      hint: 'Use --targetVersion to specify the target version explicitly.'
    });
  }

  // Releases removed by retention are skipped, so one step always reaches the newest older release still stored.
  const steps = rollbackSteps ? Number(rollbackSteps) : 1;
  const olderVersions = deploymentArtifacts.availablePreviousVersions
    .filter((version) => getNumericVersion(version) < getNumericVersion(currentVersion))
    .toSorted((a, b) => getNumericVersion(b) - getNumericVersion(a));
  const targetVersion = olderVersions[steps - 1];

  if (!targetVersion) {
    throw stpErrors.e999({
      message: `Cannot roll back ${steps} step(s) from ${currentVersion}: only ${olderVersions.length} older release(s) are stored.`,
      hint: 'Use --listVersions to see the stored releases and --targetVersion to pick one.'
    });
  }

  return targetVersion;
};

const verifyArtifactsExist = async ({
  deploymentArtifacts,
  targetVersion,
  tui
}: Pick<RollbackExecutionOperation, 'deploymentArtifacts' | 'tui'> & { targetVersion: string }) => {
  const availableVersions = deploymentArtifacts.availablePreviousVersions;
  if (!availableVersions.includes(targetVersion)) {
    throw stpErrors.e999({
      message: `Version ${targetVersion} not found in deployment bucket. Available versions: ${availableVersions.sort().join(', ') || 'none'}.`,
      hint: `Use --listVersions to see available versions. Old versions may have been cleaned up based on the previousVersionsToKeep setting.`
    });
  }

  const verifySpinner = tui.createSpinner({ text: `Verifying artifacts for ${targetVersion}` });
  try {
    await deploymentArtifacts.verifyArtifactsForVersion(targetVersion);
    verifySpinner.success({ text: `All artifacts for ${targetVersion} verified` });
  } catch (error) {
    verifySpinner.error(`Artifact verification failed for ${targetVersion}`);
    throw error;
  }
};

const checkRollbackSafety = ({
  deployedStackOverview
}: Pick<RollbackExecutionOperation, 'deployedStackOverview'>): { isSafe: boolean; warnings: string[] } => {
  const warnings: string[] = [];
  const rollbackSafety = deployedStackOverview.getStackMetadata(stackMetadataNames.rollbackSafety());

  if (!rollbackSafety) {
    warnings.push(
      'Rollback safety metadata not found. This deployment was made before rollback support was added. Proceeding with fast rollback, but results may be unpredictable if the config used $File, TypeScript transforms, custom directives, or after:deploy hooks.'
    );
    return { isSafe: true, warnings };
  }

  const safety = typeof rollbackSafety === 'string' ? JSON.parse(rollbackSafety) : rollbackSafety;

  if (safety.unsafeDirectives?.length) {
    warnings.push(
      `Config uses directives that embed local/external state: ${safety.unsafeDirectives.join(', ')}. The rolled-back template will contain values from the original deploy time.`
    );
  }
  if (safety.hasTypeScriptTransforms) {
    warnings.push('Config uses TypeScript transforms that are not captured in the CF template.');
  }
  if (safety.hasAfterDeployHooks) {
    warnings.push('Config has after:deploy hooks that will NOT be re-executed during rollback.');
  }
  if (safety.hasCustomDirectives) {
    warnings.push('Config uses custom directives whose results were baked in at deploy time.');
  }

  return {
    isSafe: !safety.unsafeDirectives?.length && !safety.hasTypeScriptTransforms && !safety.hasCustomDirectives,
    warnings
  };
};

export const commandRollback = async () => {
  const operation = await initializeRollbackOperation();
  await configManager.loadGlobalConfig();
  configManager.validateGuardrails({ hasConfig: !!configManager.config });
  const { args, deployedStackOverview, deploymentArtifacts, progress, stack, stackContext, tui } = operation;

  return executeRollbackOperation({
    args,
    deployedStackOverview,
    deploymentArtifacts,
    progress,
    stack,
    stackName: stackContext.stackName,
    tui
  });
};

export const executeRollbackOperation = async ({
  args,
  deployedStackOverview,
  deploymentArtifacts,
  progress,
  stack,
  stackName,
  tui
}: RollbackExecutionOperation) => {
  // Handle --listVersions
  if (args.listVersions) {
    return listAvailableVersions({ deploymentArtifacts, stack, tui });
  }

  const currentVersion = stack.lastVersion;
  const targetVersion = resolveTargetVersion({ args, deploymentArtifacts, stack });

  if (targetVersion === currentVersion) {
    // Restoring the current release repairs workloads a failed fast deployment left on other code.
    tui.info(`Restoring the current release ${targetVersion}.`);
  }

  tui.info(`Rolling back from ${currentVersion || 'unknown'} to ${targetVersion}`);

  // Verify target version artifacts exist
  await verifyArtifactsExist({ deploymentArtifacts, targetVersion, tui });

  // Check rollback safety and warn
  const { warnings } = checkRollbackSafety({ deployedStackOverview });
  for (const warning of warnings) {
    tui.warn(warning);
  }

  // Prepare rollback template: download old template, patch version output, re-upload
  progress.setPhase('DEPLOY');
  const newVersion = stack.nextVersion;
  const { templateUrl, template } = await deploymentArtifacts.prepareRollbackTemplate(targetVersion, newVersion);
  // The restored code keeps its digests, so the maps stored with the release still describe it.
  const sourceMapManifest = await recordSourceMapsBeforeSwitch(template);

  const spinner = tui.createSpinner({
    text: `Deploying CF template from ${targetVersion} as ${newVersion} to stack ${tui.prettyStackName(stackName)}`
  });

  try {
    await stack.deployStackForRollback(templateUrl);
    await deploymentArtifacts.tagRestoredFunctions();
    spinner.success({ text: `Stack rolled back to ${targetVersion} (deployed as ${newVersion})` });
  } catch (err) {
    spinner.error(`Rollback deployment failed`);
    throw err;
  } finally {
    // Records what the rollback switched, also when it failed partway. It never throws.
    await recordSourceMapActivation(sourceMapManifest);
  }

  // Restore bucket-synced content if versioning manifests are available
  try {
    await deploymentArtifacts.restoreBucketSyncFromManifest(targetVersion);
  } catch {
    tui.warn(
      'Could not restore bucket-synced content. If your stack has static websites, you may need to redeploy from the original commit.'
    );
  }

  tui.info(`Rollback to ${targetVersion} complete. New deployment version: ${newVersion}`);

  return null;
};
