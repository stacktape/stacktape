import { tuiManager } from '@application-services/tui-manager';
import { awsSdkManager } from '@utils/aws-sdk-manager';
import { loadUserCredentials } from '../_utils/initialization';

export const commandSecretDelete = async () => {
  await loadUserCredentials();

  const { secretName } = await tuiManager.prompt({
    type: 'text',
    name: 'secretName',
    message: 'Secret name:'
  });
  awsSdkManager.deleteSecret(secretName);
  tuiManager.success(`Secret "${secretName}" deleted successfully.`);

  // @todo-return-value
  return null;
};
