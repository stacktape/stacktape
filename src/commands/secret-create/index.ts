import { globalStateManager } from '@application-services/global-state-manager';
import { consoleLinks } from '@shared/naming/console-links';
import { userPrompt } from '@shared/utils/user-prompt';
import { awsSdkManager } from '@utils/aws-sdk-manager';
import { loadRawFileContent } from '@utils/file-loaders';
import { printer } from '@utils/printer';
import { loadUserCredentials } from '../_utils/initialization';

const provideOptions = ['Interactively using CLI', 'From file'];

export const commandSecretCreate = async () => {
  await loadUserCredentials();

  const { secretName } = await userPrompt({
    type: 'text',
    name: 'secretName',
    message: 'Secret name:'
  });
  const { provideOption } = await userPrompt({
    type: 'select',
    choices: provideOptions.map((option) => ({ title: option, value: option })),
    name: 'provideOption',
    message: 'How do you want to specify value for your secret.'
  });
  let secretString: string;
  if (provideOption === provideOptions[0]) {
    ({ secretString } = await userPrompt({
      type: 'password',
      name: 'secretString',
      message: 'Secret string:'
    }));
  } else {
    const { filePath } = await userPrompt({
      type: 'text',
      name: 'filePath',
      message: 'Path to file containing secret(s)'
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
    const { shouldUpdate } = await userPrompt({
      type: 'confirm',
      name: 'shouldUpdate',
      message: `Secret with name "${secretName}" already exists. Would you like to update it?`
    });
    if (shouldUpdate) {
      await awsSdkManager.updateExistingSecret(matchingSecret.ARN, secretValue);
      printer.success(`Secret "${secretName}" successfully updated.`);
    } else {
      printer.info('Aborting secret update.');
    }
    return;
  }
  await awsSdkManager.createNewSecret(secretName, secretValue);
  printer.success(`Secret "${secretName}" created successfully.`);
  printer.info(`You can view your secret at ${consoleLinks.secretUrl(globalStateManager.region, secretName)}`);
};
