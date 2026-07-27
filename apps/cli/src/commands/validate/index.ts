import { globalStateManager } from '@application-services/global-state-manager';
import { tuiManager } from '@application-services/tui-manager';
import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { configManager } from '@domain-services/config-manager';
import { validateGuardrails } from '@domain-services/config-manager/utils/validation';
import { packagingManager } from '@domain-services/packaging-manager';
import { stackManager } from '@domain-services/cloudformation-stack-manager';
import { templateManager } from '@domain-services/template-manager';
import { stringifyToYaml } from '@shared/utils/yaml';
import { initializeAllStackServices } from '../_utils/initialization';

export const commandValidate = async () => {
  const { withPackage, thorough } = globalStateManager.args as StacktapeCliArgs;
  const shouldPackage = Boolean(withPackage || thorough);

  await initializeAllStackServices({
    commandModifiesStack: false,
    commandRequiresDeployedStack: false,
    loadGlobalConfig: true,
    requiresSubscription: false
  });

  validateGuardrails({ guardrails: configManager.guardrails, hasConfig: true });

  let packagedWorkloads: PackageWorkloadOutput[] | undefined;
  if (shouldPackage) {
    packagedWorkloads = await packagingManager.packageAllWorkloads({
      commandCanUseCache: false
    });
  }

  await calculatedStackOverviewManager.resolveAllResources();
  await templateManager.finalizeTemplate();

  const template = templateManager.getTemplate();
  if (thorough) {
    await stackManager.validateTemplate({ templateBody: stringifyToYaml(template) });
  }

  if (globalStateManager.invokedFrom === 'cli') {
    const details = [
      'config',
      'resources',
      'template',
      shouldPackage && 'packaging',
      thorough && 'cloudformation'
    ].filter(Boolean);
    tuiManager.setPendingCompletion({
      success: true,
      message: `VALIDATION SUCCESSFUL (${details.join(', ')})`,
      links: []
    });
  }

  return {
    valid: true,
    checked: {
      config: true,
      resources: true,
      template: true,
      packaging: shouldPackage,
      cloudformation: Boolean(thorough)
    },
    ...(packagedWorkloads ? { packagedWorkloads } : {})
  };
};
