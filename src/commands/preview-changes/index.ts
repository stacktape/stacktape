import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { stackManager } from '@domain-services/cloudformation-stack-manager';
import { packagingManager } from '@domain-services/packaging-manager';
import { templateManager } from '@domain-services/template-manager';
import { stringifyToYaml } from '@shared/utils/yaml';
import { initializeAllStackServices } from '../_utils/initialization';

export const commandPreviewChanges = async (): Promise<PreviewChangesReturnValue> => {
  await initializeAllStackServices({ commandModifiesStack: false, commandRequiresDeployedStack: true });

  await packagingManager.packageAllWorkloads({ commandCanUseCache: true });
  await calculatedStackOverviewManager.resolveAllResources();
  await calculatedStackOverviewManager.populateStackMetadata();
  await templateManager.finalizeTemplate();

  await stackManager.validateTemplate({
    templateBody: stringifyToYaml(templateManager.getTemplate())
  });

  const { changes } = await stackManager.getChangeSet({
    templateBody: stringifyToYaml(templateManager.getTemplate())
  });

  // eslint-disable-next-line no-console
  console.dir(changes, { depth: 7 });

  // @todo-return-value
  return null;
};
