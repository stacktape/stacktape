import type {
  StacktapeResourceReferenceableParam,
  StpResourceType
} from '@domain-services/config-manager/resolved-types/resources';
import { tuiManager } from '@application-services/tui-manager';
import { deployedStackOverviewManager } from '@domain-services/deployed-stack-overview-manager';
import { deployedResourceNotFoundError } from '@domain-services/deployed-stack-overview-manager/errors';
import type { StackInfoMapResource } from '@domain-services/stack-info/types';
import { CliError } from '@utils/errors';
import { initializeStackServicesForWorkingWithDeployedStack } from '../_utils/initialization';

export const commandParamGet = async () => {
  // we do not need to initialize all services yet
  // in case we only need to print existing stack non-detailed info, this is enough
  const { args, stackContext } = await initializeStackServicesForWorkingWithDeployedStack({
    commandModifiesStack: false,
    commandRequiresConfig: false
  });
  const { paramName, resourceName } = args;
  const param = resolveReferenceableParam({
    resource: deployedStackOverviewManager.stackInfoMap.resources[resourceName],
    resourceName,
    paramName,
    stackName: stackContext.stackName
  });
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

type ReferenceableParamResource = Pick<StackInfoMapResource, 'referencableParams' | 'resourceType'>;

export const resolveReferenceableParam = ({
  resource,
  resourceName,
  paramName,
  stackName
}: {
  resource: ReferenceableParamResource | undefined;
  resourceName: string;
  paramName: string;
  stackName: string;
}) => {
  if (!resource) {
    throw deployedResourceNotFoundError({ stackName, resourceName });
  }
  const param = resource.referencableParams[paramName as StacktapeResourceReferenceableParam];
  if (!param) {
    const referenceableParams = Object.keys(resource.referencableParams);
    throw new CliError({
      category: 'PARAMETER',
      code: 'RESOURCE_PARAMETER_NOT_REFERENCEABLE',
      message: `Parameter \`${paramName}\` is not referenceable on resource \`${resourceName}\` of type \`${resource.resourceType as StpResourceType}\`.`,
      hints: `Referenceable parameters: ${referenceableParams.map((name) => `\`${name}\``).join(', ') || 'none'}.`
    });
  }
  return param;
};
