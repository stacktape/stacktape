import { globalStateManager } from '@application-services/global-state-manager';
import { configManager } from '@domain-services/config-manager';
import { deployedStackOverviewManager } from '@domain-services/deployed-stack-overview-manager';
import { stpErrors } from '@errors';
import { initializeStackServicesForDev } from '../_utils/initialization';
import { runDevContainer } from './container';
import { runDevLambdaFunction } from './lambda-function';

export const commandDev = async (): Promise<DevReturnValue> => {
  await initializeStackServicesForDev();

  const { resourceName } = globalStateManager.args;

  const { resource: inConfigStpResource } = configManager.findResourceInConfig({ nameChain: resourceName });
  const deployedStpResource = deployedStackOverviewManager.getStpResource({ nameChain: resourceName });

  if (!inConfigStpResource) {
    throw stpErrors.e1({ resourceName });
  }

  if (!deployedStpResource || deployedStpResource.resourceType !== inConfigStpResource.type) {
    throw stpErrors.e6({
      resourceName,
      resourceType: inConfigStpResource.type,
      stackName: globalStateManager.targetStack.stackName
    });
  }

  if (inConfigStpResource.type === 'function') {
    await runDevLambdaFunction();
  } else if (
    inConfigStpResource.type === 'multi-container-workload' ||
    inConfigStpResource.type === 'web-service' ||
    inConfigStpResource.type === 'private-service' ||
    inConfigStpResource.type === 'worker-service'
  ) {
    await runDevContainer();
  } else {
    throw stpErrors.e52({ resourceName, resourceType: inConfigStpResource.type });
  }
};
