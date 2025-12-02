import type { IntrinsicFunction } from '@cloudform/dataTypes';
import { globalStateManager } from '@application-services/global-state-manager';
import { diffTemplate } from '@aws-cdk/cloudformation-diff';
import { StackStatus } from '@aws-sdk/client-cloudformation';
import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { stackManager } from '@domain-services/cloudformation-stack-manager';
import { configManager } from '@domain-services/config-manager';
import { stpErrors } from '@errors';
import { outputNames } from '@shared/naming/stack-output-names';
import { getExportedStackOutputName, getStackCfTemplateDescription } from '@shared/naming/utils';
import { serialize } from '@shared/utils/misc';
import { getCloudformationChildResources } from '@shared/utils/stack-info-map';
import { stringifyToYaml } from '@shared/utils/yaml';
import { awsSdkManager } from '@utils/aws-sdk-manager';
import compose from '@utils/basic-compose-shim';
import { cancelablePublicMethods, skipInitIfInitialized } from '@utils/decorators';
import { ExpectedError } from '@utils/errors';
import { printer } from '@utils/printer';
import { saveToCfTemplateFile, saveToInitialCfTemplateFile, saveToStpTemplateFile } from '@utils/temp-files';
import { validateStackOutput, validateUniqueness } from '@utils/validator';
import set from 'lodash/set';
import { getInitialCfTemplate } from './utils';

export class TemplateManager {
  template: CloudformationTemplate = getInitialCfTemplate();
  initialTemplate: CloudformationTemplate = getInitialCfTemplate();
  oldTemplate: CloudformationTemplate = getInitialCfTemplate();
  // template which is passed as a part of props is modified in-place
  templateOverrideFunctions: ((template: CloudformationTemplate) => Promise<void>)[] = [];

  init = async ({ stackDetails }: { stackDetails: StackDetails }) => {
    // if stack is deleted we do not bother with getting the template (CF stores it for 90 days)
    if (
      stackDetails &&
      stackDetails.StackStatus !== StackStatus.DELETE_COMPLETE
      // globalStateManager.command === 'deploy'
    ) {
      this.oldTemplate = await awsSdkManager.getCfStackTemplate(stackDetails.StackName);
    }
  };

  reset = () => {
    this.template = getInitialCfTemplate();
    this.initialTemplate = getInitialCfTemplate();
    this.oldTemplate = getInitialCfTemplate();
    this.templateOverrideFunctions = [];
  };

  getTemplate = (): CloudformationTemplate => {
    const amountOfResources = Object.keys(this.template.Resources).length;
    if (amountOfResources > 470) {
      // @later-dodo: print options to solve this issue
      printer.warn(
        `You are approaching limit of 500 resources per cloudformation stack. Resources used: ${amountOfResources}`
      );
    }
    if (amountOfResources > 500) {
      throw new ExpectedError(
        'CLOUDFORMATION',
        `Cloudformation template can't have more than 500 resources per stack. Resources used: ${amountOfResources}`
      );
    }
    return serialize(this.template);
  };

  // @note functions that override final template ... useful when resolving runtime directives
  addFinalTemplateOverrideFn = (fn: (template: CloudformationTemplate) => Promise<void>) => {
    this.templateOverrideFunctions.push(fn);
  };

  /**
   * this method should only be called from calculatedStackOverviewManager
   */
  addResource = (resourceInfo: {
    cfLogicalName: string;
    resource: CloudformationResource;
    initial: boolean;
    // nameChain: string[]; // required just so we don't forget to add it to every place
  }) => {
    const { cfLogicalName, resource, initial } = resourceInfo;
    validateUniqueness(cfLogicalName, resource.Type, this.template.Resources);
    this.template.Resources[cfLogicalName] = resource;
    if (initial) {
      this.initialTemplate.Resources[cfLogicalName] = resource;
    }
  };

  addTemplateTransformMacro = ({ macro }: { macro: string }) => {
    if (!this.template.Transform) {
      this.template.Transform = [macro];
      return;
    }
    if (!this.template.Transform.includes(macro)) {
      this.template.Transform.push(macro);
    }
  };

  addTemplateHook = ({ hookLogicalName, hook }: { hookLogicalName: string; hook: any }) => {
    this.template.Hooks[hookLogicalName] = hook;
  };

  getOldTemplateDiff = () => {
    return diffTemplate(this.oldTemplate, this.getTemplate());
  };

  finalizeTemplate = async () => {
    this.addStackOutput({
      cfOutputName: outputNames.deploymentVersion(),
      value: stackManager.nextVersion,
      description: 'Version of this stack deployed by Stacktape'
    });
    this.addStackOutput({
      cfOutputName: outputNames.stackInfoMap(),
      value: await calculatedStackOverviewManager.getSubstitutedStackInfoMap(),
      description: 'Overview of stack resources, outputs and metadata'
    });
    // replace code configuration with actual config
    this.template = await configManager.resolveDirectives<CloudformationTemplate>({
      itemToResolve: this.getTemplate(),
      resolveRuntime: true
    });

    this.#resolveDependenciesBetweenResources();
    this.#setCfTemplatesDescription();

    this.#resolveOverrides();

    if (globalStateManager.invokedFrom !== 'server') {
      for (const fn of this.templateOverrideFunctions) {
        await fn(this.template);
      }
      for (const [logicalName, transform] of Object.entries(configManager.transforms)) {
        this.template.Resources[logicalName].Properties = transform(this.template.Resources[logicalName].Properties);
      }
      // Apply the final transform if provided
      if (configManager.finalTransform) {
        this.template = configManager.finalTransform(this.template);
      }
    }

    // final transform of template

    // if overrides added some directives, resolve them too
    this.template = await configManager.resolveDirectives<CloudformationTemplate>({
      itemToResolve: this.getTemplate(),
      resolveRuntime: true
    });
  };

  prepareForDeploy = async () => {
    await this.finalizeTemplate();

    const { stackActionType } = stackManager;
    await Promise.all([
      stackActionType === 'create' && saveToInitialCfTemplateFile(stringifyToYaml(this.initialTemplate)),
      saveToCfTemplateFile(stringifyToYaml(this.getTemplate())),
      saveToStpTemplateFile(stringifyToYaml(configManager.rawConfig))
    ]);
  };

  #setCfTemplatesDescription = () => {
    this.template.Description = getStackCfTemplateDescription(
      globalStateManager.targetStack.projectName,
      globalStateManager.targetStack.stage,
      globalStateManager.targetStack.globallyUniqueStackHash
    );
    this.initialTemplate.Description = getStackCfTemplateDescription(
      globalStateManager.targetStack.projectName,
      globalStateManager.targetStack.stage,
      globalStateManager.targetStack.globallyUniqueStackHash
    );
  };

  getCfResourceFromTemplate = (cfLogicalName: string) => {
    return this.template.Resources[cfLogicalName];
  };

  #resolveOverrides = () => {
    configManager.allConfigResources.forEach((resource: StpResource & { overrides?: ResourceOverrides }) => {
      if (resource.overrides) {
        Object.entries(resource.overrides).forEach(([cfLogicalName, overrides]) => {
          const childResources = calculatedStackOverviewManager.getChildResourceList({
            stpResourceName: resource.name
          });
          const isValidChildResource = calculatedStackOverviewManager.isCfResourceChildOfStpResource({
            stpResourceName: resource.name,
            cfLogicalName
          });
          if (!isValidChildResource) {
            throw stpErrors.e101({
              stpResourceName: resource.name,
              cfLogicalName,
              childResources: Object.keys(childResources)
            });
          }
          // @todo better validation
          // const updatedResourceProperties = merge(this.template.Resources[cfLogicalName].Properties, overrides);
          Object.entries(overrides).forEach(([pathToProp, value]) =>
            set(this.template.Resources[cfLogicalName].Properties, pathToProp, value)
          );
          // this.template.Resources[cfLogicalName].Properties = updatedResourceProperties;
        });
      }
    });
  };

  #resolveDependenciesBetweenResources = () => {
    // @todo add option to use explicit dependencies between resources
    configManager.allConfigResources.forEach((resource) => {
      const dependencyCloudformationResources: string[] = [];
      // "script" resources which are to be triggered "after:deploy" or "before:delete" need to be fully
      // dependent on all other resources (with exception of other "after:deploy" or "before:delete" scripts)
      const isScriptResourceThatMustDependOnAllOtherResources =
        resource.type === 'deployment-script' &&
        (resource.trigger === 'after:deploy' || resource.trigger === 'before:delete');
      if (isScriptResourceThatMustDependOnAllOtherResources) {
        Object.entries(calculatedStackOverviewManager.stackInfoMap.resources).forEach(
          ([resourceName, inspectedResource]) => {
            // if the resource is another "script" we must check
            if (inspectedResource.resourceType === 'deployment-script') {
              const potentialScriptDependency = configManager.deploymentScripts.find(
                ({ name }) => name === resourceName
              );
              // if it is "after:deploy" or "before:delete" - if YES then we will NOT add it as dependency (this would create circular dependency between scripts)
              if (
                potentialScriptDependency.trigger === 'after:deploy' ||
                potentialScriptDependency.trigger === 'before:delete'
              ) {
                return;
              }
            }
            dependencyCloudformationResources.push(
              ...Object.keys(
                getCloudformationChildResources({
                  resource: inspectedResource
                })
              )
            );
          }
        );
      }
      // applying dependencies to child resources of dependent resource
      const cfChildLogicalNames = Object.keys(
        getCloudformationChildResources({
          resource: calculatedStackOverviewManager.getStpResource({ nameChain: resource.nameChain })
        })
      );
      cfChildLogicalNames.forEach((cfLogicalName) => {
        this.template.Resources[cfLogicalName].DependsOn = (
          [this.template.Resources[cfLogicalName].DependsOn || []].flat() as string[]
        ).concat(dependencyCloudformationResources);
      });
    });
  };

  addStackOutput = ({
    cfOutputName,
    value,
    description,
    exportOutput
  }: {
    cfOutputName: string;
    value: string | number | boolean | IntrinsicFunction;
    description?: string;
    exportOutput?: boolean;
  }) => {
    let Value: any = value.toString ? value.toString() : value;
    if (Value === '[object Object]') {
      Value = value.valueOf();
    }
    validateStackOutput(cfOutputName, this.template, Value);
    const output = {
      Value,
      ...(description ? { Description: description } : {}),
      ...(exportOutput
        ? { Export: { Name: getExportedStackOutputName(cfOutputName, globalStateManager.targetStack.stackName) } }
        : {})
    };

    this.template.Outputs[cfOutputName] = output;
  };
}

export const templateManager = compose(skipInitIfInitialized, cancelablePublicMethods)(new TemplateManager());
