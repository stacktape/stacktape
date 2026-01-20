import EventBridgeRule from '@cloudform/events/rule';
import { GetAtt, Ref } from '@cloudform/functions';
import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { configManager } from '@domain-services/config-manager';
import { cfLogicalNames } from '@shared/naming/logical-names';
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
      lambdaEndpointArn: GetAtt(configManager.stacktapeServiceLambdaProps.cfLogicalName, 'Arn'),
      eventBusRuleArn: GetAtt(cfLogicalNames.customTaggingScheduleRule(), 'Arn')
    })
  });
};

const getScheduledTaggingEventBridgeRule = () => {
  const input: CustomTaggingScheduledRuleInput = {
    tagHostedZoneAttributedToCloudMapNamespace: configManager.isServiceDiscoveryPrivateNamespaceRequired
      ? [
          {
            attributionCfResourceLogicalName: cfLogicalNames.serviceDiscoveryPrivateNamespace(),
            namespaceId: GetAtt(cfLogicalNames.serviceDiscoveryPrivateNamespace(), 'Id')
          }
        ]
      : [],
    tagNetworkInterfaceWithSecurityGroup: [
      ...filterResourcesForDevMode(configManager.databases).map(({ name }) => {
        return {
          securityGroupId: Ref(cfLogicalNames.dbSecurityGroup(name)),
          attributionCfResourceLogicalName: cfLogicalNames.dbSubnetGroup(name)
        };
      }),
      ...configManager.allApplicationLoadBalancers.map(({ name }) => {
        return {
          securityGroupId: Ref(cfLogicalNames.loadBalancerSecurityGroup(name)),
          attributionCfResourceLogicalName: cfLogicalNames.loadBalancer(name)
        };
      })
    ]
  };
  return new EventBridgeRule({
    State: 'ENABLED',
    ScheduleExpression: 'rate(2 hours)',
    // Description: eventDetails.description,
    // Name: eventDetails.name,
    Targets: [
      {
        Input: transformIntoCloudformationSubstitutedString(input),
        Arn: GetAtt(configManager.stacktapeServiceLambdaProps.cfLogicalName, 'Arn'),
        Id: 'scheduledService'
      }
    ]
  });
};
