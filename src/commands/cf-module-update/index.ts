import { tuiManager } from '@application-services/tui-manager';
import { cloudformationRegistryManager } from '@domain-services/cloudformation-registry-manager';
import { loadUserCredentials } from '../_utils/initialization';

const allowedModules: StpCfInfrastructureModuleType[] = ['atlasMongo', 'upstashRedis', 'ecsBlueGreen'];

export const commandCfModuleUpdate = async () => {
  const moduleType = await tuiManager.promptSelect({
    message: 'Choose a module you wish to update:',
    options: allowedModules.map((mod) => ({ label: mod, value: mod }))
  });
  await loadUserCredentials();

  const initSpinner = tuiManager.createSpinner({ text: 'Initializing CloudFormation registry' });
  await Promise.all([cloudformationRegistryManager.init()]);
  initSpinner.success({ text: 'CloudFormation registry initialized' });

  const loadSpinner = tuiManager.createSpinner({
    text: `Loading private types for ${tuiManager.makeBold(moduleType)}`
  });
  await cloudformationRegistryManager.loadPrivateTypesAndPackages([moduleType as StpCfInfrastructureModuleType]);
  loadSpinner.success({ text: `Loaded private types for ${tuiManager.makeBold(moduleType)}` });

  const registerSpinner = tuiManager.createSpinner({
    text: `Registering newest version of ${tuiManager.makeBold(moduleType)}`
  });
  try {
    await cloudformationRegistryManager.registerNewestAvailablePrivateTypes({
      infrastructureModuleType: moduleType as StpCfInfrastructureModuleType
    });
    registerSpinner.success({ text: `Module ${tuiManager.makeBold(moduleType)} updated` });
  } catch (error) {
    registerSpinner.error(`Failed to register ${moduleType}`);
    throw error;
  }
};
