import { globalStateManager } from '@application-services/global-state-manager';
import { tuiManager } from '@application-services/tui-manager';
import { CF_ESCAPED_DYNAMIC_REFERENCE_END, CF_ESCAPED_DYNAMIC_REFERENCE_START } from 'src/config/constants';
import { awsSdkManager } from '@utils/aws-sdk-manager';

const captureSecretsRegex = new RegExp(
  `${CF_ESCAPED_DYNAMIC_REFERENCE_START}(.*?)${CF_ESCAPED_DYNAMIC_REFERENCE_END}`,
  'g'
);

export const escapeCloudformationSecretDynamicReference = (node: any): any => {
  if (
    typeof node === 'string' &&
    (node.startsWith('{{resolve:ssm-secure') || node.startsWith('{{resolve:secretsmanager')) &&
    node.endsWith('}}')
  ) {
    return node.replace('{{', CF_ESCAPED_DYNAMIC_REFERENCE_START).replace('}}', CF_ESCAPED_DYNAMIC_REFERENCE_END);
  }
  return node;
};

export const locallyResolveSensitiveValue = async ({ ssmParameterName }: { ssmParameterName: string }) => {
  const parameterValue = await locallyResolveSSMParameter({ ssmParameterName });
  const inlinedSecretValuesToResolve = [...new Set(parameterValue.match(captureSecretsRegex) || [])];
  const resolvedValues = new Map(
    await Promise.all(
      inlinedSecretValuesToResolve.map(
        async (escapedSecretString) =>
          [escapedSecretString, await locallyResolveEscapedReference(escapedSecretString)] as const
      )
    )
  );
  // A replacement function inserts each value as it is, even one that contains `$&` or `$$`.
  return parameterValue.replace(captureSecretsRegex, (match) => resolvedValues.get(match) ?? match);
};

const locallyResolveEscapedReference = async (escapedSecretString: string) => {
  const cleanedReference = escapedSecretString.slice(
    CF_ESCAPED_DYNAMIC_REFERENCE_START.length,
    -CF_ESCAPED_DYNAMIC_REFERENCE_END.length
  );
  const [, serviceName, ...referenceKey] = cleanedReference.split(':');
  if (serviceName === 'ssm-secure') {
    return locallyResolveSSMParameter({ ssmParameterName: referenceKey.join(':') });
  }
  if (serviceName === 'secretsmanager') {
    const [secretId, , jsonKey, versionStage, versionId] = referenceKey;
    return locallyResolveSecret({ secretId, versionId, versionStage, jsonKey });
  }
  return undefined;
};

const locallyResolveSSMParameter = async ({ ssmParameterName }: { ssmParameterName: string }) => {
  try {
    const {
      Parameter: { Value }
    } = await awsSdkManager.parameterStore.get({ name: ssmParameterName });
    return Value;
  } catch (err) {
    if (globalStateManager.logLevel === 'debug') {
      tuiManager.debug(`Failed to fetch SSM parameter ${ssmParameterName}: ${err}`);
    }
  }
  return '<<UNABLE_TO_RESOLVE>>';
};

const locallyResolveSecret = async ({
  secretId,
  versionId,
  versionStage,
  jsonKey
}: {
  secretId: string;
  versionId?: string;
  versionStage?: string;
  jsonKey?: string;
}) => {
  try {
    const { SecretString } = await awsSdkManager.secrets.get({ secretId, versionId, versionStage });
    if (jsonKey) {
      return JSON.parse(SecretString)[jsonKey];
    }
    return SecretString;
  } catch (err) {
    if (globalStateManager.logLevel === 'debug') {
      tuiManager.debug(`Failed to fetch secret ${secretId} (${versionId || versionStage}): ${err}`);
    }
  }
  return '<<UNABLE_TO_RESOLVE>>';
};
