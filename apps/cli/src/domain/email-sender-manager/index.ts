import { tuiManager } from '@application-services/tui-manager';
import { configManager } from '@domain-services/config-manager';
import { domainManager } from '@domain-services/domain-manager';
import {
  SharedResourceStackManager,
  type SharedResourceStackAdapter,
  type SharedStackRequirement
} from '@domain-services/shared-resource-stack-manager';
import { getSharedResourceStackName } from '@stacktape/naming/shared-stacks';
import { awsSdkManager } from '@utils/aws-sdk-manager';
import { OnFailure } from '@aws-sdk/client-cloudformation';
import { CliError } from '@utils/errors';
import { buildManagedEmailIdentityTemplate, EMAIL_IDENTITY_STACK_CONTRACT_VERSION } from './template';
import { getEmailIdentityDomain, isEmailAddressIdentity } from './identity';

const cloudFormationAdapter: SharedResourceStackAdapter = {
  get: async (stackName) => (await awsSdkManager.cloudFormation.getDetails(stackName)) ?? undefined,
  create: ({ roleArn, stackName, template, parameters, tags }) =>
    awsSdkManager.cloudFormation.createSharedStack(template, {
      StackName: stackName,
      Parameters: parameters,
      Tags: tags,
      OnFailure: OnFailure.DELETE,
      EnableTerminationProtection: true,
      ...(roleArn ? { RoleARN: roleArn } : {})
    }),
  update: ({ stackName, template, parameters, tags }) =>
    awsSdkManager.cloudFormation.updateSharedStack(template, {
      StackName: stackName,
      Parameters: parameters,
      Tags: tags
    })
};

const sharedResourceStackManager = new SharedResourceStackManager({ adapter: cloudFormationAdapter });

const getRequirement = async (
  resource: (typeof configManager.emailSenders)[number]
): Promise<SharedStackRequirement> => {
  const isEmail = isEmailAddressIdentity(resource.identity);
  const hostedZoneId = isEmail
    ? undefined
    : await domainManager.findAuthoritativePublicHostedZoneId(getEmailIdentityDomain(resource.identity));
  return {
    kind: 'email-identity',
    contractVersion: EMAIL_IDENTITY_STACK_CONTRACT_VERSION,
    ownershipKey: resource.identity,
    stackName: getSharedResourceStackName('email-identity', resource.identity),
    parameters: { HostedZoneId: hostedZoneId ?? '' },
    mergeParameters: ({ desired, existing }) => {
      const desiredZone = desired.HostedZoneId;
      const existingZone = existing.HostedZoneId;
      if (desiredZone && existingZone && desiredZone !== existingZone) {
        throw new CliError({
          category: 'DOMAIN_MANAGEMENT',
          code: 'EMAIL_SENDER_HOSTED_ZONE_CONFLICT',
          message: `Shared email identity \`${resource.identity}\` is already bound to Route 53 zone \`${existingZone}\`, but this deployment discovered \`${desiredZone}\`.`,
          hints: 'Use the currently delegated hosted zone, or resolve the DNS delegation conflict before retrying.'
        });
      }
      return { HostedZoneId: existingZone || desiredZone || '' };
    },
    roleArn: configManager.deploymentConfig?.cloudformationRoleArn,
    template: buildManagedEmailIdentityTemplate({ canonicalIdentity: resource.identity }),
    beforeCreate: async () => {
      if (await awsSdkManager.email.getIdentityIfExists(resource.identity)) {
        throw new CliError({
          category: 'AWS',
          code: 'EMAIL_SENDER_IDENTITY_ALREADY_EXISTS',
          message: `SES identity \`${resource.identity}\` already exists outside its Stacktape shared stack.`,
          hints: 'Set `manageIdentity: false` to use it without transferring ownership.'
        });
      }
    }
  };
};

export const ensureManagedEmailSenders = async () => {
  const managed = configManager.emailSenders.filter(({ manageIdentity }) => manageIdentity !== false);
  const external = configManager.emailSenders.filter(({ manageIdentity }) => manageIdentity === false);
  if (!managed.length && !external.length) return;

  await Promise.all(
    external.map(async (resource) => {
      if (!(await awsSdkManager.email.getIdentityIfExists(resource.identity))) {
        throw new CliError({
          category: 'AWS',
          code: 'EMAIL_SENDER_EXTERNAL_IDENTITY_NOT_FOUND',
          message: `External SES identity \`${resource.identity}\` does not exist in \`${awsSdkManager.region}\`.`,
          hints: 'Create the exact identity in this region, or remove `manageIdentity: false` so Stacktape manages it.'
        });
      }
      if (
        resource.configurationSetName &&
        !(await awsSdkManager.email.getConfigurationSetIfExists(resource.configurationSetName))
      ) {
        throw new CliError({
          category: 'AWS',
          code: 'EMAIL_SENDER_EXTERNAL_CONFIGURATION_SET_NOT_FOUND',
          message: `SES configuration set \`${resource.configurationSetName}\` does not exist in \`${awsSdkManager.region}\`.`,
          hints: 'Create that configuration set in this region, correct its name, or omit `configurationSetName`.'
        });
      }
    })
  );

  const requirements = await Promise.all(managed.map(getRequirement));
  const results = await sharedResourceStackManager.ensureAll(requirements);
  for (const result of results) {
    if (result.action === 'create') tuiManager.info(`Created retained shared email stack ${result.stackName}.`);
    if (result.action === 'upgrade') tuiManager.info(`Upgraded retained shared email stack ${result.stackName}.`);
  }

  const [account, ...identities] = await Promise.all([
    awsSdkManager.email.getAccount(),
    ...configManager.emailSenders.map(({ identity }) => awsSdkManager.email.getIdentityIfExists(identity))
  ]);
  if (!account.ProductionAccessEnabled) {
    tuiManager.warn(
      `Amazon SES is in sandbox mode in this region. Sending is limited to verified recipients and sandbox quotas. Request production access: https://console.aws.amazon.com/ses/home?region=${awsSdkManager.region}#/account`
    );
  }
  for (const [index, identity] of identities.entries()) {
    const resource = configManager.emailSenders[index];
    if (!identity || identity.VerificationStatus === 'SUCCESS') continue;
    if (isEmailAddressIdentity(resource.identity)) {
      tuiManager.warn(
        `SES sent a verification email to ${resource.identity}. Open it before sending from this identity.`
      );
      continue;
    }
    const requirement = requirements.find(({ ownershipKey }) => ownershipKey === resource.identity);
    if (requirement?.parameters.HostedZoneId) {
      tuiManager.warn(`SES identity ${resource.identity} is pending while its Route 53 DKIM records propagate.`);
      continue;
    }
    const result = results.find(({ stackName }) => stackName === requirement?.stackName);
    if (result) {
      const stack = await awsSdkManager.cloudFormation.getDetails(result.stackName);
      const output = (key: string) => stack?.Outputs?.find(({ OutputKey }) => OutputKey === key)?.OutputValue;
      const records = [1, 2, 3]
        .map((recordIndex) => [output(`DkimDNSTokenName${recordIndex}`), output(`DkimDNSTokenValue${recordIndex}`)])
        .filter(([name, value]) => name && value);
      if (records.length) {
        tuiManager.warn(
          `SES identity ${resource.identity} is pending DNS verification. Add these exact CNAME records:\n${records
            .map(([name, value]) => `- ${name} -> ${value}`)
            .join('\n')}`
        );
      }
    }
  }
};
