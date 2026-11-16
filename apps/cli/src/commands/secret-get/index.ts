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

  // The value is printed and returned only with --show-secrets: command output often ends up in CI logs and agent
  // transcripts.
  const showValue = Boolean(args.showSensitiveValues);
  const value = !showValue
    ? '<<OMITTED>>'
    : isJson(secretValue.SecretString)
      ? JSON.parse(secretValue.SecretString)
      : secretValue.SecretString;
  const result = {
    name: secretValue.Name,
    arn: secretValue.ARN,
    created: secretValue.CreatedDate?.toISOString(),
    value
  };

  if (!agentMode) {
    const valueStr = typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value);
    tuiManager.printBox({
      title: 'Secret',
      lines: [
        `${tuiManager.makeBold('Name')}     ${secretValue.Name}`,
        `${tuiManager.makeBold('Created')}  ${secretValue.CreatedDate?.toLocaleString()}`,
        `${tuiManager.makeBold('ARN')}      ${secretValue.ARN}`,
        '',
        `${tuiManager.makeBold('Value')}`,
        valueStr
      ]
    });
    if (!showValue) {
      tuiManager.info('Re-run with --show-secrets to print the value.');
    }
  }

  return result;
};
