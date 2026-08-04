# IdentityProvider API Reference

Resource type: `user-auth-pool`

## TypeScript definition

```typescript
import type { Record<string,any> } from 'stacktape';

type IdentityProvider = {
  /** OAuth / OIDC client ID */
  clientId: string;
  /** OAuth / OIDC client secret */
  clientSecret: string;
  /** Provider type */
  type: "Facebook" | "Google" | "LoginWithAmazon" | "OIDC" | "SAML" | "SignInWithApple";
  /** Attribute mapping */
  attributeMapping?: unknown;
  /** Requested scopes */
  authorizeScopes?: Array<string>;
  /** Advanced provider options */
  providerDetails?: Record<string,any>;
};
```

## Property: `clientId`

- Required: yes
- Type: `string`

OAuth / OIDC client ID

The client ID (sometimes called app ID) that you obtained from the external provider's console.
Cognito presents this ID when redirecting users to the provider.

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
      identityProviders:
        - type: Google
          clientId: my-google-client-id.apps.googleusercontent.com
          clientSecret: $Secret('google-oauth.client-secret')
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
    allowedOAuthScopes: ['openid'],
    identityProviders: [
      {
        type: 'Google',
        clientId: 'my-google-client-id.apps.googleusercontent.com',
        clientSecret: $Secret('google-oauth.client-secret')
      }
    ]
  });
  return { resources: { userPool } };
});
```

## Property: `clientSecret`

- Required: yes
- Type: `string`

OAuth / OIDC client secret

The client secret associated with the `clientId`, used by Cognito when exchanging authorization codes for tokens.
This value should be kept confidential and only configured from secure sources.

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
      identityProviders:
        - type: Google
          clientId: my-google-client-id.apps.googleusercontent.com
          clientSecret: $Secret('google-oauth.client-secret')
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
    allowedOAuthScopes: ['openid'],
    identityProviders: [
      {
        type: 'Google',
        clientId: 'my-google-client-id.apps.googleusercontent.com',
        clientSecret: $Secret('google-oauth.client-secret')
      }
    ]
  });
  return { resources: { userPool } };
});
```

## Property: `type`

- Required: yes
- Type: `string: "Facebook" | "Google" | "LoginWithAmazon" | "OIDC" | "SAML" | "SignInWithApple"`

Provider type

The kind of external identity provider you want to integrate:

`Facebook`, `Google`, `LoginWithAmazon`, `SignInWithApple`: social identity providers.
`OIDC`: a generic OpenID Connect provider.
`SAML`: a SAML 2.0 identity provider (often used for enterprise SSO).

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
      identityProviders:
        -
          type: Facebook
          clientId: my-facebook-app-id
          clientSecret: $Secret('facebook-oauth.client-secret')
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
    allowedOAuthScopes: ['openid'],
    identityProviders: [
      {
        type: 'Facebook',
        clientId: 'my-facebook-app-id',
        clientSecret: $Secret('facebook-oauth.client-secret')
      }
    ]
  });
  return { resources: { userPool } };
});
```

## Property: `attributeMapping`

- Required: no
- Type: `unknown`

Attribute mapping

Maps attributes from the external provider (for example `email`, `given_name`) to Cognito user pool attributes.
Keys are Cognito attribute names, values are attribute names from the identity provider.

If not provided, Stacktape defaults to mapping `email -> email`.

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
      identityProviders:
        - type: Google
          clientId: my-google-client-id.apps.googleusercontent.com
          clientSecret: $Secret('google-oauth.client-secret')
          attributeMapping:
            email: email
            given_name: given_name
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
    allowedOAuthScopes: ['openid'],
    identityProviders: [
      {
        type: 'Google',
        clientId: 'my-google-client-id.apps.googleusercontent.com',
        clientSecret: $Secret('google-oauth.client-secret'),
        attributeMapping: {
          email: 'email',
          given_name: 'given_name'
        }
      }
    ]
  });
  return { resources: { userPool } };
});
```

## Property: `authorizeScopes`

- Required: no
- Type: `Array<string>`

Requested scopes

Additional OAuth scopes to request from the identity provider (for example `openid`, `email`, `profile`).
These control which pieces of user information and permissions your app receives in the provider's tokens.

If omitted, Stacktape uses a reasonable default per provider (see
[AWS::Cognito::UserPoolIdentityProvider](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-cognito-userpoolidentityprovider)).

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
      identityProviders:
        - type: Google
          clientId: my-google-client-id.apps.googleusercontent.com
          clientSecret: $Secret('google-oauth.client-secret')
          authorizeScopes:
            - openid
            - email
            - profile
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
    allowedOAuthScopes: ['openid'],
    identityProviders: [
      {
        type: 'Google',
        clientId: 'my-google-client-id.apps.googleusercontent.com',
        clientSecret: $Secret('google-oauth.client-secret'),
        authorizeScopes: ['openid', 'email', 'profile']
      }
    ]
  });
  return { resources: { userPool } };
});
```

## Property: `providerDetails`

- Required: no
- Type: `Record<string,any>`

Advanced provider options

Low‑level configuration passed directly into Cognito's `ProviderDetails` map.
You can use this to override endpoints or supply provider‑specific keys as documented by AWS,
for example `authorize_url`, `token_url`, `attributes_request_method`, `oidc_issuer`, and others.

In most cases you don't need to set this – Stacktape configures sensible defaults for common providers.

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
      identityProviders:
        - type: OIDC
          clientId: my-oidc-client-id
          clientSecret: $Secret('oidc-provider.client-secret')
          authorizeScopes:
            - openid
            - email
          providerDetails:
            oidc_issuer: https://idp.example.com
            attributes_request_method: GET
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
    allowedOAuthScopes: ['openid'],
    identityProviders: [
      {
        type: 'OIDC',
        clientId: 'my-oidc-client-id',
        clientSecret: $Secret('oidc-provider.client-secret'),
        authorizeScopes: ['openid', 'email'],
        providerDetails: {
          oidc_issuer: 'https://idp.example.com',
          attributes_request_method: 'GET'
        }
      }
    ]
  });
  return { resources: { userPool } };
});
```
