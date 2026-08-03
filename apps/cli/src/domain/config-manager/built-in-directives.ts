import type { Directive } from '@domain-services/config-manager/directive-types';
import type { IntrinsicFunction } from '@cloudform/dataTypes';
import { GetAtt, ImportValue, Ref, Sub } from '@cloudform/functions';
import { IDENTIFIER_FOR_MISSING_OUTPUT, linksMap } from '@config';
import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { stackManager } from '@domain-services/cloudformation-stack-manager';
import { deployedStackOverviewManager } from '@domain-services/deployed-stack-overview-manager';
import { templateManager } from '@domain-services/template-manager';
import { getStackOutputName } from '@stacktape/naming/stack-output-names';
import type { SupportedAWSRegion as AWSRegion } from '@stacktape/config/aws-regions';
import { serialize } from '@utils/misc';
import { awsSdkManager } from '@utils/aws-sdk-manager';
import { SubWithoutMapping } from '@utils/cloudformation';
import { CliError } from '@utils/errors';
import { loadFromAnySupportedFile, loadRawFileContent } from '@utils/file-loaders';
import { gitInfoManager } from '@utils/git-info-manager';
import { getAllReferencableParams, referenceableTypes } from '@utils/referenceable-types';
import { validateFormatDirectiveParams, validateStackOutputName } from '@utils/validator';
import type { StacktapeArgs, StacktapeCommand } from 'src/config/cli/types';
import { configErrors } from './errors';

// @note !!! BE CAREFUL !!! with using services in directives... some of them might not be initialized yet

export type BuiltInDirectiveContext = Readonly<{
  accountId: string;
  additionalArgs: Readonly<Record<string, string | boolean>>;
  awsProfile: string;
  cliArgs: Readonly<StacktapeArgs>;
  command: StacktapeCommand;
  disableEmulation: boolean;
  region: AWSRegion;
  stage: string;
  workingDir: string;
}>;

export const createBuiltInDirectives = (context: BuiltInDirectiveContext): Directive[] => [
  {
    name: 'File',
    isRuntime: false,
    requiredParams: { filePath: 'string' },
    resolveFunction: () => async (sourcePath: string) => {
      const res = await loadFromAnySupportedFile({
        sourcePath,
        codeType: '$File directive input',
        workingDir: context.workingDir
      });
      if (res === null) {
        throw new CliError({
          category: 'DIRECTIVE',
          code: 'DIRECTIVE_FILE_TYPE_UNSUPPORTED',
          message: `\`$File\` cannot load \`${sourcePath}\`. It supports .env, JSON, YAML and INI files, which it parses automatically. Parsed properties can be accessed as \`$File("myfile.json").myProperty\`.`,
          hints:
            'Use `$FileRaw` to load raw file content as a string. See https://docs.stacktape.com/configuration/directives/#file-raw.'
        });
      }
      if (res === undefined) {
        throw new CliError({
          category: 'DIRECTIVE',
          code: 'DIRECTIVE_FILE_VALUE_MISSING',
          message: `\`$File\` did not resolve a value from \`${sourcePath}\`.`
        });
      }
      return res;
    }
  },
  {
    name: 'FileRaw',
    isRuntime: false,
    requiredParams: { filePath: 'string' },
    resolveFunction: () => async (filePath: string) => {
      const res = await loadRawFileContent({
        filePath,
        workingDir: context.workingDir
      });
      return res;
    }
  },
  {
    name: 'CliArgs',
    isRuntime: false,
    requiredParams: { argName: 'string' },
    resolveFunction: () => (argName, defaultValue) => {
      return { ...context.cliArgs, ...context.additionalArgs }[argName] ?? defaultValue;
    }
  },
  {
    name: 'Stage',
    isRuntime: false,
    requiredParams: {},
    resolveFunction: () => () => context.stage
  },
  {
    name: 'Region',
    isRuntime: false,
    requiredParams: {},
    resolveFunction: () => () => context.region
  },
  {
    name: 'Profile',
    isRuntime: false,
    requiredParams: {},
    resolveFunction: () => () => context.awsProfile
  },
  {
    name: 'AwsAccountId',
    isRuntime: false,
    requiredParams: {},
    resolveFunction: () => () => context.accountId
  },
  {
    name: 'Format',
    requiredParams: { interpolatedString: 'string' },
    isRuntime: false,
    resolveFunction:
      () =>
      (interpolatedString: string, ...values: any[]) => {
        validateFormatDirectiveParams(interpolatedString, 'Format', values);
        let finalString = interpolatedString;
        for (const idx in values) {
          finalString = finalString.replace('{}', values[idx]);
        }
        return finalString;
      }
  },
  {
    name: 'Var',
    requiredParams: {},
    isRuntime: false,
    resolveFunction: (configResolver) => () => configResolver.rawConfig.variables
  },
  {
    name: 'This',
    requiredParams: {},
    isRuntime: false,
    resolveFunction: (configResolver) => () => configResolver.rawConfig
  },
  {
    name: 'ResourceParam',
    requiredParams: { resourceReference: 'string', property: 'string' },
    isRuntime: true,
    resolveFunction: () => (resourceReference: string, property: string) => {
      const resource = calculatedStackOverviewManager.getStpResource({ nameChain: resourceReference });
      if (!resource) {
        throw configErrors.directiveResourceNotFound({
          resourceName: resourceReference,
          directiveType: '$ResourceParam'
        });
      }
      if (resource.referencableParams?.[property] === undefined) {
        throw configErrors.directiveResourceParameterInvalid({
          resourceName: resourceReference,
          referencedParam: property,
          referencableParams: Object.keys(resource.referencableParams || {}),
          directiveType: '$ResourceParam'
        });
      }
      return resource.referencableParams[property].value;
    },
    localResolveFunction: () => (resourceReference: string, property: string) => {
      const resource = deployedStackOverviewManager.getStpResource({ nameChain: resourceReference });
      const value = resource?.referencableParams?.[property]?.value;
      const isLocalInvoke = context.command === 'dev';
      if (!resource) {
        throw configErrors.directiveResourceNotFound({
          resourceName: resourceReference,
          directiveType: '$ResourceParam'
        });
      }
      if (resource.referencableParams?.[property] === undefined) {
        throw configErrors.directiveResourceParameterInvalid({
          resourceName: resourceReference,
          referencedParam: property,
          referencableParams: Object.keys(resource.referencableParams || {}),
          directiveType: '$ResourceParam'
        });
      }
      if (value === undefined || value === null) {
        if (isLocalInvoke && context.disableEmulation) {
          return IDENTIFIER_FOR_MISSING_OUTPUT;
        }
        throw new CliError({
          category: 'DIRECTIVE',
          code: 'DIRECTIVE_RESOURCE_PARAM_UNRESOLVED',
          message: `Can't resolve the result of $ResourceParam('${resourceReference}', '${property}') directive.`,
          hints: isLocalInvoke ? getDisableEmulationHint() : undefined
        });
      }

      return value;
    }
  },
  {
    name: 'CfResourceParam',
    requiredParams: { resourceName: 'string', property: 'string' },
    isRuntime: true,
    resolveFunction: () => (resourceName: string, property: string) => {
      const cfResource = templateManager.template.Resources[resourceName];
      if (!cfResource) {
        throw configErrors.directiveResourceNotFound({ resourceName, directiveType: '$CfResourceParam' });
      }
      const { Ref: RefAttributes, GetAtt: GetAttAttributes } = referenceableTypes[cfResource.Type] || {
        GetAtt: [],
        Ref: []
      };
      let intrinsicFn: IntrinsicFunction;
      if (GetAttAttributes.includes(property)) {
        intrinsicFn = GetAtt(resourceName, property);
      } else if (RefAttributes.includes(property)) {
        intrinsicFn = Ref(resourceName);
      } else if (cfResource.Type === 'AWS::CloudFormation::CustomResource') {
        // for custom resources we do not know what output is, therefore we allow everything
        // this assignment is same as in above "else if" branch, but we handle it in separate branch to understand the situation
        intrinsicFn = GetAtt(resourceName, property);
      } else {
        throw configErrors.directiveResourceParameterInvalid({
          resourceName,
          referencedParam: property,
          referencableParams: getAllReferencableParams(cfResource.Type),
          directiveType: '$CfResourceParam'
        });
      }
      templateManager.addFinalTemplateOverrideFn(async () => {
        templateManager.addStackOutput({
          cfOutputName: getStackOutputName(resourceName, property),
          value: intrinsicFn,
          description: `Added by $CfResourceParam('${resourceName}', '${property}') directive`
        });
      });
      return intrinsicFn.toJSON();
    },
    localResolveFunction: () => (resourceName: string, property: string) => {
      const isResourceDeployed = stackManager.getExistingResourceDetails(resourceName);
      if (!isResourceDeployed) {
        throw configErrors.directiveResourceNotFound({ resourceName, directiveType: '$CfResourceParam' });
      }
      const outputName = getStackOutputName(resourceName, property);
      const output = stackManager.existingStackDetails?.stackOutput[outputName];
      return output || IDENTIFIER_FOR_MISSING_OUTPUT;
    }
  },
  {
    name: 'Secret',
    requiredParams: { resourceName: 'string' },
    isRuntime: true,
    resolveFunction: () => async (secretReference: string) => {
      const [secretName, jsonKey] = secretReference.split('.');
      let secret;
      try {
        secret = await awsSdkManager.secrets.get({ secretId: secretName });
      } catch (error) {
        throw new CliError({
          category: 'DIRECTIVE',
          code: 'DIRECTIVE_SECRET_UNRESOLVED',
          message: `Cannot resolve \`$Secret('${secretName}')\`.\n${String(error)}`,
          hints: `If the secret does not exist yet, create it using \`stacktape secret:set\`.`,
          cause: error
        });
      }
      if (jsonKey) {
        let parsedSecret: unknown;
        try {
          parsedSecret = JSON.parse(secret.SecretString);
        } catch (error) {
          throw new CliError({
            category: 'DIRECTIVE',
            code: 'DIRECTIVE_SECRET_JSON_INVALID',
            message: `Cannot resolve key \`${jsonKey}\` from \`$Secret('${secretName}')\` because the secret is not valid JSON.`,
            cause: error
          });
        }
        if (typeof parsedSecret !== 'object' || parsedSecret === null || Array.isArray(parsedSecret)) {
          throw new CliError({
            category: 'DIRECTIVE',
            code: 'DIRECTIVE_SECRET_JSON_INVALID',
            message: `Cannot resolve key \`${jsonKey}\` from \`$Secret('${secretName}')\` because the secret is not a JSON object.`
          });
        }
        if (!Object.hasOwn(parsedSecret, jsonKey)) {
          throw new CliError({
            category: 'DIRECTIVE',
            code: 'DIRECTIVE_SECRET_JSON_KEY_MISSING',
            message: `Secret \`${secretName}\` does not contain JSON key \`${jsonKey}\` required by \`$Secret('${secretName}.${jsonKey}')\`.`
          });
        }
      }

      const outputName = getStackOutputName(secretName, 'CurrentSecretVersionId');
      templateManager.addFinalTemplateOverrideFn(async () => {
        templateManager.addStackOutput({
          cfOutputName: outputName,
          value: secret.VersionId,
          description: `Added by $Secret('${secretReference}') directive`
        });
      });

      return `{{resolve:secretsmanager:${secretName}:SecretString:${jsonKey || ''}::${secret.VersionId}}}`;
    },
    localResolveFunction: () => async (secretReference: string) => {
      const secretName = secretReference.split('.')[0];
      const secretVersionId =
        stackManager?.existingStackDetails?.stackOutput[getStackOutputName(secretName, 'CurrentSecretVersionId')];
      try {
        const { SecretString: secretValue } = await awsSdkManager.secrets.get({
          secretId: secretName,
          versionId: secretVersionId
        });
        if (!secretValue) {
          throw new Error(`Secret "${secretName}" is not valid string secret.`);
        }
        const jsonKey = secretReference.split('.')[1];
        const finalValue = jsonKey ? JSON.parse(secretValue)[jsonKey] : secretValue;
        if (finalValue === undefined) {
          throw new Error(`Secret "${secretName}" does not contain property "${jsonKey}"`);
        }
        return finalValue;
      } catch (error) {
        if (error instanceof CliError) throw error;
        throw new CliError({
          category: 'DIRECTIVE',
          code: 'DIRECTIVE_SECRET_UNRESOLVED',
          message: `Cannot resolve secret \`${secretName}\`.\n${String(error)}`,
          cause: error
        });
      }
    }
  },
  {
    name: 'SsmParam',
    requiredParams: { paramName: 'string' },
    isRuntime: true,
    resolveFunction: () => async (paramReference: string) => {
      let param;
      try {
        param = await awsSdkManager.parameterStore.get({ name: paramReference });
      } catch (error) {
        throw new CliError({
          category: 'DIRECTIVE',
          code: 'DIRECTIVE_SSM_PARAMETER_UNRESOLVED',
          message: `Cannot resolve \`$SsmParam('${paramReference}')\`.\n${String(error)}`,
          hints: `If the parameter does not exist yet, create it in the Stacktape Console: ${linksMap.ssmParams}`,
          cause: error
        });
      }
      const paramType = param.Parameter.Type;
      const paramVersion = String(param.Parameter.Version);
      const resolvePrefix = paramType === 'SecureString' ? 'ssm-secure' : 'ssm';

      const outputName = getStackOutputName(paramReference.replace(/\//g, '-'), 'CurrentSsmParamVersion');
      templateManager.addFinalTemplateOverrideFn(async () => {
        templateManager.addStackOutput({
          cfOutputName: outputName,
          value: paramVersion,
          description: `Added by $SsmParam('${paramReference}') directive`
        });
      });

      return `{{resolve:${resolvePrefix}:${paramReference}:${paramVersion}}}`;
    },
    localResolveFunction: () => async (paramReference: string) => {
      try {
        const result = await awsSdkManager.parameterStore.get({ name: paramReference });
        const value = result.Parameter?.Value;
        if (!value) {
          throw new Error(`SSM parameter "${paramReference}" has no value.`);
        }
        return value;
      } catch (error) {
        throw new CliError({
          category: 'DIRECTIVE',
          code: 'DIRECTIVE_SSM_PARAMETER_UNRESOLVED',
          message: `Cannot resolve SSM parameter \`${paramReference}\`.\n${String(error)}`,
          cause: error
        });
      }
    }
  },
  {
    name: 'CfFormat',
    requiredParams: { interpolatedString: 'string' },
    isRuntime: true,
    resolveFunction:
      () =>
      (interpolatedString: string, ...values: any[]) => {
        validateFormatDirectiveParams(interpolatedString, 'CfFormat', values);
        const substitutions = {};
        let finalString = interpolatedString;
        for (const idx in values) {
          const subName = `\${sub${idx}}`;
          finalString = finalString.replace('{}', subName);
          const value = values[idx];
          substitutions[`sub${idx}`] = value;
        }
        return serialize(values.length ? Sub(finalString, substitutions) : SubWithoutMapping(finalString));
      },
    localResolveFunction:
      () =>
      (interpolatedString: string, ...values: any[]) => {
        let res = interpolatedString;
        values.forEach((val) => {
          res = res.replace('{}', val);
        });
        return res;
      }
  },
  {
    name: 'StackOutput',
    requiredParams: { stackName: 'string', outputName: 'string' },
    isRuntime: false,
    resolveFunction: () => async (stackName: string, outputName: string, region?: AWSRegion) => {
      return resolveStackOutput({
        directive: 'StackOutput',
        disableEmulation: context.disableEmulation,
        outputName,
        stackName,
        region
      });
    }
  },
  {
    name: 'CfStackOutput',
    requiredParams: { stackName: 'string', outputName: 'string' },
    isRuntime: true,
    resolveFunction: () => async (stackName: string, outputName: string, region?: AWSRegion) => {
      return resolveStackOutput({
        directive: 'CfStackOutput',
        disableEmulation: context.disableEmulation,
        outputName,
        stackName,
        region
      });
    },
    localResolveFunction: () => async (stackName: string, outputName: string, region?: AWSRegion) => {
      // in case of local resolving of CfStackOutput, we treat it as StackOutput.
      return resolveStackOutput({
        directive: 'StackOutput',
        disableEmulation: context.disableEmulation,
        outputName,
        stackName,
        region
      });
    }
  },
  {
    name: 'GitInfo',
    requiredParams: { property: 'string' },
    isRuntime: false,
    lazyLoad: true,
    resolveFunction: () => async (property: string) => {
      const gitInfo = await gitInfoManager.gitInfo;
      const res = gitInfo[property];
      if (!res) {
        throw new CliError({
          category: 'DIRECTIVE',
          code: 'DIRECTIVE_GIT_PROPERTY_INVALID',
          message: `\`$GitInfo\` property \`${property}\` is invalid.`,
          hints: `Valid properties: ${Object.keys(gitInfo)
            .map((key) => `\`${key}\``)
            .join(', ')}.`
        });
      }
      return res;
    }
  }
];

const getDisableEmulationHint = () =>
  'Use `--disableEmulation` (`--de`) to disable automatic injection of deployed resource values.';

const resolveStackOutput = async ({
  directive,
  disableEmulation,
  outputName,
  stackName,
  region
}: {
  directive: 'StackOutput' | 'CfStackOutput';
  disableEmulation: boolean;
  outputName: string;
  stackName: string;
  region?: string;
}) => {
  validateStackOutputName(outputName);
  const stackDetails = await awsSdkManager.cloudFormation.getDetails(stackName, region);
  if (!stackDetails) {
    if (!disableEmulation) {
      throw new CliError({
        category: 'DIRECTIVE',
        code: 'DIRECTIVE_STACK_NOT_FOUND',
        message: `\`$${directive}\` cannot fetch outputs from stack \`${stackName}\`.`,
        hints:
          'Make sure the stack is deployed and its full name is correct. Full stack names use the `{stackName}-{stage}` format.'
      });
    }
    return IDENTIFIER_FOR_MISSING_OUTPUT;
  }
  const result = stackDetails.Outputs.find(({ OutputKey }) => OutputKey === outputName);
  if (!result) {
    const exportedOutputNames = stackDetails.Outputs.filter(({ ExportName }) => ExportName).map(
      ({ OutputKey }) => `\`${OutputKey}\``
    );
    throw new CliError({
      category: 'DIRECTIVE',
      code: 'DIRECTIVE_STACK_OUTPUT_NOT_FOUND',
      message: `\`$${directive}\` cannot find output \`${outputName}\` on stack \`${stackName}\`.`,
      hints: [
        `Only exported outputs can be referenced by \`$${directive}\`.`,
        exportedOutputNames.length
          ? `Exported output names: ${exportedOutputNames.join(', ')}.`
          : `Stack \`${stackName}\` has no exported outputs.`,
        `Export \`${outputName}\` before referencing it.`
      ]
    });
  }
  if (!result.ExportName) {
    throw new CliError({
      category: 'DIRECTIVE',
      code: 'DIRECTIVE_STACK_OUTPUT_NOT_EXPORTED',
      message: `Output \`${outputName}\` on stack \`${stackName}\` is not exported.`,
      hints: `Export the output before referencing it with \`$${directive}\`.`
    });
  }
  return directive === 'StackOutput' ? result.OutputValue : ImportValue(result.ExportName);
};
