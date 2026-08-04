import { globalStateManager } from '@application-services/global-state-manager';
import { initUsingExistingConfig } from './using-existing-config';
import { initUsingStarterProject } from './using-starter-project';
import { runInitWizard } from './wizard';

export const commandInit = async () => {
  // Handle --templateId flag (legacy mode - fetch template from console)
  if (globalStateManager.args.templateId) {
    return initUsingExistingConfig();
  }

  // Handle --starterId flag (starter project mode)
  if (globalStateManager.args.starterId || globalStateManager.args.starterProject) {
    return initUsingStarterProject();
  }

  // Default: Run the full init wizard
  return runInitWizard();
};
