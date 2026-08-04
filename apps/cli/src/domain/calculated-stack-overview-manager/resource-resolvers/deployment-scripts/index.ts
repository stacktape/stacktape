import { cfnResource } from '@stacktape/cloudformation/resource';
import { getAtt, ref } from '@stacktape/cloudformation/intrinsics';
import type { StpServiceCustomResourceProperties } from '@helper-lambdas/stacktapeServiceLambda/custom-resource-types';
import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { configManager } from '@domain-services/config-manager';
import { cfLogicalNames } from '@stacktape/naming/cloudformation-logical-names';
import { resolveFunction } from '../functions';

export const resolveDeploymentScripts = () => {
  configManager.deploymentScripts.forEach(({ _nestedResources: { scriptFunction }, ...deploymentScript }) => {
    resolveFunction({ lambdaProps: scriptFunction });
    const customResource = cfnResource('AWS::CloudFormation::CustomResource', {
      ServiceToken: getAtt(configManager.stacktapeServiceLambdaProps.cfLogicalName, 'Arn')
    });
    const customResourceProperties: Pick<StpServiceCustomResourceProperties, 'scriptFunction'> & {
      forceUpdate: number;
    } = {
      scriptFunction: {
        functionName: ref(scriptFunction.cfLogicalName),
        triggerType: deploymentScript.trigger,
        parameters: deploymentScript.parameters || {}
      },
      forceUpdate: Date.now()
    };
    customResource.Properties = { ...customResource.Properties, ...customResourceProperties };
    calculatedStackOverviewManager.addCfChildResource({
      cfLogicalName: cfLogicalNames.customResource(deploymentScript.name),
      nameChain: deploymentScript.nameChain,
      resource: customResource
    });
  });
};
