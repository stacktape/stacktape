import { globalStateManager } from '@application-services/global-state-manager';
import { tuiManager } from '@application-services/tui-manager';
import { deployedStackOverviewManager } from '@domain-services/deployed-stack-overview-manager';
import { stpErrors } from '@errors';
import { initializeStackServicesForWorkingWithDeployedStack } from '../_utils/initialization';

export const commandParamGet = async () => {
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
    tuiManager.success(
      `Parameter retrieved: ${tuiManager.prettyResourceName(resourceName)}.${tuiManager.prettyConfigProperty(
        paramName
      )}`
    );
    console.info(`${tuiManager.makeBold(`${paramValue}`)}\n`);
  }
  return `${paramValue}`;
};
