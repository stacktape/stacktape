import { tuiManager } from '@application-services/tui-manager';
import { notificationManager } from '@domain-services/notification-manager';
import { awsSdkManager } from '@utils/aws-sdk-manager';
import { isAgentMode } from '../_utils/agent-mode';
import { loadUserCredentials } from '../_utils/initialization';
import { requireSecretName } from '../_utils/secret-input';

export const commandSecretDelete = async () => {
  const { args } = await loadUserCredentials();
  await notificationManager.init();

  const agentMode = isAgentMode(args);
  let secretName: string;

  if (agentMode) {
    secretName = requireSecretName(args.secretName);
  } else {
    secretName = await tuiManager.promptText({
      message: 'Secret name:',
      description: '(name of the AWS Secrets Manager secret to delete)'
    });
  }

  await awsSdkManager.secrets.delete({ secretId: secretName });
  tuiManager.success(`Secret "${secretName}" deleted.`);
  await notificationManager.reportEvent({ type: 'SECRET_DELETED', title: `Secret "${secretName}" deleted` });

  return null;
};
