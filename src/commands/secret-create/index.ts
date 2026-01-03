import { globalStateManager } from '@application-services/global-state-manager';
import { tuiManager } from '@application-services/tui-manager';
import { consoleLinks } from '@shared/naming/console-links';
import { awsSdkManager } from '@utils/aws-sdk-manager';
import { loadRawFileContent } from '@utils/file-loaders';
import { loadUserCredentials } from '../_utils/initialization';

const provideOptions = ['Interactively using CLI', 'From file'];

export const commandSecretCreate = async () => {
  await loadUserCredentials();

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
  await createNamedSecret(secretName, secretString);

  return null;
};

const createNamedSecret = async (secretName: string, secretValue: string) => {
  const secretList = await awsSdkManager.listAllSecrets();
  const matchingSecret = secretList.find(({ Name }) => Name === secretName);
  if (matchingSecret) {
    const shouldUpdate = await tuiManager.promptConfirm({
      message: `Secret with name "${secretName}" already exists. Would you like to update it?`
    });
    if (shouldUpdate) {
      await awsSdkManager.updateExistingSecret(matchingSecret.ARN, secretValue);
      tuiManager.success(`Secret "${secretName}" successfully updated.`);
    } else {
      tuiManager.info('Aborting secret update.');
    }
    return;
  }
  await awsSdkManager.createNewSecret(secretName, secretValue);
  tuiManager.success(`Secret "${secretName}" created successfully.`);
  tuiManager.info(`You can view your secret at ${consoleLinks.secretUrl(globalStateManager.region, secretName)}`);
};
