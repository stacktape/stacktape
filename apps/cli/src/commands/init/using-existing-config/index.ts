import { basename, isAbsolute, join } from 'node:path';
import { globalStateManager } from '@application-services/global-state-manager';
import { stacktapeTrpcApiManager } from '@application-services/stacktape-trpc-api-manager';
import { tuiManager } from '@application-services/tui-manager';
import { IS_DEV } from '@config';
import { stpErrors } from '@errors';
import { outputFile } from 'fs-extra';
import { getTypescriptConfig } from './utils';
import { printInitPreflight } from '../utils/ui';

export const initUsingExistingConfig = async () => {
  const projectDirectory = globalStateManager.args.projectDirectory;
  const cwd = projectDirectory
    ? isAbsolute(projectDirectory)
      ? projectDirectory
      : join(process.cwd(), projectDirectory)
    : process.cwd();
  const projectName = basename(cwd);
  printInitPreflight({ projectName, mode: 'template-import' });

  await stacktapeTrpcApiManager.init({ apiKey: globalStateManager.apiKey });

  const sourceCodePath = join(globalStateManager.workingDir, globalStateManager.args.projectDirectory || '');

  const subfolder = IS_DEV ? '_debug-test' : '';

  const templatePath = join(
    sourceCodePath,
    subfolder,
    globalStateManager.args.configFormat === 'typescript' ? 'stacktape.ts' : 'stacktape.yml'
  );

  let templateId = globalStateManager.args.templateId;
  if (!templateId) {
    templateId = await tuiManager.promptText({
      message: 'Template ID:',
      description: `(from ${tuiManager.terminalLink('https://console.stacktape.com/template-editor', 'console')} -> Copy templateId)`
    });
  }

  let template;
  try {
    template = await stacktapeTrpcApiManager.apiClient.template({ templateId: templateId.trim() });
  } catch {
    throw stpErrors.e509({ templateId });
  }
  if (globalStateManager.args.configFormat === 'typescript') {
    template.content = getTypescriptConfig(template.content);
  }

  await outputFile(templatePath, template.content);
  tuiManager.printBox({
    title: 'Configuration',
    lines: [
      `✓ Configuration generated to ${tuiManager.prettyFilePath(templatePath)}`,
      '',
      'Setup mode: Template import (no AI project analysis).',
      '',
      tuiManager.makeBold('Next steps:'),
      `  ${tuiManager.prettyCommand('deploy --projectName {projectName} --stage {stage} --region {region}')}`
    ]
  });
};
