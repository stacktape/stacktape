import { GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager';
import { GetParameterCommand, SSMClient } from '@aws-sdk/client-ssm';
import { defaultProvider } from '@aws-sdk/credential-provider-node';
import { AwsIdentityProtectedClient } from '@shared/trpc/aws-identity-protected';
import { CF_ESCAPED_DYNAMIC_REFERENCE_END, CF_ESCAPED_DYNAMIC_REFERENCE_START } from '@shared/utils/constants';
import { processAllNodes } from '@shared/utils/misc';

const ssmClient = new SSMClient({});
const secretsClient = new SecretsManagerClient({});

export default async (event: AlarmNotificationEventRuleInput) => {
  const resolvedEvent = await resolveDynamicReferences(event);

  if (resolvedEvent.alarmConfig?.includeInHistory === false) return;

  await reportToConsoleApi(resolvedEvent);
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
      type: event.stateValue === 'OK' ? 'ALARM_RESOLVED' : 'ALARM_TRIGGERED',
      alarmName: event.alarmConfig?.name || event.alarmAwsResourceName,
      sourceConfigName: event.alarmConfig?.name,
      project,
      stage,
      region,
      title:
        event.stateValue === 'OK'
          ? `Alarm "${event.alarmConfig?.name || event.alarmAwsResourceName}" resolved`
          : `Alarm "${event.alarmConfig?.name || event.alarmAwsResourceName}" triggered`,
      channels: (event.alarmConfig?.notificationTargets || []).map((channel) => ({
        name: channel.type === 'slack' ? 'Slack' : channel.type === 'email' ? 'Email' : channel.type,
        type: channel.type === 'ms-teams' ? 'ms_teams' : channel.type === 'email' ? 'e_mail' : channel.type,
        properties: channel.properties || {}
      })),
      details: {
        description: event.description,
        time: event.time,
        state: event.stateValue,
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
