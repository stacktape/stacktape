import { resolveAllResources } from '@domain-services/calculated-stack-overview-manager/synthesize';
import { stringifyToYaml } from '@utils/yaml';
import fsExtra from 'fs-extra';
import { initializeSynthOperation } from '../_utils/initialization';
import { prepareStageNetwork } from '@domain-services/shared-network';

export const commandSynth = async () => {
  const { args, finalizeTemplate, stackContext, template: templateManager, tui } = await initializeSynthOperation();

  await prepareStageNetwork({ stage: stackContext.stage, mode: 'preview' });
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
