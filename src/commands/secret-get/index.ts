import { isJson } from '@shared/utils/misc';
import { userPrompt } from '@shared/utils/user-prompt';
import { awsSdkManager } from '@utils/aws-sdk-manager';
import { printer } from '@utils/printer';
import { loadUserCredentials } from '../_utils/initialization';

export const commandSecretGet = async () => {
  await loadUserCredentials();

  const { secretName } = await userPrompt({
    type: 'text',
    name: 'secretName',
    message: 'Secret name:'
  });

  const secretValue = await awsSdkManager.getSecretValue({ secretId: secretName });
  const formattedSecret = {
    name: secretValue.Name,
    value: isJson(secretValue.SecretString) ? JSON.parse(secretValue.SecretString) : secretValue.SecretString,
    created: secretValue.CreatedDate.toLocaleString(),
    arn: secretValue.ARN
  };
  printer.info('Secret details:');
  // eslint-disable-next-line no-console
  console.dir(formattedSecret, { depth: 5 });

  return null;
};
