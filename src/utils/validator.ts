import type Resource from '@cloudform/resource';
import { globalStateManager } from '@application-services/global-state-manager';
import { SUPPORTED_AWS_REGIONS } from '@config';
import { stpErrors } from '@errors';
import { getError, isAlphanumeric, isSmallAlphanumericDashCase } from '@shared/utils/misc';
import { ExpectedError } from '@utils/errors';
import { renderPrettyJson } from '@utils/pretty-json';
import { camelCase } from 'change-case';
import cliSchema from '../../@generated/schemas/cli-schema.json' with { type: 'json' };
import sdkSchema from '../../@generated/schemas/sdk-schema.json' with { type: 'json' };
import { allowedCliArgs, cliArgsAliases, cliCommands } from '../config/cli';
import { getAwsCredentialsIdentity } from './aws-sdk-manager/utils';
import { tuiManager } from './tui';
import { getCommandShortDescription, getPrettyCommand } from './validation-utils';

export const validateDomain = (domain: string) => {
  // eslint-disable-next-line regexp/no-super-linear-backtracking
  if (!domain.match(/^((?:(?:\w[.\-+]?)*\w)+)((?:(?:\w[.\-+]?){0,62}\w)+)\.(\w{2,6})$/)?.length) {
    throw new ExpectedError('CONFIG_VALIDATION', `Domain name '${domain}' is not a valid domain name.`);
  }
};

export const validateUniqueness = (
  cfLogicalName: string,
  resourceType: string,
  resourceList: { [name: string]: Resource }
) => {
  const resourceWithSameLogicalName = resourceList[cfLogicalName];

  if (resourceWithSameLogicalName) {
    throw new ExpectedError(
      'CONFIG',
      `Can't have multiple resources with the same logical name '${cfLogicalName}'. (${resourceWithSameLogicalName.Type}, ${resourceType})`
    );
  }
};

export const validateStackDrift = (driftInformation: DriftDetail[]) => {
  if (globalStateManager.command === 'deploy' && driftInformation && driftInformation.length) {
    throw new ExpectedError(
      'EXISTING_STACK',
      `Your stack has drifted since last deploy. To proceed anyway, use --disableDriftDetection CLI flag. \n${driftInformation
        .map(
          (resource) =>
            `Resource ${resource.resourceLogicalName} of type ${
              resource.resourceType
            } has following differences:\n${renderPrettyJson(resource.differences as any)}`
        )
        .join('\n')}`
    );
  }
};

export const validateScript = ({ type, properties, scriptName }: Script) => {
  const exactlyOneDefined =
    [properties.executeCommand, properties.executeCommands]
      .concat(type !== 'bastion-script' ? [properties.executeScript, properties.executeScripts] : [])
      .filter(Boolean).length === 1;
  if (!exactlyOneDefined) {
    throw new ExpectedError(
      'CONFIG_VALIDATION',
      `Script ${tuiManager.makeBold(scriptName)} must have exactly one of ${tuiManager.prettyConfigProperty(
        'executeCommand'
      )}, ${tuiManager.prettyConfigProperty('executeScript')}, ${tuiManager.prettyConfigProperty(
        'executeCommands'
      )} or ${tuiManager.prettyConfigProperty('executeScripts')} properties defined.`
    );
  }
};

export const validateCommand = ({ rawCommands }: { rawCommands: StacktapeCommand[] }) => {
  if (globalStateManager.invokedFrom !== 'cli') {
    return;
  }
  const hint = `Use ${tuiManager.prettyCommand(
    'help'
  )} to see all available commands and their options or visit ${tuiManager.getLink('docsCli', 'CLI documentation')}`;
  if (rawCommands.length > 1) {
    throw getError({
      type: 'CLI',
      message: `Unknown positional arguments: ${rawCommands.slice(1).join(', ')}`,
      hint
    });
  }
  const command = rawCommands[0];
  if (!command) {
    throw getError({
      type: 'CLI',
      message: `No command specified. Must be one of:\n${cliCommands
        .map(
          (availableCommand) =>
            `- ${tuiManager.makeBold(availableCommand)} - ${getCommandShortDescription(availableCommand)}`
        )
        .join('\n')}.`,
      hint
    });
  }
  if (!cliCommands.includes(command)) {
    throw getError({
      type: 'CLI',
      message: `Invalid command ${tuiManager.makeBold(command)}. Must be one of:\n${cliCommands
        .map(
          (availableCommand) =>
            `- ${tuiManager.makeBold(availableCommand)} - ${getCommandShortDescription(availableCommand)}`
        )
        .join('\n')}.`,
      hint
    });
  }
};

const getLink = (command: string) => {
  if (globalStateManager.invokedFrom === 'cli') {
    const cmdLink = command.replaceAll(':', '-');
    return `https://docs.stacktape.com/cli/commands/${cmdLink}/`;
  }
  const methodLink = camelCase(command.replaceAll(':', '-'));
  return `https://docs.stacktape.com/sdk/methods/${methodLink}/`;
};

export const validateArgs = ({
  command,
  rawArgs,
  defaults,
  fromEnv
}: {
  rawArgs: StacktapeArgs;
  command: StacktapeCommand;
  defaults: ConfigurableCliArgsDefaults;
  fromEnv: Omit<ConfigurableCliArgsDefaults, 'stage'>;
}) => {
  const filteredFromEnv = {};
  Object.entries(fromEnv)
    .filter(([, propValue]) => propValue !== null && propValue !== undefined)
    .forEach(([propName, propValue]) => {
      filteredFromEnv[propName] = propValue;
    });
  const mergedArgs = { ...defaults, ...filteredFromEnv, ...rawArgs };
  const argsSchema = globalStateManager.invokedFrom === 'cli' ? cliSchema[command].args : sdkSchema[command].args;
  const helpHint = `Use ${getPrettyCommand(
    `stacktape ${command} --help`
  )} to show available options and their meaning or visit ${tuiManager.terminalLink(getLink(command), 'docs')}.`;
  const multiCharacterHint =
    'Note that multi-character aliases for options must be supplied with -- (two dashes) instead of one.';
  for (const cliArg in rawArgs) {
    if (!Object.keys(argsSchema).find((allowedArg) => allowedArg === cliArg)) {
      const alias = cliArgsAliases[cliArg] ? `(--${cliArgsAliases[cliArg]}) ` : '';
      throw getError({
        type: 'CLI',
        message: `Invalid argument --${cliArg} ${alias}for command ${command}.${
          allowedCliArgs[command].length ? ` Must be one of ${allowedCliArgs[command].join(', ')}.` : ''
        }`,
        hint: [multiCharacterHint, helpHint]
      });
    }
    const value = mergedArgs[cliArg];
    const { allowedTypes, allowedValues } = argsSchema[cliArg];
    const valueType = Array.isArray(value) ? 'array' : typeof value;
    if (allowedTypes.includes('array') && valueType === 'string') {
      continue;
    }
    if (!allowedTypes.includes(valueType)) {
      let type;
      if (value === true || value === false) {
        type = 'boolean';
      } else if (!Number.isNaN(Number(value))) {
        type = 'number';
      } else if (Array.isArray(value)) {
        type = 'array';
      } else {
        type = typeof value;
      }
      throw getError({
        type: 'CLI',
        message: `Invalid type of argument --${cliArg} for command ${command}. Received '${value}' of type ${type}. Must be of type ${allowedTypes.join(
          ', '
        )}.`,
        hint: [multiCharacterHint, helpHint]
      });
    }
    if (allowedValues) {
      if (!allowedValues.includes(value)) {
        throw getError({
          type: 'CLI',
          message: `Argument --${cliArg} for command ${command} must be one of ${allowedValues.join(
            ', '
          )}. Received: ${value}`,
          hint: [multiCharacterHint, helpHint]
        });
      }
    }
  }
  const requiredCliArgs = Object.entries(argsSchema)
    .map(([argName, argDetails]) => (argDetails as any).required && argName)
    .filter(Boolean);

  if (requiredCliArgs) {
    for (const requiredCliArg of requiredCliArgs) {
      if (requiredCliArg === 'stage') {
        validateStage(mergedArgs[requiredCliArg]);
      }
      if (requiredCliArg === 'region') {
        validateRegion(mergedArgs[requiredCliArg]);
      }
      if (!mergedArgs[requiredCliArg]) {
        throw getError({
          type: 'CLI',
          message: `Missing required argument --${requiredCliArg} for command ${
            globalStateManager.command
          }. Required arguments: ${requiredCliArgs.join(', ')}.`,
          hint: [multiCharacterHint, helpHint]
        });
      }
    }
  }
};

export const validateProjectName = (projectName: string) => {
  if (!isSmallAlphanumericDashCase(projectName)) {
    throw new ExpectedError(
      'CONFIG_VALIDATION',
      `Project name must be alphanumeric with only small characters or dashes (small dash case). Received "${
        projectName || ''
      }".`
    );
  }
};

const validateStage = (stage: string) => {
  if (stage === undefined || stage === null) {
    throw new ExpectedError(
      'CONFIG_VALIDATION',
      'stage is not set.',
      `To set stage, use --stage option or configure default stage globally for your system using ${tuiManager.prettyCommand(
        'defaults:configure'
      )}.`
    );
  }
  if (stage.length < 2) {
    throw new ExpectedError('CONFIG_VALIDATION', `stage must be at least 2 characters long. Value: '${stage}'.`);
  }
  if (!isSmallAlphanumericDashCase(stage)) {
    throw new ExpectedError(
      'CONFIG_VALIDATION',
      'stage must be alphanumeric with only small characters or dashes (small dash case).'
    );
  }
};

export const validateRegion = (region: string) => {
  const hint = `To set region, use --region option, AWS_DEFAULT_REGION env variable or configure it globally for your system using ${tuiManager.prettyCommand(
    'defaults:configure'
  )}.`;
  if (region === null || region === undefined) {
    throw new ExpectedError('CONFIG_VALIDATION', 'Region is not set.', hint);
  }
  if (!SUPPORTED_AWS_REGIONS.includes(region as AWSRegion)) {
    throw new ExpectedError(
      'CONFIG_VALIDATION',
      `Unsupported AWS region ${region}. Supported regions: ${SUPPORTED_AWS_REGIONS.join(', ')}.`,
      hint
    );
  }
};

export const validateFormatDirectiveParams = (
  interpolatedString: string,
  directiveName: 'CfFormat' | 'Format',
  values: any[]
) => {
  const interpolatedStringsCount = interpolatedString.match(/\{\}/g)?.length || 0;
  if (values.length !== interpolatedStringsCount) {
    throw new ExpectedError(
      'DIRECTIVE',
      `Amount of interpolated expressions and values should be the same in $${directiveName} directive. You have ${interpolatedStringsCount} interpolated expressions and ${values.length} values.`
    );
  }
};

// export const validateEnvironmentVars = (envVars: { [name: string]: any }, workloadName: string) => {
//   Object.entries(envVars).forEach(([envName, envValue]) => {
//     if (!getIsDirective(envValue) && !(envValue as any).match(/^[A-Za-z0-9_][a-zA-Z0-9_]*$/)) {
//       throw new ExpectedError(
//         'CONFIG',
//         `Environment variable ${envName} for ${workloadName} includes incorrect characters. It must match regexp /^[A-Za-z_][a-zA-Z0-9_]*$/`
//       );
//     }
//   });
// };

export const validateStackOutput = (propertyName: string, cfTemplate: CloudformationTemplate, value: any) => {
  validateStackOutputName(propertyName);
  const existingValue = cfTemplate.Outputs[propertyName];
  if (existingValue && JSON.stringify(existingValue.Value) !== JSON.stringify(value)) {
    throw new ExpectedError(
      'CONFIG',
      `Stack output with name ${propertyName} already exists with different value. Existing value: ${existingValue.Value}, new value: ${value}.`
    );
  }
};

export const validateStackOutputName = (outputName: string) => {
  if (!isAlphanumeric(outputName)) {
    throw new ExpectedError(
      'CONFIG',
      `Stack output names must be alphanumeric (a-z, A-Z, 0-9). Received ${outputName}.`
    );
  }
};

export const validateS3BucketName = (bucketName) => {
  let error;
  if (bucketName.length < 3) {
    error = `Bucket name '${bucketName}' is shorter than 3 characters.`;
  } else if (bucketName.length > 63) {
    error = `Bucket name '${bucketName}' is longer than 63 characters.`;
  } else if (/[A-Z]/.test(bucketName)) {
    error = `Bucket name '${bucketName}' cannot contain uppercase letters.`;
  } else if (/^[^a-z0-9]/.test(bucketName)) {
    error = `Bucket name '${bucketName}' must start with a letter or number.`;
  } else if (/[^a-z0-9]$/.test(bucketName)) {
    error = `Bucket name '${bucketName}' must end with a letter or number.`;
  } else if (!/^[a-z0-9][a-z.0-9-]+[a-z0-9]$/.test(bucketName)) {
    error = `Bucket name '${bucketName}' contains invalid characters.`;
  } else if (/\.{2,}/.test(bucketName)) {
    error = `Bucket name '${bucketName}' cannot contain consecutive periods '.'`;
  } else if (/^(?:\d{1,3}\.){3}\d{1,3}$/.test(bucketName)) {
    error = `Bucket name '${bucketName}' cannot look like an IPv4 address.`;
  }
  throw new ExpectedError('CONFIG_VALIDATION', error);
};

// export const validateStackExistence = (existingStackDetails: StackDetails, stackName: string) => {
//   if (!existingStackDetails) {
//     throw stpErrors.e32({
//       stackName,
//       stage: globalStateManager.targetStack.stage,
//       organizationName: globalStateManager.organizationData?.name,
//       awsAccountName: globalStateManager.targetAwsAccount.name
//     });
//   }
// };

export const validateAwsProfile = ({
  availableAwsProfiles,
  profile
}: {
  availableAwsProfiles: { profile: string }[];
  profile: string;
}) => {
  if (!availableAwsProfiles.find((p) => p.profile === profile)) {
    throw getError({
      type: 'CLI',
      message: `AWS credentials profile '${profile}' is not set on this system.`,
      hint: [
        `Available profiles are: ${
          availableAwsProfiles.map((p) => p.profile).join(', ') || 'NONE'
        }. You can create a new AWS profile using ${tuiManager.prettyCommand(
          'aws-profile:create'
        )} command or configure AWS credentials using \`AWS_ACCESS_KEY_ID\` and \`AWS_SECRET_ACCESS_KEY\` environment variables.`,
        `To obtain your AWS credentials, you can follow ${tuiManager.terminalLink(
          'https://docs.stacktape.com/user-guides/configure-aws-profile/',
          'our detailed guide'
        )}`
      ]
    });
  }
};

export const validateAwsAccountUsability = ({
  account,
  organization
}: {
  account: GlobalStateConnectedAwsAccount;
  organization: GlobalStateOrganization;
}) => {
  if (account.state !== 'ACTIVE' || !account.awsAccountId) {
    throw stpErrors.e68({ accountInfo: account, organizationName: organization.name });
  }
};

export const validateCredentialsWithRespectToAccount = async ({
  targetAccount,
  credentials,
  profile
}: {
  targetAccount: GlobalStateConnectedAwsAccount;
  credentials: LoadedAwsCredentials;
  profile?: string;
}): Promise<ValidatedAwsCredentials> => {
  const identity = await getAwsCredentialsIdentity({ credentials });
  if (identity.Account !== targetAccount.awsAccountId) {
    throw stpErrors.e69({
      accountInfo: targetAccount,
      credentials,
      credentialsOriginArn: identity.Arn,
      credentialsOriginAwsAccount: identity.Account,
      profile
    });
  }
  return { ...credentials, identity: { account: identity.Account, arn: identity.Arn } };
};
