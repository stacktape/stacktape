import { userPrompt } from '@shared/utils/user-prompt';
import { awsSdkManager } from '@utils/aws-sdk-manager';
import { tuiManager } from '@utils/tui';
import { loadUserCredentials } from '../_utils/initialization';

export const commandSecretDelete = async () => {
  await loadUserCredentials();

  const { secretName } = await userPrompt({
    type: 'text',
    name: 'secretName',
    message: 'Secret name:'
  });
  awsSdkManager.deleteSecret(secretName);
  tuiManager.success(`Secret "${secretName}" deleted successfully.`);

  // @todo-return-value
  return null;
};
