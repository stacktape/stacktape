import { globalStateManager } from '@application-services/global-state-manager';
import { tuiManager } from '@application-services/tui-manager';
import { awsSdkManager } from '@utils/aws-sdk-manager';
import { ExpectedError } from '@utils/errors';
import { isAgentMode } from '../_utils/agent-mode';
import { loadUserCredentials } from '../_utils/initialization';

export const commandSecretDelete = async () => {
  await loadUserCredentials();

  const args = globalStateManager.args as StacktapeCliArgs;
  let secretName: string;

  if (isAgentMode()) {
    if (!args.secretName) {
      throw new ExpectedError('CLI', 'Missing required flag: --secretName', 'Provide --secretName <name>');
    }
    secretName = args.secretName;
  } else {
    secretName = await tuiManager.promptText({
      message: 'Secret name:',
      description: '(name of the AWS Secrets Manager secret to delete)'
    });
  }

  await awsSdkManager.deleteSecret(secretName);
  tuiManager.success(`Secret "${secretName}" deleted.`);

  return null;
};
