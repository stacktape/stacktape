import type {
  NumberAttributeConstraints,
  SchemaAttribute,
  StringAttributeConstraints
} from '@stacktape/cloudformation/resources/aws-cognito-userpool';
import { cfnResource } from '@stacktape/cloudformation/resource';
import { getAtt, ref } from '@stacktape/cloudformation/intrinsics';
import type { StpUserAuthPool } from '@domain-services/config-manager/resolved-types/user-pools';
import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { domainManager } from '@domain-services/domain-manager';
import { stackManager } from '@domain-services/cloudformation-stack-manager';
import { awsResourceNames } from '@stacktape/naming/aws-resource-names';
import { cfLogicalNames } from '@stacktape/naming/cloudformation-logical-names';
import { getUserPoolDomainPrefix } from '@stacktape/naming/domain-names';
import { hasProperties } from '@utils/misc';
import { ExpectedError } from '@utils/errors';
import { getStpServiceCustomResource } from '../_utils/custom-resource';
import type { AttributeSchema } from '@stacktape/config/user-pools';

export const getUserPoolResource = ({
  name,
  allowOnlyAdminsToCreateAccount,
  unusedAccountValidityDays,
  emailConfiguration,
  inviteMessageConfig = {},
  userVerificationMessageConfig = {},
  userVerificationType,
  mfaConfiguration,
  passwordPolicy,
  schema,
  allowPhoneNumberAsUserName,
  allowEmailAsUserName,
  hooks
}: StpUserAuthPool) => {
  if (!emailConfiguration?.sesAddressArn) {
    const { smsMessage: _, ...emailInviteMessageConfig } = inviteMessageConfig || {};
    const { smsMessage: __, ...emailMessageConfig } = userVerificationMessageConfig || {};
    if (hasProperties(emailInviteMessageConfig) || hasProperties(userVerificationMessageConfig)) {
      const definedProps = [
        ...Object.keys(inviteMessageConfig || {}).map((prop) => `inviteMessageConfig.${prop}`),
        ...Object.keys(emailMessageConfig).map((prop) => `userVerificationMessageConfig.${prop}`)
      ];
      throw new ExpectedError(
        'CONFIG',
        `Can't define ${definedProps.join(', ')} for user pool ${name} if you don't set an email to use.`,
        'You can set it using [userPool].emailConfiguration.sesAddressArn.'
      );
    }
  }

  const tagObject = {};
  stackManager.getTags().forEach(({ Key, Value }) => {
    tagObject[Key] = Value;
  });

  return cfnResource('AWS::Cognito::UserPool', {
    UserPoolName: awsResourceNames.userPool(name, calculatedStackOverviewManager.context.stackName),
    AccountRecoverySetting: {
      RecoveryMechanisms: [
        { Name: 'verified_email', Priority: 1 },
        { Name: 'verified_phone_number', Priority: 2 }
      ]
    },
    AdminCreateUserConfig: {
      AllowAdminCreateUserOnly: allowOnlyAdminsToCreateAccount || false,
      UnusedAccountValidityDays: unusedAccountValidityDays || 31,
      ...(inviteMessageConfig && {
        InviteMessageTemplate: {
          ...(inviteMessageConfig?.emailMessage && { EmailMessage: inviteMessageConfig?.emailMessage }),
          ...(inviteMessageConfig?.emailSubject && { EmailSubject: inviteMessageConfig?.emailSubject }),
          ...(inviteMessageConfig?.smsMessage && { SmsMessage: inviteMessageConfig?.smsMessage })
        }
      })
    },
    AutoVerifiedAttributes:
      userVerificationType === 'sms' ? ['phone_number'] : userVerificationType === 'none' ? [] : ['email'],
    EmailConfiguration: {
      EmailSendingAccount: emailConfiguration?.sesAddressArn ? 'DEVELOPER' : 'COGNITO_DEFAULT',
      ...(emailConfiguration?.sesAddressArn && { SourceArn: emailConfiguration.sesAddressArn }),
      ...(emailConfiguration?.from && { From: emailConfiguration.from }),
      ...(emailConfiguration?.replyToEmailAddress && { ReplyToEmailAddress: emailConfiguration.replyToEmailAddress })
    },
    ...(mfaConfiguration?.status && { MfaConfiguration: mfaConfiguration?.status }),
    ...(mfaConfiguration?.enabledTypes && {
      EnabledMfas: (mfaConfiguration?.enabledTypes || []).map((type) =>
        type === 'EMAIL_OTP' ? 'EMAIL_OTP' : `${type}_MFA`
      )
    }),
    ...(passwordPolicy && {
      Policies: {
        PasswordPolicy: {
          ...(passwordPolicy?.minimumLength && { MinimumLength: passwordPolicy?.minimumLength }),
          ...(passwordPolicy?.requireLowercase && { RequireLowercase: passwordPolicy?.requireLowercase }),
          ...(passwordPolicy?.requireNumbers && { RequireNumbers: passwordPolicy?.requireNumbers }),
          ...(passwordPolicy?.requireSymbols && { RequireSymbols: passwordPolicy?.requireSymbols }),
          ...(passwordPolicy?.requireUppercase && { RequireUppercase: passwordPolicy?.requireUppercase }),
          ...(passwordPolicy?.temporaryPasswordValidityDays && {
            TemporaryPasswordValidityDays: passwordPolicy?.temporaryPasswordValidityDays
          })
        }
      }
    }),
    ...(hooks && {
      LambdaConfig: {
        ...(hooks.createAuthChallenge && { CreateAuthChallenge: hooks.createAuthChallenge }),
        ...(hooks.customMessage && { CustomMessage: hooks.customMessage }),
        ...(hooks.defineAuthChallenge && { DefineAuthChallenge: hooks.defineAuthChallenge }),
        ...(hooks.postAuthentication && { PostAuthentication: hooks.postAuthentication }),
        ...(hooks.postConfirmation && { PostConfirmation: hooks.postConfirmation }),
        ...(hooks.preAuthentication && { PreAuthentication: hooks.preAuthentication }),
        ...(hooks.preSignUp && { PreSignUp: hooks.preSignUp }),
        ...(hooks.preTokenGeneration && { PreTokenGeneration: hooks.preTokenGeneration }),
        ...(hooks.userMigration && { UserMigration: hooks.userMigration }),
        ...(hooks.verifyAuthChallengeResponse && { VerifyAuthChallengeResponse: hooks.verifyAuthChallengeResponse })
      }
    }),
    ...(schema && { Schema: schema.map(getSchema) }),
    UsernameAttributes: [
      ...(allowPhoneNumberAsUserName === false ? [] : ['phone_number']),
      ...(allowEmailAsUserName === false ? [] : ['email'])
    ],
    SmsConfiguration: {
      SnsCallerArn: getAtt(cfLogicalNames.snsRoleSendSmsFromCognito(name), 'Arn')
      // @todo add external id so that MFA can be sent via SMS "You can set it to anything (a unique string is best, e.g., your project name or UUID)"
      // ExternalId:
    },
    VerificationMessageTemplate: {
      ...((userVerificationType === 'email-code' || userVerificationType === 'email-link') && {
        DefaultEmailOption: userVerificationType === 'email-code' ? 'CONFIRM_WITH_CODE' : 'CONFIRM_WITH_LINK'
      }),
      ...(userVerificationMessageConfig?.emailMessageUsingCode && {
        EmailMessage: userVerificationMessageConfig?.emailMessageUsingCode
      }),
      ...(userVerificationMessageConfig?.emailSubjectUsingCode && {
        EmailSubject: userVerificationMessageConfig?.emailSubjectUsingCode
      }),
      ...(userVerificationMessageConfig?.emailMessageUsingLink && {
        EmailMessageByLink: userVerificationMessageConfig?.emailMessageUsingLink
      }),
      ...(userVerificationMessageConfig?.emailSubjectUsingLink && {
        EmailSubjectByLink: userVerificationMessageConfig?.emailSubjectUsingLink
      }),
      ...(userVerificationMessageConfig?.smsMessage && { SmsMessage: userVerificationMessageConfig?.smsMessage })
    },
    UserPoolTags: tagObject
  });
};

export const getSnsRoleSendSmsFromCognito = (userPoolName: string) =>
  cfnResource('AWS::IAM::Role', {
    Policies: [
      {
        PolicyName: `send-sms-for-${userPoolName}`,
        PolicyDocument: {
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Action: ['sns:publish'],
              Resource: ['*']
            }
          ]
        }
      }
    ],
    AssumeRolePolicyDocument: {
      Statement: [
        {
          Effect: 'Allow',
          Principal: {
            Service: 'cognito-idp.amazonaws.com'
          },
          Action: 'sts:AssumeRole'
        }
      ],
      Version: '2012-10-17'
    }
  });

export const getUserPoolClientResource = (
  {
    accessTokenValiditySeconds,
    idTokenValiditySeconds,
    refreshTokenValidityDays,
    allowedOAuthFlows,
    allowedOAuthScopes,
    callbackURLs,
    logoutURLs,
    identityProviders,
    allowOnlyExternalIdentityProviders,
    generateClientSecret
  }: StpUserAuthPool,
  userPoolName: string
) => {
  if (accessTokenValiditySeconds && (accessTokenValiditySeconds > 86400 || accessTokenValiditySeconds < 1)) {
    throw new ExpectedError(
      'CONFIG_VALIDATION',
      `accessTokenValiditySeconds for user-pool ${userPoolName} must be between 1 and 86400`
    );
  }
  if (idTokenValiditySeconds && (idTokenValiditySeconds > 86400 || idTokenValiditySeconds < 1)) {
    throw new ExpectedError(
      'CONFIG_VALIDATION',
      `idTokenValiditySeconds for user-pool ${userPoolName} must be between 1 and 86400`
    );
  }
  if (refreshTokenValidityDays && (refreshTokenValidityDays > 315360000 || refreshTokenValidityDays < 0)) {
    throw new ExpectedError(
      'CONFIG_VALIDATION',
      `refreshTokenValidityDays for user-pool ${userPoolName} must be between 1 and 86400`
    );
  }
  // const usesIdentityProviders = !!identityProviders?.length || enableHostedUi;
  const allowedCallbackUrls = callbackURLs || ['http://localhost:3000/api/auth/callback/cognito'];
  return cfnResource('AWS::Cognito::UserPoolClient', {
    UserPoolId: ref(cfLogicalNames.userPool(userPoolName)),
    AccessTokenValidity: accessTokenValiditySeconds || 1,
    IdTokenValidity: idTokenValiditySeconds || 1,
    RefreshTokenValidity: refreshTokenValidityDays || 30,
    AllowedOAuthFlowsUserPoolClient: true,
    AllowedOAuthFlows: allowedOAuthFlows || ['code', 'implicit'],
    ExplicitAuthFlows: [
      'ALLOW_ADMIN_USER_PASSWORD_AUTH',
      'ALLOW_CUSTOM_AUTH',
      'ALLOW_USER_PASSWORD_AUTH',
      'ALLOW_USER_SRP_AUTH',
      'ALLOW_REFRESH_TOKEN_AUTH'
    ],
    AllowedOAuthScopes: allowedOAuthScopes || ['email', 'openid', 'profile'],
    CallbackURLs: allowedCallbackUrls,
    DefaultRedirectURI: allowedCallbackUrls[0],
    LogoutURLs: logoutURLs || [],
    SupportedIdentityProviders: (allowOnlyExternalIdentityProviders ? [] : ['COGNITO']).concat(
      (identityProviders || []).map((provider) => provider.type)
    ),
    ClientName: awsResourceNames.userPoolClient(userPoolName, calculatedStackOverviewManager.context.stackName),
    GenerateSecret: generateClientSecret
  });
};

export const getIdentityProviderResource = (
  providerProps: StpUserAuthPool['identityProviders'][number],
  userPoolName: string
) => {
  const { type, attributeMapping, providerDetails, authorizeScopes } = providerProps;
  const { authorize_scopes, client_id, client_secret } = getIdentityProviderDetails(providerProps);
  return cfnResource('AWS::Cognito::UserPoolIdentityProvider', {
    ProviderName: type,
    ProviderType: type,
    UserPoolId: ref(cfLogicalNames.userPool(userPoolName)),
    AttributeMapping: attributeMapping || { email: 'email' },
    ProviderDetails: {
      authorize_scopes: authorizeScopes ? authorizeScopes.join(' ') : authorize_scopes,
      client_id,
      client_secret,
      ...(providerDetails || {})
    }
  });
};

const getIdentityProviderDetails = ({ clientId, clientSecret, type }: StpUserAuthPool['identityProviders'][number]) => {
  switch (type) {
    case 'LoginWithAmazon': {
      return {
        client_id: clientId,
        client_secret: clientSecret,
        authorize_scopes: 'profile postal_code'
      };
    }
    case 'Google': {
      return {
        client_id: clientId,
        client_secret: clientSecret,
        authorize_scopes: 'profile email openid'
      };
    }
    case 'Facebook': {
      return {
        client_id: clientId,
        client_secret: clientSecret,
        authorize_scopes: 'public_profile,email'
      };
    }
    case 'OIDC': {
      return {
        client_id: clientId,
        client_secret: clientSecret,
        authorize_scopes: 'email profile openid'
      };
    }
  }
};

const getSchema = (attrSchema: AttributeSchema): SchemaAttribute => {
  const res: SchemaAttribute = {};
  if (attrSchema.attributeDataType) {
    res.AttributeDataType = String(attrSchema.attributeDataType);
  }
  if (attrSchema.developerOnlyAttribute) {
    res.DeveloperOnlyAttribute = attrSchema.developerOnlyAttribute;
  }
  if (attrSchema.mutable) {
    res.Mutable = attrSchema.mutable;
  }
  if (attrSchema.name) {
    res.Name = String(attrSchema.name);
  }
  if (attrSchema.required) {
    res.Required = attrSchema.required;
  }
  if (attrSchema.numberMaxValue) {
    (res.NumberAttributeConstraints as NumberAttributeConstraints).MaxValue = String(attrSchema.numberMaxValue);
  }
  if (attrSchema.numberMinValue) {
    (res.NumberAttributeConstraints as NumberAttributeConstraints).MinValue = String(attrSchema.numberMinValue);
  }
  if (attrSchema.stringMaxLength) {
    (res.StringAttributeConstraints as StringAttributeConstraints).MaxLength = String(attrSchema.stringMaxLength);
  }
  if (attrSchema.stringMinLength) {
    (res.StringAttributeConstraints as StringAttributeConstraints).MinLength = String(attrSchema.stringMinLength);
  }
  return res;
};

export const getUserPoolDomainResource = (userPool: StpUserAuthPool, userPoolName: string) => {
  if (userPool.customDomain) {
    return cfnResource('AWS::Cognito::UserPoolDomain', {
      UserPoolId: ref(cfLogicalNames.userPool(userPoolName)),
      Domain: userPool.customDomain.domainName,
      CustomDomainConfig: {
        CertificateArn:
          userPool.customDomain.customCertificateArn ||
          domainManager.getCertificateForDomain(userPool.customDomain.domainName, 'cdn')
      }
    });
  }
  return cfnResource('AWS::Cognito::UserPoolDomain', {
    UserPoolId: ref(cfLogicalNames.userPool(userPoolName)),
    Domain:
      userPool.hostedUiDomainPrefix ||
      getUserPoolDomainPrefix(calculatedStackOverviewManager.context.stackName, userPoolName)
  });
};

export const getLambdaPermissionForHookResource = (lambdaArn: string, userPoolName: string) => {
  return cfnResource('AWS::Lambda::Permission', {
    FunctionName: lambdaArn,
    Action: 'lambda:InvokeFunction',
    Principal: 'cognito-idp.amazonaws.com',
    SourceArn: getAtt(cfLogicalNames.userPool(userPoolName), 'Arn')
  });
};

export const getUserPoolDetailsCustomResource = (userPool: StpUserAuthPool) => {
  return getStpServiceCustomResource<'userPoolDetails'>({
    userPoolDetails: {
      userPoolId: ref(cfLogicalNames.userPool(userPool.name)),
      userPoolClientId: ref(cfLogicalNames.userPoolClient(userPool.name))
    }
  });
};

export const getUserPoolUiCustomizationAttachmentResource = (
  { hostedUiCSS }: StpUserAuthPool,
  userPoolName: string
) => {
  return cfnResource('AWS::Cognito::UserPoolUICustomizationAttachment', {
    CSS: hostedUiCSS,
    ClientId: ref(cfLogicalNames.userPoolClient(userPoolName)),
    UserPoolId: ref(cfLogicalNames.userPool(userPoolName))
  });
};

export const getUserPoolCustomDomainDnsRecord = (
  userPoolName: string,
  domainConfiguration: { fullyQualifiedDomainName: string; hostedZoneId: string }
) =>
  cfnResource('AWS::Route53::RecordSet', {
    HostedZoneId: domainConfiguration.hostedZoneId,
    Name: domainConfiguration.fullyQualifiedDomainName,
    Type: 'A',
    AliasTarget: {
      DNSName: getAtt(cfLogicalNames.userPoolDomain(userPoolName), 'CloudFrontDistribution'),
      HostedZoneId: 'Z2FDTNDATAQYW2'
    }
  });
