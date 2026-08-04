import type { CloudFormationTemplate } from '@stacktape/cloudformation/resource';
import type { AnyCloudFormationResource } from '@stacktape/cloudformation/resource';
import type {
  ConfigurableCliArgsDefaults,
  GlobalStateConnectedAwsAccount,
  GlobalStateOrganization
} from '@application-services/global-state-manager/types';
import type { DriftDetail } from '@domain-services/cloudformation-stack-manager/types';
import type { StacktapeArgs } from 'src/config/cli/types';
import type { Script } from '@domain-services/config-manager/resolved-types/resources';
import { globalStateManager } from '@application-services/global-state-manager';
import type { LoadedAwsCredentials, ValidatedAwsCredentials } from 'src/aws/credentials';
import { SUPPORTED_AWS_REGIONS, type SupportedAWSRegion as AWSRegion } from '@stacktape/config/aws-regions';
import { isAlphanumeric, isSmallAlphanumericDashCase } from '@utils/misc';
import { CliError } from '@utils/errors';
import { renderPrettyJson } from '@utils/pretty-json';
import { cliCommands, type StacktapeCommand } from '../config/cli/commands';
import { argAliases as cliArgsAliases } from '../config/cli/options';
import { getAllowedArgs, getArgInfo, getRequiredArgs } from '../config/cli/utils';
import { getAwsCredentialsIdentity } from './aws-sdk-manager/utils';

export const validateDomain = (domain: string) => {
  if (!domain.match(/^((?:(?:\w[.\-+]?)*\w)+)((?:(?:\w[.\-+]?){0,62}\w)+)\.(\w{2,6})$/)?.length) {
    throw new CliError({
      category: 'CONFIG_VALIDATION',
      code: 'CONFIG_VALIDATION_INVALID_DOMAIN',
      message: `Domain name \`${domain}\` is not valid.`
    });
  }
};

export const validateUniqueness = (
  cfLogicalName: string,
  resourceType: string,
  resourceList: { [name: string]: AnyCloudFormationResource }
) => {
  const resourceWithSameLogicalName = resourceList[cfLogicalName];

  if (resourceWithSameLogicalName) {
    throw new CliError({
      category: 'CONFIG',
      code: 'CONFIG_DUPLICATE_LOGICAL_NAME',
      message: `Multiple resources resolve to the logical name \`${cfLogicalName}\`: \`${resourceWithSameLogicalName.Type}\` and \`${resourceType}\`.`
    });
  }
};

export const validateStackDrift = (driftInformation: DriftDetail[]) => {
  if (globalStateManager.command === 'deploy' && driftInformation && driftInformation.length) {
    throw new CliError({
      category: 'EXISTING_STACK',
      code: 'STACK_DRIFT_DETECTED',
      message: `Your stack has drifted since the last deploy.\n${driftInformation
        .map(
          (resource) =>
            `Resource ${resource.resourceLogicalName} of type ${
              resource.resourceType
            } has following differences:\n${renderPrettyJson(resource.differences as any)}`
        )
        .join('\n')}`,
      hints: 'To proceed anyway, use `--disableDriftDetection`.'
    });
  }
};

export const validateScript = ({ type, properties, scriptName }: Script) => {
  const exactlyOneDefined =
    [properties.executeCommand, properties.executeCommands]
      .concat(type !== 'bastion-script' ? [properties.executeScript, properties.executeScripts] : [])
      .filter(Boolean).length === 1;
  if (!exactlyOneDefined) {
    throw new CliError({
      category: 'CONFIG_VALIDATION',
      code: 'CONFIG_VALIDATION_SCRIPT_COMMAND_COUNT',
      message: `Script \`${scriptName}\` must define exactly one of \`executeCommand\`, \`executeScript\`, \`executeCommands\`, or \`executeScripts\`.`
    });
  }
};

export const validateCommand = ({ rawCommands }: { rawCommands: StacktapeCommand[] }) => {
  const hint =
    'Use `stacktape help` to see all available commands and their options, or visit https://docs.stacktape.com/cli/.';
  if (rawCommands.length > 1) {
    throw new CliError({
      category: 'CLI',
      code: 'CLI_MULTIPLE_POSITIONAL_ARGUMENTS',
      message: `Unknown positional arguments: ${rawCommands
        .slice(1)
        .map((arg) => `\`${arg}\``)
        .join(', ')}.`,
      hints: hint
    });
  }
  const command = rawCommands[0];
  if (!command) {
    throw new CliError({
      category: 'CLI',
      code: 'CLI_COMMAND_MISSING',
      message: 'No command specified.',
      hints: hint
    });
  }
  if (!cliCommands.includes(command)) {
    throw new CliError({
      category: 'CLI',
      code: 'CLI_COMMAND_UNKNOWN',
      message: `Unknown command \`${command}\`.`,
      hints: hint
    });
  }
};

const getLink = (command: string) => {
  const cmdLink = command.replaceAll(':', '-');
  return `https://docs.stacktape.com/cli/commands/${cmdLink}/`;
};

export const validateArgs = ({
  command,
  rawArgs,
  defaults,
  fromEnv,
  skipRegionValidation
}: {
  rawArgs: StacktapeArgs;
  command: StacktapeCommand;
  defaults: ConfigurableCliArgsDefaults;
  fromEnv: Omit<ConfigurableCliArgsDefaults, 'stage'>;
  skipRegionValidation?: boolean;
}) => {
  const filteredFromEnv: Record<string, unknown> = {};
  Object.entries(fromEnv)
    .filter(([, propValue]) => propValue !== null && propValue !== undefined)
    .forEach(([propName, propValue]) => {
      filteredFromEnv[propName] = propValue;
    });
  const mergedArgs = { ...defaults, ...filteredFromEnv, ...rawArgs };

  // Get allowed args using the new Zod-based definition
  const allowedArgs = getAllowedArgs(command as StacktapeCommand);

  const helpHint = `Use \`stacktape ${command} --help\` to show available options and their meaning, or visit ${getLink(command)}.`;
  const multiCharacterHint =
    'Note that multi-character aliases for options must be supplied with -- (two dashes) instead of one.';

  // Validate each provided arg
  for (const cliArg in rawArgs) {
    if (!allowedArgs.includes(cliArg)) {
      const rawAlias = cliArgsAliases[cliArg as keyof typeof cliArgsAliases];
      const alias = rawAlias ? `(--${Array.isArray(rawAlias) ? rawAlias.join(', --') : rawAlias}) ` : '';
      throw new CliError({
        category: 'CLI',
        code: 'CLI_ARGUMENT_UNKNOWN',
        message: `Invalid argument \`--${cliArg}\` ${alias}for command \`${command}\`.${
          allowedArgs.length ? ` Must be one of ${allowedArgs.map((arg) => `\`--${arg}\``).join(', ')}.` : ''
        }`,
        hints: [multiCharacterHint, helpHint]
      });
    }

    const value = mergedArgs[cliArg];
    const argInfo = getArgInfo(command as StacktapeCommand, cliArg);
    const { allowedTypes, allowedValues } = argInfo;

    const valueType = Array.isArray(value) ? 'array' : typeof value;

    // Allow string for array args (will be wrapped)
    if (allowedTypes.includes('array') && valueType === 'string') {
      continue;
    }

    if (!allowedTypes.includes(valueType)) {
      let type: string;
      if (value === true || value === false) {
        type = 'boolean';
      } else if (!Number.isNaN(Number(value))) {
        type = 'number';
      } else if (Array.isArray(value)) {
        type = 'array';
      } else {
        type = typeof value;
      }
      throw new CliError({
        category: 'CLI',
        code: 'CLI_ARGUMENT_TYPE_INVALID',
        message: `Invalid type of argument \`--${cliArg}\` for command \`${command}\`. Received \`${value}\` of type \`${type}\`. Must be of type ${allowedTypes.join(
          ', '
        )}.`,
        hints: [multiCharacterHint, helpHint]
      });
    }

    if (allowedValues && allowedValues.length > 0) {
      if (!allowedValues.includes(value as string)) {
        throw new CliError({
          category: 'CLI',
          code: 'CLI_ARGUMENT_VALUE_INVALID',
          message: `Argument \`--${cliArg}\` for command \`${command}\` must be one of ${allowedValues.join(
            ', '
          )}. Received: \`${value}\``,
          hints: [multiCharacterHint, helpHint]
        });
      }
    }
  }

  // Get required args for the command
  const requiredArgs = getRequiredArgs(command as StacktapeCommand);

  if (requiredArgs) {
    for (const requiredArg of requiredArgs) {
      if (requiredArg === 'stage') {
        validateStage(mergedArgs[requiredArg] as string);
      }
      if (requiredArg === 'region') {
        // Skip region validation if it will be prompted interactively
        if (!skipRegionValidation) {
          validateRegion(mergedArgs[requiredArg] as string);
        }
        continue; // Skip the generic missing check for region - handled separately
      }
      if (!mergedArgs[requiredArg]) {
        throw new CliError({
          category: 'CLI',
          code: 'CLI_ARGUMENT_REQUIRED',
          message: `Missing required argument \`--${requiredArg}\` for command \`${command}\`. Required arguments: ${(
            requiredArgs as readonly string[]
          )
            .map((arg) => `\`--${arg}\``)
            .join(', ')}.`,
          hints: [multiCharacterHint, helpHint]
        });
      }
    }
  }
};

export const validateProjectName = (projectName: string) => {
  if (!isSmallAlphanumericDashCase(projectName)) {
    throw new CliError({
      category: 'CONFIG_VALIDATION',
      code: 'CONFIG_VALIDATION_PROJECT_NAME_INVALID',
      message: `Project name must contain only lowercase letters, numbers, and dashes. Received \`${projectName || ''}\`.`
    });
  }
};

const validateStage = (stage: string) => {
  if (stage === undefined || stage === null) {
    throw new CliError({
      category: 'CONFIG_VALIDATION',
      code: 'CONFIG_VALIDATION_STAGE_MISSING',
      message: 'Stage is not set.',
      hints: 'Use `--stage`, or configure a global default with `stacktape defaults:configure`.'
    });
  }
  if (stage.length < 2) {
    throw new CliError({
      category: 'CONFIG_VALIDATION',
      code: 'CONFIG_VALIDATION_STAGE_TOO_SHORT',
      message: `Stage must be at least two characters long. Received \`${stage}\`.`
    });
  }
  if (!isSmallAlphanumericDashCase(stage)) {
    throw new CliError({
      category: 'CONFIG_VALIDATION',
      code: 'CONFIG_VALIDATION_STAGE_INVALID',
      message: 'Stage must contain only lowercase letters, numbers, and dashes.'
    });
  }
};

export const validateRegion = (region: string) => {
  const hint =
    'Use `--region`, set `AWS_DEFAULT_REGION`, or configure a global default with `stacktape defaults:configure`.';
  if (region === null || region === undefined) {
    throw new CliError({
      category: 'CONFIG_VALIDATION',
      code: 'CONFIG_VALIDATION_REGION_MISSING',
      message: 'AWS region is not set.',
      hints: hint
    });
  }
  if (!SUPPORTED_AWS_REGIONS.includes(region as AWSRegion)) {
    throw new CliError({
      category: 'CONFIG_VALIDATION',
      code: 'CONFIG_VALIDATION_REGION_UNSUPPORTED',
      message: `Unsupported AWS region \`${region}\`. Supported regions: ${SUPPORTED_AWS_REGIONS.join(', ')}.`,
      hints: hint
    });
  }
};

export const validateFormatDirectiveParams = (
  interpolatedString: string,
  directiveName: 'CfFormat' | 'Format',
  values: any[]
) => {
  const interpolatedStringsCount = interpolatedString.match(/\{\}/g)?.length || 0;
  if (values.length !== interpolatedStringsCount) {
    throw new CliError({
      category: 'DIRECTIVE',
      code: 'DIRECTIVE_FORMAT_VALUE_COUNT_MISMATCH',
      message: `The \`$${directiveName}\` directive has ${interpolatedStringsCount} placeholders but ${values.length} values.`
    });
  }
};

export const validateStackOutput = (propertyName: string, cfTemplate: CloudFormationTemplate, value: any) => {
  validateStackOutputName(propertyName);
  const existingValue = cfTemplate.Outputs[propertyName];
  if (existingValue && JSON.stringify(existingValue.Value) !== JSON.stringify(value)) {
    throw new CliError({
      category: 'CONFIG',
      code: 'CONFIG_STACK_OUTPUT_CONFLICT',
      message: `Stack output \`${propertyName}\` already exists with a different value. Existing value: ${existingValue.Value}; new value: ${value}.`
    });
  }
};

export const validateStackOutputName = (outputName: string) => {
  if (!isAlphanumeric(outputName)) {
    throw new CliError({
      category: 'CONFIG',
      code: 'CONFIG_STACK_OUTPUT_NAME_INVALID',
      message: `Stack output names must be alphanumeric (a-z, A-Z, 0-9). Received \`${outputName}\`.`
    });
  }
};

export const validateS3BucketName = (bucketName: string) => {
  let error: string | undefined;
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
  if (error) {
    throw new CliError({
      category: 'CONFIG_VALIDATION',
      code: 'CONFIG_VALIDATION_BUCKET_NAME_INVALID',
      message: error
    });
  }
};

export const validateAwsProfile = ({
  availableAwsProfiles,
  profile
}: {
  availableAwsProfiles: { profile: string }[];
  profile: string;
}) => {
  if (!availableAwsProfiles.find((p) => p.profile === profile)) {
    throw new CliError({
      category: 'CLI',
      code: 'CLI_AWS_PROFILE_NOT_FOUND',
      message: `AWS credentials profile \`${profile}\` is not configured on this system.`,
      hints: [
        `Available profiles are: ${
          availableAwsProfiles.map((p) => p.profile).join(', ') || 'NONE'
        }. Create one with \`stacktape aws-profile:create\`, or set \`AWS_ACCESS_KEY_ID\` and \`AWS_SECRET_ACCESS_KEY\`.`,
        'See https://docs.stacktape.com/user-guides/configure-aws-profile/ for a detailed guide.'
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
    throw new CliError({
      category: 'AWS_ACCOUNT',
      code: 'AWS_ACCOUNT_UNUSABLE',
      message: `AWS account \`${account.name}\` (${account.awsAccountId || 'no account ID'}) in organization \`${organization.name}\` is in state \`${account.state}\` and cannot be used.`,
      hints:
        account.state === 'PENDING'
          ? 'Finish connecting the account at https://console.stacktape.com/aws-accounts.'
          : 'Contact Stacktape support at support@stacktape.com.'
    });
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
    throw new CliError({
      category: 'AWS_ACCOUNT',
      code: 'AWS_ACCOUNT_CREDENTIALS_MISMATCH',
      message: `AWS credentials from \`${credentials.source}${
        credentials.source === 'credentialsFile' && profile ? ` (${profile})` : ''
      }\` belong to account \`${identity.Account}\` (${identity.Arn}), not target account \`${targetAccount.name}\` (${targetAccount.awsAccountId}).`
    });
  }
  return { ...credentials, identity: { account: identity.Account, arn: identity.Arn } };
};
