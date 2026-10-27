import { resolveAllResources } from '@domain-services/calculated-stack-overview-manager/synthesize';
import type { PackageWorkloadOutput } from '@domain-services/packaging-manager/types';
import { stringifyToYaml } from '@utils/yaml';
import fsExtra from 'fs-extra';
import { globalStateManager } from '@application-services/global-state-manager';
import { initializeValidateOperation } from '../_utils/initialization';
import { findMissingSecrets, type MissingSecret } from '../_utils/secret-preflight';
import { assessAndPrintSecurityPosture } from '../_utils/security-posture-output';

/** What a missing secret means for this project, and how to create it. */
const describeMissingSecret = (
  { name, jsonKeys, generated }: MissingSecret,
  { region, prettyCommand }: { region: string; prettyCommand: (command: string) => string }
): string => {
  const value =
    jsonKeys.length === 0
      ? ''
      : ` with a JSON value that has ${jsonKeys.map((key) => `a \`${key}\` key`).join(' and ')}`;
  const create = `${prettyCommand(`secret set ${name}`)}${value}`;
  return generated
    ? `Secret ${name} does not exist in ${region} yet. It holds a generated database password: ${prettyCommand('dev')} creates it when it starts, and ${prettyCommand('deploy')} creates it before it deploys (in a terminal it asks first). To create it yourself, run ${create}.`
    : `Secret ${name} does not exist in ${region}. Create it with ${create} before you deploy or start dev mode; both stop until it exists.`;
};

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
  const securityAssessment = assessAndPrintSecurityPosture({ config, tui, command: 'validate' });

  // A missing secret is a finding, not the end of the check: `dev` and `deploy` create or ask for it themselves, and the
  // template is checked with a placeholder reference in its place.
  const missingSecrets = await findMissingSecrets();
  config.reportSecretsMissing(missingSecrets.map(({ name }) => name));
  for (const secret of missingSecrets) {
    tui.warn(
      describeMissingSecret(secret, {
        region: globalStateManager.region,
        prettyCommand: (command) => tui.prettyCommand(command)
      })
    );
  }

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
    ...(securityAssessment ? { security: securityAssessment } : {}),
    ...(missingSecrets.length > 0 ? { missingSecrets } : {}),
    ...(packagedWorkloads ? { packagedWorkloads } : {})
  };
};
