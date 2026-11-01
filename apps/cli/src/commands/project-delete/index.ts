import { publicCommandLine } from '../../config/cli/public-names';
import { tuiManager } from '@application-services/tui-manager';
import { CliError } from '@utils/errors';
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

  // Agent mode (`--agent`, the MCP server) implies --yes for every command, as it does for `stacktape delete`.
  if (!args.autoConfirmOperation) {
    if (!tuiManager.isTTY) {
      throw new CliError({
        category: 'CONFIRMATION_REQUIRED',
        code: 'PROJECT_DELETE_NOT_CONFIRMED',
        message: `Deleting project ${name} needs confirmation.`,
        hints: 'Run it in a terminal, or add --yes.'
      });
    }
    const typed = await tuiManager.promptText({
      message: `Type ${name} to delete this project:`,
      description: '(its deploy history and stage settings are removed from the Stacktape Console)'
    });
    if (typed.trim() !== name) {
      tuiManager.info('Operation cancelled: the typed name does not match the project name.');
      return { deleted: false };
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
