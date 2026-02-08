import { globalStateManager } from '@application-services/global-state-manager';
import { initUsingExistingConfig } from './using-existing-config';
import { initUsingStarterProject } from './using-starter-project';
import { initUsingAiConfigGen } from './using-ai-config-gen';
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

  // Handle --useAi flag (legacy mode - AI config gen only, no wizard)
  if (globalStateManager.args.useAi) {
    return initUsingAiConfigGen({
      configFormat: globalStateManager.args.configFormat as 'yaml' | 'typescript' | undefined,
      infrastructureType: globalStateManager.args.infrastructureType as
        | 'low-cost'
        | 'standard'
        | 'production'
        | undefined
    });
  }

  // Default: Run the full init wizard
  // This is the main flow that guides users from project analysis to deployment
  return runInitWizard();
};
