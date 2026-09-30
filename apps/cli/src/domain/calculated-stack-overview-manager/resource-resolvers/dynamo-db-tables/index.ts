import { getAtt, ref } from '@stacktape/cloudformation/intrinsics';
import type { StpDynamoTable } from '@domain-services/config-manager/resolved-types/dynamo-db-tables';
import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { configManager } from '@domain-services/config-manager';
import { filterResourcesForDevMode } from '@domain-services/config-manager/dev-mode';
import { cfEvaluatedLinks } from '@domain-services/calculated-stack-overview-manager/cloudformation-links';
import { cfLogicalNames } from '@stacktape/naming/cloudformation-logical-names';
import { getDynamoGlobalTableResource } from './utils';

export const resolveDynamoTables = async () => {
  const dynamoDbTables = filterResourcesForDevMode(configManager.dynamoDbTables, configManager.deploymentContext);
  dynamoDbTables.forEach((resource) => {
    resolveDynamoDbTable({ resource });
  });
};

export const resolveDynamoDbTable = ({ resource }: { resource: StpDynamoTable }) => {
  calculatedStackOverviewManager.addCfChildResource({
    nameChain: resource.nameChain,
    cfLogicalName: cfLogicalNames.dynamoGlobalTable(resource.name),
    resource: getDynamoGlobalTableResource({ resource })
  });
  calculatedStackOverviewManager.addStacktapeResourceLink({
    linkName: 'metrics',
    nameChain: resource.nameChain,
    linkValue: cfEvaluatedLinks.dynamoTable(ref(cfLogicalNames.dynamoGlobalTable(resource.name)), 'monitoring')
  });
  calculatedStackOverviewManager.addStacktapeResourceLink({
    linkName: 'table-items',
    nameChain: resource.nameChain,
    linkValue: cfEvaluatedLinks.dynamoItems(ref(cfLogicalNames.dynamoGlobalTable(resource.name)))
  });
  calculatedStackOverviewManager.addStacktapeResourceReferenceableParam({
    paramName: 'name',
    paramValue: ref(cfLogicalNames.dynamoGlobalTable(resource.name)),
    nameChain: resource.nameChain,
    showDuringPrint: true
  });
  calculatedStackOverviewManager.addStacktapeResourceReferenceableParam({
    paramName: 'arn',
    paramValue: getAtt(cfLogicalNames.dynamoGlobalTable(resource.name), 'Arn'),
    nameChain: resource.nameChain,
    showDuringPrint: true
  });
  if (resource.streamType) {
    calculatedStackOverviewManager.addStacktapeResourceReferenceableParam({
      paramName: 'streamArn',
      paramValue: getAtt(cfLogicalNames.dynamoGlobalTable(resource.name), 'StreamArn'),
      nameChain: resource.nameChain,
      showDuringPrint: true
    });
  }
};
