import { basename, isAbsolute, join } from 'node:path';
import { tuiManager } from '@application-services/tui-manager';
import { IS_DEV } from '@config';
import { stpErrors } from '@errors';
import { outputFile } from 'fs-extra';
import { captureCommandArgs, initializeControlPlaneOperation } from '../../_utils/initialization';
import { getTypescriptConfig } from './utils';
import { printInitPreflight } from '../utils/ui';

export const initUsingExistingConfig = async () => {
  const args = captureCommandArgs();
  const projectDirectory = args.projectDirectory;
  const cwd = projectDirectory
    ? isAbsolute(projectDirectory)
      ? projectDirectory
      : join(process.cwd(), projectDirectory)
    : process.cwd();
  const projectName = basename(cwd);
  printInitPreflight({ projectName, mode: 'template-import' });

  const { apiClient, workingDir } = await initializeControlPlaneOperation({ args });

  const sourceCodePath = join(workingDir, projectDirectory || '');

  const subfolder = IS_DEV ? '_debug-test' : '';

  const templatePath = join(
    sourceCodePath,
    subfolder,
    args.configFormat === 'typescript' ? 'stacktape.ts' : 'stacktape.yml'
  );

  let templateId = args.templateId;
  if (!templateId) {
    templateId = await tuiManager.promptText({
      message: 'Template ID:',
      description: `(from ${tuiManager.terminalLink('https://console.stacktape.com/template-editor', 'console')} -> Copy templateId)`
    });
  }

  let template;
  try {
    template = await apiClient.template({ templateId: templateId.trim() });
  } catch {
    throw stpErrors.e509({ templateId });
  }
  if (args.configFormat === 'typescript') {
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
