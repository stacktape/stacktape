import type { PackageWorkloadOutput } from '@domain-services/packaging-manager/types';
import { stringifyToYaml } from '@utils/yaml';
import fsExtra from 'fs-extra';
import { initializeValidateOperation } from '../_utils/initialization';
import { assessAndPrintSecurityPosture } from '../_utils/security-posture-output';

export const commandValidate = async () => {
  const {
    args: { outFile, thorough, withPackage },
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
  const securityAssessment = assessAndPrintSecurityPosture({ config, tui });

  let packagedWorkloads: PackageWorkloadOutput[] | undefined;
  if (shouldPackage) {
    packagedWorkloads = await packaging.packageAllWorkloads({
      commandCanUseCache: false
    });
  }

  await calculatedStackOverview.resolveAllResources();
  await finalizeTemplate();

  const synthesizedTemplate = template.getTemplate();
  const serializedTemplate = stringifyToYaml(synthesizedTemplate);
  if (thorough) {
    await stack.validateTemplate({ templateBody: JSON.stringify(synthesizedTemplate) });
  }
  if (outFile) {
    await fsExtra.writeFile(outFile, serializedTemplate);
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
    ...(securityAssessment
      ? { securityFindings: securityAssessment.findings, securityExposure: securityAssessment.exposure }
      : {}),
    ...(packagedWorkloads ? { packagedWorkloads } : {})
  };
};
