import type { PackageWorkloadOutput } from '@domain-services/packaging-manager/types';
import { stringifyToYaml } from '@utils/yaml';
import { initializeValidateOperation } from '../_utils/initialization';

export const commandValidate = async () => {
  const {
    args: { thorough, withPackage },
    calculatedStackOverview,
    config,
    finalizeTemplate,
    packaging,
    stack,
    template,
    tui
  } = await initializeValidateOperation();
  const shouldPackage = Boolean(withPackage || thorough);

  config.validateGuardrails({ hasConfig: true });

  let packagedWorkloads: PackageWorkloadOutput[] | undefined;
  if (shouldPackage) {
    packagedWorkloads = await packaging.packageAllWorkloads({
      commandCanUseCache: false
    });
  }

  await calculatedStackOverview.resolveAllResources();
  await finalizeTemplate();

  const synthesizedTemplate = template.getTemplate();
  if (thorough) {
    await stack.validateTemplate({ templateBody: stringifyToYaml(synthesizedTemplate) });
  }

  const details = [
    'config',
    'resources',
    'template',
    shouldPackage && 'packaging',
    thorough && 'cloudformation'
  ].filter(Boolean);
  tui.setPendingCompletion({
    success: true,
    message: `VALIDATION SUCCESSFUL (${details.join(', ')})`,
    links: []
  });

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
