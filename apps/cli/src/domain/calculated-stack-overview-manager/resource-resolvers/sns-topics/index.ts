import { globalStateManager } from '@application-services/global-state-manager';
import { GetAtt } from '@cloudform/functions';
import SnsTopic from '@cloudform/sns/topic';
import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { stackManager } from '@domain-services/cloudformation-stack-manager';
import { configManager } from '@domain-services/config-manager';
import { awsResourceNames } from '@shared/naming/aws-resource-names';
import { consoleLinks } from '@shared/naming/console-links';
import { cfLogicalNames } from '@shared/naming/logical-names';

export const resolveSnsTopics = async () => {
  configManager.snsTopics.forEach((resource) => {
    calculatedStackOverviewManager.addCfChildResource({
      nameChain: resource.nameChain,
      cfLogicalName: cfLogicalNames.snsTopic(resource.name),
      resource: new SnsTopic({
        ContentBasedDeduplication: resource.contentBasedDeduplication,
        FifoTopic: resource.fifoEnabled,
        DisplayName: resource.smsDisplayName,
        TopicName: awsResourceNames.snsTopic(
          resource.name,
          globalStateManager.targetStack.stackName,
          resource.fifoEnabled
        ),
        Tags: stackManager.getTags()
      })
    });
    calculatedStackOverviewManager.addStacktapeResourceLink({
      nameChain: resource.nameChain,
      linkName: 'console',
      linkValue: consoleLinks.snsTopic(
        globalStateManager.region,
        globalStateManager.targetAwsAccount.awsAccountId,
        awsResourceNames.snsTopic(resource.name, globalStateManager.targetStack.stackName, resource.fifoEnabled)
      )
    });
    calculatedStackOverviewManager.addStacktapeResourceReferenceableParam({
      paramName: 'arn',
      nameChain: resource.nameChain,
      paramValue: GetAtt(cfLogicalNames.snsTopic(resource.name), 'TopicArn')
    });
    calculatedStackOverviewManager.addStacktapeResourceReferenceableParam({
      paramName: 'name',
      nameChain: resource.nameChain,
      paramValue: GetAtt(cfLogicalNames.snsTopic(resource.name), 'TopicName')
    });
  });
};
