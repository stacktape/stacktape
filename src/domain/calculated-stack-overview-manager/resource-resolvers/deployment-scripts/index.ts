import CustomResource from '@cloudform/cloudFormation/customResource';
import { GetAtt, Ref } from '@cloudform/functions';
import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { configManager } from '@domain-services/config-manager';
import { cfLogicalNames } from '@shared/naming/logical-names';
import { resolveFunction } from '../functions';

export const resolveDeploymentScripts = () => {
  configManager.deploymentScripts.forEach(({ _nestedResources: { scriptFunction }, ...deploymentScript }) => {
    resolveFunction({ lambdaProps: scriptFunction });
    const customResource = new CustomResource({
      ServiceToken: GetAtt(configManager.stacktapeServiceLambdaProps.cfLogicalName, 'Arn')
    });
    const customResourceProperties: Pick<StpServiceCustomResourceProperties, 'scriptFunction'> & {
      forceUpdate: number;
    } = {
      scriptFunction: {
        functionName: Ref(scriptFunction.cfLogicalName),
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
