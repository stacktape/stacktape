import { globalStateManager } from '@application-services/global-state-manager';
import { tuiManager } from '@application-services/tui-manager';
import { configManager } from '@domain-services/config-manager';
import { packagingManager } from '@domain-services/packaging-manager';
import { loadUserCredentials } from '../_utils/initialization';

export const commandPackageWorkloads = async (): Promise<PackageWorkloadsReturnValue> => {
  await loadUserCredentials();
  await globalStateManager.loadTargetStackInfo();
  await configManager.init({ configRequired: true });

  await packagingManager.init();

  const packagedWorkloads = await packagingManager.packageAllWorkloads({ commandCanUseCache: false });

  tuiManager.success(
    `Packaged compute resources for stack ${tuiManager.prettyStackName(globalStateManager.targetStack.stackName)}.`
  );

  return packagedWorkloads;
};
