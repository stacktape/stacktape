import { tuiManager } from '@application-services/tui-manager';
import { notificationManager } from '@domain-services/notification-manager';
import { consoleLinks } from '@stacktape/naming/console-links';
import { awsSdkManager } from '@utils/aws-sdk-manager';
import { CliError } from '@utils/errors';
import { loadRawFileContent } from '@utils/file-loaders';
import { isAgentMode } from '../_utils/agent-mode';
import { loadUserCredentials } from '../_utils/initialization';
import { requireSecretName, requireSecretValueInput } from '../_utils/secret-input';

const provideOptions = ['Interactively using CLI', 'From file'];

export const commandSecretSet = async () => {
  const { args, region, workingDir } = await loadUserCredentials();
  await notificationManager.init();

  const agentMode = isAgentMode(args);

  // Agent mode: require flags instead of prompts
  if (agentMode) {
    const secretName = requireSecretName(args.secretName);
    requireSecretValueInput({ secretValue: args.secretValue, secretFile: args.secretFile });

    let secretString: string;
    if (args.secretFile) {
      const fileContent = await loadRawFileContent({
        filePath: args.secretFile,
        workingDir
      });
      secretString = JSON.stringify(fileContent);
    } else {
      secretString = args.secretValue;
    }

    await createNamedSecret({
      agentMode,
      forceUpdate: args.forceUpdate,
      region,
      secretName,
      secretValue: secretString
    });
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
      workingDir
    });
    secretString = JSON.stringify(fileContent);
  }
  await createNamedSecret({ agentMode, forceUpdate: false, region, secretName, secretValue: secretString });

  return null;
};

const createNamedSecret = async ({
  agentMode,
  forceUpdate,
  region,
  secretName,
  secretValue
}: {
  agentMode: boolean;
  forceUpdate?: boolean;
  region: Parameters<typeof consoleLinks.secretUrl>[0];
  secretName: string;
  secretValue: string;
}) => {
  const spinner = tuiManager.createSpinner({ text: 'Creating secret' });

  const secretList = await awsSdkManager.secrets.list();
  const matchingSecret = secretList.find(({ Name }) => Name === secretName);
  if (matchingSecret) {
    spinner.success({ text: 'Checked existing secrets' });

    if (agentMode) {
      if (forceUpdate) {
        const updateSpinner = tuiManager.createSpinner({ text: 'Updating secret' });
        await awsSdkManager.secrets.update({ secretId: matchingSecret.ARN, value: secretValue });
        updateSpinner.success({ text: `Secret "${secretName}" updated` });
        await notificationManager.reportEvent({ type: 'SECRET_UPDATED', title: `Secret "${secretName}" updated` });
        return;
      }
      throw new CliError({
        category: 'CLI',
        code: 'SECRET_ALREADY_EXISTS',
        message: `Secret \`${secretName}\` already exists.`,
        hints: 'Use `--forceUpdate` to overwrite the existing secret.'
      });
    }
    const shouldUpdate = await tuiManager.promptConfirm({
      message: `Secret with name "${secretName}" already exists. Would you like to update it?`
    });
    if (shouldUpdate) {
      const updateSpinner = tuiManager.createSpinner({ text: 'Updating secret' });
      await awsSdkManager.secrets.update({ secretId: matchingSecret.ARN, value: secretValue });
      updateSpinner.success({ text: `Secret "${secretName}" updated` });
      await notificationManager.reportEvent({ type: 'SECRET_UPDATED', title: `Secret "${secretName}" updated` });
      tuiManager.outro('Secret updated!');
    } else {
      tuiManager.outro('Aborted.');
    }
    return;
  }
  await awsSdkManager.secrets.create({ name: secretName, value: secretValue });
  spinner.success({ text: `Secret "${secretName}" created` });
  await notificationManager.reportEvent({ type: 'SECRET_CREATED', title: `Secret "${secretName}" created` });
  if (!agentMode) {
    tuiManager.info(`View at ${consoleLinks.secretUrl(region, secretName)}`);
    tuiManager.outro('Secret created!');
  }
};
