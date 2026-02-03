import { globalStateManager } from '@application-services/global-state-manager';
import { tuiManager } from '@application-services/tui-manager';
import { consoleLinks } from '@shared/naming/console-links';
import { awsSdkManager } from '@utils/aws-sdk-manager';
import { ExpectedError } from '@utils/errors';
import { loadRawFileContent } from '@utils/file-loaders';
import { isAgentMode } from '../_utils/agent-mode';
import { loadUserCredentials } from '../_utils/initialization';

const provideOptions = ['Interactively using CLI', 'From file'];

export const commandSecretCreate = async () => {
  await loadUserCredentials();

  const args = globalStateManager.args as StacktapeCliArgs;

  // Agent mode: require flags instead of prompts
  if (isAgentMode()) {
    if (!args.secretName) {
      throw new ExpectedError('CLI', 'Missing required flag: --secretName', 'Provide --secretName <name>');
    }
    if (!args.secretValue && !args.secretFile) {
      throw new ExpectedError(
        'CLI',
        'Missing required flag: --secretValue or --secretFile',
        'Provide --secretValue <value> or --secretFile <path>'
      );
    }

    let secretString: string;
    if (args.secretFile) {
      const fileContent = await loadRawFileContent({
        filePath: args.secretFile,
        workingDir: globalStateManager.workingDir
      });
      secretString = JSON.stringify(fileContent);
    } else {
      secretString = args.secretValue;
    }

    await createNamedSecret(args.secretName, secretString, args.forceUpdate);
    return null;
  }

  // Interactive mode with guided UI
  tuiManager.intro('Create Secret');

  const secretName = await tuiManager.promptText({
    message: 'Secret name:',
    description: '(unique name for the AWS Secrets Manager secret)'
  });
  const provideOption = await tuiManager.promptSelect({
    message: 'How do you want to provide the secret value?',
    options: provideOptions.map((option) => ({ label: option, value: option }))
  });
  let secretString: string;
  if (provideOption === provideOptions[0]) {
    secretString = await tuiManager.promptText({
      message: 'Secret value:',
      description: '(the value will be stored securely in AWS Secrets Manager)',
      isPassword: true
    });
  } else {
    const filePath = await tuiManager.promptText({
      message: 'Path to file:',
      description: '(file content will be stored as JSON in the secret)'
    });
    const fileContent = await loadRawFileContent({
      filePath,
      workingDir: globalStateManager.workingDir
    });
    secretString = JSON.stringify(fileContent);
  }
  await createNamedSecret(secretName, secretString, false);

  return null;
};

const createNamedSecret = async (secretName: string, secretValue: string, forceUpdate?: boolean) => {
  const spinner = tuiManager.createSpinner({ text: 'Creating secret' });

  const secretList = await awsSdkManager.listAllSecrets();
  const matchingSecret = secretList.find(({ Name }) => Name === secretName);
  if (matchingSecret) {
    spinner.success({ text: 'Checked existing secrets' });

    if (isAgentMode()) {
      if (forceUpdate) {
        const updateSpinner = tuiManager.createSpinner({ text: 'Updating secret' });
        await awsSdkManager.updateExistingSecret(matchingSecret.ARN, secretValue);
        updateSpinner.success({ text: `Secret "${secretName}" updated` });
        return;
      }
      throw new ExpectedError(
        'CLI',
        `Secret "${secretName}" already exists.`,
        'Use --forceUpdate to overwrite existing secret'
      );
    }
    const shouldUpdate = await tuiManager.promptConfirm({
      message: `Secret with name "${secretName}" already exists. Would you like to update it?`
    });
    if (shouldUpdate) {
      const updateSpinner = tuiManager.createSpinner({ text: 'Updating secret' });
      await awsSdkManager.updateExistingSecret(matchingSecret.ARN, secretValue);
      updateSpinner.success({ text: `Secret "${secretName}" updated` });
      tuiManager.outro('Secret updated!');
    } else {
      tuiManager.outro('Aborted.');
    }
    return;
  }
  await awsSdkManager.createNewSecret(secretName, secretValue);
  spinner.success({ text: `Secret "${secretName}" created` });
  if (!isAgentMode()) {
    tuiManager.info(`View at ${consoleLinks.secretUrl(globalStateManager.region, secretName)}`);
    tuiManager.outro('Secret created!');
  }
};
