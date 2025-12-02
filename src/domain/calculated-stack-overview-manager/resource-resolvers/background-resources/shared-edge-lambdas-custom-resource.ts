import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { configManager } from '@domain-services/config-manager';
import { cfLogicalNames } from '@shared/naming/logical-names';
import { PARENT_IDENTIFIER_SHARED_GLOBAL } from '@shared/utils/constants';
import { getEdgeLambdaBucketCustomResource, getEdgeLambdaCustomResource } from '../_utils/edge-lambdas';

export const resolveDefaultEdgeLambdas = () => {
  if (configManager.configContainsCdnDistribution) {
    [configManager.stacktapeOriginRequestLambdaProps, configManager.stacktapeOriginResponseLambdaProps]
      .map(getEdgeLambdaCustomResource)
      .forEach(({ cfLogicalName, resource, nameChain }) =>
        calculatedStackOverviewManager.addCfChildResource({
          resource,
          cfLogicalName,
          nameChain
        })
      );
  }
};

export const resolveDefaultEdgeLambdaBucket = () => {
  if (configManager.configContainsCdnDistribution || configManager.edgeLambdaFunctions.length) {
    calculatedStackOverviewManager.addCfChildResource({
      resource: getEdgeLambdaBucketCustomResource(),
      cfLogicalName: cfLogicalNames.customResourceEdgeLambdaBucket(),
      nameChain: [PARENT_IDENTIFIER_SHARED_GLOBAL]
    });
  }
};
