import { cfnResource } from '@stacktape/cloudformation/resource';
import { getAtt } from '@stacktape/cloudformation/intrinsics';
import type { StpKinesisStream } from '@domain-services/config-manager/resolved-types/kinesis-streams';
import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { stackManager } from '@domain-services/cloudformation-stack-manager';
import { configManager } from '@domain-services/config-manager';
import { awsResourceNames } from '@stacktape/naming/aws-resource-names';
import { consoleLinks } from '@stacktape/naming/console-links';
import { cfLogicalNames } from '@stacktape/naming/cloudformation-logical-names';

export const resolveKinesisStreams = async () => {
  configManager.kinesisStreams.forEach((resource) => {
    resolveKinesisStream({ resource });
  });
};

export const resolveKinesisStream = ({ resource }: { resource: StpKinesisStream }) => {
  const streamAwsName = awsResourceNames.kinesisStream(resource.name, calculatedStackOverviewManager.context.stackName);
  const capacityMode = resource.capacityMode || 'ON_DEMAND';

  calculatedStackOverviewManager.addCfChildResource({
    nameChain: resource.nameChain,
    cfLogicalName: cfLogicalNames.kinesisStream(resource.name),
    resource: cfnResource('AWS::Kinesis::Stream', {
      Name: streamAwsName,
      StreamModeDetails: {
        StreamMode: capacityMode
      },
      ShardCount: capacityMode === 'PROVISIONED' ? resource.shardCount || 1 : undefined,
      RetentionPeriodHours: resource.retentionPeriodHours,
      StreamEncryption: resource.encryption?.enabled
        ? {
            EncryptionType: 'KMS',
            KeyId: resource.encryption.kmsKeyArn || 'alias/aws/kinesis'
          }
        : undefined,
      Tags: stackManager.getTags()
    })
  });

  calculatedStackOverviewManager.addStacktapeResourceLink({
    nameChain: resource.nameChain,
    linkName: 'console',
    linkValue: consoleLinks.kinesisStream(calculatedStackOverviewManager.context.region, streamAwsName)
  });

  calculatedStackOverviewManager.addStacktapeResourceReferenceableParam({
    paramName: 'arn',
    nameChain: resource.nameChain,
    paramValue: getAtt(cfLogicalNames.kinesisStream(resource.name), 'Arn')
  });

  calculatedStackOverviewManager.addStacktapeResourceReferenceableParam({
    paramName: 'name',
    nameChain: resource.nameChain,
    paramValue: streamAwsName
  });
};
