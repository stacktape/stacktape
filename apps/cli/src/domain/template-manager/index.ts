import type { CloudFormationTemplate } from '@stacktape/cloudformation/resource';
import type { AnyCloudFormationResource } from '@stacktape/cloudformation/resource';
import type { Intrinsic } from '@stacktape/cloudformation/intrinsics';
import type { StackDetails } from '@domain-services/cloudformation-stack-manager/types';
import { tuiManager } from '@application-services/tui-manager';
import { diffTemplate } from '@aws-cdk/cloudformation-diff';
import { StackStatus } from '@aws-sdk/client-cloudformation';
import { getExportedStackOutputName } from '@stacktape/naming/stack-output-names';
import { serialize } from '@utils/misc';
import { awsSdkManager } from '@utils/aws-sdk-manager';
import compose from '@utils/basic-compose-shim';
import { cancelablePublicMethods, skipInitIfInitialized } from '@utils/decorators';
import { CliError } from '@utils/errors';
import { validateStackOutput, validateUniqueness } from '@utils/validator';
import { getInitialCfTemplate } from './utils';

export class TemplateManager {
  template: CloudFormationTemplate = getInitialCfTemplate();
  initialTemplate: CloudFormationTemplate = getInitialCfTemplate();
  oldTemplate: CloudFormationTemplate = getInitialCfTemplate();
  #stackName: string | undefined;
  // template which is passed as a part of props is modified in-place
  templateOverrideFunctions: ((template: CloudFormationTemplate) => Promise<void>)[] = [];
  /** The template as it stood when this invocation first finalized it. See {@link beginFinalization}. */
  #preFinalizationTemplate: CloudFormationTemplate | undefined;

  init = async ({ stackDetails, stackName }: { stackDetails: StackDetails; stackName: string }) => {
    this.#stackName = stackName;
    // if stack is deleted we do not bother with getting the template (CF stores it for 90 days)
    if (stackDetails && stackDetails.StackStatus !== StackStatus.DELETE_COMPLETE) {
      this.oldTemplate = await awsSdkManager.cloudFormation.getTemplate(stackDetails.StackName);
    }
  };

  reset = () => {
    this.template = getInitialCfTemplate();
    this.initialTemplate = getInitialCfTemplate();
    this.oldTemplate = getInitialCfTemplate();
    this.templateOverrideFunctions = [];
    this.#preFinalizationTemplate = undefined;
    this.#stackName = undefined;
  };

  /**
   * Starts a finalization pass, putting the template back to the state it was in before this invocation finalized it
   * for the first time.
   *
   * One invocation can finalize more than once: a deploy that asked for a hot-swap and cannot have one repackages the
   * jobs it had skipped and finalizes again, so that what is deployed matches the artifacts that actually exist.
   * Finalization is not idempotent — `DependsOn` is concatenated, override functions append to arrays such as an IAM
   * role's `Policies`, and customer-authored transforms are under no obligation to be repeatable — so a second pass
   * run over the first pass's output would deploy a template the user never saw in the diff.
   *
   * Only the template is rewound. Override functions, transforms and the artifact state they read are all consulted
   * again by the caller, which is exactly what lets a later pass observe the newly packaged artifacts.
   */
  beginFinalization = () => {
    if (!this.#preFinalizationTemplate) {
      this.#preFinalizationTemplate = serialize(this.template);
      return;
    }
    this.template = serialize(this.#preFinalizationTemplate);
  };

  getTemplate = (): CloudFormationTemplate => {
    const amountOfResources = Object.keys(this.template.Resources).length;
    if (amountOfResources > 470) {
      // @later-dodo: print options to solve this issue
      tuiManager.warn(`Approaching CloudFormation 500-resource limit (used: ${amountOfResources}).`);
    }
    if (amountOfResources > 500) {
      throw new CliError({
        category: 'CLOUDFORMATION',
        code: 'CLOUDFORMATION_RESOURCE_LIMIT_EXCEEDED',
        message: `CloudFormation templates cannot contain more than 500 resources. This template contains ${amountOfResources}.`,
        hints: 'Split the infrastructure across multiple stacks or remove resources that are no longer needed.'
      });
    }
    return serialize(this.template);
  };

  // @note functions that override final template ... useful when resolving runtime directives
  addFinalTemplateOverrideFn = (fn: (template: CloudFormationTemplate) => Promise<void>) => {
    this.templateOverrideFunctions.push(fn);
  };

  /**
   * this method should only be called from calculatedStackOverviewManager
   */
  addResource = (resourceInfo: {
    cfLogicalName: string;
    resource: AnyCloudFormationResource;
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
      this.template.Transform = Array.isArray(this.template.Transform)
        ? [...this.template.Transform, macro]
        : [this.template.Transform, macro];
    }
  };

  addTemplateHook = ({ hookLogicalName, hook }: { hookLogicalName: string; hook: any }) => {
    this.template.Hooks[hookLogicalName] = hook;
  };

  getOldTemplateDiff = () => {
    return diffTemplate(this.oldTemplate, this.getTemplate());
  };

  getCfResourceFromTemplate = (cfLogicalName: string) => {
    return this.template.Resources[cfLogicalName];
  };

  addStackOutput = ({
    cfOutputName,
    value,
    description,
    exportOutput,
    overwriteExisting = false
  }: {
    cfOutputName: string;
    value: string | number | boolean | Intrinsic;
    description?: string;
    exportOutput?: boolean;
    overwriteExisting?: boolean;
  }) => {
    if (exportOutput && !this.#stackName) {
      throw new Error('Template manager was used before its stack name was initialized.');
    }
    let Value: any = value.toString ? value.toString() : value;
    if (Value === '[object Object]') {
      Value = value.valueOf();
    }

    if (!overwriteExisting) {
      validateStackOutput(cfOutputName, this.template, Value);
    }

    const output = {
      Value,
      ...(description ? { Description: description } : {}),
      ...(exportOutput ? { Export: { Name: getExportedStackOutputName(cfOutputName, this.#stackName) } } : {})
    };

    this.template.Outputs[cfOutputName] = output;
  };
}

export const templateManager = compose(skipInitIfInitialized, cancelablePublicMethods)(new TemplateManager());
