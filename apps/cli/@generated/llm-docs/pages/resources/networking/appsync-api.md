# AppSync API

An AppSync API is a GraphQL endpoint run by AWS AppSync. You write the schema and attach a
[Lambda function](/resources/compute/lambda-function) to each field you want to resolve. Stacktape creates the API, the
resolvers, the roles that let AppSync call your functions, and the logs. It costs $4 per million queries and mutations
in us-east-1 and nothing while idle ([AppSync pricing](https://aws.amazon.com/appsync/pricing/)).

Each field has one Lambda resolver; there are no VTL or JavaScript resolvers and no pipelines.

## Basic example

Create `schema.graphql` in the project root:

```graphql
type Query {
  user(id: ID!): User
}

type User {
  id: ID!
  name: String!
}
```

Then configure the API and field handler:

```yaml
resources:
  graphql:
    type: appsync-api
    properties:
      authentication:
        type: aws-iam

  getUser:
    type: function
    properties:
      packaging:
        type: js-bundle
        properties:
          entryfilePath: ./src/get-user.ts
      events:
        - type: appsync-api
          properties:
            appsyncApiName: graphql
            field: Query.user
```

The resolver gets the standard AppSync event: `arguments`, `identity`, `source` and field information. It returns
the value of the field:

```ts
export const handler = async (event: { arguments: { id: string } }) => {
  return { id: event.arguments.id, name: 'Ada' };
};
```

Stacktape reads `schema.graphql` (or `schemaFilePath`) before deploying and stops if a configured `Type.field` isn't in
it. AppSync directives and custom scalars are allowed.

After the deploy, run a query in the AWS console under **AppSync → your API → Queries**, which signs requests with
your IAM identity:

```graphql
query {
  user(id: "1") {
    id
    name
  }
}
```

It returns `{"data":{"user":{"id":"1","name":"Ada"}}}`. From your own code, call the `url` parameter with
SigV4-signed requests.

## Authentication

`authentication` is required and takes one mode:

- **`aws-iam`**: for calls from your AWS workloads. A workload that lists the API in `connectTo` gets permission to
  query this API's fields.
- **`user-auth-pool`**: signed-in users of a Stacktape [user auth pool](/resources/security/user-auth-pool).
- **`api-key`**: for deliberately public or short-lived access. `expiresAt` is a fixed RFC 3339 time 1 to 365 days in
  the future; Stacktape never extends it, so the key stops working on that date until you set a new one. The key is a
  sensitive parameter and isn't printed in the deploy output.

## Operational defaults

By default the API logs errors without request content and keeps logs for 30 days, limits queries to a depth of 10 and
1,000 resolver calls, allows introspection and leaves X-Ray off. Each setting can be changed. Verbose logging can
record headers, variables and personal data, so turn it on only while debugging.

The Infrequent Access log class works only without log forwarding, because AWS can't forward from it.

## Custom domains

`customDomain` serves the API at your own hostname. The certificate must be in `us-east-1`, even when the API runs in
another region; `stacktape domain add` creates one there (see
[Set up the domain](/resources/networking/custom-domains#set-up-the-domain)). Stacktape creates the DNS record unless
you turn that off.

## Configuration reference


### Definition: `AppSyncApiProps`

The complete property-level reference is included in `llms-api-reference.txt` and indexed under route `/config-reference/appsync-apis` with definition name `AppSyncApiProps`.

| Property | Required | Type | Default |
| --- | --- | --- | --- |
| `authentication` | yes | `aws-iam \| user-auth-pool \| api-key` | - |
| `customDomain` | no | `DomainConfiguration` | - |
| `introspectionEnabled` | no | `boolean` | `true` |
| `logging` | no | `AppSyncApiLogging` | - |
| `queryDepthLimit` | no | `number` | `10` |
| `resolverCountLimit` | no | `number` | `1000` |
| `schemaFilePath` | no | `string` | `schema.graphql` |
| `xrayEnabled` | no | `boolean` | `false` |


## Referenceable parameters

`url`, `realtimeUrl`, `apiId` and `arn`, plus the sensitive `apiKey` with API key authentication.
