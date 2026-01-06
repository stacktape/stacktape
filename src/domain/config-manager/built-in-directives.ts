import type { IntrinsicFunction } from '@cloudform/dataTypes';
import { globalStateManager } from '@application-services/global-state-manager';
import { tuiManager } from '@application-services/tui-manager';
import { GetAtt, ImportValue, Ref, Sub } from '@cloudform/functions';
import { IDENTIFIER_FOR_MISSING_OUTPUT } from '@config';
import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { stackManager } from '@domain-services/cloudformation-stack-manager';
import { deployedStackOverviewManager } from '@domain-services/deployed-stack-overview-manager';
import { templateManager } from '@domain-services/template-manager';
import { getStackOutputName } from '@shared/naming/utils';
import { getError, serialize } from '@shared/utils/misc';
import { awsSdkManager } from '@utils/aws-sdk-manager';
import { SubWithoutMapping } from '@utils/cloudformation';
import { ExpectedError } from '@utils/errors';
import { loadFromAnySupportedFile, loadRawFileContent } from '@utils/file-loaders';
import { gitInfoManager } from '@utils/git-info-manager';
import { getAllReferencableParams, referenceableTypes } from '@utils/referenceable-types';
import { validateFormatDirectiveParams, validateStackOutputName } from '@utils/validator';
import { getNonExistingResourceError, getReferencableParamsError } from './utils/resource-references';

// @note !!! BE CAREFUL !!! with using services in directives... some of them might not be initialized yet

export const builtInDirectives: Directive[] = [
  {
    name: 'File',
    isRuntime: false,
    requiredParams: { filePath: 'string' },
    resolveFunction: () => async (sourcePath: string) => {
      const res = await loadFromAnySupportedFile({
        sourcePath,
        codeType: '$File directive input',
        workingDir: globalStateManager.workingDir
      });
      if (res === null) {
        throw new ExpectedError(
          'DIRECTIVE',
          `$File directive cannot load data from file ${tuiManager.makeBold(sourcePath)}. File directive can only load from .env, JSON, YAML or INI files. Loaded file is automatically parsed and its properties can be accessed like this:${tuiManager.makeBold('$File("myfile.json").myProperty')}`,
          'If you wish to load raw file content as string, use $FileRaw directive. Docs: https://docs.stacktape.com/configuration/directives/#file-raw'
        );
      }
      if (res === undefined) {
        throw new ExpectedError(
          'DIRECTIVE',
          `$File directive that references file ${tuiManager.makeBold(sourcePath)} did not return a value.`
        );
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
        workingDir: globalStateManager.workingDir
      });
      return res;
    }
  },
  {
    name: 'CliArgs',
    isRuntime: false,
    requiredParams: { argName: 'string' },
    resolveFunction: () => (argName, defaultValue) => {
      return { ...globalStateManager.args, ...globalStateManager.additionalArgs }[argName] ?? defaultValue;
    }
  },
  {
    name: 'Stage',
    isRuntime: false,
    requiredParams: {},
    resolveFunction: () => () => globalStateManager.targetStack.stage
  },
  {
    name: 'Region',
    isRuntime: false,
    requiredParams: {},
    resolveFunction: () => () => globalStateManager.region
  },
  {
    name: 'Profile',
    isRuntime: false,
    requiredParams: {},
    resolveFunction: () => () => globalStateManager.awsProfileName
  },
  {
    name: 'AwsAccountId',
    isRuntime: false,
    requiredParams: {},
    resolveFunction: () => () => globalStateManager.targetAwsAccount.awsAccountId
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
        throw getNonExistingResourceError({ resourceName: resourceReference, directiveType: '$ResourceParam' });
      }
      if (resource.referencableParams?.[property] === undefined) {
        throw getReferencableParamsError({
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
      const isLocalInvoke = ['dev'].includes(globalStateManager.command);
      if (!resource) {
        throw getNonExistingResourceError({ resourceName: resourceReference, directiveType: '$ResourceParam' });
      }
      if (resource.referencableParams?.[property] === undefined) {
        throw getReferencableParamsError({
          resourceName: resourceReference,
          referencedParam: property,
          referencableParams: Object.keys(resource.referencableParams || {}),
          directiveType: '$ResourceParam'
        });
      }
      if (value === undefined || value === null) {
        const err = getError({
          type: 'DIRECTIVE',
          message: `Can't resolve the result of $ResourceParam('${resourceReference}', '${property}') directive.`
        });
        if (isLocalInvoke) {
          if (globalStateManager.args.disableEmulation) {
            return IDENTIFIER_FOR_MISSING_OUTPUT;
          }
          err.hint = getDisableEmulationHint();
          throw err;
        }
        throw err;
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
        throw getNonExistingResourceError({ resourceName, directiveType: '$CfResourceParam' });
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
        throw getReferencableParamsError({
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
        throw getNonExistingResourceError({ resourceName, directiveType: '$CfResourceParam' });
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
        secret = await awsSdkManager.getSecretValue({ secretId: secretName });
      } catch (err) {
        throw new ExpectedError(
          'DIRECTIVE',
          `Error resolving directive \`$Secret('${secretName}')\`:\n${err}`,
          `If you did not create the secret yet, create it using ${tuiManager.prettyCommand('secret:create')}`
        );
      }
      if (jsonKey) {
        let parsedSecret;
        try {
          parsedSecret = JSON.parse(secret.SecretString);
        } catch {
          throw new ExpectedError(
            'DIRECTIVE',
            `Error resolving directive \`$Secret('${secretName}')\`:\nThe key ${tuiManager.makeBold(jsonKey)} cannot be resolved, because the secret ${tuiManager.makeBold(secretName)} is not a valid JSON object.`
          );
        }
        if (!parsedSecret[jsonKey]) {
          throw new ExpectedError(
            'DIRECTIVE',
            `Error resolving directive \`$Secret('${secretName}')\`:\nThe key ${tuiManager.makeBold(jsonKey)} is not specified in the JSON secret ${tuiManager.makeBold(secretName)}.`
          );
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
      // if (!secretVersionId) {
      //   if (!globalStateManager.args.disableEmulation) {
      //     // @todo think about this
      //     throw new ExpectedError(
      //       'DIRECTIVE',
      //       `Can't resolve the current version of secret ${secretName}. The secret can only be injected if it was used in a stack deployment.`,
      //       getDisableEmulationHint()
      //     );
      //   }
      //   return IDENTIFIER_FOR_MISSING_OUTPUT;
      // }
      try {
        const { SecretString: secretValue } = await awsSdkManager.getSecretValue({
          secretId: secretName,
          versionId: secretVersionId
        });
        if (!secretValue) {
          throw new Error(`Secret "${secretName}" is not valid string secret.`);
        }
        const finalValue = secretReference.split('.')[1]
          ? JSON.parse(secretValue)[secretReference.split('.')[1]]
          : secretValue;
        if (!finalValue) {
          throw new Error(`Secret "${secretName}" does not contain property "${secretReference.split('.')[1]}"`);
        }
        return finalValue;
      } catch (err) {
        throw new ExpectedError(
          'DIRECTIVE',
          `Error when resolving Secret directive for secret with name ${secretName}.\n${err}`
        );
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
      return resolveStackOutput({ directive: 'StackOutput', outputName, stackName, region });
    }
  },
  {
    name: 'CfStackOutput',
    requiredParams: { stackName: 'string', outputName: 'string' },
    isRuntime: true,
    resolveFunction: () => async (stackName: string, outputName: string, region?: AWSRegion) => {
      return resolveStackOutput({ directive: 'CfStackOutput', outputName, stackName, region });
    },
    localResolveFunction: () => async (stackName: string, outputName: string, region?: AWSRegion) => {
      // in case of local resolving of CfStackOutput, we treat it as StackOutput.
      return resolveStackOutput({ directive: 'StackOutput', outputName, stackName, region });
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
        throw new ExpectedError(
          'DIRECTIVE',
          `$GitInfo directive argument "${tuiManager.makeBold(property)}" is not a valid argument.`,
          [`Valid arguments are: ${Object.keys(gitInfo).map(tuiManager.makeBold).join(', ')}`]
        );
      }
      return res;
    }
  }
];

const getDisableEmulationHint = () =>
  `If you want to disable the automatic injection, use the ${tuiManager.colorize(
    'yellow',
    '--disableEmulation'
  )} (--de) flag`;

const resolveStackOutput = async ({
  directive,
  outputName,
  stackName,
  region
}: {
  directive: 'StackOutput' | 'CfStackOutput';
  outputName: string;
  stackName: string;
  region?: string;
}) => {
  validateStackOutputName(outputName);
  const stackDetails = await awsSdkManager.getStackDetails(stackName, region);
  if (!stackDetails) {
    if (!globalStateManager.args.disableEmulation) {
      throw new ExpectedError('DIRECTIVE', `$${directive} error: can't fetch stack outputs of stack "${stackName}"`, [
        'Make sure the stack is deployed and correctly spelled (full stack names are formatted as {stackName}-{stage})'
      ]);
    }
    return IDENTIFIER_FOR_MISSING_OUTPUT;
  }
  const result = stackDetails.Outputs.find(({ OutputKey }) => OutputKey === outputName);
  if (!result) {
    throw new ExpectedError(
      'DIRECTIVE',
      `$${directive} error: cannot find output with name "${outputName}" on stack "${stackName}".`,
      [
        `Only exported outputs can be referenced in $${directive} directive`,
        `Referencable output names: ${stackDetails.Outputs.filter(({ ExportName }) => ExportName)
          .map(({ OutputKey }) => `"${OutputKey}"`)
          .join(', ')}`,
        'If output you are trying to reference is not among referencable outputs, try exporting it first.'
      ]
    );
  }
  if (!result.ExportName) {
    throw new ExpectedError(
      'DIRECTIVE',
      `$${directive} error: output with name "${outputName}" on stack "${stackName}" is not exported.`,
      `Export output "${outputName}" on stack "${stackName}" first, before referencing it in $${directive} directive`
    );
  }
  return directive === 'StackOutput' ? result.OutputValue : ImportValue(result.ExportName);
};
