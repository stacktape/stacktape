import { globalStateManager } from '@application-services/global-state-manager';
import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { templateManager } from '@domain-services/template-manager';
import { stringifyToYaml } from '@shared/utils/yaml';
import fsExtra from 'fs-extra';
import { initializeAllStackServices } from '../_utils/initialization';

export const commandCompileTemplate = async (): Promise<CompileTemplateReturnValue> => {
  await initializeAllStackServices({
    commandModifiesStack: false,
    commandRequiresDeployedStack: false,
    loadGlobalConfig: true,
    requiresSubscription: false
  });

  await calculatedStackOverviewManager.resolveAllResources();

  await templateManager.finalizeTemplate();

  const templatePath = globalStateManager.args.outFile || 'compiled-template.yaml';

  const template = templateManager.getTemplate();

  if (globalStateManager.invokedFrom === 'cli') {
    await fsExtra.writeFile(templatePath, stringifyToYaml(template));
  }

  return template;
};
