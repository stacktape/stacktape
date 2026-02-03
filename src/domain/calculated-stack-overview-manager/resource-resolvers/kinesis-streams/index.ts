import { globalStateManager } from '@application-services/global-state-manager';
import { GetAtt } from '@cloudform/functions';
import Stream, { StreamEncryption, StreamModeDetails } from '@cloudform/kinesis/stream';
import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { stackManager } from '@domain-services/cloudformation-stack-manager';
import { configManager } from '@domain-services/config-manager';
import { awsResourceNames } from '@shared/naming/aws-resource-names';
import { consoleLinks } from '@shared/naming/console-links';
import { cfLogicalNames } from '@shared/naming/logical-names';

export const resolveKinesisStreams = async () => {
  configManager.kinesisStreams.forEach((resource) => {
    resolveKinesisStream({ resource });
  });
};

export const resolveKinesisStream = ({ resource }: { resource: StpKinesisStream }) => {
  const streamAwsName = awsResourceNames.kinesisStream(resource.name, globalStateManager.targetStack.stackName);
  const capacityMode = resource.capacityMode || 'ON_DEMAND';

  calculatedStackOverviewManager.addCfChildResource({
    nameChain: resource.nameChain,
    cfLogicalName: cfLogicalNames.kinesisStream(resource.name),
    resource: new Stream({
      Name: streamAwsName,
      StreamModeDetails: new StreamModeDetails({
        StreamMode: capacityMode
      }),
      ShardCount: capacityMode === 'PROVISIONED' ? resource.shardCount || 1 : undefined,
      RetentionPeriodHours: resource.retentionPeriodHours,
      StreamEncryption: resource.encryption?.enabled
        ? new StreamEncryption({
            EncryptionType: 'KMS',
            KeyId: resource.encryption.kmsKeyArn || 'alias/aws/kinesis'
          })
        : undefined,
      Tags: stackManager.getTags()
    })
  });

  calculatedStackOverviewManager.addStacktapeResourceLink({
    nameChain: resource.nameChain,
    linkName: 'console',
    linkValue: consoleLinks.kinesisStream(globalStateManager.region, streamAwsName)
  });

  calculatedStackOverviewManager.addStacktapeResourceReferenceableParam({
    paramName: 'arn',
    nameChain: resource.nameChain,
    paramValue: GetAtt(cfLogicalNames.kinesisStream(resource.name), 'Arn')
  });

  calculatedStackOverviewManager.addStacktapeResourceReferenceableParam({
    paramName: 'name',
    nameChain: resource.nameChain,
    paramValue: streamAwsName
  });
};
