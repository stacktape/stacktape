import type { IntrinsicFunction } from '@cloudform/dataTypes';
import CustomResource from '@cloudform/cloudFormation/customResource';
import { GetAtt } from '@cloudform/functions';
import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { configManager } from '@domain-services/config-manager';
import { resolveReferenceToCustomResourceDefinition } from '@domain-services/config-manager/utils/custom-resource-definitions';
import { cfLogicalNames } from '@shared/naming/logical-names';
import { STACKTAPE_SERVICE_CUSTOM_RESOURCE_LAMBDA_IDENTIFIER } from '@shared/utils/constants';
import { resolveFunction } from '../functions';

export const resolveCustomResources = () => {
  // resolve custom resource definitions (their inner lambdas)
  configManager.customResourceDefinitions.forEach(({ _nestedResources: { backingFunction } }) => {
    resolveFunction({ lambdaProps: backingFunction });
  });

  // resolving user custom resources (this includes deployment-script custom resources)
  configManager.customResourceInstances.forEach(({ name, definitionName, resourceProperties, nameChain }) => {
    let serviceToken: IntrinsicFunction;
    if (definitionName === STACKTAPE_SERVICE_CUSTOM_RESOURCE_LAMBDA_IDENTIFIER) {
      serviceToken = GetAtt(configManager.stacktapeServiceLambdaProps.cfLogicalName, 'Arn');
    } else {
      serviceToken = GetAtt(
        resolveReferenceToCustomResourceDefinition({
          stpResourceReference: definitionName,
          referencedFrom: name,
          referencedFromType: 'custom-resource-instance'
        })._nestedResources.backingFunction.cfLogicalName,
        'Arn'
      );
    }
    const resource = new CustomResource({ ServiceToken: serviceToken });
    resource.Properties = { ...resource.Properties, ...resourceProperties };
    calculatedStackOverviewManager.addCfChildResource({
      resource,
      cfLogicalName: cfLogicalNames.customResource(name),
      nameChain
    });
  });
};
