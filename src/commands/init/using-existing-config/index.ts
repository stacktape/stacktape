import { join } from 'node:path';
import { globalStateManager } from '@application-services/global-state-manager';
import { stacktapeTrpcApiManager } from '@application-services/stacktape-trpc-api-manager';
import { IS_DEV } from '@config';
import { stpErrors } from '@errors';
import { getTypescriptConfig } from '@shared/utils/stacktape-config';
import { userPrompt } from '@shared/utils/user-prompt';
import { tuiManager } from '@utils/tui';
import { outputFile } from 'fs-extra';

export const initUsingExistingConfig = async () => {
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
    const res = await userPrompt({
      type: 'text',
      name: 'templateId',
      message: 'TemplateId (available at https://console.stacktape.com/template-editor) -> Click Copy templateId button'
    });
    templateId = res.templateId;
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

  tuiManager.success(`Template successfully initialized to ${tuiManager.prettyFilePath(templatePath)}`);
};
