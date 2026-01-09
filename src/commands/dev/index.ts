import { globalStateManager } from '@application-services/global-state-manager';
import { tuiManager } from '@application-services/tui-manager';
import { configManager } from '@domain-services/config-manager';
import { deployedStackOverviewManager } from '@domain-services/deployed-stack-overview-manager';
import { stpErrors } from '@errors';
import { getError } from '@shared/utils/misc';
import { initializeStackServicesForDevPhase1, initializeStackServicesForDevPhase2 } from '../_utils/initialization';
import { runDevContainer } from './container';
import { runDevLambdaFunction } from './lambda-function';

const getDevCompatibleResources = () => {
  const containerWorkloads = configManager.allContainerWorkloads.map((r) => ({
    name: r.nameChain[0],
    type: r.configParentResourceType
  }));
  const functions = configManager.functions.map((f) => ({
    name: f.name,
    type: 'function' as const
  }));
  return [...containerWorkloads, ...functions];
};

export const commandDev = async (): Promise<DevReturnValue> => {
  // Phase 1: credentials, config, packagingManager - enough to start building
  await initializeStackServicesForDevPhase1();

  let { resourceName } = globalStateManager.args;

  // If resourceName not provided, prompt user to select from available resources
  if (!resourceName) {
    const devCompatibleResources = getDevCompatibleResources();
    if (devCompatibleResources.length === 0) {
      throw getError({
        type: 'CLI',
        message: 'No dev-compatible resources found in your config.',
        hint: 'Add a function or container workload (web-service, worker-service, etc.) to use the dev command.'
      });
    }
    if (devCompatibleResources.length === 1) {
      resourceName = devCompatibleResources[0].name;
    } else {
      // Start TUI for interactive prompt (dev command skips tuiManager.start() by default)
      tuiManager.start();
      resourceName = await tuiManager.promptSelect({
        message: 'Select a resource to run in dev mode',
        options: devCompatibleResources.map((r) => ({
          label: `${r.name} (${r.type})`,
          value: r.name
        }))
      });
      await tuiManager.stop();
    }
    globalStateManager.args.resourceName = resourceName;
  }

  const { resource: inConfigStpResource } = configManager.findResourceInConfig({ nameChain: resourceName });

  if (!inConfigStpResource) {
    throw stpErrors.e1({ resourceName });
  }

  if (inConfigStpResource.type === 'function') {
    // For lambdas, run phase 2 first (need deployed stack info before running)
    const spinner = tuiManager.createSpinner({ text: 'Loading metadata from AWS' });
    await initializeStackServicesForDevPhase2();
    spinner.success();
    const deployedStpResource = deployedStackOverviewManager.getStpResource({ nameChain: resourceName });
    if (!deployedStpResource || deployedStpResource.resourceType !== inConfigStpResource.type) {
      throw stpErrors.e6({
        resourceName,
        resourceType: inConfigStpResource.type,
        stackName: globalStateManager.targetStack.stackName
      });
    }
    await runDevLambdaFunction();
  } else if (
    inConfigStpResource.type === 'multi-container-workload' ||
    inConfigStpResource.type === 'web-service' ||
    inConfigStpResource.type === 'private-service' ||
    inConfigStpResource.type === 'worker-service'
  ) {
    // For containers, run phase 2 in parallel with build
    await runDevContainer();
  } else {
    throw stpErrors.e52({ resourceName, resourceType: inConfigStpResource.type });
  }
};
