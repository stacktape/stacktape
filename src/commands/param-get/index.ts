import { globalStateManager } from '@application-services/global-state-manager';
import { deployedStackOverviewManager } from '@domain-services/deployed-stack-overview-manager';
import { stpErrors } from '@errors';
import { printer } from '@utils/printer';
import { initializeStackServicesForWorkingWithDeployedStack } from '../_utils/initialization';

export const commandParamGet = async (): Promise<ParamGetReturnValue> => {
  const resourceName = globalStateManager.args.resourceName;
  const paramName = globalStateManager.args.paramName;
  // we do not need to initialize all services yet
  // in case we only need to print existing stack non-detailed info, this is enough
  await initializeStackServicesForWorkingWithDeployedStack({
    commandModifiesStack: false,
    commandRequiresConfig: false
  });
  const resource = deployedStackOverviewManager.stackInfoMap.resources[resourceName];
  if (!resource) {
    throw stpErrors.e77({ stackName: globalStateManager.targetStack.stackName, resourceName });
  }
  const param =
    deployedStackOverviewManager.stackInfoMap.resources[resourceName].referencableParams[
      paramName as StacktapeResourceReferenceableParam
    ];
  if (!param) {
    throw stpErrors.e78({
      resourceName,
      resourceParamName: paramName,
      resourceType: resource.resourceType as StpResourceType,
      referenceableParams: Object.keys(resource.referencableParams)
    });
  }
  const paramValue = param.value;
  if (globalStateManager.invokedFrom === 'cli') {
    printer.success(
      `Successfully retrieved parameter ${printer.prettyResourceName(resourceName)}.${printer.prettyResourceParamName(
        paramName
      )}\n`
    );
    console.info(`${printer.makeBold(`${paramValue}`)}\n`);
  }
  return `${paramValue}`;
};
