import { resolveAllResources } from '@domain-services/calculated-stack-overview-manager/synthesize';
import type { PackageWorkloadOutput } from '@domain-services/packaging-manager/types';
import { stringifyToYaml } from '@utils/yaml';
import fsExtra from 'fs-extra';
import { initializeValidateOperation } from '../_utils/initialization';
import { assessAndPrintSecurityPosture } from '../_utils/security-posture-output';

/** CloudFormation's limit for a `TemplateBody` sent with the request. */
const CLOUDFORMATION_INLINE_TEMPLATE_LIMIT_BYTES = 51_200;

export const commandValidate = async () => {
  const {
    args: { outFile, thorough, withPackage },
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

  await resolveAllResources();
  await finalizeTemplate();

  const synthesizedTemplate = template.getTemplate();
  const serializedTemplate = stringifyToYaml(synthesizedTemplate);
  // CloudFormation validates an inline template only up to 51,200 bytes; anything larger must come from S3, and
  // validate creates nothing to upload it to. An ordinary web-service stack is already larger, so it is reported
  // as not checked rather than failing a valid configuration. CloudFormation still validates it on deploy.
  const compactTemplate = JSON.stringify(synthesizedTemplate);
  const cloudformationChecked =
    Boolean(thorough) && Buffer.byteLength(compactTemplate) <= CLOUDFORMATION_INLINE_TEMPLATE_LIMIT_BYTES;
  if (cloudformationChecked) {
    await stack.validateTemplate({ templateBody: compactTemplate });
  } else if (thorough) {
    tui.warn(
      `CloudFormation did not check this template: it is ${Math.ceil(Buffer.byteLength(compactTemplate) / 1024)} KB, and CloudFormation validates templates over 50 KB only from S3. It is validated when you deploy.`
    );
  }
  if (outFile) {
    await fsExtra.writeFile(outFile, serializedTemplate);
  }

  const details = [
    'config',
    'resources',
    'template',
    shouldPackage && 'packaging',
    cloudformationChecked && 'cloudformation'
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
      cloudformation: cloudformationChecked
    },
    ...(securityAssessment
      ? { securityFindings: securityAssessment.findings, securityExposure: securityAssessment.exposure }
      : {}),
    ...(packagedWorkloads ? { packagedWorkloads } : {})
  };
};
