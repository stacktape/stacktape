import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { configManager } from '@domain-services/config-manager';
import type { StpEmailSender } from '@domain-services/config-manager/resolved-types/email-senders';
import { arns } from '@stacktape/naming/arns';
import { consoleLinks } from '@stacktape/naming/console-links';
import {
  getSharedEmailConfigurationSetName,
  getSharedEmailFeedbackTopicName,
  getSharedResourceStackName
} from '@stacktape/naming/shared-stacks';

const getConfigurationSetName = (resource: StpEmailSender) =>
  resource.manageIdentity !== false
    ? getSharedEmailConfigurationSetName(resource.identity)
    : resource.configurationSetName;

export const resolveEmailSenders = () => {
  for (const resource of configManager.emailSenders) {
    const { accountId, region } = calculatedStackOverviewManager.context;
    const identityArn = arns.sesIdentity({ accountId, identity: resource.identity, region });
    const configurationSetName = getConfigurationSetName(resource);

    calculatedStackOverviewManager.addStacktapeResourceReferenceableParam({
      nameChain: resource.nameChain,
      paramName: 'identity',
      paramValue: resource.identity
    });
    calculatedStackOverviewManager.addStacktapeResourceReferenceableParam({
      nameChain: resource.nameChain,
      paramName: 'identityArn',
      paramValue: identityArn
    });
    calculatedStackOverviewManager.addStacktapeResourceReferenceableParam({
      nameChain: resource.nameChain,
      paramName: 'region',
      paramValue: region
    });
    if (configurationSetName) {
      calculatedStackOverviewManager.addStacktapeResourceReferenceableParam({
        nameChain: resource.nameChain,
        paramName: 'configurationSetName',
        paramValue: configurationSetName
      });
    }
    if (resource.manageIdentity !== false) {
      calculatedStackOverviewManager.addStacktapeResourceReferenceableParam({
        nameChain: resource.nameChain,
        paramName: 'feedbackTopicArn',
        paramValue: arns.snsTopic({
          accountId,
          region,
          snsTopicAwsName: getSharedEmailFeedbackTopicName(resource.identity)
        })
      });
    }
    calculatedStackOverviewManager.addStacktapeResourceLink({
      nameChain: resource.nameChain,
      linkName: 'console',
      linkValue: consoleLinks.sesIdentity(region, resource.identity)
    });
    if (resource.manageIdentity !== false) {
      calculatedStackOverviewManager.addStacktapeResourceLink({
        nameChain: resource.nameChain,
        linkName: 'retained shared stack',
        linkValue: consoleLinks.stackUrl(
          region,
          getSharedResourceStackName('email-identity', resource.identity),
          'resources'
        )
      });
    }
  }
};
