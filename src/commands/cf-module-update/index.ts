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
  await Promise.all([cloudformationRegistryManager.init()]);

  await cloudformationRegistryManager.loadPrivateTypesAndPackages([moduleType as StpCfInfrastructureModuleType]);

  await cloudformationRegistryManager.registerNewestAvailablePrivateTypes({
    infrastructureModuleType: moduleType as StpCfInfrastructureModuleType
  });
};
