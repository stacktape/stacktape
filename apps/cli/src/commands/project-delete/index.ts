import { publicCommandLine } from '../../config/cli/public-names';
import { tuiManager, UserCancelledError } from '@application-services/tui-manager';
import { CliError, confirmationRequiredError } from '@utils/errors';
import { canAskForConfirmation } from '../_utils/agent-mode';
import { captureCommandArgs, initializeControlPlaneOperation } from '../_utils/initialization';

export const commandProjectDelete = async () => {
  const args = captureCommandArgs();
  const name = args.projectName?.trim();
  if (!name) {
    throw new CliError({
      category: 'INPUT',
      code: 'PROJECT_NAME_REQUIRED',
      message: 'Missing required flag: --project',
      hints: `Run ${publicCommandLine('project:delete', { projectName: '<project-name>' })}.`
    });
  }

  const { apiClient } = await initializeControlPlaneOperation({ args });

  // Only --yes confirms. Agent mode and machine output cannot type the name, so they fail without it.
  if (!args.autoConfirmOperation) {
    if (!canAskForConfirmation()) {
      throw confirmationRequiredError({
        message: `Deleting project ${name} needs confirmation.`,
        hints: 'Run it in a terminal, or add --yes. --agent does not confirm it.'
      });
    }
    const typed = await tuiManager.promptText({
      message: `Type ${name} to delete this project:`,
      description: '(its deploy history and stage settings are removed from the Stacktape Console)'
    });
    if (typed.trim() !== name) {
      tuiManager.info('Operation cancelled: the typed name does not match the project name.');
      // A cancelled command does not report success (exit code 130).
      throw new UserCancelledError();
    }
  }

  const result = await apiClient.deleteProject({ projectName: name });
  if (result.deleted === false) {
    const { deployedStages } = result;
    const count = deployedStages.length;
    throw new CliError({
      category: 'CLI',
      code: 'PROJECT_HAS_DEPLOYED_STAGES',
      message: `Project ${name} still has ${count} deployed stage${count === 1 ? '' : 's'}: ${deployedStages
        .map(({ stage, region, awsAccountName }) => `${stage} (${region}, AWS account ${awsAccountName})`)
        .join(', ')}. Deleting the project never deletes stacks, so it was kept.`,
      hints: [
        `Delete the stage${count === 1 ? '' : 's'} first:`,
        ...deployedStages.map(({ stage, region, awsAccountName }) =>
          publicCommandLine('delete', { stage, region, projectName: name, awsAccount: awsAccountName })
        ),
        `Then run ${publicCommandLine('project:delete', { projectName: name })} again.`
      ],
      data: { deployedStages }
    });
  }

  tuiManager.success(`Project ${tuiManager.makeBold(result.name)} deleted.`);
  return result;
};
