import type { CloudFormationTemplate } from '@stacktape/cloudformation/resource';

import type { StpResource } from '@domain-services/config-manager/resolved-types/resources';
import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { stackManager } from '@domain-services/cloudformation-stack-manager';
import { configManager } from '@domain-services/config-manager';
import { outputNames } from '@stacktape/naming/stack-output-names';
import { getStackCfTemplateDescription } from '@stacktape/naming/stacks';
import { getCloudformationChildResources } from '@utils/stack-info-map';
import { saveToCfTemplateFile, saveToInitialCfTemplateFile, saveToStpTemplateFile } from '@utils/temp-files';
import { stringifyToYaml } from '@utils/yaml';
import merge from 'lodash/merge';
import set from 'lodash/set';
import type { ResourceOverrides } from '@stacktape/config/shared';
import { CliError, getUserCodeStackTrace } from '@utils/errors';
import { shouldExcludeResourceInDevMode } from '../../commands/dev/dev-resource-filter';
import { templateManager } from '.';
import { validateImmutableLogGroupClasses, validateInfrequentAccessSubscriptions } from './log-group-class';

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
    if (shouldExcludeResourceInDevMode(resource.name, resource.type)) {
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

      Object.entries(overrides).forEach(([pathToProp, value]) => {
        const resourceProperties = templateManager.template.Resources[cfLogicalName].Properties;
        const firstDotIndex = pathToProp.indexOf('.');
        if (firstDotIndex > -1 && typeof value !== 'object') {
          const topLevelProperty = pathToProp.slice(0, firstDotIndex);
          const literalMapKey = pathToProp.slice(firstDotIndex + 1);
          const existingTopLevelValue = resourceProperties?.[topLevelProperty];
          const existingLooksLikeMapWithSpecialKeys =
            existingTopLevelValue &&
            typeof existingTopLevelValue === 'object' &&
            !Array.isArray(existingTopLevelValue) &&
            Object.keys(existingTopLevelValue).some((key) => !/^[A-Za-z0-9_]+$/.test(key));

          // CloudFormation maps such as RDS Parameters and OpenSearch
          // AdvancedOptions can contain dots in their literal keys.
          if (existingLooksLikeMapWithSpecialKeys || ['Parameters', 'AdvancedOptions'].includes(topLevelProperty)) {
            set(resourceProperties, topLevelProperty, {
              ...(resourceProperties?.[topLevelProperty] || {}),
              [literalMapKey]: value
            });
            return;
          }
        }

        const existingValue = resourceProperties?.[pathToProp];
        if (
          !pathToProp.includes('.') &&
          value &&
          typeof value === 'object' &&
          !Array.isArray(value) &&
          existingValue &&
          typeof existingValue === 'object' &&
          !Array.isArray(existingValue)
        ) {
          set(resourceProperties, pathToProp, merge({}, existingValue, value));
          return;
        }

        set(resourceProperties, pathToProp, value);
      });
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
      cfResource.DependsOn = ([cfResource.DependsOn || []].flat() as string[]).concat(
        dependencyCloudformationResources
      );
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

  validateInfrequentAccessSubscriptions({ candidateTemplate: templateManager.template });
  validateImmutableLogGroupClasses({
    previousTemplate: templateManager.oldTemplate,
    candidateTemplate: templateManager.template
  });
};

export const prepareTemplateForDeploy = async () => {
  await finalizeTemplate();

  await Promise.all([
    stackManager.stackActionType === 'create' &&
      saveToInitialCfTemplateFile(stringifyToYaml(templateManager.initialTemplate)),
    saveToCfTemplateFile(stringifyToYaml(templateManager.getTemplate())),
    saveToStpTemplateFile(stringifyToYaml(configManager.rawConfig))
  ]);
};
