import type { Intrinsic } from '@stacktape/cloudformation/intrinsics';
import { cfnResource } from '@stacktape/cloudformation/resource';
import { getAtt } from '@stacktape/cloudformation/intrinsics';

import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { configManager } from '@domain-services/config-manager';
import { resolveReferenceToCustomResourceDefinition } from '@domain-services/config-manager/utils/custom-resource-definitions';
import { cfLogicalNames } from '@stacktape/naming/cloudformation-logical-names';
import { STACKTAPE_SERVICE_CUSTOM_RESOURCE_LAMBDA_IDENTIFIER } from 'src/config/constants';
import { resolveFunction } from '../functions';

export const resolveCustomResources = () => {
  // resolve custom resource definitions (their inner lambdas)
  configManager.customResourceDefinitions.forEach(({ _nestedResources: { backingFunction } }) => {
    resolveFunction({ lambdaProps: backingFunction });
  });

  // resolving user custom resources (this includes deployment-script custom resources)
  configManager.customResourceInstances.forEach(({ name, definitionName, resourceProperties, nameChain }) => {
    let serviceToken: Intrinsic;
    if (definitionName === STACKTAPE_SERVICE_CUSTOM_RESOURCE_LAMBDA_IDENTIFIER) {
      serviceToken = getAtt(configManager.stacktapeServiceLambdaProps.cfLogicalName, 'Arn');
    } else {
      serviceToken = getAtt(
        resolveReferenceToCustomResourceDefinition({
          stpResourceReference: definitionName,
          referencedFrom: name,
          referencedFromType: 'custom-resource-instance'
        })._nestedResources.backingFunction.cfLogicalName,
        'Arn'
      );
    }
    const resource = cfnResource('AWS::CloudFormation::CustomResource', { ServiceToken: serviceToken });
    resource.Properties = { ...resource.Properties, ...resourceProperties };
    calculatedStackOverviewManager.addCfChildResource({
      resource,
      cfLogicalName: cfLogicalNames.customResource(name),
      nameChain
    });
  });
};
