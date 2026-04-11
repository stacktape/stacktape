---
docType: config-ref
title: User Auth Pool
resourceType: user-auth-pool
tags:
  - user-auth-pool
  - cognito
  - auth
  - authentication
source: types/stacktape-config/user-pools.d.ts
priority: 1
---

# User Auth Pool

A resource for managing user authentication and authorization.

A user pool is a fully managed identity provider that handles user sign-up, sign-in, and access control.
It provides a secure and scalable way to manage user identities for your applications.

Resource type: `user-auth-pool`

## TypeScript Definition

```typescript
/**
 * #### A resource for managing user authentication and authorization.
 *
 * ---
 *
 * A user pool is a fully managed identity provider that handles user sign-up, sign-in, and access control.
 * It provides a secure and scalable way to manage user identities for your applications.
 */
interface UserAuthPool {
  type: 'user-auth-pool';
  properties?: UserAuthPoolProps;
  overrides?: ResourceOverrides;
}

interface UserAuthPoolProps {
  /**
   * #### Restrict account creation to administrators
   *
   * ---
   *
   * If enabled, new users can't sign up themselves. Accounts must be created through an admin flow (for example from an internal admin tool or script),
   * which helps prevent unwanted self-registrations.
   *
   * Internally this controls `AdminCreateUserConfig.AllowAdminCreateUserOnly` on the Cognito user pool
   * ([AWS::Cognito::UserPool](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-cognito-userpool)).
   *
   * @default false
   */
  allowOnlyAdminsToCreateAccount?: boolean;
  /**
   * #### Expire unused admin-created accounts
   *
   * ---
   *
   * When an admin creates a user account, Cognito issues a temporary password. This setting controls how many days that temporary password
   * (and the corresponding account) stays valid if the user never signs in.
   *
   * Internally this maps to `AdminCreateUserConfig.UnusedAccountValidityDays`.
   *
   * @default 31
   */
  unusedAccountValidityDays?: number;
  /**
   * #### (Reserved) Require verified emails
   *
   * ---
   *
   * Present for forward compatibility. Stacktape currently derives email / phone verification behavior from `userVerificationType`,
   * not from this flag directly.
   *
   * To require email-based verification today, use `userVerificationType: 'email-link' | 'email-code'` instead.
   */
  requireEmailVerification?: boolean;
  /**
   * #### (Reserved) Require verified phone numbers
   *
   * ---
   *
   * Present for forward compatibility. Stacktape currently derives email / phone verification behavior from `userVerificationType`,
   * not from this flag directly.
   *
   * To require SMS-based verification today, use `userVerificationType: 'sms'`.
   */
  requirePhoneNumberVerification?: boolean;
  /**
   * #### Enable the Cognito Hosted UI
   *
   * ---
   *
   * Turns on Cognito's Hosted UI – a pre-built, hosted login and registration page – so you don't have to build your own auth screens.
   * This is useful when you want to get started quickly or keep authentication logic outside of your main app.
   *
   * @default false
   */
  enableHostedUi?: boolean;
  /**
   * #### Hosted UI domain prefix
   *
   * ---
   *
   * Sets the first part of your Hosted UI URL: `https://<prefix>.auth.<region>.amazoncognito.com`.
   * Pick something that matches your project or company name.
   */
  hostedUiDomainPrefix?: string;
  /**
   * #### Custom CSS for the Hosted UI
   *
   * ---
   *
   * Lets you override the default Cognito Hosted UI styling with your own CSS (colors, fonts, layouts, etc.),
   * so the login experience matches the rest of your application.
   *
   * Behind the scenes this is applied using the `AWS::Cognito::UserPoolUICustomizationAttachment` resource.
   */
  hostedUiCSS?: string;
  /**
   * #### Lambda triggers for the user pool
   *
   * ---
   *
   * Connects AWS Lambda functions to Cognito "hooks" (triggers) such as pre-sign-up, post-confirmation, or token generation.
   * You can use these to enforce additional validation, enrich user profiles, migrate users from another system, and more.
   *
   * Internally this maps to the Cognito user pool `LambdaConfig`.
   */
  hooks?: UserPoolHooks;
  /**
   * #### Email delivery settings
   *
   * ---
   *
   * Controls how Cognito sends emails (verification messages, password reset codes, admin invitations, etc.).
   * You can either use Cognito's built-in email service or plug in your own SES identity for full control over the sender.
   *
   * This config is used to build the Cognito `EmailConfiguration` block
   * ([AWS docs](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-cognito-userpool)).
   */
  emailConfiguration?: EmailConfiguration;
  /**
   * #### Invite message overrides
   *
   * ---
   *
   * Customizes the contents of the "invitation" message that users receive when an administrator creates their account
   * (for example, when sending a temporary password and sign-in instructions).
   *
   * If you want to send custom emails through SES, you must also configure `emailConfiguration.sesAddressArn`.
   */
  inviteMessageConfig?: InviteMessageConfig;
  /**
   * #### Verification strategy
   *
   * ---
   *
   * Chooses how new users prove that they own their contact information:
   *
   * - `email-link`: Cognito emails a clickable link.
   * - `email-code`: Cognito emails a short numeric code.
   * - `sms`: Cognito sends a code via SMS to the user's phone number.
   * - `none`: Users aren't required to verify email or phone during sign-up.
   *
   * Stacktape uses this value to configure `AutoVerifiedAttributes` and `VerificationMessageTemplate`
   * on the underlying Cognito user pool.
   */
  userVerificationType?: UserVerificationType;
  /**
   * #### Verification message text
   *
   * ---
   *
   * Lets you customize the exact email and SMS texts that Cognito sends when asking users to verify their email / phone.
   * For example, you can change subjects, body text, or the message that contains the `{####}` verification code.
   */
  userVerificationMessageConfig?: UserVerificationMessageConfig;
  /**
   * #### Multi-factor authentication
   *
   * ---
   *
   * Controls whether you use Multi‑Factor Authentication (MFA) and which second factors are allowed.
   * MFA makes it much harder for attackers to access accounts even if they know a user's password.
   *
   * Under the hood this config drives both the `MfaConfiguration` and `EnabledMfas` properties in Cognito
   * (see "MFA configuration" in the
   * [AWS::Cognito::UserPool docs](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-cognito-userpool)).
   */
  mfaConfiguration?: MfaConfiguration;
  /**
   * #### Password strength rules
   *
   * ---
   *
   * Defines how strong user passwords must be – minimum length and whether they must include lowercase, uppercase,
   * numbers, and/or symbols – plus how long temporary passwords issued to new users remain valid.
   *
   * This is applied to the Cognito `Policies.PasswordPolicy` block.
   */
  passwordPolicy?: PasswordPolicy;
  /**
   * #### Custom attributes schema
   *
   * ---
   *
   * Lets you define additional attributes (like `role`, `plan`, `companyId`, etc.) that are stored on each user,
   * including their data type and validation constraints.
   *
   * These translate into the Cognito user pool `Schema` entries
   * ([schema docs](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-cognito-userpool)).
   */
  schema?: AttributeSchema[];
  /**
   * #### Allow phone numbers as usernames
   *
   * ---
   *
   * If enabled (the default), users can sign in using their phone number in addition to any traditional username.
   * Turning this off means phone numbers can still be stored, but can't be used to log in.
   *
   * This is implemented via Cognito's `UsernameAttributes` configuration.
   *
   * @default true
   */
  allowPhoneNumberAsUserName?: boolean;
  /**
   * #### Allow email addresses as usernames
   *
   * ---
   *
   * If enabled (the default), users can sign in using their email address instead of a dedicated username.
   * Turning this off means emails can still be stored, but can't be used to log in directly.
   *
   * This is also controlled through Cognito `UsernameAttributes`.
   *
   * @default true
   */
  allowEmailAsUserName?: boolean;
  /**
   * #### Access token lifetime
   *
   * ---
   *
   * Controls how long an access token issued by Cognito stays valid after login. Shorter lifetimes reduce the window
   * in which a stolen token can be abused, at the cost of more frequent refreshes.
   *
   * This value is passed to the user pool client as `AccessTokenValidity`.
   */
  accessTokenValiditySeconds?: number;
  /**
   * #### ID token lifetime
   *
   * ---
   *
   * Controls how long an ID token (which contains user profile and claims) is accepted before clients must obtain a new one.
   *
   * This is set on the user pool client as `IdTokenValidity`.
   */
  idTokenValiditySeconds?: number;
  /**
   * #### Refresh token lifetime
   *
   * ---
   *
   * Sets for how many days a refresh token can be used to obtain new access / ID tokens without requiring the user to sign in again.
   * Longer lifetimes mean fewer re-authentications, but keep sessions alive for longer.
   *
   * This value is used as `RefreshTokenValidity` on the Cognito user pool client.
   */
  refreshTokenValidityDays?: number;
  /**
   * #### OAuth flows
   *
   * ---
   *
   * Specifies which OAuth 2.0 flows the user pool client is allowed to use:
   *
   * - `code`: Authorization Code flow (recommended for web apps and backends).
   * - `implicit`: Implicit flow (legacy browser-only flow).
   * - `client_credentials`: Server‑to‑server (no end user) machine credentials.
   *
   * These values populate `AllowedOAuthFlows` on the Cognito user pool client
   * ([AWS::Cognito::UserPoolClient](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-cognito-userpoolclient)).
   */
  allowedOAuthFlows?: AllowedOauthFlow[];
  /**
   * #### OAuth scopes
   *
   * ---
   *
   * Lists which scopes clients can request when using OAuth (for example `email`, `openid`, `profile`).
   * Scopes control which user information and permissions your app receives in tokens.
   *
   * These values are passed to the user pool client as `AllowedOAuthScopes`.
   */
  allowedOAuthScopes?: string[];
  /**
   * #### OAuth callback URLs
   *
   * ---
   *
   * The allowed URLs where Cognito is permitted to redirect users after successful authentication.
   * These must exactly match the URLs registered with your frontend / backend, otherwise the redirect will fail.
   *
   * Mapped into `CallbackURLs` and `DefaultRedirectURI` on the user pool client.
   */
  callbackURLs?: string[];
  /**
   * #### OAuth logout URLs
   *
   * ---
   *
   * The URLs Cognito can redirect users to after they log out of the Hosted UI or end their session.
   * Must also be explicitly configured so that sign-out redirects don't fail.
   *
   * These populate the `LogoutURLs` list on the user pool client.
   */
  logoutURLs?: string[];
  /**
   * #### External identity providers
   *
   * ---
   *
   * Allows users to sign in with third‑party identity providers like Google, Facebook, Login with Amazon, OIDC, SAML, or Sign in with Apple.
   * Each entry configures one external provider (client ID/secret, attribute mapping, requested scopes, and advanced provider‑specific options).
   *
   * Under the hood Stacktape creates separate `AWS::Cognito::UserPoolIdentityProvider` resources and registers them
   * in the user pool client's `SupportedIdentityProviders`.
   */
  identityProviders?: IdentityProvider[];
  /**
   * #### Associate a WAF
   *
   * ---
   *
   * Links the user pool to a `web-app-firewall` resource, so requests to the Hosted UI and token endpoints are inspected
   * by AWS WAF rules you configure in Stacktape.
   *
   * Stacktape does this by creating a `WebACLAssociation` between the user pool and the referenced firewall.
   */
  useFirewall?: string;
  /**
   * #### Custom Domain
   *
   * ---
   *
   * Configures a custom domain for the Cognito Hosted UI (e.g., `auth.example.com`).
   *
   * When configured, Cognito creates a CloudFront distribution to serve your custom domain.
   * Stacktape automatically:
   * - Configures the user pool domain with your custom domain and an ACM certificate from us-east-1
   * - Creates a DNS record pointing to the CloudFront distribution
   *
   * The domain must be registered and verified in your Stacktape account with a valid ACM certificate in us-east-1.
   */
  customDomain?: UserPoolCustomDomainConfiguration;
  /**
   * #### Generate a client secret
   *
   * ---
   *
   * Asks Cognito to generate a secret for the user pool client. Use this when you have trusted backends (like APIs or server‑side apps)
   * that can safely store a client secret and use confidential OAuth flows.
   *
   * This flag controls the `GenerateSecret` property on the user pool client.
   *
   * @default false
   */
  generateClientSecret?: boolean;
  /**
   * #### Force external identity providers
   *
   * ---
   *
   * If `true`, users can't sign in with a username/password against the Cognito user directory at all.
   * Instead, they must always use one of the configured external identity providers (Google, SAML, etc.).
   *
   * Internally this removes `COGNITO` from `SupportedIdentityProviders` on the user pool client.
   *
   * @default false
   */
  allowOnlyExternalIdentityProviders?: boolean;
}

type AllowedOauthFlow = 'code' | 'implicit' | 'client_credentials';

type UserVerificationType = 'email-link' | 'email-code' | 'sms' | 'none';

interface UserPoolCustomDomainConfiguration {
  /**
   * #### Domain Name
   *
   * ---
   *
   * Fully qualified domain name for the Cognito Hosted UI (e.g., `auth.example.com`).
   */
  domainName: string;
  /**
   * #### Custom Certificate ARN
   *
   * ---
   *
   * ARN of an ACM certificate in **us-east-1** to use for this domain.
   * By default, Stacktape uses the certificate associated with your domain in us-east-1.
   *
   * The certificate must be in us-east-1 because Cognito uses CloudFront for custom domains.
   */
  customCertificateArn?: string;
  /**
   * #### Disable DNS Record Creation
   *
   * ---
   *
   * If `true`, Stacktape will not create a DNS record for this domain.
   *
   * @default false
   */
  disableDnsRecordCreation?: boolean;
}

interface UserPoolHooks {
  /**
   * #### Custom message hook
   *
   * Triggered whenever Cognito is about to send an email or SMS (sign‑up, verification, password reset, etc.).
   * Lets you fully customize message contents or dynamically choose language/branding.
   *
   * Value must be the ARN of a Lambda function configured to handle the "Custom Message" trigger.
   */
  customMessage?: string;
  /**
   * #### Post-authentication hook
   *
   * Runs after a user has successfully authenticated. You can use this to record analytics, update last‑login timestamps,
   * or block access based on additional checks.
   */
  postAuthentication?: string;
  /**
   * #### Post-confirmation hook
   *
   * Runs right after a user confirms their account (for example via email link or admin confirmation).
   * This is often used to create user records in your own database or to provision resources.
   */
  postConfirmation?: string;
  /**
   * #### Pre-authentication hook
   *
   * Invoked just before Cognito validates a user's credentials. You can use this to block sign‑in attempts
   * based on IP, device, or user state (for example, soft‑deleting an account).
   */
  preAuthentication?: string;
  /**
   * #### Pre-sign-up hook
   *
   * Called before a new user is created. Useful for validating input, auto‑confirming trusted users,
   * or blocking sign‑ups that don't meet your business rules.
   */
  preSignUp?: string;
  /**
   * #### Pre-token-generation hook
   *
   * Runs right before Cognito issues tokens. Lets you customize token claims (for example, adding roles or flags)
   * based on external systems or additional logic.
   */
  preTokenGeneration?: string;
  /**
   * #### User migration hook
   *
   * Lets you migrate users on‑the‑fly from another user store. When someone tries to sign in but doesn't exist in Cognito,
   * this trigger can look them up elsewhere, import them, and let the sign‑in continue.
   */
  userMigration?: string;
  /**
   * #### Create auth challenge hook
   *
   * Part of Cognito's custom auth flow. This trigger is used to generate a challenge (for example sending a custom OTP)
   * after `DefineAuthChallenge` decides a challenge is needed.
   */
  createAuthChallenge?: string;
  /**
   * #### Define auth challenge hook
   *
   * Also part of the custom auth flow. It decides whether a user needs another challenge, has passed, or has failed,
   * based on previous challenges and responses.
   */
  defineAuthChallenge?: string;
  /**
   * #### Verify auth challenge response hook
   *
   * Validates the user's response to a custom challenge (for example, checking an OTP the user provides).
   */
  verifyAuthChallengeResponse?: string;
}

interface EmailConfiguration {
  /**
   * #### SES identity to send emails from
   *
   * ---
   *
   * ARN of an SES verified identity (email address or domain) that Cognito should use when sending emails.
   * Required when you want full control over sending (for example for MFA via `EMAIL_OTP`), because Cognito
   * must switch into `DEVELOPER` email sending mode.
   */
  sesAddressArn?: string;
  /**
   * #### From address
   *
   * ---
   *
   * The email address that appears in the "From" field of messages sent by Cognito (if you're using SES).
   * This address must be verified in SES if you're sending through your own identity.
   */
  from?: string;
  /**
   * #### Reply-to address
   *
   * ---
   *
   * Optional address where replies to Cognito emails should be delivered.
   * If not set, replies go to the `from` address (or the default Cognito sender).
   */
  replyToEmailAddress?: string;
}

interface InviteMessageConfig {
  /**
   * #### Invitation email body
   *
   * ---
   *
   * The text of the email sent when an administrator creates a new user.
   * You can reference placeholders like `{username}` and `{####}` (temporary password or code) in the message.
   */
  emailMessage?: string;
  /**
   * #### Invitation email subject
   */
  emailSubject?: string;
  /**
   * #### Invitation SMS body
   *
   * ---
   *
   * The content of the SMS message sent when new users are created with a phone number.
   * As with email, you can include placeholders such as `{username}` and `{####}`.
   */
  smsMessage?: string;
}

interface UserVerificationMessageConfig {
  /**
   * #### Email body when verifying with a code
   *
   * Used when `userVerificationType` is `email-code`. The message typically contains a `{####}` placeholder
   * that Cognito replaces with a one‑time verification code.
   */
  emailMessageUsingCode?: string;
  /**
   * #### Email body when verifying with a link
   *
   * Used when `userVerificationType` is `email-link`. Cognito replaces special markers like `{##verify your email##}`
   * with a clickable URL.
   */
  emailMessageUsingLink?: string;
  /**
   * #### Email subject when verifying with a code
   */
  emailSubjectUsingCode?: string;
  /**
   * #### Email subject when verifying with a link
   */
  emailSubjectUsingLink?: string;
  /**
   * #### SMS verification message
   *
   * ---
   *
   * Text of the SMS Cognito sends when verifying a phone number (for example containing `{####}`).
   */
  smsMessage?: string;
}

interface AttributeSchema {
  /**
   * #### Attribute name
   *
   * The logical name of the attribute as it appears on the user (for example `given_name`, `plan`, or `tenantId`).
   */
  name?: string;
  /**
   * #### Attribute data type
   *
   * The value type stored for this attribute (`String`, `Number`, etc.).
   * This is passed to Cognito's `AttributeDataType`.
   */
  attributeDataType?: string;
  /**
   * #### Developer-only attribute
   *
   * If true, the attribute is only readable/writable by privileged backend code and not exposed to end users directly.
   */
  developerOnlyAttribute?: boolean;
  /**
   * #### Mutable after sign-up
   *
   * Controls whether the attribute can be changed after it has been initially set.
   */
  mutable?: boolean;
  /**
   * #### Required at sign-up
   *
   * If true, users must supply this attribute when creating an account.
   */
  required?: boolean;
  /**
   * #### Maximum numeric value
   */
  numberMaxValue?: number;
  /**
   * #### Minimum numeric value
   */
  numberMinValue?: number;
  /**
   * #### Maximum string length
   */
  stringMaxLength?: number;
  /**
   * #### Minimum string length
   */
  stringMinLength?: number;
}

interface PasswordPolicy {
  /**
   * #### Minimum password length
   *
   * The fewest characters a password can have. Longer passwords are generally more secure.
   */
  minimumLength?: number;
  /**
   * #### Require at least one lowercase letter
   */
  requireLowercase?: boolean;
  /**
   * #### Require at least one number
   */
  requireNumbers?: boolean;
  /**
   * #### Require at least one symbol
   *
   * Symbols are non‑alphanumeric characters such as `!`, `@`, or `#`.
   */
  requireSymbols?: boolean;
  /**
   * #### Require at least one uppercase letter
   */
  requireUppercase?: boolean;
  /**
   * #### Temporary password validity (days)
   *
   * How long a temporary password issued to a new user is valid before it must be changed on first sign‑in.
   */
  temporaryPasswordValidityDays?: number;
}

interface MfaConfiguration {
  /**
   * #### MFA requirement
   *
   * - `OFF`: MFA is completely disabled.
   * - `ON`: All users must complete MFA during sign‑in.
   * - `OPTIONAL`: Users can opt in to MFA; it's recommended but not strictly required.
   *
   * This value configures the Cognito `MfaConfiguration` property.
   */
  status?: 'ON' | 'OFF' | 'OPTIONAL';
  /**
   * #### Enabled MFA factor types
   *
   * ---
   *
   * Chooses which MFA methods users can use:
   *
   * - `SMS`: One‑time codes are sent via text message. Requires an SNS role so Cognito can send SMS.
   * - `SOFTWARE_TOKEN`: Time‑based one‑time codes from an authenticator app.
   * - `EMAIL_OTP`: Codes are sent by email. AWS requires that you configure a developer email sending identity
   *   (which Stacktape does when you provide `emailConfiguration.sesAddressArn`).
   *
   * These values are mapped to Cognito's `EnabledMfas` setting (`SMS_MFA`, `SOFTWARE_TOKEN_MFA`, `EMAIL_OTP`),
   * whose behavior is described in
   * [EnabledMfas in the AWS::Cognito::UserPool docs](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-cognito-userpool).
   */
  enabledTypes?: ('SMS' | 'SOFTWARE_TOKEN' | 'EMAIL_OTP')[];
}

interface IdentityProvider {
  /**
   * #### Provider type
   *
   * ---
   *
   * The kind of external identity provider you want to integrate:
   *
   * - `Facebook`, `Google`, `LoginWithAmazon`, `SignInWithApple`: social identity providers.
   * - `OIDC`: a generic OpenID Connect provider.
   * - `SAML`: a SAML 2.0 identity provider (often used for enterprise SSO).
   */
  type: 'Facebook' | 'Google' | 'LoginWithAmazon' | 'OIDC' | 'SAML' | 'SignInWithApple';
  /**
   * #### OAuth / OIDC client ID
   *
   * ---
   *
   * The client ID (sometimes called app ID) that you obtained from the external provider's console.
   * Cognito presents this ID when redirecting users to the provider.
   */
  clientId: string;
  /**
   * #### OAuth / OIDC client secret
   *
   * ---
   *
   * The client secret associated with the `clientId`, used by Cognito when exchanging authorization codes for tokens.
   * This value should be kept confidential and only configured from secure sources.
   */
  clientSecret: string;
  /**
   * #### Attribute mapping
   *
   * ---
   *
   * Maps attributes from the external provider (for example `email`, `given_name`) to Cognito user pool attributes.
   * Keys are Cognito attribute names, values are attribute names from the identity provider.
   *
   * If not provided, Stacktape defaults to mapping `email -> email`.
   */
  attributeMapping?: { [awsAttributeName: string]: string };
  /**
   * #### Requested scopes
   *
   * ---
   *
   * Additional OAuth scopes to request from the identity provider (for example `openid`, `email`, `profile`).
   * These control which pieces of user information and permissions your app receives in the provider's tokens.
   *
   * If omitted, Stacktape uses a reasonable default per provider (see
   * [AWS::Cognito::UserPoolIdentityProvider](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-cognito-userpoolidentityprovider)).
   */
  authorizeScopes?: string[];
  /**
   * #### Advanced provider options
   *
   * ---
   *
   * Low‑level configuration passed directly into Cognito's `ProviderDetails` map.
   * You can use this to override endpoints or supply provider‑specific keys as documented by AWS,
   * for example `authorize_url`, `token_url`, `attributes_request_method`, `oidc_issuer`, and others.
   *
   * In most cases you don't need to set this – Stacktape configures sensible defaults for common providers.
   */
  providerDetails?: Record<string, any>;
}

interface CognitoAuthorizerProperties {
  /**
   * #### Name of the user pool to protect the API
   *
   * ---
   *
   * The Stacktape name of the `user-auth-pool` resource whose tokens should be accepted by this HTTP API authorizer.
   * Stacktape uses this to:
   *
   * - Set the expected **audience** to the user pool client ID.
   * - Build the expected **issuer** URL based on the user pool and AWS region.
   *
   * In practice this means only JWTs issued by this pool (and its client) will be considered valid.
   */
  userPoolName: string;
  /**
   * #### Where to read the JWT from in the request
   *
   * ---
   *
   * A list of identity sources that tell API Gateway where to look for the bearer token, using the
   * `$request.*` syntax from API Gateway (for example `'$request.header.Authorization'`).
   *
   * If you omit this, Stacktape defaults to reading the token from the `Authorization` HTTP header,
   * using a JWT authorizer as described in the API Gateway v2 authorizer docs
   * ([AWS::ApiGatewayV2::Authorizer](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-apigatewayv2-authorizer)).
   */
  identitySources?: string[];
}

interface CognitoAuthorizer {
  /**
   * #### Cognito JWT authorizer
   *
   * ---
   *
   * Configures an HTTP API authorizer that validates JSON Web Tokens (JWTs) issued by a Cognito user pool.
   * This is the simplest way to protect routes when your users sign in via `user-auth-pool`.
   *
   * Stacktape turns this into an API Gateway v2 authorizer of type `JWT` that checks the token's issuer and audience.
   */
  type: 'cognito';
  properties: CognitoAuthorizerProperties;
}

interface LambdaAuthorizerProperties {
  /**
   * #### Name of the authorizer function
   *
   * ---
   *
   * The Stacktape name of a `function` resource that should run for each authorized request.
   * API Gateway calls this Lambda, passes request details, and uses its response to allow or deny access.
   */
  functionName: string;
  /**
   * #### Use IAM-style (v1) authorizer responses
   *
   * ---
   *
   * - If `true`, your Lambda must return a full IAM policy document (the "v1" format).
   * - If `false` or omitted, Stacktape enables **simple responses** (the HTTP API v2 payload format)
   *   so your Lambda can return a small JSON object with an `isAuthorized` flag and optional context.
   *
   * This flag is wired to `EnableSimpleResponses` on the underlying `AWS::ApiGatewayV2::Authorizer`.
   */
  iamResponse?: boolean;
  /**
   * #### Where to read identity data from
   *
   * ---
   *
   * A list of request fields API Gateway should pass into your Lambda authorizer (for example headers, query parameters,
   * or stage variables) using the `$request.*` syntax.
   *
   * When left empty, no specific identity sources are configured and your Lambda must inspect the incoming event directly.
   */
  identitySources?: string[];
  /**
   * #### Cache authorizer results
   *
   * ---
   *
   * Number of seconds API Gateway should cache the result of the Lambda authorizer for a given identity.
   * While cached, repeated requests skip calling your authorizer function and reuse the previous result.
   *
   * This value is applied to `AuthorizerResultTtlInSeconds`. If omitted, Stacktape sets it to `0` (no caching).
   */
  cacheResultSeconds?: number;
}

interface LambdaAuthorizer {
  /**
   * #### Lambda-based HTTP API authorizer
   *
   * ---
   *
   * Configures an API Gateway **request** authorizer that runs a Lambda function to decide whether a request is allowed.
   * This is useful when your authorization logic can't be expressed as simple JWT validation – for example when you
   * check API keys, look up permissions in a database, or integrate with a non-JWT identity system.
   *
   * Stacktape creates an `AWS::ApiGatewayV2::Authorizer` of type `REQUEST` and wires it up to your Lambda.
   */
  type: 'lambda';
  properties: LambdaAuthorizerProperties;
}

type UserPoolReferencableParam = 'id' | 'clientId' | 'arn' | 'domain' | 'clientSecret' | 'providerUrl';
```
