import { GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager';
import { GetParameterCommand, SSMClient } from '@aws-sdk/client-ssm';
import { defaultProvider } from '@aws-sdk/credential-provider-node';
import { AwsIdentityProtectedClient } from '@shared/trpc/aws-identity-protected';
import { CF_ESCAPED_DYNAMIC_REFERENCE_END, CF_ESCAPED_DYNAMIC_REFERENCE_START } from '@shared/utils/constants';
import { processAllNodes } from '@shared/utils/misc';
import { sendAlarmEmail } from './email';
import { sendAlarmSlackMessage } from './slack';

const ssmClient = new SSMClient({});
const secretsClient = new SecretsManagerClient({});

export default async (event: AlarmNotificationEventRuleInput) => {
  const resolvedEvent = await resolveDynamicReferences(event);

  // Dispatch to direct notification targets (legacy per-stack routing)
  const directResults = await Promise.allSettled(
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
  console.info(`Direct notification results: ${JSON.stringify(directResults, null, 2)}`);

  // Report to console API for centralized alert routing (Discord, Webhook, alert history, etc.)
  await reportToConsoleApi(event);
};

const reportToConsoleApi = async (event: AlarmNotificationEventRuleInput) => {
  const apiUrl = process.env.STACKTAPE_TRPC_API_ENDPOINT;
  const region = process.env.AWS_REGION;
  const project = process.env.PROJECT_NAME;
  const stage = process.env.STAGE;
  if (!apiUrl || !region || !project || !stage) return;

  try {
    const client = new AwsIdentityProtectedClient();
    await client.init({ credentials: await defaultProvider()(), region, apiUrl });
    await client.reportAlarmEvent.mutate({
      type: 'ALARM_TRIGGERED',
      alarmName: event.alarmConfig?.name || event.alarmAwsResourceName,
      project,
      stage,
      region,
      title: `Alarm "${event.alarmConfig?.name || event.alarmAwsResourceName}" triggered`,
      details: {
        description: event.description,
        time: event.time,
        alarmArn: event.alarmAwsResourceName,
        stackName: event.stackName,
        affectedResource: event.affectedResource,
        comparisonOperator: event.comparisonOperator,
        measuringUnit: event.measuringUnit,
        statFunction: event.statFunction,
        alarmLink: event.alarmLink
      }
    });
  } catch (err) {
    console.info(`Failed to report alarm event to console API: ${err}`);
  }
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
