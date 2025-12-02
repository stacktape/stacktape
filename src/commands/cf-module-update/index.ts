import { cloudformationRegistryManager } from '@domain-services/cloudformation-registry-manager';
import { userPrompt } from '@shared/utils/user-prompt';
import { loadUserCredentials } from '../_utils/initialization';

const allowedModules: StpCfInfrastructureModuleType[] = ['atlasMongo', 'upstashRedis', 'ecsBlueGreen'];

export const commandCfModuleUpdate = async () => {
  const { moduleType } = await userPrompt({
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
