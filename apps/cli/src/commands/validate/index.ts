import { prepareStageNetwork } from '@domain-services/shared-network';
import { resolveAllResources } from '@domain-services/calculated-stack-overview-manager/synthesize';
import type { PackageWorkloadOutput } from '@domain-services/packaging-manager/types';
import { stringifyToYaml } from '@utils/yaml';
import fsExtra from 'fs-extra';
import { awsSdkManager } from '@utils/aws-sdk-manager';
import { applicationManager } from '@application-services/application-manager';
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

/**
 * Asks CloudFormation to validate the template. Up to 51,200 bytes it is sent with the request; a larger one goes through
 * a temporary object in the stack's deployment bucket, as `diff` sends it. Returns false when there is no bucket yet.
 */
const validateWithCloudFormation = async ({
  compactTemplate,
  deploymentArtifacts,
  stack
}: {
  compactTemplate: string;
  deploymentArtifacts: ValidateOperation['deploymentArtifacts'];
  stack: ValidateOperation['stack'];
}) => {
  if (Buffer.byteLength(compactTemplate) <= CLOUDFORMATION_INLINE_TEMPLATE_LIMIT_BYTES) {
    await stack.validateTemplate({ templateBody: compactTemplate });
    return true;
  }
  if (!(await awsSdkManager.s3.bucketExists({ bucketName: deploymentArtifacts.deploymentBucketName }))) return false;
  const { templateUrl, deleteTemplate } = await deploymentArtifacts.uploadPreviewTemplate({ body: compactTemplate });
  // Ctrl+C or SIGTERM during the check ends the command through the cleanup hooks, not this `finally`.
  let deletion: Promise<unknown> | undefined;
  const deleteOnce = () => (deletion ??= deleteTemplate());
  applicationManager.registerCleanUpHook(async () => {
    await deleteOnce();
  });
  try {
    await stack.validateTemplate({ templateUrl });
  } finally {
    await deleteOnce();
  }
  return true;
};

type ValidateOperation = Awaited<ReturnType<typeof initializeValidateOperation>>;

export const commandValidate = async () => {
  const {
    args: { outFile, thorough, withPackage },
    config,
    deploymentArtifacts,
    finalizeTemplate,
    packaging,
    stack,
    stackContext,
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

  await prepareStageNetwork({ stage: stackContext.stage, mode: 'preview' });
  await resolveAllResources();
  await finalizeTemplate();

  const synthesizedTemplate = template.getTemplate();
  const serializedTemplate = stringifyToYaml(synthesizedTemplate);
  const compactTemplate = JSON.stringify(synthesizedTemplate);
  const warnings: string[] = [];
  let cloudformationChecked = false;
  if (thorough) {
    cloudformationChecked = await validateWithCloudFormation({ compactTemplate, deploymentArtifacts, stack });
    if (!cloudformationChecked) {
      // Only a stack's deployment bucket can hold the template, and validate creates nothing: before the first deploy,
      // a template over the inline limit cannot reach CloudFormation. The result says so instead of passing silently.
      warnings.push(
        `CloudFormation did not validate this template: it is ${Math.ceil(Buffer.byteLength(compactTemplate) / 1024)} KB, CloudFormation reads templates over 50 KB only from S3, and the stack has no deployment bucket yet. The first deploy validates it.`
      );
    }
  }
  for (const warning of warnings) tui.warn(warning);
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
    message: `VALIDATION SUCCESSFUL (${details.join(', ')})${thorough && !cloudformationChecked ? '; CloudFormation did not validate the template' : ''}`,
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
    ...(warnings.length > 0 ? { warnings } : {}),
    ...(securityAssessment ? { security: securityAssessment } : {}),
    ...(missingSecrets.length > 0 ? { missingSecrets } : {}),
    ...(packagedWorkloads ? { packagedWorkloads } : {})
  };
};
