# EventBusIntegrationPattern API Reference

## TypeScript definition

```typescript
type EventBusIntegrationPattern = {
  /** Filter by AWS account ID. */
  account?: unknown;
  /** Filter by event payload content. Supports nested matching, prefix/suffix, numeric comparisons. */
  detail?: unknown;
  /** Filter by event detail-type (e.g., `["OrderPlaced"]`). This is the primary field for routing custom events. */
  "detail-type"?: unknown;
  /** Filter by AWS region. */
  region?: unknown;
  /** Filter by replay name (only present on replayed events). */
  "replay-name"?: unknown;
  /** Filter by resource ARNs. */
  resources?: unknown;
  /** Filter by event source (e.g., `["my-app"]` or `["aws.ec2"]` for AWS service events). */
  source?: unknown;
  /** Filter by event version. */
  version?: unknown;
};
```

## Property: `account`

- Required: no
- Type: `unknown`

Filter by AWS account ID.

## Property: `detail`

- Required: no
- Type: `unknown`

Filter by event payload content. Supports nested matching, prefix/suffix, numeric comparisons.

## Property: `detail-type`

- Required: no
- Type: `unknown`

Filter by event detail-type (e.g., `["OrderPlaced"]`). This is the primary field for routing custom events.

## Property: `region`

- Required: no
- Type: `unknown`

Filter by AWS region.

## Property: `replay-name`

- Required: no
- Type: `unknown`

Filter by replay name (only present on replayed events).

## Property: `resources`

- Required: no
- Type: `unknown`

Filter by resource ARNs.

## Property: `source`

- Required: no
- Type: `unknown`

Filter by event source (e.g., `["my-app"]` or `["aws.ec2"]` for AWS service events).

## Property: `version`

- Required: no
- Type: `unknown`

Filter by event version.
