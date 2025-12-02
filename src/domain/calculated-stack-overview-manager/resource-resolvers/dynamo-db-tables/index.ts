import { GetAtt, Ref } from '@cloudform/functions';
import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { configManager } from '@domain-services/config-manager';
import { cfEvaluatedLinks } from '@shared/naming/cf-evaluated-links';
import { cfLogicalNames } from '@shared/naming/logical-names';
import { getDynamoGlobalTableResource } from './utils';

export const resolveDynamoTables = async () => {
  configManager.dynamoDbTables.forEach((resource) => {
    resolveDynamoDbTable({ resource });
  });
};

export const resolveDynamoDbTable = ({ resource }: { resource: StpDynamoTable }) => {
  calculatedStackOverviewManager.addCfChildResource({
    nameChain: resource.nameChain,
    cfLogicalName: cfLogicalNames.dynamoGlobalTable(resource.name),
    resource: getDynamoGlobalTableResource({ resource })
  });
  // if (resource.provisionedThroughput?.readScaling) {
  //   const metric = 'readScaling';
  //   calculatedStackOverviewManager.addCfChildResource({
  //     nameChain: resource.nameChain,
  //     cfLogicalName: cfLogicalNames.dynamoAutoScalingTarget(resource.name, metric),
  //     resource: getScalableTargetForDynamoTableProvisionedCapacity({ resource, metric })
  //   });
  //   calculatedStackOverviewManager.addCfChildResource({
  //     nameChain: resource.nameChain,
  //     cfLogicalName: cfLogicalNames.autoScalingPolicy(resource.name, metric),
  //     resource: getScalingPolicyForDynamoTableProvisionedCapacity({ resource, metric })
  //   });
  // }
  // if (resource.provisionedThroughput?.writeScaling) {
  //   const metric = 'writeScaling';
  //   calculatedStackOverviewManager.addCfChildResource({
  //     nameChain: resource.nameChain,
  //     cfLogicalName: cfLogicalNames.dynamoAutoScalingTarget(resource.name, metric),
  //     resource: getScalableTargetForDynamoTableProvisionedCapacity({ resource, metric })
  //   });
  //   calculatedStackOverviewManager.addCfChildResource({
  //     nameChain: resource.nameChain,
  //     cfLogicalName: cfLogicalNames.autoScalingPolicy(resource.name, metric),
  //     resource: getScalingPolicyForDynamoTableProvisionedCapacity({ resource, metric })
  //   });
  // }
  calculatedStackOverviewManager.addStacktapeResourceLink({
    linkName: 'metrics',
    nameChain: resource.nameChain,
    linkValue: cfEvaluatedLinks.dynamoTable(Ref(cfLogicalNames.dynamoGlobalTable(resource.name)), 'monitoring')
  });
  calculatedStackOverviewManager.addStacktapeResourceLink({
    linkName: 'table-items',
    nameChain: resource.nameChain,
    linkValue: cfEvaluatedLinks.dynamoItems(Ref(cfLogicalNames.dynamoGlobalTable(resource.name)))
  });
  calculatedStackOverviewManager.addStacktapeResourceReferenceableParam({
    paramName: 'name',
    paramValue: Ref(cfLogicalNames.dynamoGlobalTable(resource.name)),
    nameChain: resource.nameChain,
    showDuringPrint: true
  });
  calculatedStackOverviewManager.addStacktapeResourceReferenceableParam({
    paramName: 'arn',
    paramValue: GetAtt(cfLogicalNames.dynamoGlobalTable(resource.name), 'Arn'),
    nameChain: resource.nameChain,
    showDuringPrint: true
  });
  if (resource.streamType) {
    calculatedStackOverviewManager.addStacktapeResourceReferenceableParam({
      paramName: 'streamArn',
      paramValue: GetAtt(cfLogicalNames.dynamoGlobalTable(resource.name), 'StreamArn'),
      nameChain: resource.nameChain,
      showDuringPrint: true
    });
  }
};
