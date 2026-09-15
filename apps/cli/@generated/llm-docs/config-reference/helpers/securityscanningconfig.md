# SecurityScanningConfig API Reference

## TypeScript definition

```typescript
type SecurityScanningConfig = {
  /** Turns security scanning on or off for this stack. */
  enabled?: boolean;
  /** Limits security scanning to the listed stages. */
  stages?: Array<string>;
};
```

## Property: `enabled`

- Required: no
- Type: `boolean`
- Default: `true`

Turns security scanning on or off for this stack.

When enabled, every deployment evaluates the resolved configuration against Stacktape's security rules and
reports the findings to the Security section of the Stacktape Console. Findings describe risky settings, for
example a database reachable from the internet or a secret stored as a plain environment variable. When
disabled, nothing is evaluated or uploaded for this stack.

## Property: `stages`

- Required: no
- Type: `Array<string>`

Limits security scanning to the listed stages.

When omitted, every stage is scanned. Stage names are matched exactly.

### Example 1 (yaml)

```yaml
deploymentConfig:
  securityScanning:
    stages: [production, staging]
resources:
  api:
    type: web-service
    properties:
      packaging:
        type: stacktape-image-buildpack
        properties:
          entryfilePath: src/server.ts
      resources:
        cpu: 0.25
        memory: 512
```
