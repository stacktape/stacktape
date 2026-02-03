import { globalStateManager } from '@application-services/global-state-manager';
import { tuiManager } from '@application-services/tui-manager';
import { isJson } from '@shared/utils/misc';
import { awsSdkManager } from '@utils/aws-sdk-manager';
import { ExpectedError } from '@utils/errors';
import { isAgentMode } from '../_utils/agent-mode';
import { loadUserCredentials } from '../_utils/initialization';

export const commandSecretGet = async () => {
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
      description: '(name of the AWS Secrets Manager secret to retrieve)'
    });
  }

  const secretValue = await awsSdkManager.getSecretValue({ secretId: secretName });
  const formattedSecret = {
    name: secretValue.Name,
    value: isJson(secretValue.SecretString) ? JSON.parse(secretValue.SecretString) : secretValue.SecretString,
    created: secretValue.CreatedDate.toLocaleString(),
    arn: secretValue.ARN
  };

  if (isAgentMode()) {
    // Agent mode: simple structured output
    tuiManager.info(JSON.stringify(formattedSecret, null, 2));
  } else {
    tuiManager.info('Secret details:');
    // eslint-disable-next-line no-console
    console.dir(formattedSecret, { depth: 5 });
  }

  return null;
};
