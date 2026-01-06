import { tuiManager } from '@application-services/tui-manager';
import { awsSdkManager } from '@utils/aws-sdk-manager';
import { loadUserCredentials } from '../_utils/initialization';

export const commandSecretDelete = async () => {
  await loadUserCredentials();

  const secretName = await tuiManager.promptText({
    message: 'Secret name:',
    description: '(name of the AWS Secrets Manager secret to delete)'
  });
  await awsSdkManager.deleteSecret(secretName);
  tuiManager.success(`Secret "${secretName}" deleted successfully.`);

  // @todo-return-value
  return null;
};
