# UserPoolCustomDomainConfiguration API Reference

Resource type: `user-auth-pool`

## TypeScript definition

```typescript
type UserPoolCustomDomainConfiguration = {
  /** Domain Name */
  domainName: string;
  /** Custom Certificate ARN */
  customCertificateArn?: string;
  /** Disable DNS Record Creation */
  disableDnsRecordCreation?: boolean;
};
```

## Property: `domainName`

- Required: yes
- Type: `string`

Domain Name

Fully qualified domain name for the Cognito Hosted UI (e.g., `auth.example.com`).

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

## Property: `customCertificateArn`

- Required: no
- Type: `string`

Custom Certificate ARN

ARN of an ACM certificate in **us-east-1** to use for this domain.
By default, Stacktape uses the certificate associated with your domain in us-east-1.

The certificate must be in us-east-1 because Cognito uses CloudFront for custom domains.

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
        customCertificateArn: arn:aws:acm:us-east-1:123456789012:certificate/abcd1234-5678-90ab-cdef-1234567890ab
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
      domainName: 'auth.example.com',
      customCertificateArn: 'arn:aws:acm:us-east-1:123456789012:certificate/abcd1234-5678-90ab-cdef-1234567890ab'
    }
  });
  return { resources: { userPool } };
});
```

## Property: `disableDnsRecordCreation`

- Required: no
- Type: `boolean`
- Default: `false`

Disable DNS Record Creation

If `true`, Stacktape will not create a DNS record for this domain.

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
        disableDnsRecordCreation: true
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
      domainName: 'auth.example.com',
      disableDnsRecordCreation: true
    }
  });
  return { resources: { userPool } };
});
```
