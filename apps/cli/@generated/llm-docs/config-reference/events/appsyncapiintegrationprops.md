# AppSyncApiIntegrationProps API Reference

## TypeScript definition

```typescript
type AppSyncApiIntegrationProps = {
  /** Name of the `appsync-api` resource. */
  appsyncApiName: string;
  /** GraphQL field handled by this function, written as `Type.field`.

**Examples:** `Query.user`, `Mutation.createOrder` */
  field: string;
};
```

## Property: `appsyncApiName`

- Required: yes
- Type: `string`

Name of the `appsync-api` resource.

## Property: `field`

- Required: yes
- Type: `string`

GraphQL field handled by this function, written as `Type.field`.

**Examples:** `Query.user`, `Mutation.createOrder`
