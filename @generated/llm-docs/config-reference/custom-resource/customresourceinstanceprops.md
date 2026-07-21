# CustomResourceInstanceProps API Reference

Resource type: `custom-resource`

## TypeScript definition

```typescript
type CustomResourceInstanceProps = {
  /** Name of the custom-resource-definition in your config that provides the backing Lambda. */
  definitionName: string;
  /** Key-value pairs passed to the Lambda function during create/update/delete events. */
  resourceProperties: unknown;
};
```

## Property: `definitionName`

- Required: yes
- Type: `string`

Name of the `custom-resource-definition` in your config that provides the backing Lambda.

### Example 1 (yaml)

```yaml
resources:
  slackProvisioner:
    type: custom-resource-definition
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: provisioners/slack-channel.ts
      runtime: nodejs22.x
      timeout: 60
  releaseChannel:
    type: custom-resource-instance
    properties:
      definitionName: slackProvisioner
      resourceProperties:
        channelName: product-releases
        isPrivate: false
```

### Example 2 (typescript)

```typescript
import { CustomResourceDefinition, CustomResourceInstance, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const slackProvisioner = new CustomResourceDefinition({
    packaging: {
      type: 'stacktape-lambda-buildpack',
      properties: { entryfilePath: 'provisioners/slack-channel.ts' }
    },
    runtime: 'nodejs22.x',
    timeout: 60
  });

  const releaseChannel = new CustomResourceInstance({
    definitionName: 'slackProvisioner',
    resourceProperties: { channelName: 'product-releases', isPrivate: false }
  });

  return { resources: { slackProvisioner, releaseChannel } };
});
```

## Property: `resourceProperties`

- Required: yes
- Type: `unknown`

Key-value pairs passed to the Lambda function during create/update/delete events.

### Example 1 (yaml)

```yaml
resources:
  dnsProvisioner:
    type: custom-resource-definition
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: provisioners/cloudflare-dns.ts
      environment:
        - name: CLOUDFLARE_API_TOKEN
          value: $Secret('cloudflare-token')
      timeout: 120
  appDnsRecord:
    type: custom-resource-instance
    properties:
      definitionName: dnsProvisioner
      resourceProperties:
        recordType: CNAME
        name: app.example.com
        target: my-load-balancer.eu-west-1.elb.amazonaws.com
        ttl: 300
```

### Example 2 (typescript)

```typescript
import { CustomResourceDefinition, CustomResourceInstance, $Secret, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const dnsProvisioner = new CustomResourceDefinition({
    packaging: {
      type: 'stacktape-lambda-buildpack',
      properties: { entryfilePath: 'provisioners/cloudflare-dns.ts' }
    },
    environment: [{ name: 'CLOUDFLARE_API_TOKEN', value: $Secret('cloudflare-token') }],
    timeout: 120
  });

  const appDnsRecord = new CustomResourceInstance({
    definitionName: 'dnsProvisioner',
    resourceProperties: {
      recordType: 'CNAME',
      name: 'app.example.com',
      target: 'my-load-balancer.eu-west-1.elb.amazonaws.com',
      ttl: 300
    }
  });

  return { resources: { dnsProvisioner, appDnsRecord } };
});
```
