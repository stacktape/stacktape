import { stringifyToYaml } from '@utils/yaml';
import fsExtra from 'fs-extra';
import { initializeAllStackServices } from '../_utils/initialization';

export const commandSynth = async () => {
  const {
    args,
    services: { calculatedStackOverview, finalizeTemplate, template: templateManager, tui }
  } = await initializeAllStackServices({
    commandModifiesStack: false,
    commandRequiresDeployedStack: false,
    loadGlobalConfig: false,
    requiresControlPlane: false,
    requiresSubscription: false
  });

  await calculatedStackOverview.resolveAllResources();

  await finalizeTemplate();

  const templatePath = args.outFile || 'compiled-template.yaml';

  const template = templateManager.getTemplate();

  await fsExtra.writeFile(templatePath, stringifyToYaml(template));
  tui.setPendingCompletion({
    success: true,
    message: 'TEMPLATE COMPILED',
    links: []
  });

  return template;
};
