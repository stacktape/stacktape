import { tuiManager } from '@application-services/tui-manager';
import { isJson } from '@shared/utils/misc';
import { awsSdkManager } from '@utils/aws-sdk-manager';
import { loadUserCredentials } from '../_utils/initialization';

export const commandSecretGet = async () => {
  await loadUserCredentials();

  const secretName = await tuiManager.promptText({
    message: 'Secret name:',
    description: '(name of the AWS Secrets Manager secret to retrieve)'
  });

  const secretValue = await awsSdkManager.getSecretValue({ secretId: secretName });
  const formattedSecret = {
    name: secretValue.Name,
    value: isJson(secretValue.SecretString) ? JSON.parse(secretValue.SecretString) : secretValue.SecretString,
    created: secretValue.CreatedDate.toLocaleString(),
    arn: secretValue.ARN
  };
  tuiManager.info('Secret details:');
  // eslint-disable-next-line no-console
  console.dir(formattedSecret, { depth: 5 });

  return null;
};
