# DomainConfiguration API Reference

## TypeScript definition

```typescript
type DomainConfiguration = {
  /** Your domain name (e.g., mydomain.com or api.mydomain.com). */
  domainName: string;
  /** Use your own TLS certificate instead of the auto-generated one. */
  customCertificateArn?: string;
  /** Skip DNS record creation for this domain. */
  disableDnsRecordCreation?: boolean;
};
```

## Property: `domainName`

- Required: yes
- Type: `string`

Your domain name (e.g., `mydomain.com` or `api.mydomain.com`).

Don't include the protocol (`https://`). The domain must have a Route53 hosted zone
in your AWS account, with your registrar's nameservers pointing to it.

Stacktape automatically creates a DNS record and provisions a free TLS certificate.

### Example 1 (yaml)

```yaml
resources:
  webApi:
    type: web-service
    properties:
      packaging:
        type: stacktape-image-buildpack
        properties:
          entryfilePath: src/server.ts
      resources:
        cpu: 0.5
        memory: 1024
      customDomains:
        - domainName: api.example.com
```

### Example 2 (typescript)

```typescript
import { WebService, StacktapeImageBuildpackPackaging, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const webApi = new WebService({
    packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/server.ts' }),
    resources: { cpu: 0.5, memory: 1024 },
    customDomains: [
      { domainName: 'api.example.com' }
    ]
  });

  return { resources: { webApi } };
});
```

## Property: `customCertificateArn`

- Required: no
- Type: `string`

Use your own TLS certificate instead of the auto-generated one.

Provide the ARN of an ACM certificate from your AWS account.
Only needed if you have specific certificate requirements (e.g., EV/OV certs).
By default, Stacktape provisions and renews free certificates automatically.

### Example 1 (yaml)

```yaml
resources:
  webApi:
    type: web-service
    properties:
      packaging:
        type: stacktape-image-buildpack
        properties:
          entryfilePath: src/server.ts
      resources:
        cpu: 0.5
        memory: 1024
      customDomains:
        - domainName: api.example.com
          customCertificateArn: arn:aws:acm:us-east-1:123456789012:certificate/abcd1234-ef56-7890-abcd-ef1234567890
```

### Example 2 (typescript)

```typescript
import { WebService, StacktapeImageBuildpackPackaging, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const webApi = new WebService({
    packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/server.ts' }),
    resources: { cpu: 0.5, memory: 1024 },
    customDomains: [
      {
        domainName: 'api.example.com',
        customCertificateArn:
          'arn:aws:acm:us-east-1:123456789012:certificate/abcd1234-ef56-7890-abcd-ef1234567890'
      }
    ]
  });

  return { resources: { webApi } };
});
```

## Property: `disableDnsRecordCreation`

- Required: no
- Type: `boolean`
- Default: `false`

Skip DNS record creation for this domain.

Set to `true` if you manage DNS records yourself (e.g., through Cloudflare or another DNS provider).
Stacktape will still provision the TLS certificate but won't touch your DNS.

### Example 1 (yaml)

```yaml
resources:
  webApi:
    type: web-service
    properties:
      packaging:
        type: stacktape-image-buildpack
        properties:
          entryfilePath: src/server.ts
      resources:
        cpu: 0.5
        memory: 1024
      customDomains:
        - domainName: api.example.com
          disableDnsRecordCreation: true
```

### Example 2 (typescript)

```typescript
import { WebService, StacktapeImageBuildpackPackaging, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const webApi = new WebService({
    packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/server.ts' }),
    resources: { cpu: 0.5, memory: 1024 },
    customDomains: [
      {
        domainName: 'api.example.com',
        disableDnsRecordCreation: true
      }
    ]
  });

  return { resources: { webApi } };
});
```
