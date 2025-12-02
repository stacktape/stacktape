import { globalStateManager } from '@application-services/global-state-manager';
import { Ref } from '@cloudform/functions';
import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { configManager } from '@domain-services/config-manager';
import { templateManager } from '@domain-services/template-manager';
import { awsResourceNames } from '@shared/naming/aws-resource-names';
import { cfEvaluatedLinks } from '@shared/naming/cf-evaluated-links';
import { cfLogicalNames } from '@shared/naming/logical-names';
import { PARENT_IDENTIFIER_SHARED_GLOBAL } from '@shared/utils/constants';
import { getResourcesNeededForLogForwarding } from '../_utils/log-forwarding';
import {
  getCloudwatchAgentAutoUpdateDocument,
  getCloudwatchAgentAutoUpdateSsmAssociation,
  getEc2AutoscalingGroup,
  getEc2InstanceProfile,
  getEc2InstanceRole,
  getEc2LaunchTemplate,
  getLogGroup,
  getSecurityGroup,
  // getSecurityGroup,
  getSsmAgentAutoUpdateSsmAssociation
} from './utils';

export const resolveBastions = async () => {
  configManager.bastions.forEach((bastion) => resolveBastion({ bastion }));
};

const resolveBastion = ({ bastion }: { bastion: StpBastion }) => {
  const { nameChain } = bastion;
  if (!templateManager.getCfResourceFromTemplate(cfLogicalNames.bastionCloudwatchSsmDocument())) {
    calculatedStackOverviewManager.addCfChildResource({
      cfLogicalName: cfLogicalNames.bastionCloudwatchSsmDocument(),
      resource: getCloudwatchAgentAutoUpdateDocument(),
      nameChain: [PARENT_IDENTIFIER_SHARED_GLOBAL]
    });
  }
  calculatedStackOverviewManager.addCfChildResource({
    cfLogicalName: cfLogicalNames.bastionEc2AutoscalingGroup(bastion.name),
    resource: getEc2AutoscalingGroup({ definition: bastion }),
    nameChain
  });
  calculatedStackOverviewManager.addCfChildResource({
    cfLogicalName: cfLogicalNames.bastionSecurityGroup(bastion.name),
    resource: getSecurityGroup({ definition: bastion }),
    nameChain
  });
  calculatedStackOverviewManager.addCfChildResource({
    cfLogicalName: cfLogicalNames.bastionEc2LaunchTemplate(bastion.name),
    resource: getEc2LaunchTemplate({ definition: bastion }),
    nameChain
  });
  calculatedStackOverviewManager.addCfChildResource({
    cfLogicalName: cfLogicalNames.bastionRole(bastion.name),
    resource: getEc2InstanceRole(),
    nameChain
  });
  calculatedStackOverviewManager.addCfChildResource({
    cfLogicalName: cfLogicalNames.bastionEc2InstanceProfile(bastion.name),
    resource: getEc2InstanceProfile({ definition: bastion }),
    nameChain
  });
  calculatedStackOverviewManager.addCfChildResource({
    cfLogicalName: cfLogicalNames.bastionCwAgentSsmAssociation(bastion.name),
    resource: getCloudwatchAgentAutoUpdateSsmAssociation({ definition: bastion }),
    nameChain
  });
  calculatedStackOverviewManager.addCfChildResource({
    cfLogicalName: cfLogicalNames.bastionSsmAgentSsmAssociation(bastion.name),
    resource: getSsmAgentAutoUpdateSsmAssociation({ definition: bastion }),
    nameChain
  });
  if (!bastion.logging?.audit?.disabled) {
    calculatedStackOverviewManager.addCfChildResource({
      cfLogicalName: cfLogicalNames.bastionLogGroup(bastion.name, 'audit'),
      resource: getLogGroup({ definition: bastion, logType: 'audit' }),
      nameChain
    });
    calculatedStackOverviewManager.addStacktapeResourceLink({
      linkName: 'logs-audit',
      linkValue: cfEvaluatedLinks.logGroup(
        awsResourceNames.bastionLogGroup({
          stackName: globalStateManager.targetStack.stackName,
          logType: 'audit',
          stpResourceName: bastion.name
        })
      ),
      nameChain
    });
    if (bastion.logging?.audit?.logForwarding) {
      getResourcesNeededForLogForwarding({
        resource: bastion,
        logGroupCfLogicalName: cfLogicalNames.bastionLogGroup(bastion.name, 'audit'),
        logForwardingConfig: bastion.logging?.audit?.logForwarding
      }).forEach(({ cfLogicalName, cfResource }) => {
        if (!templateManager.getCfResourceFromTemplate(cfLogicalName)) {
          calculatedStackOverviewManager.addCfChildResource({
            nameChain,
            cfLogicalName,
            resource: cfResource
          });
        }
      });
    }
  }
  if (!bastion.logging?.secure?.disabled) {
    calculatedStackOverviewManager.addCfChildResource({
      cfLogicalName: cfLogicalNames.bastionLogGroup(bastion.name, 'secure'),
      resource: getLogGroup({ definition: bastion, logType: 'secure' }),
      nameChain
    });
    calculatedStackOverviewManager.addStacktapeResourceLink({
      linkName: 'logs-secure',
      linkValue: cfEvaluatedLinks.logGroup(
        awsResourceNames.bastionLogGroup({
          stackName: globalStateManager.targetStack.stackName,
          logType: 'secure',
          stpResourceName: bastion.name
        })
      ),
      nameChain
    });
    if (bastion.logging?.secure?.logForwarding) {
      getResourcesNeededForLogForwarding({
        resource: bastion,
        logGroupCfLogicalName: cfLogicalNames.bastionLogGroup(bastion.name, 'secure'),
        logForwardingConfig: bastion.logging?.secure?.logForwarding
      }).forEach(({ cfLogicalName, cfResource }) => {
        if (!templateManager.getCfResourceFromTemplate(cfLogicalName)) {
          calculatedStackOverviewManager.addCfChildResource({
            nameChain,
            cfLogicalName,
            resource: cfResource
          });
        }
      });
    }
  }
  if (!bastion.logging?.messages?.disabled) {
    calculatedStackOverviewManager.addCfChildResource({
      cfLogicalName: cfLogicalNames.bastionLogGroup(bastion.name, 'messages'),
      resource: getLogGroup({ definition: bastion, logType: 'messages' }),
      nameChain
    });
    calculatedStackOverviewManager.addStacktapeResourceLink({
      linkName: 'logs-messages',
      linkValue: cfEvaluatedLinks.logGroup(
        awsResourceNames.bastionLogGroup({
          stackName: globalStateManager.targetStack.stackName,
          logType: 'messages',
          stpResourceName: bastion.name
        })
      ),
      nameChain
    });
    if (bastion.logging?.messages?.logForwarding) {
      getResourcesNeededForLogForwarding({
        resource: bastion,
        logGroupCfLogicalName: cfLogicalNames.bastionLogGroup(bastion.name, 'messages'),
        logForwardingConfig: bastion.logging?.messages?.logForwarding
      }).forEach(({ cfLogicalName, cfResource }) => {
        if (!templateManager.getCfResourceFromTemplate(cfLogicalName)) {
          calculatedStackOverviewManager.addCfChildResource({
            nameChain,
            cfLogicalName,
            resource: cfResource
          });
        }
      });
    }
  }
  calculatedStackOverviewManager.addStacktapeResourceLink({
    linkName: 'console',
    linkValue: cfEvaluatedLinks.ec2InstancesOfAsg(Ref(cfLogicalNames.bastionEc2AutoscalingGroup(bastion.name))),
    nameChain
  });
};
