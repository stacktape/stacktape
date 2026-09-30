import { resolveAllResources } from '@domain-services/calculated-stack-overview-manager/synthesize';
import { stringifyToYaml } from '@utils/yaml';
import fsExtra from 'fs-extra';
import { initializeSynthOperation } from '../_utils/initialization';

export const commandSynth = async () => {
  const { args, finalizeTemplate, template: templateManager, tui } = await initializeSynthOperation();

  await resolveAllResources();

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
