import { codeSwapIntegration } from '@domain-services/code-swap/integration';
import type { CloudFormationTemplate } from '@stacktape/cloudformation/resource';

import type { StpResource } from '@domain-services/config-manager/resolved-types/resources';
import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { stampLambdaVersionPublishers } from '@domain-services/calculated-stack-overview-manager/resource-resolvers/functions/versioned-configuration';
import { stackManager } from '@domain-services/cloudformation-stack-manager';
import { configManager } from '@domain-services/config-manager';
import { outputNames } from '@stacktape/naming/stack-output-names';
import { getStackCfTemplateDescription } from '@stacktape/naming/stacks';
import { getCloudformationChildResources } from '@utils/stack-info-map';
import { saveToCfTemplateFile, saveToInitialCfTemplateFile, saveToStpTemplateFile } from '@utils/temp-files';
import { stringifyToYaml } from '@utils/yaml';
import type { ResourceOverrides } from '@stacktape/config/shared';
import { CliError, getUserCodeStackTrace } from '@utils/errors';
import { NOT_YET_KNOWN_IDENTIFIER } from 'src/config/constants';
import { shouldExcludeResourceInDevMode } from '@domain-services/config-manager/dev-mode';
import { templateManager } from '.';
import { applyResourceOverride, getPropertiesPrefixMistake } from './resource-overrides';
import { validateImmutableLogGroupClasses, validateInfrequentAccessSubscriptions } from './log-group-class';
import { deriveAuroraInstanceAddressesForNewFunctions } from './aurora-instance-addresses';
import { keepDeployedBatchComputeEnvironmentImages } from './batch-compute-environment-images';

const throwTransformFailure = ({
  code,
  error,
  subject
}: {
  code: 'CONFIG_RESOURCE_TRANSFORM_FAILED' | 'CONFIG_FINAL_TRANSFORM_FAILED';
  error: unknown;
  subject: string;
}): never => {
  if (error instanceof CliError) {
    throw error;
  }

  const errorMessage = error instanceof Error ? error.message : String(error);
  throw new CliError({
    category: 'SOURCE_CODE',
    code,
    message: `${subject} failed: ${errorMessage}`,
    cause: error,
    userStackTrace: error instanceof Error ? getUserCodeStackTrace(error) || undefined : undefined
  });
};

const isNonArrayObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Promise);

const describeTransformResult = (value: unknown) => {
  if (value instanceof Promise) return 'a Promise';
  if (Array.isArray(value)) return 'an array';
  return value === null ? 'null' : typeof value;
};

const setTemplateDescriptions = () => {
  const { globallyUniqueStackHash, projectName, stage } = calculatedStackOverviewManager.context;
  const description = getStackCfTemplateDescription(projectName, stage, globallyUniqueStackHash);
  templateManager.template.Description = description;
  templateManager.initialTemplate.Description = description;
};

const applyResourceOverrides = () => {
  configManager.allConfigResources.forEach((resource: StpResource & { overrides?: ResourceOverrides }) => {
    if (!resource.overrides) {
      return;
    }
    // An override still describes the normal remote resource when dev mode intentionally keeps that resource local.
    // The same resource is validated normally as soon as it is selected for remote use.
    if (shouldExcludeResourceInDevMode(resource.name, resource.type, configManager.deploymentContext)) {
      return;
    }

    Object.entries(resource.overrides).forEach(([cfLogicalName, overrides]) => {
      const childResources = calculatedStackOverviewManager.getChildResourceList({
        stpResourceName: resource.name
      });
      if (
        !calculatedStackOverviewManager.isCfResourceChildOfStpResource({
          stpResourceName: resource.name,
          cfLogicalName
        })
      ) {
        throw new CliError({
          category: 'CONFIG_VALIDATION',
          code: 'CONFIG_RESOURCE_OVERRIDE_TARGET_INVALID',
          message: `CloudFormation resource \`${cfLogicalName}\` is not a child of Stacktape resource \`${resource.name}\`.`,
          hints: `Valid child resources: ${Object.keys(childResources)
            .map((childResource) => `\`${childResource}\``)
            .join(', ')}.`
        });
      }

      const resourceType = templateManager.template.Resources[cfLogicalName].Type;
      for (const pathToProp of Object.keys(overrides)) {
        const mistake = getPropertiesPrefixMistake({ resourceType, path: pathToProp });
        if (!mistake) continue;
        throw new CliError({
          category: 'CONFIG_VALIDATION',
          code: 'CONFIG_RESOURCE_OVERRIDE_PATH_INVALID',
          message: `Override \`${pathToProp}\` of \`${cfLogicalName}\` in resource \`${resource.name}\` starts with \`Properties\`. Override paths are relative to the CloudFormation resource's \`Properties\`, so this would set \`Properties.${pathToProp}\`, which ${resourceType} does not have.`,
          hints: mistake.intended
            ? `Write \`${mistake.intended}\` instead of \`${pathToProp}\`.`
            : `Move the keys inside \`Properties\` one level up, directly under \`${cfLogicalName}\`.`
        });
      }
      Object.entries(overrides).forEach(([pathToProp, value]) =>
        applyResourceOverride(templateManager.template.Resources[cfLogicalName].Properties, pathToProp, value)
      );
    });
  });
};

const resolveDependenciesBetweenResources = () => {
  configManager.allConfigResources.forEach((resource) => {
    const dependencyCloudformationResources: string[] = [];
    const mustDependOnAllOtherResources =
      resource.type === 'deployment-script' &&
      (resource.trigger === 'after:deploy' || resource.trigger === 'before:delete');

    if (mustDependOnAllOtherResources) {
      Object.entries(calculatedStackOverviewManager.stackInfoMap.resources).forEach(
        ([resourceName, inspectedResource]) => {
          if (inspectedResource.resourceType === 'deployment-script') {
            const potentialScriptDependency = configManager.deploymentScripts.find(({ name }) => name === resourceName);
            if (
              potentialScriptDependency.trigger === 'after:deploy' ||
              potentialScriptDependency.trigger === 'before:delete'
            ) {
              return;
            }
          }
          dependencyCloudformationResources.push(
            ...Object.keys(getCloudformationChildResources({ resource: inspectedResource }))
          );
        }
      );
    }

    const cfChildLogicalNames = Object.keys(
      getCloudformationChildResources({
        resource: calculatedStackOverviewManager.getStpResource({ nameChain: resource.nameChain })
      })
    );
    cfChildLogicalNames.forEach((cfLogicalName) => {
      const cfResource = templateManager.template.Resources[cfLogicalName];
      const dependsOn = ([cfResource.DependsOn || []].flat() as string[]).concat(dependencyCloudformationResources);
      // A resource without dependencies keeps no `DependsOn` at all. An empty list is harmless to CloudFormation, but
      // it differs from what every v3 template and every resource added before finalization carries, so it made the
      // diff and the change plan report an update on resources whose properties had not changed.
      if (dependsOn.length) {
        cfResource.DependsOn = dependsOn;
      } else {
        delete cfResource.DependsOn;
      }
    });
  });
};

export const finalizeTemplate = async () => {
  // Everything below mutates the template in place, so each pass has to start from the same pre-finalization state.
  templateManager.beginFinalization();

  templateManager.addStackOutput({
    cfOutputName: outputNames.deploymentVersion(),
    value: stackManager.nextVersion,
    description: 'Version of this stack deployed by Stacktape',
    overwriteExisting: true
  });
  templateManager.addStackOutput({
    cfOutputName: outputNames.stackInfoMap(),
    value: await calculatedStackOverviewManager.getSubstitutedStackInfoMap(),
    description: 'Overview of stack resources, outputs and metadata',
    overwriteExisting: true
  });

  templateManager.template = await configManager.resolveDirectives<CloudFormationTemplate>({
    itemToResolve: templateManager.getTemplate(),
    resolveRuntime: true
  });

  resolveDependenciesBetweenResources();
  setTemplateDescriptions();
  applyResourceOverrides();

  for (const overrideTemplate of templateManager.templateOverrideFunctions) {
    await overrideTemplate(templateManager.template);
  }
  for (const [logicalName, transform] of Object.entries(configManager.transforms)) {
    const resource = templateManager.template.Resources[logicalName];
    if (!resource) {
      throw new CliError({
        category: 'SOURCE_CODE',
        code: 'CONFIG_RESOURCE_TRANSFORM_TARGET_MISSING',
        message: `Resource transform target \`${logicalName}\` does not exist in the synthesized CloudFormation template.`,
        hints: 'Check that the transform targets a resource synthesized by this command and configuration.'
      });
    }
    try {
      if (!isNonArrayObject(resource.Properties)) {
        throw new TypeError(
          `Resource transforms require a CloudFormation properties object, but resource \`${logicalName}\` has none.`
        );
      }
      const transformedProperties = transform(resource.Properties);
      if (!isNonArrayObject(transformedProperties)) {
        throw new TypeError(
          `Resource transforms must return a CloudFormation properties object, but this transform returned ${describeTransformResult(transformedProperties)}.`
        );
      }
      resource.Properties = transformedProperties;
    } catch (error) {
      throwTransformFailure({
        code: 'CONFIG_RESOURCE_TRANSFORM_FAILED',
        error,
        subject: `Resource transform for CloudFormation resource \`${logicalName}\``
      });
    }
  }
  if (configManager.finalTransform) {
    // This is the validation boundary for customer-authored whole-template transforms. The public authoring type
    // intentionally describes CloudFormation broadly; the CLI continues with its more precise synthesized shape.
    try {
      const transformedTemplate = configManager.finalTransform(templateManager.template);
      if (!isNonArrayObject(transformedTemplate) || !isNonArrayObject(transformedTemplate.Resources)) {
        throw new TypeError(
          `Final template transforms must return a CloudFormation template with a Resources object, but this transform returned ${describeTransformResult(transformedTemplate)}.`
        );
      }
      templateManager.template = transformedTemplate as CloudFormationTemplate;
    } catch (error) {
      throwTransformFailure({ code: 'CONFIG_FINAL_TRANSFORM_FAILED', error, subject: 'Final template transform' });
    }
  }

  // Overrides and transforms may introduce runtime directives.
  templateManager.template = await configManager.resolveDirectives<CloudFormationTemplate>({
    itemToResolve: templateManager.getTemplate(),
    resolveRuntime: true
  });
  deriveAuroraInstanceAddressesForNewFunctions({
    template: templateManager.template,
    deployedTemplate: templateManager.oldTemplate
  });
  keepDeployedBatchComputeEnvironmentImages({
    template: templateManager.template,
    deployedTemplate: templateManager.oldTemplate,
    existingLogicalIds: new Set(
      stackManager.existingStackResources
        .filter(({ PhysicalResourceId }) => PhysicalResourceId)
        .map(({ LogicalResourceId }) => LogicalResourceId)
    )
  });
  // Last, so that each version publisher sees its function exactly as it will be deployed.
  await codeSwapIntegration.template(templateManager.template);
  stampLambdaVersionPublishers(templateManager.template);

  validateInfrequentAccessSubscriptions({ candidateTemplate: templateManager.template });
  validateImmutableLogGroupClasses({
    previousTemplate: templateManager.oldTemplate,
    candidateTemplate: templateManager.template
  });
};

/**
 * Where the template still holds `NOT_YET_KNOWN_IDENTIFIER`: a value, such as a container image or an artifact key, that
 * is filled in once its artifact is packaged. In the r2ll dogfood a dev stack deployed a batch job definition with
 * `Image: <<not-yet-known>>`, and AWS Batch rejected the first job submitted to it.
 */
export const findUnresolvedPlaceholders = (value: unknown, path: string[] = []): string[] => {
  if (value === NOT_YET_KNOWN_IDENTIFIER) return [path.join('.')];
  if (Array.isArray(value))
    return value.flatMap((item, index) => findUnresolvedPlaceholders(item, [...path, `${index}`]));
  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([key, item]) => findUnresolvedPlaceholders(item, [...path, key]));
  }
  return [];
};

/** Refuses a template with an unresolved placeholder before anything is uploaded or sent to CloudFormation. */
export const assertNoUnresolvedPlaceholders = (template: CloudFormationTemplate) => {
  const paths = findUnresolvedPlaceholders({ Resources: template.Resources, Outputs: template.Outputs });
  if (!paths.length) return;
  throw new CliError({
    category: 'STACK',
    code: 'TEMPLATE_UNRESOLVED_PLACEHOLDER',
    message: `The CloudFormation template still has a placeholder where a packaged artifact belongs: ${paths
      .slice(0, 5)
      .map((path) => `\`${path}\``)
      .join(', ')}. Stacktape did not package the artifact that this value comes from, so nothing was deployed.`,
    hints: 'This is a Stacktape bug. Report it with the command you ran; `stacktape synth` shows the whole template.',
    data: { paths }
  });
};

export const prepareTemplateForDeploy = async () => {
  await finalizeTemplate();
  assertNoUnresolvedPlaceholders(templateManager.getTemplate());

  await Promise.all([
    stackManager.stackActionType === 'create' &&
      saveToInitialCfTemplateFile(stringifyToYaml(templateManager.initialTemplate)),
    saveToCfTemplateFile(stringifyToYaml(templateManager.getTemplate())),
    saveToStpTemplateFile(stringifyToYaml(configManager.rawConfig))
  ]);
};
