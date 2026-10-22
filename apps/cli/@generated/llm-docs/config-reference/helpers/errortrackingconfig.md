# ErrorTrackingConfig API Reference

## TypeScript definition

```typescript
type ErrorTrackingConfig = {
  /** Records runtime errors from this stack's logs in the Stacktape Console. */
  enabled?: boolean;
  /** Stages that record errors. When omitted or empty, every stage does. */
  stages?: Array<string>;
};
```

## Property: `enabled`

- Required: no
- Type: `boolean`
- Default: `true`

Records runtime errors from this stack's logs in the Stacktape Console.

When enabled, every deployment subscribes the stack's function and container log groups to Stacktape's error
detector. Matching error lines are grouped into issues (one per distinct error and resource) with their stack
traces and occurrence counts, shown on the Error tracking page and by `stacktape error list`.

What leaves your AWS account per error: the error message and type, the stack frames, the matching log line and
the request id. Known shapes of sensitive data (secrets and tokens, values under sensitive key names such as
`password` or `authorization`, email addresses, IP addresses, card numbers and user home paths) are masked before
the event is sent. Logs themselves stay in your account.

When disabled, no log subscriptions are created for this stack and nothing is sent. The Console also has an
organization-wide switch that turns error tracking off for every stack at once.

## Property: `stages`

- Required: no
- Type: `Array<string>`

Stages that record errors. When omitted or empty, every stage does.

Use it to keep short-lived preview stages out of the Error tracking page while production and staging report.

### Example 1 (yaml)

```yaml
deploymentConfig:
  errorTracking:
    stages: [production, staging]
resources:
  api:
    type: function
    properties:
      packaging:
        type: js-bundle
        properties:
          entryfilePath: src/api.ts
```
