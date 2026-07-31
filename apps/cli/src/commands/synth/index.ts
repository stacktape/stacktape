import { globalStateManager } from '@application-services/global-state-manager';
import { tuiManager } from '@application-services/tui-manager';
import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { templateManager } from '@domain-services/template-manager';
import { finalizeTemplate } from '@domain-services/template-manager/finalize';
import { stringifyToYaml } from '@utils/yaml';
import fsExtra from 'fs-extra';
import { initializeAllStackServices } from '../_utils/initialization';

export const commandSynth = async () => {
  await initializeAllStackServices({
    commandModifiesStack: false,
    commandRequiresDeployedStack: false,
    loadGlobalConfig: false,
    requiresControlPlane: false,
    requiresSubscription: false
  });

  await calculatedStackOverviewManager.resolveAllResources();

  await finalizeTemplate();

  const templatePath = globalStateManager.args.outFile || 'compiled-template.yaml';

  const template = templateManager.getTemplate();

  if (globalStateManager.invokedFrom === 'cli') {
    await fsExtra.writeFile(templatePath, stringifyToYaml(template));
    tuiManager.setPendingCompletion({
      success: true,
      message: 'TEMPLATE COMPILED',
      links: []
    });
  }

  return template;
};
