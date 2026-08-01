import type {
  StacktapeResourceReferenceableParam,
  StpResourceType
} from '@domain-services/config-manager/resolved-types/resources';
import { tuiManager } from '@application-services/tui-manager';
import { deployedStackOverviewManager } from '@domain-services/deployed-stack-overview-manager';
import { stpErrors } from '@errors';
import { initializeStackServicesForWorkingWithDeployedStack } from '../_utils/initialization';

export const commandParamGet = async () => {
  // we do not need to initialize all services yet
  // in case we only need to print existing stack non-detailed info, this is enough
  const { args, stackContext } = await initializeStackServicesForWorkingWithDeployedStack({
    commandModifiesStack: false,
    commandRequiresConfig: false
  });
  const { paramName, resourceName } = args;
  const resource = deployedStackOverviewManager.stackInfoMap.resources[resourceName];
  if (!resource) {
    throw stpErrors.e77({ stackName: stackContext.stackName, resourceName });
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
  const isSensitive = Boolean(param.ssmParameterName);
  const shouldShowSensitiveValue = Boolean(args.showSensitiveValues);
  const paramValue = isSensitive && !shouldShowSensitiveValue ? '<<OMITTED>>' : param.value;
  tuiManager.success(
    `Parameter retrieved: ${tuiManager.prettyResourceName(resourceName)}.${tuiManager.prettyConfigProperty(paramName)}`
  );
  if (isSensitive && !shouldShowSensitiveValue) {
    tuiManager.warn('This parameter is sensitive. Re-run with --showSensitiveValues to print the value.');
  }
  tuiManager.printLines([`${tuiManager.makeBold(`${paramValue}`)}`, '']);
  return `${paramValue}`;
};
