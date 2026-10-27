import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { configManager } from '@domain-services/config-manager';
import { filterResourcesForDevMode } from '@domain-services/config-manager/dev-mode';
import { cfLogicalNames } from '@stacktape/naming/cloudformation-logical-names';
import { PARENT_IDENTIFIER_SHARED_GLOBAL } from 'src/config/constants';
import { getEdgeLambdaBucketCustomResource, getEdgeLambdaCustomResource } from '../_utils/edge-lambdas';

export const resolveDefaultEdgeLambdas = () => {
  if (configManager.configContainsCdnDistribution) {
    [
      ...(configManager.configNeedsStacktapeOriginRequestLambda
        ? [configManager.stacktapeOriginRequestLambdaProps]
        : []),
      ...(configManager.configNeedsStacktapeOriginResponseLambda
        ? [configManager.stacktapeOriginResponseLambdaProps]
        : [])
    ]
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

/**
 * The bucket resource owns the us-east-1 bucket that edge Lambda code is deployed from and deletes it with the stack.
 * Every deployed edge Lambda needs it, including the server edge Lambda of a Next.js site, which is not a top-level
 * resource.
 */
export const resolveDefaultEdgeLambdaBucket = () => {
  if (
    configManager.configNeedsStacktapeOriginRequestLambda ||
    configManager.configNeedsStacktapeOriginResponseLambda ||
    configManager.edgeLambdaFunctions.length ||
    filterResourcesForDevMode(configManager.nextjsWebs, configManager.deploymentContext).some(
      ({ _nestedResources }) => _nestedResources.serverEdgeFunction
    )
  ) {
    calculatedStackOverviewManager.addCfChildResource({
      resource: getEdgeLambdaBucketCustomResource(),
      cfLogicalName: cfLogicalNames.customResourceEdgeLambdaBucket(),
      nameChain: [PARENT_IDENTIFIER_SHARED_GLOBAL]
    });
  }
};
