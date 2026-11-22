# User authentication pool

A user authentication pool is an Amazon Cognito user pool: sign-up, sign-in, password reset, email or phone
verification, MFA, social and enterprise sign-in (Google, Facebook, Apple, SAML, OIDC) and OAuth 2.0. It issues JWTs
that an [HTTP API Gateway](/resources/networking/http-api-gateway) can check on every request, so your code gets only
signed-in users.

New pools use Cognito's Essentials tier: the first 10,000 monthly active users are free, then $0.015 per user in
us-east-1. Users who sign in through SAML or OIDC have a separate free allowance of 50
([Cognito pricing](https://aws.amazon.com/cognito/pricing/)).

Stacktape configures password, email or phone, MFA, social and enterprise sign-in. Passkeys and other passwordless
sign-in that Cognito offers aren't Stacktape settings; set them with [overrides](/configuration/overrides-and-escape-hatches)
or pick a provider such as Auth0 or Clerk. For service-to-service calls without users, IAM is simpler.

## Basic example

A pool needs no properties; Stacktape creates the Cognito user pool and an app client. Most apps set at least how new
users verify their email or phone:


Example (TypeScript):

```typescript
import { defineConfig, UserAuthPool } from 'stacktape';
export default defineConfig(() => {
  const auth = new UserAuthPool({
    userVerificationType: 'email-code'
  });

  return {
    resources: { auth }
  };
});
```


New users verify their email with a one-time code. They can sign in with their email or phone number
(`allowEmailAsUserName` and `allowPhoneNumberAsUserName` are `true` by default). The deploy prints nothing to open; your
app uses the pool through `connectTo` or the [Hosted UI](#hosted-ui).

### Admin-only accounts

For internal tools, B2B dashboards, or any app where you do not want public sign-ups, set `allowOnlyAdminsToCreateAccount: true`. Accounts must then be created through an admin flow (using the Cognito `AdminCreateUser` API from your backend).


Example (TypeScript):

```typescript
import { defineConfig, UserAuthPool } from 'stacktape';
export default defineConfig(() => {
  const auth = new UserAuthPool({
    userVerificationType: 'email-code',
    allowOnlyAdminsToCreateAccount: true,
    unusedAccountValidityDays: 7
  });

  return {
    resources: { auth }
  };
});
```


Use `unusedAccountValidityDays` to control how long an unused admin-created account stays valid if the user never signs in. Setting it to `7` means the temporary password and account expire after 7 days. The default is 31 days. This is separate from `passwordPolicy.temporaryPasswordValidityDays`, which controls how long a temporary password is valid before it must be changed on first sign-in.

## Connecting to resources

To use the user pool from a [Lambda function](/resources/compute/lambda-function), [web service](/resources/compute/web-service), or any other compute resource, add it to the resource's [`connectTo`](/configuration/connecting-resources) list. For a `UserAuthPool`, `connectTo` grants full-control permissions and injects `ID`, `CLIENT_ID`, and `ARN` environment variables.


Example (TypeScript):

```typescript
import {
  defineConfig,
  UserAuthPool,
  LambdaFunction,
  HttpApiGateway,
  HttpApiIntegration,
  JsBundleLambdaPackaging
} from 'stacktape';
export default defineConfig(() => {
  const auth = new UserAuthPool({
    userVerificationType: 'email-code'
  });

  const gateway = new HttpApiGateway({});

  const api = new LambdaFunction({
    packaging: new JsBundleLambdaPackaging({
      entryfilePath: './src/handler.ts'
    }),
    connectTo: [auth],
    events: [
      new HttpApiIntegration({
        httpApiGatewayName: 'gateway',
        method: '*',
        path: '/{proxy+}'
      })
    ]
  });

  return {
    resources: { auth, gateway, api }
  };
});
```


For a resource named `auth`, the following environment variables are injected by `connectTo`:

| Variable | Description |
|---|---|
| `STP_AUTH_ID` | Cognito User Pool ID |
| `STP_AUTH_CLIENT_ID` | User Pool Client ID |
| `STP_AUTH_ARN` | User Pool ARN |

`$ResourceParam('auth', 'domain')` gives the Hosted UI domain.

Your application code can pass the injected pool ID, client ID, and ARN to AWS SDKs or Cognito-compatible libraries. For example, backend code commonly uses Cognito APIs for admin user creation or authentication flows. Libraries like `amazon-cognito-identity-js` or `@aws-sdk/client-cognito-identity-provider` accept the pool ID and client ID directly.

## Protecting API routes

A Stacktape user authentication pool integrates with [HTTP API Gateway](/resources/networking/http-api-gateway) to protect routes using JWT validation. With a `cognito` authorizer on an HTTP trigger, API Gateway checks the bearer token on every request before your code
runs, and answers `401` when it's missing or invalid.


Example (TypeScript):

```typescript
import {
  defineConfig,
  UserAuthPool,
  LambdaFunction,
  HttpApiGateway,
  HttpApiIntegration,
  JsBundleLambdaPackaging
} from 'stacktape';
export default defineConfig(() => {
  const auth = new UserAuthPool({
    userVerificationType: 'email-code'
  });

  const gateway = new HttpApiGateway({});

  const api = new LambdaFunction({
    packaging: new JsBundleLambdaPackaging({
      entryfilePath: './src/handler.ts'
    }),
    connectTo: [auth],
    events: [
      new HttpApiIntegration({
        httpApiGatewayName: 'gateway',
        method: 'GET',
        path: '/me',
        authorizer: {
          type: 'cognito',
          properties: {
            userPoolName: 'auth'
          }
        }
      })
    ]
  });

  return {
    resources: { auth, gateway, api }
  };
});
```


The `cognito` authorizer type validates JWTs issued by the referenced user pool. Stacktape uses `userPoolName` to set the expected audience to the user pool client ID and build the issuer URL from the user pool and AWS region. By default, the token is read from the `Authorization` header. You can customize this with the `identitySources` property on the authorizer to read from a different header, query parameter, or stage variable using the `$request.*` syntax.

Stacktape also supports a `lambda` authorizer type, where a [Lambda function](/resources/compute/lambda-function) runs custom authorization logic for each request. Use it for checks beyond the JWT, for example API keys, permissions from a database or another identity provider. See [HTTP triggers](/resources/triggers/http-triggers) for details on both authorizer types.

## Verification

Stacktape user authentication pools support four verification strategies that control how new users prove ownership of their contact information. Set `userVerificationType` to choose the strategy:

| Strategy | Behavior |
|---|---|
| `email-code` | Cognito emails a short numeric code the user enters during sign-up |
| `email-link` | Cognito emails a clickable verification link |
| `sms` | Cognito sends a verification code via SMS to the user's phone number |
| `none` | No email or phone verification is required during sign-up |

For most web apps, `email-code` is the best default: it needs nothing else and users know it. Use `email-link` for a smoother UX where users just click a link instead of copying a code. Use `sms` when phone numbers are the primary identifier (ride-sharing, delivery apps). Use `none` only for internal tools where you trust all users.

You can customize the email subject and body text for both code and link verification using `userVerificationMessageConfig`. To fully customize the email sender and message format, configure `emailConfiguration.sesAddressArn` with a verified SES identity. Without SES configuration, Cognito sends emails through its built-in sender, which works for standard verification flows but has lower daily sending limits.


> **Warning:** `requireEmailVerification` and `requirePhoneNumberVerification` have no effect yet; `userVerificationType` decides
verification.


## Identity providers

A Stacktape user authentication pool supports six types of external identity providers, allowing users to sign in with existing accounts instead of creating new credentials:

| Provider type | Use case |
|---|---|
| `Google` | Consumer and business apps |
| `Facebook` | Consumer apps, especially social or e-commerce |
| `SignInWithApple` | Required for iOS apps that offer other social logins |
| `LoginWithAmazon` | E-commerce or Alexa-integrated apps |
| `OIDC` | Any OpenID Connect provider (Okta, Azure AD, etc.) |
| `SAML` | Enterprise SSO (Active Directory, Ping Identity, etc.) |

Every provider needs a `clientId` and a `clientSecret`. For social and OIDC providers, obtain them from the provider's developer console. For SAML and OIDC providers, advanced provider-specific options can be passed through `providerDetails` as Cognito `ProviderDetails` values. Store secrets using the [`$Secret` directive](/configuration/directives) to avoid exposing them in your config. See [secrets](/configuration/secrets) or [`stacktape secret set`](/cli/secret-set) for setup.


Example (TypeScript):

```typescript
import { defineConfig, UserAuthPool } from 'stacktape';
export default defineConfig(() => {
  const auth = new UserAuthPool({
    userVerificationType: 'email-code',
    enableHostedUi: true,
    hostedUiDomainPrefix: 'myapp-login',
    identityProviders: [
      {
        type: 'Google',
        clientId: "$Secret('google-credentials', 'clientId')",
        clientSecret: "$Secret('google-credentials', 'clientSecret')"
      }
    ],
    callbackURLs: ['https://myapp.com/auth/callback'],
    logoutURLs: ['https://myapp.com/logged-out']
  });

  return {
    resources: { auth }
  };
});
```


When you add an identity provider, Stacktape creates separate `AWS::Cognito::UserPoolIdentityProvider` resources and registers them in the user pool client's `SupportedIdentityProviders`. If you do not specify `attributeMapping`, Stacktape defaults to mapping `email` from the provider to the Cognito `email` attribute. You can override this with the `attributeMapping` property to map additional attributes like `given_name` or `picture`.

If you omit `authorizeScopes`, Stacktape uses a reasonable default per provider. Set `authorizeScopes` explicitly when your app needs specific provider scopes, for example requesting access to a user's Google Calendar or Facebook friend list.

Set `allowOnlyExternalIdentityProviders: true` only after configuring at least one `identityProviders` entry. Stacktape then removes `COGNITO` from the user pool client's `SupportedIdentityProviders`, so users must sign in through the configured external providers.

## Lambda hooks

Cognito triggers let you run custom logic at key points in the authentication lifecycle. The `hooks` property connects [Lambda function](/resources/compute/lambda-function) ARNs to specific trigger points. Use [`$ResourceParam`](/configuration/referenceable-parameters) to reference a Lambda function from your stack:

| Hook | When it runs | Common use case |
|---|---|---|
| `preSignUp` | Before a new user is created | Validate input, auto-confirm trusted domains, block sign-ups |
| `postConfirmation` | After account confirmation | Create records in your database, provision resources |
| `preAuthentication` | Before credential validation | Block sign-in by IP, device, or user state |
| `postAuthentication` | After successful sign-in | Update last-login timestamps, record analytics |
| `preTokenGeneration` | Before tokens are issued | Add custom claims (roles, permissions) to JWTs |
| `customMessage` | Before sending email/SMS | Customize message content, localize text |
| `userMigration` | When an unknown user signs in | Import users on-the-fly from a legacy system |
| `createAuthChallenge` | During custom auth flow | Generate a custom challenge (e.g., OTP) |
| `defineAuthChallenge` | During custom auth flow | Decide whether a challenge is needed |
| `verifyAuthChallengeResponse` | During custom auth flow | Validate the user's challenge response |

Each hook value must be a Lambda function ARN. Stacktape maps the configured hooks to the Cognito user pool `LambdaConfig`.


Example (TypeScript):

```typescript
import {
  defineConfig,
  UserAuthPool,
  LambdaFunction,
  JsBundleLambdaPackaging
} from 'stacktape';
export default defineConfig(() => {
  const createProfile = new LambdaFunction({
    packaging: new JsBundleLambdaPackaging({
      entryfilePath: './src/create-profile.ts'
    })
  });

  const auth = new UserAuthPool({
    userVerificationType: 'email-code',
    hooks: {
      postConfirmation: "$ResourceParam('createProfile', 'arn')"
    }
  });

  return {
    resources: { createProfile, auth }
  };
});
```


Here `createProfile` runs after each user confirms their account, for example to add the user to your own database. The `$ResourceParam('createProfile', 'arn')` directive resolves to the Lambda ARN at deploy time.

## Multi-factor authentication

MFA adds a second verification step during sign-in, making it harder for attackers to access accounts even if they know a user's password. Stacktape supports three MFA factor types:

| Factor | How it works | Requirements |
|---|---|---|
| `SOFTWARE_TOKEN` | Time-based one-time codes from an authenticator app (Google Authenticator, Authy) | None |
| `SMS` | One-time codes sent via text message | Requires an SNS role so Cognito can send SMS |
| `EMAIL_OTP` | One-time codes sent via email | Requires `emailConfiguration.sesAddressArn` with a verified SES identity |

The `mfaConfiguration.status` property controls enforcement: `ON` requires MFA for all users, `OPTIONAL` lets users opt in, and `OFF` disables MFA entirely. For most apps, start with `OPTIONAL` and move to `ON` once your users have enrolled their second factor.


Example (TypeScript):

```typescript
import { defineConfig, UserAuthPool } from 'stacktape';
export default defineConfig(() => {
  const auth = new UserAuthPool({
    userVerificationType: 'email-code',
    mfaConfiguration: {
      status: 'OPTIONAL',
      enabledTypes: ['SOFTWARE_TOKEN']
    }
  });

  return {
    resources: { auth }
  };
});
```


`SOFTWARE_TOKEN` is the best default: no per-message cost, works everywhere and needs no SES or SNS setup. Use `SMS` only when your users might not have access to authenticator apps, keeping in mind the per-message SMS cost. Use `EMAIL_OTP` when you already have SES configured and want a low-friction second factor that does not require a separate authenticator app.

## Hosted UI

Cognito provides a pre-built, hosted login and registration page so you do not have to build your own auth screens. Enable it with `enableHostedUi: true`. The Hosted UI is useful when you want authentication screens outside your main app. If you use OAuth redirects, configure `callbackURLs` and `logoutURLs` explicitly.


Example (TypeScript):

```typescript
import { defineConfig, UserAuthPool } from 'stacktape';
export default defineConfig(() => {
  const auth = new UserAuthPool({
    enableHostedUi: true,
    hostedUiDomainPrefix: 'myapp-auth',
    userVerificationType: 'email-code',
    callbackURLs: ['https://myapp.com/auth/callback'],
    logoutURLs: ['https://myapp.com/logged-out'],
    allowedOAuthFlows: ['code'],
    allowedOAuthScopes: ['email', 'openid', 'profile']
  });

  return {
    resources: { auth }
  };
});
```


The `hostedUiDomainPrefix` sets the first part of the Hosted UI URL: `https://<prefix>.auth.<region>.amazoncognito.com`. Choose a prefix that matches your project name. Cognito accepts 1 to 63 lowercase letters, digits and hyphens, starting and ending with a letter or digit, and rejects a prefix that contains `aws`, `amazon` or `cognito`; Stacktape checks this before deploying. Without `hostedUiDomainPrefix`, the prefix is `<stack name>-<pool name>`. When Cognito would reject that, for example for a pool named `cognitoPool`, a new pool gets the same name without the rejected parts and with a short hash. A deployed pool keeps the prefix it has. Use `hostedUiCSS` to provide custom CSS for the Hosted UI, applied via Cognito's `AWS::Cognito::UserPoolUICustomizationAttachment` resource.

**When to enable the Hosted UI:** Use it when you want to ship authentication quickly without building custom UI. It is especially useful with social login providers, since the Hosted UI handles the OAuth redirect flow for you. **When to skip it:** For full control of the sign-in screens, build your own UI on the Cognito SDK against the same pool.

### Custom domain

By default, the Hosted UI is served from a Cognito-managed subdomain. To use your own domain (e.g., `auth.example.com`), configure `customDomain`:


Example (TypeScript):

```typescript
import { defineConfig, UserAuthPool } from 'stacktape';
export default defineConfig(() => {
  const auth = new UserAuthPool({
    enableHostedUi: true,
    userVerificationType: 'email-code',
    customDomain: {
      domainName: 'auth.example.com'
    },
    callbackURLs: ['https://example.com/auth/callback'],
    logoutURLs: ['https://example.com/logged-out']
  });

  return {
    resources: { auth }
  };
});
```


Use your own domain when users see the sign-in URL, for example in login redirects. Otherwise the Cognito subdomain
from `hostedUiDomainPrefix` needs no DNS or certificate.

Cognito serves custom domains through CloudFront, so the certificate must be in `us-east-1`. Run
[`stacktape domain add`](/resources/networking/custom-domains#set-up-the-domain) before the first deploy; it creates one
there. Cognito also requires the parent domain (`example.com` for `auth.example.com`) to have an A record. Stacktape
creates the DNS record for `customDomain` unless you set `disableDnsRecordCreation: true`, and `customCertificateArn`
picks a specific certificate.

## OAuth

The user pool client's OAuth configuration controls which flows, scopes, and redirect URLs are allowed. Configure these explicitly when using the Hosted UI or integrating with external identity providers:

- **`allowedOAuthFlows`**: which OAuth 2.0 flows the client can use: `code` (Authorization Code, recommended for web apps), `implicit` (legacy browser-only flow), or `client_credentials` (server-to-server with no end user). For most web applications, use `['code']`.
- **`allowedOAuthScopes`**: a string list of scopes the user pool client can request. Common values are `email`, `openid`, and `profile`. These are passed to the Cognito user pool client as `AllowedOAuthScopes`. For scopes requested from an external provider (e.g., Google Calendar access or Facebook friend list), set `authorizeScopes` on that provider's `identityProviders` entry instead.
- **`callbackURLs`**: URLs where Cognito redirects users after authentication. Must exactly match the URLs configured in your application. Include `http://localhost:3000/...` during development and your production URL for deployed environments.
- **`logoutURLs`**: URLs where Cognito redirects after sign-out. Must also be explicitly configured.
- **`generateClientSecret`**: set to `true` when your backend can safely store a client secret (server-side apps, not SPAs). Defaults to `false`.

For server-rendered web apps or backend-mediated OAuth flows, use the `code` flow with `generateClientSecret: true`. For single-page applications that call Cognito directly from the browser, use the `code` flow without a client secret (PKCE is handled automatically by the Cognito SDK).

## Password policy

Stacktape lets you configure password strength requirements through the `passwordPolicy` property. You can set `minimumLength` and require specific character classes (`requireLowercase`, `requireUppercase`, `requireNumbers`, `requireSymbols`).


Example (TypeScript):

```typescript
import { defineConfig, UserAuthPool } from 'stacktape';
export default defineConfig(() => {
  const auth = new UserAuthPool({
    userVerificationType: 'email-code',
    passwordPolicy: {
      minimumLength: 12,
      requireNumbers: true,
      requireUppercase: true,
      requireLowercase: true,
      temporaryPasswordValidityDays: 3
    }
  });

  return {
    resources: { auth }
  };
});
```


The `temporaryPasswordValidityDays` inside `passwordPolicy` controls how long a temporary password issued to a new user is valid before it must be changed on first sign-in. This is distinct from the top-level `unusedAccountValidityDays`, which controls when the entire unused admin-created account expires if the user never signs in at all.

Without `passwordPolicy`, Cognito's own defaults apply. For production, set at least `minimumLength: 12` with
`requireNumbers` and `requireUppercase`.

## Client restrictions

The pool's app client accepts every sign-in flow and can read and write every user attribute unless you limit it:

| Property | Limits |
|---|---|
| `allowedAuthFlows` | Which sign-in flows the client accepts, for example `ALLOW_USER_SRP_AUTH` and `ALLOW_REFRESH_TOKEN_AUTH` only |
| `readAttributes` | Which user attributes tokens and `GetUser` return through the client |
| `writeAttributes` | Which attributes users can set through the client, for example to keep `custom:role` admin-only |

```typescript
new UserAuthPool({
  allowedAuthFlows: ['ALLOW_USER_SRP_AUTH', 'ALLOW_REFRESH_TOKEN_AUTH'],
  readAttributes: ['email', 'name'],
  writeAttributes: ['name']
});
```

## Token lifetimes

Stacktape lets you control how long tokens issued by the user pool remain valid:

| Property | Controls | Allowed values | Default |
|---|---|---|---|
| `accessTokenValiditySeconds` | How long access tokens (used for API authorization) are valid | 300 to 86400 seconds | 3600 (1 hour) |
| `idTokenValiditySeconds` | How long ID tokens (containing user profile claims) are valid | 300 to 86400 seconds | 3600 (1 hour) |
| `refreshTokenValidityDays` | How long refresh tokens can obtain new access/ID tokens | 1 to 3650 days | 30 |


Example (TypeScript):

```typescript
import { defineConfig, UserAuthPool } from 'stacktape';
export default defineConfig(() => {
  const auth = new UserAuthPool({
    userVerificationType: 'email-code',
    accessTokenValiditySeconds: 3600,
    idTokenValiditySeconds: 3600,
    refreshTokenValidityDays: 30
  });

  return {
    resources: { auth }
  };
});
```


Shorter access token lifetimes reduce the window for token theft at the cost of more frequent refresh calls. Longer refresh token lifetimes keep users signed in longer but extend the window for session hijacking. The defaults, 1 hour for access and ID tokens and 30 days for refresh tokens, are a common starting point.

Before Stacktape v4, Cognito read `accessTokenValiditySeconds` and `idTokenValiditySeconds` in hours, so only values from 1 to 24 deployed. Such a value still means that many hours, and the CLI warns you to write it in seconds instead: `accessTokenValiditySeconds: 1` becomes `accessTokenValiditySeconds: 3600`.

The client's `TokenValidityUnits` are seconds for access and ID tokens and days for refresh tokens. An `overrides` entry that sets `AccessTokenValidity` or `IdTokenValidity` on the client is read in seconds too, so a value written in hours before v4 fails to deploy. Set the unit you mean in the same override; the other units stay as they are:

```yaml
resources:
  auth:
    type: user-auth-pool
    properties:
      userVerificationType: email-code
    overrides:
      AuthUserPoolClient:
        AccessTokenValidity: 2
        TokenValidityUnits:
          AccessToken: hours
```

## Custom attributes

The `schema` property lets you define custom attributes stored on each user record. These are useful for data like `role`, `plan`, `tenantId`, or `companyName` that you want attached to the user profile and optionally included in JWT claims (via the `preTokenGeneration` hook).


Example (TypeScript):

```typescript
import { defineConfig, UserAuthPool } from 'stacktape';
export default defineConfig(() => {
  const auth = new UserAuthPool({
    userVerificationType: 'email-code',
    schema: [
      {
        name: 'role',
        attributeDataType: 'String',
        mutable: true,
        stringMinLength: 1,
        stringMaxLength: 50
      },
      {
        name: 'tenantId',
        attributeDataType: 'String',
        required: true,
        mutable: false,
        stringMinLength: 1,
        stringMaxLength: 128
      },
      {
        name: 'loginCount',
        attributeDataType: 'Number',
        mutable: true
      }
    ]
  });

  return {
    resources: { auth }
  };
});
```


Each attribute specifies a `name`, `attributeDataType` (e.g., `String`, `Number`), and optional constraints like `required`, `mutable`, `stringMinLength`, and `stringMaxLength`. Attributes with `developerOnlyAttribute: true` are readable only from your backend, not by users.


> **Warning:** Cognito user pool custom attribute schemas are difficult to change after creation. Plan the schema carefully before deploying to production.


## Firewall

Stacktape user authentication pools can be protected by a [web application firewall](/resources/security/web-application-firewall) that inspects requests to the Hosted UI and Cognito token endpoints. `useFirewall` is the Stacktape resource name of a `web-app-firewall` resource; it is not an inline WAF rule definition. Set it to the name of a `WebAppFirewall` resource in your stack.

`useFirewall` creates a `WebACLAssociation` between the user pool and the referenced firewall. AWS requires a regional WAF web ACL for Cognito user pool associations, so the referenced `WebAppFirewall` resource must use `scope: 'regional'`. A CDN-scoped firewall targets CloudFront and cannot be associated with a Cognito user pool. See the [web application firewall](/resources/security/web-application-firewall) page for firewall scope configuration.


Example (TypeScript):

```typescript
import { defineConfig, UserAuthPool, WebAppFirewall } from 'stacktape';
export default defineConfig(() => {
  const firewall = new WebAppFirewall({
    scope: 'regional'
  });

  const auth = new UserAuthPool({
    userVerificationType: 'email-code',
    useFirewall: 'firewall'
  });

  return {
    resources: { firewall, auth }
  };
});
```


**When to enable a firewall:** Use it when your Hosted UI is publicly accessible and you want to protect against credential stuffing, bot traffic, or IP-based attacks. A firewall costs about $7 a month with the default rules, plus $0.60 per million requests. **When to skip it:** For internal-only apps or apps that use custom UI with backend-only Cognito API calls, the firewall adds cost without significant benefit.

## Email configuration

By default, Cognito sends emails (verification codes, password resets, admin invitations) through its built-in email service. This works for development but has low daily sending limits. For production, configure `emailConfiguration.sesAddressArn` with a verified SES identity to use your own sender address and get higher throughput:

- **`sesAddressArn`**: ARN of a verified SES email or domain. `EMAIL_OTP` MFA requires it.
- **`from`**: the sender address recipients see. It must be verified in SES.
- **`replyToEmailAddress`**: where replies go; by default the `from` address.

The `inviteMessageConfig` property customizes the email and SMS sent when an administrator creates a user account. Use `{username}` and `{####}` placeholders in the message body for the username and temporary password.

## Configuration reference


### Definition: `UserAuthPoolProps`

The complete property-level reference is included in `llms-api-reference.txt` and indexed under route `/config-reference/user-auth-pool` with definition name `UserAuthPoolProps`.

| Property | Required | Type | Default |
| --- | --- | --- | --- |
| `accessTokenValiditySeconds` | no | `number` | `3600` |
| `allowEmailAsUserName` | no | `boolean` | `true` |
| `allowOnlyAdminsToCreateAccount` | no | `boolean` | `false` |
| `allowOnlyExternalIdentityProviders` | no | `boolean` | `false` |
| `allowPhoneNumberAsUserName` | no | `boolean` | `true` |
| `allowedAuthFlows` | no | `Array<string: "ALLOW_ADMIN_USER_PASSWORD_AUTH" \| "ALLOW_CUSTOM_AUTH" \| "ALLOW_REFRESH_TOKEN_AUTH" \| "ALLOW_USER_AUTH" \| "ALLOW_USER_PASSWORD_AUTH" \| "ALLOW_USER_SRP_AUTH">` | - |
| `allowedOAuthFlows` | no | `Array<string: "client_credentials" \| "code" \| "implicit">` | - |
| `allowedOAuthScopes` | no | `Array<string>` | - |
| `callbackURLs` | no | `Array<string>` | - |
| `customDomain` | no | `UserPoolCustomDomainConfiguration` | - |
| `emailConfiguration` | no | `EmailConfiguration` | - |
| `enableHostedUi` | no | `boolean` | `false` |
| `generateClientSecret` | no | `boolean` | `false` |
| `hooks` | no | `UserPoolHooks` | - |
| `hostedUiCSS` | no | `string` | - |
| `hostedUiDomainPrefix` | no | `string` | - |
| `idTokenValiditySeconds` | no | `number` | `3600` |
| `identityProviders` | no | `Array<IdentityProvider>` | - |
| `inviteMessageConfig` | no | `InviteMessageConfig` | - |
| `logoutURLs` | no | `Array<string>` | - |
| `mfaConfiguration` | no | `MfaConfiguration` | - |
| `passwordPolicy` | no | `PasswordPolicy` | - |
| `readAttributes` | no | `Array<string>` | - |
| `refreshTokenValidityDays` | no | `number` | `30` |
| `requireEmailVerification` | no | `boolean` | - |
| `requirePhoneNumberVerification` | no | `boolean` | - |
| `schema` | no | `Array<AttributeSchema>` | - |
| `unusedAccountValidityDays` | no | `number` | `31` |
| `useFirewall` | no | `string` | - |
| `userVerificationMessageConfig` | no | `UserVerificationMessageConfig` | - |
| `userVerificationType` | no | `string: "email-code" \| "email-link" \| "none" \| "sms"` | - |
| `writeAttributes` | no | `Array<string>` | - |


## Referenceable parameters


## Referenceable Parameters: `user-auth-pool`
These values can be referenced with `$ResourceParam("<<resource-name>>", "<<parameter-name>>")`.

| Parameter | Description | Usage |
| --- | --- | --- |
| `id` | Id of the userpool | `$ResourceParam("<<resource-name>>", "id")` |
| `clientId` | Id of the userpool | `$ResourceParam("<<resource-name>>", "clientId")` |
| `domain` | Domain of the userpool | `$ResourceParam("<<resource-name>>", "domain")` |


`connectTo` auto-injects `STP_[RESOURCE_NAME]_ID`, `STP_[RESOURCE_NAME]_CLIENT_ID`, and `STP_[RESOURCE_NAME]_ARN` as environment variables. The remaining parameters (`providerUrl`, `domain`, `clientSecret`) are accessible via [`$ResourceParam`](/configuration/referenceable-parameters).
