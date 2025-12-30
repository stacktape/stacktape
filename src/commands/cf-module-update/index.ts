import { tuiManager } from '@application-services/tui-manager';
import { cloudformationRegistryManager } from '@domain-services/cloudformation-registry-manager';
import { loadUserCredentials } from '../_utils/initialization';

const allowedModules: StpCfInfrastructureModuleType[] = ['atlasMongo', 'upstashRedis', 'ecsBlueGreen'];

export const commandCfModuleUpdate = async () => {
  const { moduleType } = await tuiManager.prompt({
    type: 'select',
    choices: allowedModules.map((mod) => ({ title: mod, value: mod })),
    name: 'moduleType',
    message: 'Choose a module you wish to update:'
  });
  await loadUserCredentials();
  await Promise.all([cloudformationRegistryManager.init()]);

  await cloudformationRegistryManager.loadPrivateTypesAndPackages([moduleType]);

  await cloudformationRegistryManager.registerNewestAvailablePrivateTypes({ infrastructureModuleType: moduleType });
};
