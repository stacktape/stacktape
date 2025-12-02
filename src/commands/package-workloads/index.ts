import { globalStateManager } from '@application-services/global-state-manager';
import { configManager } from '@domain-services/config-manager';
import { packagingManager } from '@domain-services/packaging-manager';
import { printer } from '@utils/printer';
import { loadUserCredentials } from '../_utils/initialization';

export const commandPackageWorkloads = async (): Promise<PackageWorkloadsReturnValue> => {
  await loadUserCredentials();
  await globalStateManager.loadTargetStackInfo();
  await configManager.init({ configRequired: true });

  await packagingManager.init();

  const packagedWorkloads = await packagingManager.packageAllWorkloads({ commandCanUseCache: false });

  printer.info(`Successfully packaged compute resources for stack ${globalStateManager.targetStack.stackName}.`);

  return packagedWorkloads;
};
