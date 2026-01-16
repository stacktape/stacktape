import { globalStateManager } from '@application-services/global-state-manager';
import { tuiManager } from '@application-services/tui-manager';
import { configManager } from '@domain-services/config-manager';
import { deployedStackOverviewManager } from '@domain-services/deployed-stack-overview-manager';
import { stpErrors } from '@errors';
import { getError } from '@shared/utils/misc';
import { initializeStackServicesForDevPhase1, initializeStackServicesForDevPhase2 } from '../_utils/initialization';
import { runDevContainer } from './container';
import { runDevHostingBucket } from './hosting-bucket';
import { runDevLambdaFunction } from './lambda-function';
import { getLocalEmulateableResources } from './local-resources';
import { runDevNextjsWeb } from './nextjs-web';
import { runParallelWorkloads } from './parallel-runner';

type DevCompatibleResource = {
  name: string;
  type: string;
  category: 'container' | 'function' | 'hosting-bucket' | 'nextjs-web';
};

const getDevCompatibleResources = (): DevCompatibleResource[] => {
  const containerWorkloads = configManager.allContainerWorkloads.map((r) => ({
    name: r.nameChain[0],
    type: r.configParentResourceType,
    category: 'container' as const
  }));
  const functions = configManager.functions.map((f) => ({
    name: f.name,
    type: 'function' as const,
    category: 'function' as const
  }));
  const hostingBuckets = configManager.hostingBuckets
    .filter((b) => b.dev) // Only include hosting buckets with dev config
    .map((b) => ({
      name: b.name,
      type: 'hosting-bucket' as const,
      category: 'hosting-bucket' as const
    }));
  const nextjsWebs = configManager.nextjsWebs.map((n) => ({
    name: n.name,
    type: 'nextjs-web' as const,
    category: 'nextjs-web' as const
  }));
  return [...containerWorkloads, ...functions, ...hostingBuckets, ...nextjsWebs];
};

const isContainerType = (type: string) => {
  return ['multi-container-workload', 'web-service', 'private-service', 'worker-service'].includes(type);
};

const runSingleResource = async (resourceName: string): Promise<void> => {
  const { resource: inConfigStpResource } = configManager.findResourceInConfig({ nameChain: resourceName });

  if (!inConfigStpResource) {
    throw stpErrors.e1({ resourceName });
  }

  globalStateManager.args.resourceName = resourceName;

  if (inConfigStpResource.type === 'function') {
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
  } else if (isContainerType(inConfigStpResource.type)) {
    await runDevContainer();
  } else if (inConfigStpResource.type === 'hosting-bucket') {
    await runDevHostingBucket();
  } else if (inConfigStpResource.type === 'nextjs-web') {
    await runDevNextjsWeb();
  } else {
    throw stpErrors.e52({ resourceName, resourceType: inConfigStpResource.type });
  }
};

export const commandDev = async (): Promise<DevReturnValue> => {
  await initializeStackServicesForDevPhase1();

  const { resourceName } = globalStateManager.args;
  const devCompatibleResources = getDevCompatibleResources();
  const emulateableResources = getLocalEmulateableResources();

  if (devCompatibleResources.length === 0) {
    throw getError({
      type: 'CLI',
      message: 'No dev-compatible resources found in your config.',
      hint: 'Add a function or container workload (web-service, worker-service, etc.) to use the dev command.'
    });
  }

  // Handle --resourceName all
  if (resourceName === 'all') {
    const resourceNames = devCompatibleResources.map((r) => r.name);
    tuiManager.info(`Running all ${resourceNames.length} dev-compatible resources: ${resourceNames.join(', ')}`);
    await runMultipleResources(devCompatibleResources);
    return;
  }

  // If resourceName provided, run single resource
  if (resourceName) {
    await runSingleResource(resourceName);
    return;
  }

  // No resourceName - prompt for selection
  if (devCompatibleResources.length === 1) {
    await runSingleResource(devCompatibleResources[0].name);
    return;
  }

  // Add 'all' option to run all resources
  const selectOptions = [
    { label: 'All resources', value: 'all' },
    ...devCompatibleResources.map((r) => ({
      label: `${r.name} (${r.type})`,
      value: r.name
    }))
  ];

  tuiManager.start();
  const selectedName = await tuiManager.promptSelect({
    message: 'Select resource(s) to run in dev mode',
    options: selectOptions
  });
  await tuiManager.stop();

  if (selectedName === 'all') {
    tuiManager.info(
      `Running all ${devCompatibleResources.length} dev-compatible resources: ${devCompatibleResources.map((r) => r.name).join(', ')}`
    );
    await runMultipleResources(devCompatibleResources);
    return;
  }

  await runSingleResource(selectedName);
};

const runMultipleResources = async (resources: DevCompatibleResource[]): Promise<void> => {
  if (resources.length === 1) {
    await runSingleResource(resources[0].name);
    return;
  }

  await runParallelWorkloads(resources);
};
