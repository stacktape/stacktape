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

  const spinner = tuiManager.createSpinner({ text: 'Retrieving secret' });
  const secretValue = await awsSdkManager.getSecretValue({ secretId: secretName });
  spinner.success({ text: `Retrieved secret ${tuiManager.makeBold(secretName)}` });

  const parsedValue = isJson(secretValue.SecretString)
    ? JSON.parse(secretValue.SecretString)
    : secretValue.SecretString;

  if (isAgentMode()) {
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
