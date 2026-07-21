# UserAuthPoolProps API Reference

Resource type: `user-auth-pool`

## TypeScript definition

```typescript
import type { AttributeSchema, EmailConfiguration, IdentityProvider, InviteMessageConfig, MfaConfiguration, PasswordPolicy, UserPoolCustomDomainConfiguration, UserPoolHooks, UserVerificationMessageConfig } from 'stacktape';

type UserAuthPoolProps = {
  /** Access token lifetime */
  accessTokenValiditySeconds?: number;
  /** OAuth flows */
  allowedOAuthFlows?: Array<"client_credentials" | "code" | "implicit">;
  /** OAuth scopes */
  allowedOAuthScopes?: Array<string>;
  /** Allow email addresses as usernames */
  allowEmailAsUserName?: boolean;
  /** Restrict account creation to administrators */
  allowOnlyAdminsToCreateAccount?: boolean;
  /** Force external identity providers */
  allowOnlyExternalIdentityProviders?: boolean;
  /** Allow phone numbers as usernames */
  allowPhoneNumberAsUserName?: boolean;
  /** OAuth callback URLs */
  callbackURLs?: Array<string>;
  /** Custom Domain */
  customDomain?: UserPoolCustomDomainConfiguration;
  /** Email delivery settings */
  emailConfiguration?: EmailConfiguration;
  /** Enable the Cognito Hosted UI */
  enableHostedUi?: boolean;
  /** Generate a client secret */
  generateClientSecret?: boolean;
  /** Lambda triggers for the user pool */
  hooks?: UserPoolHooks;
  /** Custom CSS for the Hosted UI */
  hostedUiCSS?: string;
  /** Hosted UI domain prefix */
  hostedUiDomainPrefix?: string;
  /** External identity providers */
  identityProviders?: Array<IdentityProvider>;
  /** ID token lifetime */
  idTokenValiditySeconds?: number;
  /** Invite message overrides */
  inviteMessageConfig?: InviteMessageConfig;
  /** OAuth logout URLs */
  logoutURLs?: Array<string>;
  /** Multi-factor authentication */
  mfaConfiguration?: MfaConfiguration;
  /** Password strength rules */
  passwordPolicy?: PasswordPolicy;
  /** Refresh token lifetime */
  refreshTokenValidityDays?: number;
  /** (Reserved) Require verified emails */
  requireEmailVerification?: boolean;
  /** (Reserved) Require verified phone numbers */
  requirePhoneNumberVerification?: boolean;
  /** Custom attributes schema */
  schema?: Array<AttributeSchema>;
  /** Expire unused admin-created accounts */
  unusedAccountValidityDays?: number;
  /** Associate a WAF */
  useFirewall?: string;
  /** Verification message text */
  userVerificationMessageConfig?: UserVerificationMessageConfig;
  /** Verification strategy */
  userVerificationType?: "email-code" | "email-link" | "none" | "sms";
};
```

## Property: `accessTokenValiditySeconds`

- Required: no
- Type: `number`

Access token lifetime

Controls how long an access token issued by Cognito stays valid after login. Shorter lifetimes reduce the window
in which a stolen token can be abused, at the cost of more frequent refreshes.

This value is passed to the user pool client as `AccessTokenValidity`.

### Example 1 (yaml)

```yaml
resources:
  userPool:
    type: user-auth-pool
    properties:
      userVerificationType: email-code
      accessTokenValiditySeconds: 3600
```

### Example 2 (typescript)

```typescript
import { UserAuthPool, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const userPool = new UserAuthPool({
    userVerificationType: 'email-code',
    accessTokenValiditySeconds: 3600
  });
  return { resources: { userPool } };
});
```

## Property: `allowedOAuthFlows`

- Required: no
- Type: `Array<string: "client_credentials" | "code" | "implicit">`

OAuth flows

Specifies which OAuth 2.0 flows the user pool client is allowed to use:

`code`: Authorization Code flow (recommended for web apps and backends).
`implicit`: Implicit flow (legacy browser-only flow).
`client_credentials`: Server‑to‑server (no end user) machine credentials.

These values populate `AllowedOAuthFlows` on the Cognito user pool client
([AWS::Cognito::UserPoolClient](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-cognito-userpoolclient)).

### Example 1 (yaml)

```yaml
resources:
  userPool:
    type: user-auth-pool
    properties:
      enableHostedUi: true
      hostedUiDomainPrefix: acme-auth
      callbackURLs:
        - https://app.example.com/callback
      allowedOAuthScopes:
        - openid
        - email
      allowedOAuthFlows:
        - code
```

### Example 2 (typescript)

```typescript
import { UserAuthPool, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const userPool = new UserAuthPool({
    enableHostedUi: true,
    hostedUiDomainPrefix: 'acme-auth',
    callbackURLs: ['https://app.example.com/callback'],
    allowedOAuthScopes: ['openid', 'email'],
    allowedOAuthFlows: ['code']
  });
  return { resources: { userPool } };
});
```

## Property: `allowedOAuthScopes`

- Required: no
- Type: `Array<string>`

OAuth scopes

Lists which scopes clients can request when using OAuth (for example `email`, `openid`, `profile`).
Scopes control which user information and permissions your app receives in tokens.

These values are passed to the user pool client as `AllowedOAuthScopes`.

### Example 1 (yaml)

```yaml
resources:
  userPool:
    type: user-auth-pool
    properties:
      enableHostedUi: true
      hostedUiDomainPrefix: acme-auth
      callbackURLs:
        - https://app.example.com/callback
      allowedOAuthFlows:
        - code
      allowedOAuthScopes:
        - openid
        - email
        - profile
```

### Example 2 (typescript)

```typescript
import { UserAuthPool, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const userPool = new UserAuthPool({
    enableHostedUi: true,
    hostedUiDomainPrefix: 'acme-auth',
    callbackURLs: ['https://app.example.com/callback'],
    allowedOAuthFlows: ['code'],
    allowedOAuthScopes: ['openid', 'email', 'profile']
  });
  return { resources: { userPool } };
});
```

## Property: `allowEmailAsUserName`

- Required: no
- Type: `boolean`
- Default: `true`

Allow email addresses as usernames

If enabled (the default), users can sign in using their email address instead of a dedicated username.
Turning this off means emails can still be stored, but can't be used to log in directly.

This is also controlled through Cognito `UsernameAttributes`.

### Example 1 (yaml)

```yaml
resources:
  userPool:
    type: user-auth-pool
    properties:
      userVerificationType: email-code
      allowEmailAsUserName: true
```

### Example 2 (typescript)

```typescript
import { UserAuthPool, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const userPool = new UserAuthPool({
    userVerificationType: 'email-code',
    allowEmailAsUserName: true
  });
  return { resources: { userPool } };
});
```

## Property: `allowOnlyAdminsToCreateAccount`

- Required: no
- Type: `boolean`
- Default: `false`

Restrict account creation to administrators

If enabled, new users can't sign up themselves. Accounts must be created through an admin flow (for example from an internal admin tool or script),
which helps prevent unwanted self-registrations.

Internally this controls `AdminCreateUserConfig.AllowAdminCreateUserOnly` on the Cognito user pool
([AWS::Cognito::UserPool](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-cognito-userpool)).

### Example 1 (yaml)

```yaml
resources:
  adminPool:
    type: user-auth-pool
    properties:
      userVerificationType: email-code
      allowOnlyAdminsToCreateAccount: true
      inviteMessageConfig:
        emailSubject: Your new account
        emailMessage: 'Your username is {username} and temporary password is {####}.'
```

### Example 2 (typescript)

```typescript
import { UserAuthPool, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const adminPool = new UserAuthPool({
    userVerificationType: 'email-code',
    allowOnlyAdminsToCreateAccount: true,
    inviteMessageConfig: {
      emailSubject: 'Your new account',
      emailMessage: 'Your username is {username} and temporary password is {####}.'
    }
  });
  return { resources: { adminPool } };
});
```

## Property: `allowOnlyExternalIdentityProviders`

- Required: no
- Type: `boolean`
- Default: `false`

Force external identity providers

If `true`, users can't sign in with a username/password against the Cognito user directory at all.
Instead, they must always use one of the configured external identity providers (Google, SAML, etc.).

Internally this removes `COGNITO` from `SupportedIdentityProviders` on the user pool client.

### Example 1 (yaml)

```yaml
resources:
  userPool:
    type: user-auth-pool
    properties:
      enableHostedUi: true
      hostedUiDomainPrefix: acme-auth
      callbackURLs:
        - https://app.example.com/callback
      allowedOAuthFlows:
        - code
      allowedOAuthScopes:
        - openid
        - email
      identityProviders:
        - type: Google
          clientId: my-google-client-id.apps.googleusercontent.com
          clientSecret: $Secret('google-oauth.client-secret')
      allowOnlyExternalIdentityProviders: true
```

### Example 2 (typescript)

```typescript
import { UserAuthPool, $Secret, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const userPool = new UserAuthPool({
    enableHostedUi: true,
    hostedUiDomainPrefix: 'acme-auth',
    callbackURLs: ['https://app.example.com/callback'],
    allowedOAuthFlows: ['code'],
    allowedOAuthScopes: ['openid', 'email'],
    identityProviders: [
      {
        type: 'Google',
        clientId: 'my-google-client-id.apps.googleusercontent.com',
        clientSecret: $Secret('google-oauth.client-secret')
      }
    ],
    allowOnlyExternalIdentityProviders: true
  });
  return { resources: { userPool } };
});
```

## Property: `allowPhoneNumberAsUserName`

- Required: no
- Type: `boolean`
- Default: `true`

Allow phone numbers as usernames

If enabled (the default), users can sign in using their phone number in addition to any traditional username.
Turning this off means phone numbers can still be stored, but can't be used to log in.

This is implemented via Cognito's `UsernameAttributes` configuration.

### Example 1 (yaml)

```yaml
resources:
  userPool:
    type: user-auth-pool
    properties:
      userVerificationType: email-code
      allowPhoneNumberAsUserName: false
```

### Example 2 (typescript)

```typescript
import { UserAuthPool, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const userPool = new UserAuthPool({
    userVerificationType: 'email-code',
    allowPhoneNumberAsUserName: false
  });
  return { resources: { userPool } };
});
```

## Property: `callbackURLs`

- Required: no
- Type: `Array<string>`

OAuth callback URLs

The allowed URLs where Cognito is permitted to redirect users after successful authentication.
These must exactly match the URLs registered with your frontend / backend, otherwise the redirect will fail.

Mapped into `CallbackURLs` and `DefaultRedirectURI` on the user pool client.

### Example 1 (yaml)

```yaml
resources:
  userPool:
    type: user-auth-pool
    properties:
      enableHostedUi: true
      hostedUiDomainPrefix: acme-auth
      allowedOAuthFlows:
        - code
      allowedOAuthScopes:
        - openid
      callbackURLs:
        - https://app.example.com/callback
        - http://localhost:3000/callback
```

### Example 2 (typescript)

```typescript
import { UserAuthPool, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const userPool = new UserAuthPool({
    enableHostedUi: true,
    hostedUiDomainPrefix: 'acme-auth',
    allowedOAuthFlows: ['code'],
    allowedOAuthScopes: ['openid'],
    callbackURLs: ['https://app.example.com/callback', 'http://localhost:3000/callback']
  });
  return { resources: { userPool } };
});
```

## Property: `customDomain`

- Required: no
- Type: `UserPoolCustomDomainConfiguration`

Custom Domain

Configures a custom domain for the Cognito Hosted UI (e.g., `auth.example.com`).

When configured, Cognito creates a CloudFront distribution to serve your custom domain.
Stacktape automatically:

Configures the user pool domain with your custom domain and an ACM certificate from us-east-1
Creates a DNS record pointing to the CloudFront distribution

The domain must be registered and verified in your Stacktape account with a valid ACM certificate in us-east-1.

### Example 1 (yaml)

```yaml
resources:
  userPool:
    type: user-auth-pool
    properties:
      enableHostedUi: true
      hostedUiDomainPrefix: acme-auth
      callbackURLs:
        - https://app.example.com/callback
      allowedOAuthFlows:
        - code
      allowedOAuthScopes:
        - openid
      customDomain:
        domainName: auth.example.com
```

### Example 2 (typescript)

```typescript
import { UserAuthPool, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const userPool = new UserAuthPool({
    enableHostedUi: true,
    hostedUiDomainPrefix: 'acme-auth',
    callbackURLs: ['https://app.example.com/callback'],
    allowedOAuthFlows: ['code'],
    allowedOAuthScopes: ['openid'],
    customDomain: {
      domainName: 'auth.example.com'
    }
  });
  return { resources: { userPool } };
});
```

## Property: `emailConfiguration`

- Required: no
- Type: `EmailConfiguration`

Email delivery settings

Controls how Cognito sends emails (verification messages, password reset codes, admin invitations, etc.).
You can either use Cognito's built-in email service or plug in your own SES identity for full control over the sender.

This config is used to build the Cognito `EmailConfiguration` block
([AWS docs](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-cognito-userpool)).

### Example 1 (yaml)

```yaml
resources:
  userPool:
    type: user-auth-pool
    properties:
      userVerificationType: email-code
      emailConfiguration:
        sesAddressArn: arn:aws:ses:eu-west-1:123456789012:identity/example.com
        from: no-reply@example.com
        replyToEmailAddress: support@example.com
```

### Example 2 (typescript)

```typescript
import { UserAuthPool, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const userPool = new UserAuthPool({
    userVerificationType: 'email-code',
    emailConfiguration: {
      sesAddressArn: 'arn:aws:ses:eu-west-1:123456789012:identity/example.com',
      from: 'no-reply@example.com',
      replyToEmailAddress: 'support@example.com'
    }
  });
  return { resources: { userPool } };
});
```

## Property: `enableHostedUi`

- Required: no
- Type: `boolean`
- Default: `false`

Enable the Cognito Hosted UI

Turns on Cognito's Hosted UI – a pre-built, hosted login and registration page – so you don't have to build your own auth screens.
This is useful when you want to get started quickly or keep authentication logic outside of your main app.

### Example 1 (yaml)

```yaml
resources:
  userPool:
    type: user-auth-pool
    properties:
      enableHostedUi: true
      hostedUiDomainPrefix: my-company-auth
      callbackURLs:
        - https://app.example.com/callback
      logoutURLs:
        - https://app.example.com/logout
      allowedOAuthFlows:
        - code
      allowedOAuthScopes:
        - openid
        - email
```

### Example 2 (typescript)

```typescript
import { UserAuthPool, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const userPool = new UserAuthPool({
    enableHostedUi: true,
    hostedUiDomainPrefix: 'my-company-auth',
    callbackURLs: ['https://app.example.com/callback'],
    logoutURLs: ['https://app.example.com/logout'],
    allowedOAuthFlows: ['code'],
    allowedOAuthScopes: ['openid', 'email']
  });
  return { resources: { userPool } };
});
```

## Property: `generateClientSecret`

- Required: no
- Type: `boolean`
- Default: `false`

Generate a client secret

Asks Cognito to generate a secret for the user pool client. Use this when you have trusted backends (like APIs or server‑side apps)
that can safely store a client secret and use confidential OAuth flows.

This flag controls the `GenerateSecret` property on the user pool client.

### Example 1 (yaml)

```yaml
resources:
  userPool:
    type: user-auth-pool
    properties:
      userVerificationType: email-code
      generateClientSecret: true
```

### Example 2 (typescript)

```typescript
import { UserAuthPool, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const userPool = new UserAuthPool({
    userVerificationType: 'email-code',
    generateClientSecret: true
  });
  return { resources: { userPool } };
});
```

## Property: `hooks`

- Required: no
- Type: `UserPoolHooks`

Lambda triggers for the user pool

Connects AWS Lambda functions to Cognito "hooks" (triggers) such as pre-sign-up, post-confirmation, or token generation.
You can use these to enforce additional validation, enrich user profiles, migrate users from another system, and more.

Internally this maps to the Cognito user pool `LambdaConfig`.

### Example 1 (yaml)

```yaml
resources:
  postConfirmFn:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/post-confirmation.ts
  userPool:
    type: user-auth-pool
    properties:
      userVerificationType: email-code
      hooks:
        postConfirmation: $ResourceParam('postConfirmFn', 'arn')
```

### Example 2 (typescript)

```typescript
import { LambdaFunction, UserAuthPool, $ResourceParam, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const postConfirmFn = new LambdaFunction({
    packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/post-confirmation.ts' } }
  });
  const userPool = new UserAuthPool({
    userVerificationType: 'email-code',
    hooks: {
      postConfirmation: $ResourceParam('postConfirmFn', 'arn')
    }
  });
  return { resources: { postConfirmFn, userPool } };
});
```

## Property: `hostedUiCSS`

- Required: no
- Type: `string`

Custom CSS for the Hosted UI

Lets you override the default Cognito Hosted UI styling with your own CSS (colors, fonts, layouts, etc.),
so the login experience matches the rest of your application.

Behind the scenes this is applied using the `AWS::Cognito::UserPoolUICustomizationAttachment` resource.

### Example 1 (yaml)

```yaml
resources:
  userPool:
    type: user-auth-pool
    properties:
      enableHostedUi: true
      hostedUiDomainPrefix: my-company-auth
      callbackURLs:
        - https://app.example.com/callback
      allowedOAuthFlows:
        - code
      allowedOAuthScopes:
        - openid
      hostedUiCSS: |
        .label-customizable { font-weight: 600; }
        .submitButton-customizable { background: #4f46e5; }
```

### Example 2 (typescript)

```typescript
import { UserAuthPool, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const userPool = new UserAuthPool({
    enableHostedUi: true,
    hostedUiDomainPrefix: 'my-company-auth',
    callbackURLs: ['https://app.example.com/callback'],
    allowedOAuthFlows: ['code'],
    allowedOAuthScopes: ['openid'],
    hostedUiCSS: '.label-customizable { font-weight: 600; }\n.submitButton-customizable { background: #4f46e5; }'
  });
  return { resources: { userPool } };
});
```

## Property: `hostedUiDomainPrefix`

- Required: no
- Type: `string`

Hosted UI domain prefix

Sets the first part of your Hosted UI URL: `https://.auth..amazoncognito.com`.
Pick something that matches your project or company name.

### Example 1 (yaml)

```yaml
resources:
  userPool:
    type: user-auth-pool
    properties:
      enableHostedUi: true
      hostedUiDomainPrefix: my-company-auth
      callbackURLs:
        - https://app.example.com/callback
      allowedOAuthFlows:
        - code
      allowedOAuthScopes:
        - openid
```

### Example 2 (typescript)

```typescript
import { UserAuthPool, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const userPool = new UserAuthPool({
    enableHostedUi: true,
    hostedUiDomainPrefix: 'my-company-auth',
    callbackURLs: ['https://app.example.com/callback'],
    allowedOAuthFlows: ['code'],
    allowedOAuthScopes: ['openid']
  });
  return { resources: { userPool } };
});
```

## Property: `identityProviders`

- Required: no
- Type: `Array<IdentityProvider>`

External identity providers

Allows users to sign in with third‑party identity providers like Google, Facebook, Login with Amazon, OIDC, SAML, or Sign in with Apple.
Each entry configures one external provider (client ID/secret, attribute mapping, requested scopes, and advanced provider‑specific options).

Under the hood Stacktape creates separate `AWS::Cognito::UserPoolIdentityProvider` resources and registers them
in the user pool client's `SupportedIdentityProviders`.

### Example 1 (yaml)

```yaml
resources:
  userPool:
    type: user-auth-pool
    properties:
      enableHostedUi: true
      hostedUiDomainPrefix: acme-auth
      callbackURLs:
        - https://app.example.com/callback
      allowedOAuthFlows:
        - code
      allowedOAuthScopes:
        - openid
        - email
      identityProviders:
        - type: Google
          clientId: my-google-client-id.apps.googleusercontent.com
          clientSecret: $Secret('google-oauth.client-secret')
          authorizeScopes:
            - openid
            - email
```

### Example 2 (typescript)

```typescript
import { UserAuthPool, $Secret, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const userPool = new UserAuthPool({
    enableHostedUi: true,
    hostedUiDomainPrefix: 'acme-auth',
    callbackURLs: ['https://app.example.com/callback'],
    allowedOAuthFlows: ['code'],
    allowedOAuthScopes: ['openid', 'email'],
    identityProviders: [
      {
        type: 'Google',
        clientId: 'my-google-client-id.apps.googleusercontent.com',
        clientSecret: $Secret('google-oauth.client-secret'),
        authorizeScopes: ['openid', 'email']
      }
    ]
  });
  return { resources: { userPool } };
});
```

## Property: `idTokenValiditySeconds`

- Required: no
- Type: `number`

ID token lifetime

Controls how long an ID token (which contains user profile and claims) is accepted before clients must obtain a new one.

This is set on the user pool client as `IdTokenValidity`.

### Example 1 (yaml)

```yaml
resources:
  userPool:
    type: user-auth-pool
    properties:
      userVerificationType: email-code
      idTokenValiditySeconds: 3600
```

### Example 2 (typescript)

```typescript
import { UserAuthPool, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const userPool = new UserAuthPool({
    userVerificationType: 'email-code',
    idTokenValiditySeconds: 3600
  });
  return { resources: { userPool } };
});
```

## Property: `inviteMessageConfig`

- Required: no
- Type: `InviteMessageConfig`

Invite message overrides

Customizes the contents of the "invitation" message that users receive when an administrator creates their account
(for example, when sending a temporary password and sign-in instructions).

If you want to send custom emails through SES, you must also configure `emailConfiguration.sesAddressArn`.

### Example 1 (yaml)

```yaml
resources:
  adminPool:
    type: user-auth-pool
    properties:
      allowOnlyAdminsToCreateAccount: true
      inviteMessageConfig:
        emailSubject: Welcome to Acme
        emailMessage: 'Hi {username}, your temporary password is {####}.'
        smsMessage: 'Acme login: {username} / {####}'
```

### Example 2 (typescript)

```typescript
import { UserAuthPool, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const adminPool = new UserAuthPool({
    allowOnlyAdminsToCreateAccount: true,
    inviteMessageConfig: {
      emailSubject: 'Welcome to Acme',
      emailMessage: 'Hi {username}, your temporary password is {####}.',
      smsMessage: 'Acme login: {username} / {####}'
    }
  });
  return { resources: { adminPool } };
});
```

## Property: `logoutURLs`

- Required: no
- Type: `Array<string>`

OAuth logout URLs

The URLs Cognito can redirect users to after they log out of the Hosted UI or end their session.
Must also be explicitly configured so that sign-out redirects don't fail.

These populate the `LogoutURLs` list on the user pool client.

### Example 1 (yaml)

```yaml
resources:
  userPool:
    type: user-auth-pool
    properties:
      enableHostedUi: true
      hostedUiDomainPrefix: acme-auth
      callbackURLs:
        - https://app.example.com/callback
      allowedOAuthFlows:
        - code
      allowedOAuthScopes:
        - openid
      logoutURLs:
        - https://app.example.com/logout
```

### Example 2 (typescript)

```typescript
import { UserAuthPool, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const userPool = new UserAuthPool({
    enableHostedUi: true,
    hostedUiDomainPrefix: 'acme-auth',
    callbackURLs: ['https://app.example.com/callback'],
    allowedOAuthFlows: ['code'],
    allowedOAuthScopes: ['openid'],
    logoutURLs: ['https://app.example.com/logout']
  });
  return { resources: { userPool } };
});
```

## Property: `mfaConfiguration`

- Required: no
- Type: `MfaConfiguration`

Multi-factor authentication

Controls whether you use Multi‑Factor Authentication (MFA) and which second factors are allowed.
MFA makes it much harder for attackers to access accounts even if they know a user's password.

Under the hood this config drives both the `MfaConfiguration` and `EnabledMfas` properties in Cognito
(see "MFA configuration" in the
[AWS::Cognito::UserPool docs](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-cognito-userpool)).

### Example 1 (yaml)

```yaml
resources:
  userPool:
    type: user-auth-pool
    properties:
      userVerificationType: email-code
      mfaConfiguration:
        status: OPTIONAL
        enabledTypes:
          - SOFTWARE_TOKEN
```

### Example 2 (typescript)

```typescript
import { UserAuthPool, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const userPool = new UserAuthPool({
    userVerificationType: 'email-code',
    mfaConfiguration: {
      status: 'OPTIONAL',
      enabledTypes: ['SOFTWARE_TOKEN']
    }
  });
  return { resources: { userPool } };
});
```

## Property: `passwordPolicy`

- Required: no
- Type: `PasswordPolicy`

Password strength rules

Defines how strong user passwords must be – minimum length and whether they must include lowercase, uppercase,
numbers, and/or symbols – plus how long temporary passwords issued to new users remain valid.

This is applied to the Cognito `Policies.PasswordPolicy` block.

### Example 1 (yaml)

```yaml
resources:
  userPool:
    type: user-auth-pool
    properties:
      userVerificationType: email-code
      passwordPolicy:
        minimumLength: 12
        requireLowercase: true
        requireUppercase: true
        requireNumbers: true
        requireSymbols: true
        temporaryPasswordValidityDays: 7
```

### Example 2 (typescript)

```typescript
import { UserAuthPool, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const userPool = new UserAuthPool({
    userVerificationType: 'email-code',
    passwordPolicy: {
      minimumLength: 12,
      requireLowercase: true,
      requireUppercase: true,
      requireNumbers: true,
      requireSymbols: true,
      temporaryPasswordValidityDays: 7
    }
  });
  return { resources: { userPool } };
});
```

## Property: `refreshTokenValidityDays`

- Required: no
- Type: `number`

Refresh token lifetime

Sets for how many days a refresh token can be used to obtain new access / ID tokens without requiring the user to sign in again.
Longer lifetimes mean fewer re-authentications, but keep sessions alive for longer.

This value is used as `RefreshTokenValidity` on the Cognito user pool client.

### Example 1 (yaml)

```yaml
resources:
  userPool:
    type: user-auth-pool
    properties:
      userVerificationType: email-code
      refreshTokenValidityDays: 30
```

### Example 2 (typescript)

```typescript
import { UserAuthPool, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const userPool = new UserAuthPool({
    userVerificationType: 'email-code',
    refreshTokenValidityDays: 30
  });
  return { resources: { userPool } };
});
```

## Property: `requireEmailVerification`

- Required: no
- Type: `boolean`

(Reserved) Require verified emails

Present for forward compatibility. Stacktape currently derives email / phone verification behavior from `userVerificationType`,
not from this flag directly.

To require email-based verification today, use `userVerificationType: 'email-link' | 'email-code'` instead.

### Example 1 (yaml)

```yaml
resources:
  userPool:
    type: user-auth-pool
    properties:
      userVerificationType: email-code
      requireEmailVerification: true
```

### Example 2 (typescript)

```typescript
import { UserAuthPool, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const userPool = new UserAuthPool({
    userVerificationType: 'email-code',
    requireEmailVerification: true
  });
  return { resources: { userPool } };
});
```

## Property: `requirePhoneNumberVerification`

- Required: no
- Type: `boolean`

(Reserved) Require verified phone numbers

Present for forward compatibility. Stacktape currently derives email / phone verification behavior from `userVerificationType`,
not from this flag directly.

To require SMS-based verification today, use `userVerificationType: 'sms'`.

### Example 1 (yaml)

```yaml
resources:
  userPool:
    type: user-auth-pool
    properties:
      userVerificationType: sms
      requirePhoneNumberVerification: true
```

### Example 2 (typescript)

```typescript
import { UserAuthPool, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const userPool = new UserAuthPool({
    userVerificationType: 'sms',
    requirePhoneNumberVerification: true
  });
  return { resources: { userPool } };
});
```

## Property: `schema`

- Required: no
- Type: `Array<AttributeSchema>`

Custom attributes schema

Lets you define additional attributes (like `role`, `plan`, `companyId`, etc.) that are stored on each user,
including their data type and validation constraints.

These translate into the Cognito user pool `Schema` entries
([schema docs](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-cognito-userpool)).

### Example 1 (yaml)

```yaml
resources:
  userPool:
    type: user-auth-pool
    properties:
      userVerificationType: email-code
      schema:
        - name: plan
          attributeDataType: String
          mutable: true
          stringMinLength: 1
          stringMaxLength: 32
```

### Example 2 (typescript)

```typescript
import { UserAuthPool, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const userPool = new UserAuthPool({
    userVerificationType: 'email-code',
    schema: [
      {
        name: 'plan',
        attributeDataType: 'String',
        mutable: true,
        stringMinLength: 1,
        stringMaxLength: 32
      }
    ]
  });
  return { resources: { userPool } };
});
```

## Property: `unusedAccountValidityDays`

- Required: no
- Type: `number`
- Default: `31`

Expire unused admin-created accounts

When an admin creates a user account, Cognito issues a temporary password. This setting controls how many days that temporary password
(and the corresponding account) stays valid if the user never signs in.

Internally this maps to `AdminCreateUserConfig.UnusedAccountValidityDays`.

### Example 1 (yaml)

```yaml
resources:
  adminPool:
    type: user-auth-pool
    properties:
      allowOnlyAdminsToCreateAccount: true
      unusedAccountValidityDays: 7
```

### Example 2 (typescript)

```typescript
import { UserAuthPool, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const adminPool = new UserAuthPool({
    allowOnlyAdminsToCreateAccount: true,
    unusedAccountValidityDays: 7
  });
  return { resources: { adminPool } };
});
```

## Property: `useFirewall`

- Required: no
- Type: `string`

Associate a WAF

Links the user pool to a `web-app-firewall` resource, so requests to the Hosted UI and token endpoints are inspected
by AWS WAF rules you configure in Stacktape.

Stacktape does this by creating a `WebACLAssociation` between the user pool and the referenced firewall.

### Example 1 (yaml)

```yaml
resources:
  authFirewall:
    type: web-app-firewall
    properties:
      scope: regional
      rules:
        - type: managed-rule-group
          properties:
            name: AWSManagedRulesCommonRuleSet
            vendorName: AWS
            priority: 10
  userPool:
    type: user-auth-pool
    properties:
      enableHostedUi: true
      hostedUiDomainPrefix: acme-auth
      useFirewall: authFirewall
```

### Example 2 (typescript)

```typescript
import { WebAppFirewall, UserAuthPool, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const authFirewall = new WebAppFirewall({
    scope: 'regional',
    rules: [
      {
        type: 'managed-rule-group',
        properties: {
          name: 'AWSManagedRulesCommonRuleSet',
          vendorName: 'AWS',
          priority: 10
        }
      }
    ]
  });
  const userPool = new UserAuthPool({
    enableHostedUi: true,
    hostedUiDomainPrefix: 'acme-auth',
    useFirewall: 'authFirewall'
  });
  return { resources: { authFirewall, userPool } };
});
```

## Property: `userVerificationMessageConfig`

- Required: no
- Type: `UserVerificationMessageConfig`

Verification message text

Lets you customize the exact email and SMS texts that Cognito sends when asking users to verify their email / phone.
For example, you can change subjects, body text, or the message that contains the `{####}` verification code.

### Example 1 (yaml)

```yaml
resources:
  userPool:
    type: user-auth-pool
    properties:
      userVerificationType: email-code
      userVerificationMessageConfig:
        emailSubjectUsingCode: Verify your Acme account
        emailMessageUsingCode: 'Your verification code is {####}.'
```

### Example 2 (typescript)

```typescript
import { UserAuthPool, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const userPool = new UserAuthPool({
    userVerificationType: 'email-code',
    userVerificationMessageConfig: {
      emailSubjectUsingCode: 'Verify your Acme account',
      emailMessageUsingCode: 'Your verification code is {####}.'
    }
  });
  return { resources: { userPool } };
});
```

## Property: `userVerificationType`

- Required: no
- Type: `string: "email-code" | "email-link" | "none" | "sms"`

Verification strategy

Chooses how new users prove that they own their contact information:

`email-link`: Cognito emails a clickable link.
`email-code`: Cognito emails a short numeric code.
`sms`: Cognito sends a code via SMS to the user's phone number.
`none`: Users aren't required to verify email or phone during sign-up.

Stacktape uses this value to configure `AutoVerifiedAttributes` and `VerificationMessageTemplate`
on the underlying Cognito user pool.

### Example 1 (yaml)

```yaml
resources:
  userPool:
    type: user-auth-pool
    properties:
      userVerificationType: email-link
      allowEmailAsUserName: true
```

### Example 2 (typescript)

```typescript
import { UserAuthPool, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const userPool = new UserAuthPool({
    userVerificationType: 'email-link',
    allowEmailAsUserName: true
  });
  return { resources: { userPool } };
});
```
