import { tuiManager } from '@application-services/tui-manager';
import { isJson } from '@utils/misc';
import { awsSdkManager } from '@utils/aws-sdk-manager';
import { isAgentMode } from '../_utils/agent-mode';
import { loadUserCredentials } from '../_utils/initialization';
import { requireSecretName } from '../_utils/secret-input';

export const commandSecretGet = async () => {
  const { args } = await loadUserCredentials();
  const agentMode = isAgentMode(args);
  let secretName: string;

  if (agentMode) {
    secretName = requireSecretName(args.secretName);
  } else {
    secretName = await tuiManager.promptText({
      message: 'Secret name:',
      description: '(name of the AWS Secrets Manager secret to retrieve)'
    });
  }

  const spinner = tuiManager.createSpinner({ text: 'Retrieving secret' });
  const secretValue = await awsSdkManager.secrets.get({ secretId: secretName });
  spinner.success({ text: `Retrieved secret ${tuiManager.makeBold(secretName)}` });

  const parsedValue = isJson(secretValue.SecretString)
    ? JSON.parse(secretValue.SecretString)
    : secretValue.SecretString;

  if (agentMode) {
    tuiManager.info(
      JSON.stringify(
        {
          name: secretValue.Name,
          value: parsedValue,
          created: secretValue.CreatedDate.toLocaleString(),
          arn: secretValue.ARN
        },
        null,
        2
      )
    );
  } else {
    const valueStr = typeof parsedValue === 'object' ? JSON.stringify(parsedValue, null, 2) : String(parsedValue);
    tuiManager.printBox({
      title: 'Secret',
      lines: [
        `${tuiManager.makeBold('Name')}     ${secretValue.Name}`,
        `${tuiManager.makeBold('Created')}  ${secretValue.CreatedDate.toLocaleString()}`,
        `${tuiManager.makeBold('ARN')}      ${secretValue.ARN}`,
        '',
        `${tuiManager.makeBold('Value')}`,
        valueStr
      ]
    });
  }

  return null;
};
