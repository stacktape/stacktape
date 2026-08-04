import { cfnResource } from '@stacktape/cloudformation/resource';
import { getAtt, ref } from '@stacktape/cloudformation/intrinsics';
import type { CustomTaggingScheduledRuleInput } from '@domain-services/config-manager/resolved-types/resources';
import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { configManager } from '@domain-services/config-manager';
import { cfLogicalNames } from '@stacktape/naming/cloudformation-logical-names';
import { transformIntoCloudformationSubstitutedString } from '@utils/cloudformation';
import { filterResourcesForDevMode } from '../../../../commands/dev/dev-resource-filter';
import { resolveFunction } from '../functions';
import { getEventBusRuleLambdaPermission } from '../functions/events/utils';

export const resolveStacktapeServiceLambda = () => {
  resolveFunction({ lambdaProps: configManager.stacktapeServiceLambdaProps });
  calculatedStackOverviewManager.addCfChildResource({
    cfLogicalName: cfLogicalNames.customTaggingScheduleRule(),
    nameChain: configManager.stacktapeServiceLambdaProps.nameChain,
    resource: getScheduledTaggingEventBridgeRule()
  });
  calculatedStackOverviewManager.addCfChildResource({
    cfLogicalName: cfLogicalNames.customTaggingScheduleRulePermission(),
    nameChain: configManager.stacktapeServiceLambdaProps.nameChain,
    resource: getEventBusRuleLambdaPermission({
      lambdaEndpointArn: getAtt(configManager.stacktapeServiceLambdaProps.cfLogicalName, 'Arn'),
      eventBusRuleArn: getAtt(cfLogicalNames.customTaggingScheduleRule(), 'Arn')
    })
  });
};

const getScheduledTaggingEventBridgeRule = () => {
  const input: CustomTaggingScheduledRuleInput = {
    tagHostedZoneAttributedToCloudMapNamespace: configManager.isServiceDiscoveryPrivateNamespaceRequired
      ? [
          {
            attributionCfResourceLogicalName: cfLogicalNames.serviceDiscoveryPrivateNamespace(),
            namespaceId: getAtt(cfLogicalNames.serviceDiscoveryPrivateNamespace(), 'Id')
          }
        ]
      : [],
    tagNetworkInterfaceWithSecurityGroup: [
      ...filterResourcesForDevMode(configManager.databases).map(({ name }) => {
        return {
          securityGroupId: ref(cfLogicalNames.dbSecurityGroup(name)),
          attributionCfResourceLogicalName: cfLogicalNames.dbSubnetGroup(name)
        };
      }),
      ...configManager.allApplicationLoadBalancers.map(({ name }) => {
        return {
          securityGroupId: ref(cfLogicalNames.loadBalancerSecurityGroup(name)),
          attributionCfResourceLogicalName: cfLogicalNames.loadBalancer(name)
        };
      })
    ]
  };
  return cfnResource('AWS::Events::Rule', {
    State: 'ENABLED',
    ScheduleExpression: 'rate(2 hours)',
    // Description: eventDetails.description,
    // Name: eventDetails.name,
    Targets: [
      {
        Input: transformIntoCloudformationSubstitutedString(input),
        Arn: getAtt(configManager.stacktapeServiceLambdaProps.cfLogicalName, 'Arn'),
        Id: 'scheduledService'
      }
    ]
  });
};
