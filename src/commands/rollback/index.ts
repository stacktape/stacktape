import { globalStateManager } from '@application-services/global-state-manager';
import { tuiManager } from '@application-services/tui-manager';
import { eventManager } from '@application-services/event-manager';
import { stackManager } from '@domain-services/cloudformation-stack-manager';
import { deploymentArtifactManager } from '@domain-services/deployment-artifact-manager';
import { deployedStackOverviewManager } from '@domain-services/deployed-stack-overview-manager';
import { stpErrors } from '@errors';
import { stackMetadataNames } from '@shared/naming/metadata-names';
import { getNumericVersion } from '@utils/versioning';

import { initializeStackServicesForWorkingWithDeployedStack } from '../_utils/initialization';

const listAvailableVersions = async () => {
  const versions = deploymentArtifactManager.availablePreviousVersions.sort();
  const currentVersion = stackManager.lastVersion;
  if (!versions.length) {
    tuiManager.info('No previous deployment versions found.');
    return null;
  }
  tuiManager.info(`Current version: ${currentVersion || 'unknown'}`);
  tuiManager.info(`Available versions to rollback to:`);
  for (const version of versions) {
    const isCurrent = version === currentVersion;
    tuiManager.info(`  ${version}${isCurrent ? ' (current)' : ''}`);
  }
  return null;
};

const resolveTargetVersion = (): string => {
  const { targetVersion: versionArg, rollbackSteps } = globalStateManager.args;

  if (versionArg) {
    return versionArg as string;
  }

  const currentVersion = stackManager.lastVersion;

  if (!currentVersion) {
    throw stpErrors.e999({
      message: 'Cannot determine current deployment version. The stack may not have been deployed with Stacktape.',
      hint: 'Use --targetVersion to specify the target version explicitly.'
    });
  }

  const steps = rollbackSteps ? Number(rollbackSteps) : 1;
  const currentNumeric = getNumericVersion(currentVersion);
  const targetNumeric = currentNumeric - steps;

  if (targetNumeric < 1) {
    throw stpErrors.e999({
      message: `Cannot rollback ${steps} step(s) from ${currentVersion}. Target version would be below v000001.`,
      hint: 'Use --targetVersion to specify the target version explicitly, or use a smaller --rollbackSteps value.'
    });
  }

  return `v${String(targetNumeric).padStart(6, '0')}`;
};

const verifyArtifactsExist = async (targetVersion: string) => {
  const availableVersions = deploymentArtifactManager.availablePreviousVersions;
  if (!availableVersions.includes(targetVersion)) {
    throw stpErrors.e999({
      message: `Version ${targetVersion} not found in deployment bucket. Available versions: ${availableVersions.sort().join(', ') || 'none'}.`,
      hint: `Use --listVersions to see available versions. Old versions may have been cleaned up based on the previousVersionsToKeep setting.`
    });
  }

  const verifySpinner = tuiManager.createSpinner({ text: `Verifying artifacts for ${targetVersion}` });
  try {
    await deploymentArtifactManager.verifyArtifactsForVersion(targetVersion);
    verifySpinner.success({ text: `All artifacts for ${targetVersion} verified` });
  } catch (error) {
    verifySpinner.error(`Artifact verification failed for ${targetVersion}`);
    throw error;
  }
};

const checkRollbackSafety = (): { isSafe: boolean; warnings: string[] } => {
  const warnings: string[] = [];
  const rollbackSafety = deployedStackOverviewManager.getStackMetadata(stackMetadataNames.rollbackSafety());

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
  await initializeStackServicesForWorkingWithDeployedStack({
    commandModifiesStack: true,
    commandRequiresConfig: false
  });

  // Handle --listVersions
  if (globalStateManager.args.listVersions) {
    return listAvailableVersions();
  }

  const currentVersion = stackManager.lastVersion;
  const targetVersion = resolveTargetVersion();

  if (targetVersion === currentVersion) {
    tuiManager.info(`Target version ${targetVersion} is already the current version. Nothing to do.`);
    return null;
  }

  tuiManager.info(`Rolling back from ${currentVersion || 'unknown'} to ${targetVersion}`);

  // Verify target version artifacts exist
  await verifyArtifactsExist(targetVersion);

  // Check rollback safety and warn
  const { warnings } = checkRollbackSafety();
  for (const warning of warnings) {
    tuiManager.warn(warning);
  }

  // Prepare rollback template: download old template, patch version output, re-upload
  eventManager.setPhase('DEPLOY');
  const newVersion = stackManager.nextVersion;
  const templateUrl = await deploymentArtifactManager.prepareRollbackTemplate(targetVersion, newVersion);

  const spinner = tuiManager.createSpinner({
    text: `Deploying CF template from ${targetVersion} as ${newVersion} to stack ${tuiManager.prettyStackName(globalStateManager.targetStack.stackName)}`
  });

  try {
    await stackManager.deployStackForRollback(templateUrl);
    spinner.success({ text: `Stack rolled back to ${targetVersion} (deployed as ${newVersion})` });
  } catch (err) {
    spinner.error(`Rollback deployment failed`);
    throw err;
  }

  // Restore bucket-synced content if versioning manifests are available
  try {
    await deploymentArtifactManager.restoreBucketSyncFromManifest(targetVersion);
  } catch {
    tuiManager.warn(
      'Could not restore bucket-synced content. If your stack has static websites, you may need to redeploy from the original commit.'
    );
  }

  tuiManager.info(`Rollback to ${targetVersion} complete. New deployment version: ${newVersion}`);

  return null;
};
