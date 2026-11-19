import { GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager';
import { GetParameterCommand, SSMClient } from '@aws-sdk/client-ssm';
import { CF_ESCAPED_DYNAMIC_REFERENCE_END, CF_ESCAPED_DYNAMIC_REFERENCE_START } from 'src/config/constants';
import { processAllNodes } from '@utils/misc';

const ssmClient = new SSMClient({});
const secretsClient = new SecretsManagerClient({});

/**
 * Resolves the `$Secret` and secure SSM references the deploy left escaped in a channel's properties. The values are
 * read here, in the customer's account, only to deliver a notification; they are never sent to the Console.
 */
export const resolveDynamicReferences = <T>(obj: T): Promise<T> => {
  return processAllNodes(obj, async (node) => {
    if (typeof node === 'string' && node.startsWith(CF_ESCAPED_DYNAMIC_REFERENCE_START)) {
      const cleanedReference = node.slice(
        CF_ESCAPED_DYNAMIC_REFERENCE_START.length,
        -CF_ESCAPED_DYNAMIC_REFERENCE_END.length
      );
      const [, serviceName, ...referenceKey] = cleanedReference.split(':');
      if (serviceName === 'ssm-secure' || serviceName === 'ssm') {
        const parameterReference = referenceKey.join(':');
        const {
          Parameter: { Value }
        } = await ssmClient.send(new GetParameterCommand({ Name: parameterReference, WithDecryption: true }));
        return Value;
      }
      if (serviceName === 'secretsmanager') {
        const [secretId, , jsonKey, versionStage, versionId] = referenceKey;
        const { SecretString } = await secretsClient.send(
          new GetSecretValueCommand({
            SecretId: secretId,
            ...(versionId && { VersionId: versionId }),
            ...(versionStage && { VersionStage: versionStage })
          })
        );
        if (jsonKey) {
          return JSON.parse(SecretString)[jsonKey];
        }
        return SecretString;
      }
    }
    return node;
  });
};
