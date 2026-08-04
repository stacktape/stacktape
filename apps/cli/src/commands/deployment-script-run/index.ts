import type { InvokeLambdaReturnValue } from 'src/aws/lambda';
import type { StpDeploymentScript } from '@domain-services/config-manager/resolved-types/deployment-script';
import type { StpResourceType } from '@domain-services/config-manager/resolved-types/resources';
import { eventManager } from '@application-services/event-manager';
import { configManager } from '@domain-services/config-manager';
import { deployedStackOverviewManager } from '@domain-services/deployed-stack-overview-manager';
import { stpErrors } from '@errors';
import { tagNames } from '@stacktape/naming/tag-names';
import { awsSdkManager } from '@utils/aws-sdk-manager';
import { buildAndUpdateFunctionCode } from '../_utils/fn-deployment';
import { initializeStackServicesForHotSwapDeploy } from '../_utils/initialization';

export const commandDeploymentScriptRun = async () => {
  const { args, stackContext } = await initializeStackServicesForHotSwapDeploy();
  const { resourceName } = args;

  validateCorrectResourceExistence({
    resourceName,
    resourceType: 'deployment-script',
    stackName: stackContext.stackName
  });

  const { lambdaArn } = await buildAndUpdateFunctionCode(resourceName);

  await awsSdkManager.lambda.tagFunction({
    lambdaArn,
    tags: [{ key: tagNames.hotSwapDeploy(), value: 'true' }]
  });

  const [scriptParametersResolvedLocally] = await Promise.all([
    configManager.resolveDirectives<StpDeploymentScript['parameters']>({
      itemToResolve: configManager.deploymentScripts.find(({ name }) => name === resourceName).parameters || {},
      resolveRuntime: true,
      useLocalResolve: true
    })
  ]);

  await eventManager.startEvent({
    eventType: 'RUN_DEPLOYMENT_SCRIPT',
    description: `Running deployment script ${resourceName}`
  });
  const response = await awsSdkManager.lambda.invoke({
    lambdaResourceName: lambdaArn,
    payload: scriptParametersResolvedLocally
  });
  const resultMessage = getScriptResultMessage({ stpResourceName: resourceName, response });
  await eventManager.finishEvent({
    eventType: 'RUN_DEPLOYMENT_SCRIPT',
    finalMessage: resultMessage
  });

  return { success: !response.FunctionError, returnedPayload: response.Payload };
};

const getScriptResultMessage = ({
  stpResourceName,
  response
}: {
  stpResourceName: string;
  response: InvokeLambdaReturnValue;
}) => {
  let formattedJsonResponse;
  try {
    formattedJsonResponse = JSON.stringify(JSON.parse(response.Payload), null, 2);
  } catch {
    // do nothing
  }
  if (response.FunctionError) {
    return `Failed. Error from ${stpResourceName}:\n${formattedJsonResponse || response.Payload}`;
  }
  return `Succeeded. Payload:\n${formattedJsonResponse || response.Payload}`;
};

const validateCorrectResourceExistence = ({
  resourceName,
  resourceType,
  stackName
}: {
  resourceName: string;
  resourceType: StpResourceType;
  stackName: string;
}) => {
  const { resource } = configManager.findResourceInConfig({ nameChain: resourceName });
  if (!resource || resource.type !== 'deployment-script') {
    throw stpErrors.e5({ resourceName, resourceType });
  }

  const deployedStpResource = deployedStackOverviewManager.getStpResource({ nameChain: resourceName });
  if (!deployedStpResource || deployedStpResource.resourceType !== resourceType) {
    throw stpErrors.e6({ resourceName, resourceType, stackName });
  }
};
