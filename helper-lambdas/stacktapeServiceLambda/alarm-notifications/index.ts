import { GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager';
import { GetParameterCommand, SSMClient } from '@aws-sdk/client-ssm';
import { CF_ESCAPED_DYNAMIC_REFERENCE_END, CF_ESCAPED_DYNAMIC_REFERENCE_START } from '@shared/utils/constants';
import { processAllNodes } from '@shared/utils/misc';
import { sendAlarmEmail } from './email';
import { sendAlarmSlackMessage } from './slack';

const ssmClient = new SSMClient({});
const secretsClient = new SecretsManagerClient({});

export default async (event: AlarmNotificationEventRuleInput) => {
  const resolvedEvent = await resolveDynamicReferences(event);
  const results = await Promise.allSettled(
    resolvedEvent.alarmConfig?.notificationTargets?.map((notificationDetail) => {
      if (notificationDetail.type === 'slack') {
        return sendAlarmSlackMessage({ notificationDetail, alarmDetail: event });
      }
      if (notificationDetail.type === 'email') {
        return sendAlarmEmail({ notificationDetail, alarmDetail: event });
      }
      return 'no-action';
    })
  );
  console.info(`Result of resolving notifications: ${JSON.stringify(results, null, 2)}`);
};

const resolveDynamicReferences = <T>(obj: T): Promise<T> => {
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
