# Referenceable Parameters

The `$ResourceParam` [directive](/configuration/directives) retrieves deployment-time outputs — URLs, ARNs, hostnames, ports, and connection strings — from supported resource types listed on this page. Use it in environment variables, stack outputs, or any string-valued config property to wire resources together when [`connectTo`](/configuration/connecting-resources) doesn't cover your specific use case.

## Syntax

`$ResourceParam` takes two arguments: the resource name (matching the key in your config's `resources` map) and the parameter name.


Example (TypeScript):

```typescript
import {
  defineConfig,
  LambdaFunction,
  StacktapeLambdaBuildpackPackaging,
  HttpApiGateway
} from 'stacktape';
export default defineConfig(() => {
  const api = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/handler.ts'
    }),
    environment: {
      GATEWAY_URL: "$ResourceParam('gateway', 'url')"
    }
  });

  const gateway = new HttpApiGateway({});

  return {
    resources: { api, gateway }
  };
});
```


The `$ResourceParam` directive resolves at deploy time. The resulting value is a string — suitable for environment variables, script inputs, stack outputs, or anywhere a string value is accepted in your Stacktape configuration.


> **Info:** Some parameters are only available when a resource is configured a certain way. Each resource's parameter table below notes the conditions under which a given parameter is exposed.


The sections below list the available parameters for each resource type. Not all resource types expose referenceable parameters — those that do are grouped by category.

## Compute resources

Stacktape compute resources expose `$ResourceParam` values such as ARNs, URLs, domains, and log group identifiers. Use these to wire compute outputs into other parts of your configuration.

### Lambda function


## Referenceable Parameters: `function`
These values can be referenced with `$ResourceParam("<<resource-name>>", "<<parameter-name>>")`.

| Parameter | Description | Usage |
| --- | --- | --- |
| `arn` | Arn of the function | `$ResourceParam("<<resource-name>>", "arn")` |
| `logGroupArn` | Arn of the log group aggregating logs from the function | `$ResourceParam("<<resource-name>>", "logGroupArn")` |


### Web service


## Referenceable Parameters: `web-service`
These values can be referenced with `$ResourceParam("<<resource-name>>", "<<parameter-name>>")`.

| Parameter | Description | Usage |
| --- | --- | --- |
| `domain` | Web service default domain name | `$ResourceParam("<<resource-name>>", "domain")` |
| `url` | Web service default URL | `$ResourceParam("<<resource-name>>", "url")` |
| `customDomains` | Comma-separated list of custom domain names assigned to the Web Service (only available if you use [custom domain names](#custom-domain-names)) | `$ResourceParam("<<resource-name>>", "customDomains")` |
| `customDomainUrls` | Comma-separated list of custom domain name URLs (only available if you use [custom domain names](#custom-domain-names)) | `$ResourceParam("<<resource-name>>", "customDomainUrls")` |
| `cdnDomain` | Default domain of the [CDN distribution](#cdn) (only available if you DO NOT configure custom domain names for the CDN). | `$ResourceParam("<<resource-name>>", "cdnDomain")` |
| `cdnUrl` | Default url of the [CDN distribution](#cdn) (only available if you DO NOT configure custom domain names for the CDN). | `$ResourceParam("<<resource-name>>", "cdnUrl")` |
| `cdnCustomDomains` | Comma-separated list of custom domain names assigned to the [CDN](#cdn)
(only available if you configure custom domain names for the CDN). | `$ResourceParam("<<resource-name>>", "cdnCustomDomains")` |
| `cdnCustomDomainUrls` | Comma-separated list of custom domain name URLs of the [CDN](#cdn)
(only available if you configure custom domain names for the CDN). | `$ResourceParam("<<resource-name>>", "cdnCustomDomainUrls")` |


### Private service


## Referenceable Parameters: `private-service`
These values can be referenced with `$ResourceParam("<<resource-name>>", "<<parameter-name>>")`.

| Parameter | Description | Usage |
| --- | --- | --- |
| `address` | service `host:port` pair accessible only to other resources of stack([web-services](/compute-resources/web-services/), [multi-container-workloads](/compute-resources/multi-container-workloads/)) | `$ResourceParam("<<resource-name>>", "address")` |


### Batch job


## Referenceable Parameters: `batch-job`
These values can be referenced with `$ResourceParam("<<resource-name>>", "<<parameter-name>>")`.

| Parameter | Description | Usage |
| --- | --- | --- |
| `jobDefinitionArn` | Arn of the job definition resource | `$ResourceParam("<<resource-name>>", "jobDefinitionArn")` |
| `stateMachineArn` | Arn of the state machine controlling the execution flow of the batch job | `$ResourceParam("<<resource-name>>", "stateMachineArn")` |
| `logGroupArn` | Arn of the log group aggregating logs from the batch job | `$ResourceParam("<<resource-name>>", "logGroupArn")` |


### Worker service

Worker services do not currently expose referenceable parameters. Use [`connectTo`](/configuration/connecting-resources) for workload-to-resource wiring.

### Multi-container workload

Multi-container workloads do not currently expose referenceable parameters. Use [`connectTo`](/configuration/connecting-resources) for workload-to-resource wiring.

## Frontend resources

The following frontend resources expose referenceable parameters. Static [hosting buckets](/resources/frontend/static-hosting) additionally expose bucket identifiers and — when a CDN is attached — CDN-related parameters. See each resource's parameter table for the exact set of available values.

### Next.js


## Referenceable Parameters: `nextjs-web`
These values can be referenced with `$ResourceParam("<<resource-name>>", "<<parameter-name>>")`.

| Parameter | Description | Usage |
| --- | --- | --- |
| `url` | Website URL | `$ResourceParam("<<resource-name>>", "url")` |


### Astro


## Referenceable Parameters: `astro-web`
These values can be referenced with `$ResourceParam("<<resource-name>>", "<<parameter-name>>")`.

| Parameter | Description | Usage |
| --- | --- | --- |
| `url` | Website URL | `$ResourceParam("<<resource-name>>", "url")` |


### Nuxt


## Referenceable Parameters: `nuxt-web`
These values can be referenced with `$ResourceParam("<<resource-name>>", "<<parameter-name>>")`.

| Parameter | Description | Usage |
| --- | --- | --- |
| `url` | Website URL | `$ResourceParam("<<resource-name>>", "url")` |


### SvelteKit


## Referenceable Parameters: `sveltekit-web`
These values can be referenced with `$ResourceParam("<<resource-name>>", "<<parameter-name>>")`.

| Parameter | Description | Usage |
| --- | --- | --- |
| `url` | Website URL | `$ResourceParam("<<resource-name>>", "url")` |


### SolidStart


## Referenceable Parameters: `solidstart-web`
These values can be referenced with `$ResourceParam("<<resource-name>>", "<<parameter-name>>")`.

| Parameter | Description | Usage |
| --- | --- | --- |
| `url` | Website URL | `$ResourceParam("<<resource-name>>", "url")` |


### TanStack Start


## Referenceable Parameters: `tanstack-web`
These values can be referenced with `$ResourceParam("<<resource-name>>", "<<parameter-name>>")`.

| Parameter | Description | Usage |
| --- | --- | --- |
| `url` | Website URL | `$ResourceParam("<<resource-name>>", "url")` |


### Remix


## Referenceable Parameters: `remix-web`
These values can be referenced with `$ResourceParam("<<resource-name>>", "<<parameter-name>>")`.

| Parameter | Description | Usage |
| --- | --- | --- |
| `url` | Website URL | `$ResourceParam("<<resource-name>>", "url")` |


### Hosting bucket (static sites)


## Referenceable Parameters: `hosting-bucket`
These values can be referenced with `$ResourceParam("<<resource-name>>", "<<parameter-name>>")`.

| Parameter | Description | Usage |
| --- | --- | --- |
| `name` | AWS (physical) name of the bucket | `$ResourceParam("<<resource-name>>", "name")` |
| `arn` | Arn of the bucket | `$ResourceParam("<<resource-name>>", "arn")` |
| `cdnDomain` | Default domain of the [CDN distribution](#cdn) (only available if you DO NOT configure custom domain names for the CDN). | `$ResourceParam("<<resource-name>>", "cdnDomain")` |
| `cdnUrl` | Default url of the [CDN distribution](#cdn) (only available if you DO NOT configure custom domain names for the CDN). | `$ResourceParam("<<resource-name>>", "cdnUrl")` |
| `cdnCustomDomains` | Comma-separated list of custom domain names assigned to the [CDN](#cdn)
(only available if you configure custom domain names for the CDN). | `$ResourceParam("<<resource-name>>", "cdnCustomDomains")` |
| `cdnCustomDomainUrls` | Comma-separated list of custom domain name URLs of the [CDN](#cdn)
(only available if you configure custom domain names for the CDN). | `$ResourceParam("<<resource-name>>", "cdnCustomDomainUrls")` |


## Databases

Stacktape database resources expose connection strings, hostnames, ports, and identifiers via `$ResourceParam`. These are especially useful when `connectTo` doesn't cover your wiring need — for example, passing a reader connection string to a specific environment variable.

### Relational database

[Relational databases](/resources/databases/relational-database) expose the richest set of parameters. Standard RDS engines provide host, port, and connection strings. Aurora engines additionally expose reader endpoints for read scaling. Read replica parameters are available when replicas are explicitly configured.


## Referenceable Parameters: `relational-database`
These values can be referenced with `$ResourceParam("<<resource-name>>", "<<parameter-name>>")`.

| Parameter | Description | Usage |
| --- | --- | --- |
| `connectionString` | Fully-formed connection string that can be used to access the primary instance.
For aurora databases, this is connectionString to cluster endpoint, which can be used for both reads and writes.
Includes **host**, **port**, **username**, **password** and **dbName**. | `$ResourceParam("<<resource-name>>", "connectionString")` |
| `jdbcConnectionString` | Fully-formed connection string in JDBC form that can be used to access the primary instance.
Includes **host**, **port**, **username**, **password** and **dbName**. | `$ResourceParam("<<resource-name>>", "jdbcConnectionString")` |
| `host` | Hostname (address) of the primary instance that can be used for both reads and writes.
For aurora databases, this is hostname of a cluster endpoint, which can be used for both reads and writes. | `$ResourceParam("<<resource-name>>", "host")` |
| `port` | Port of the database. | `$ResourceParam("<<resource-name>>", "port")` |
| `dbName` | Name of the automatically created database (can be configured using the `dbName` property). | `$ResourceParam("<<resource-name>>", "dbName")` |
| `readerHost` | Hostname (address) used for reads only. (only available for `aurora-postgresql` and `aurora-mysql` engines).
If you have multiple instances, it is advised to use readerHost for reads to offload the primary (read/write) host.
ReaderHost automatically balances requests between available instances. Connections are auto-balanced among available reader hosts. | `$ResourceParam("<<resource-name>>", "readerHost")` |
| `readerConnectionString` | Same as **connectionString** but targets readerHosts (only available for `aurora-postgresql` and `aurora-mysql` engines). Connections are auto-balanced among available reader hosts. | `$ResourceParam("<<resource-name>>", "readerConnectionString")` |
| `readerJdbcConnectionString` | Same as **readerConnectionString** but in JDBC format (only available for `aurora-postgresql` and `aurora-mysql` engines). | `$ResourceParam("<<resource-name>>", "readerJdbcConnectionString")` |
| `readReplicaHosts` | Comma-separated list of read replica hostnames (only available if read replicas are configured).
Read replicas can only be used for read operations. | `$ResourceParam("<<resource-name>>", "readReplicaHosts")` |
| `readReplicaConnectionStrings` | Comma-separated list of connection strings (URLs) used to connect to read replicas
(only available when read replicas are configured). Read replicas can only be used for read operations. | `$ResourceParam("<<resource-name>>", "readReplicaConnectionStrings")` |
| `readReplicaJdbcConnectionStrings` | Same as **readReplicaConnectionStrings** but in JDBC format (only available when read replicas are configured). | `$ResourceParam("<<resource-name>>", "readReplicaJdbcConnectionStrings")` |


### DynamoDB table


## Referenceable Parameters: `dynamo-db-table`
These values can be referenced with `$ResourceParam("<<resource-name>>", "<<parameter-name>>")`.

| Parameter | Description | Usage |
| --- | --- | --- |
| `name` | AWS (physical) name of the table | `$ResourceParam("<<resource-name>>", "name")` |
| `arn` | Arn of the table | `$ResourceParam("<<resource-name>>", "arn")` |
| `streamArn` | Arn of [DynamoDb stream](/resources/dynamo-db-tables/#item-change-streaming) (available only if `streamType` is configured) | `$ResourceParam("<<resource-name>>", "streamArn")` |


### Redis cluster


## Referenceable Parameters: `redis-cluster`
These values can be referenced with `$ResourceParam("<<resource-name>>", "<<parameter-name>>")`.

| Parameter | Description | Usage |
| --- | --- | --- |
| `host` | In case of NON-sharded cluster(default), this is a hostname of the primary instance that can be used for both reads and writes.
In case of sharded cluster, this is cluster's configuration endpoint that can be used for all operations. | `$ResourceParam("<<resource-name>>", "host")` |
| `readerHost` | Hostname (address) that can be used for reads only. (only available for NON-sharded clusters).
If you use multiple replicas, it is advised to use readerHost for read operations to offload the primary host.
ReaderHost automatically balances requests between available read replicas. | `$ResourceParam("<<resource-name>>", "readerHost")` |
| `port` | Port of the cluster. | `$ResourceParam("<<resource-name>>", "port")` |
| `sharding` | Indicates whether cluster is sharded. Available values: `enabled` or `disabled`. | `$ResourceParam("<<resource-name>>", "sharding")` |


### MongoDB Atlas cluster


## Referenceable Parameters: `mongo-db-atlas-cluster`
These values can be referenced with `$ResourceParam("<<resource-name>>", "<<parameter-name>>")`.

| Parameter | Description | Usage |
| --- | --- | --- |
| `connectionString` | Connection string (URL) that allows connecting to the cluster. | `$ResourceParam("<<resource-name>>", "connectionString")` |


### Upstash Redis


## Referenceable Parameters: `upstash-redis`
These values can be referenced with `$ResourceParam("<<resource-name>>", "<<parameter-name>>")`.

| Parameter | Description | Usage |
| --- | --- | --- |
| `host` | Hostname (address) of the Upstash Redis database. | `$ResourceParam("<<resource-name>>", "host")` |
| `port` | Port of the Upstash Redis database. | `$ResourceParam("<<resource-name>>", "port")` |
| `password` | Autogenerated password that can be used to authenticate towards the database. | `$ResourceParam("<<resource-name>>", "password")` |
| `restToken` | Rest token which can be used when reading/writing from/to the database using the REST API | `$ResourceParam("<<resource-name>>", "restToken")` |
| `readOnlyRestToken` | Rest token which can be used only for reading from the database using the REST API | `$ResourceParam("<<resource-name>>", "readOnlyRestToken")` |
| `restUrl` | Rest URL which can be used when communicating with the database using the REST API | `$ResourceParam("<<resource-name>>", "restUrl")` |
| `redisUrl` | Standard redis url (including password) which can be used for connecting using cli. | `$ResourceParam("<<resource-name>>", "redisUrl")` |


### OpenSearch domain


## Referenceable Parameters: `open-search-domain`
These values can be referenced with `$ResourceParam("<<resource-name>>", "<<parameter-name>>")`.

| Parameter | Description | Usage |
| --- | --- | --- |
| `domainEndpoint` | Endpoint used for communicating with your opensearch-domain | `$ResourceParam("<<resource-name>>", "domainEndpoint")` |
| `arn` | Arn of the domain | `$ResourceParam("<<resource-name>>", "arn")` |


## Storage

Stacktape storage resources expose bucket names, ARNs, and — when a CDN is attached — CDN-related domain and URL parameters via `$ResourceParam`.

### Bucket


## Referenceable Parameters: `bucket`
These values can be referenced with `$ResourceParam("<<resource-name>>", "<<parameter-name>>")`.

| Parameter | Description | Usage |
| --- | --- | --- |
| `name` | AWS (physical) name of the bucket | `$ResourceParam("<<resource-name>>", "name")` |
| `arn` | Arn of the bucket | `$ResourceParam("<<resource-name>>", "arn")` |
| `cdnDomain` | Default domain of the [CDN distribution](#cdn) (only available if you DO NOT configure custom domain names for the CDN). | `$ResourceParam("<<resource-name>>", "cdnDomain")` |
| `cdnUrl` | Default url of the [CDN distribution](#cdn) (only available if you DO NOT configure custom domain names for the CDN). | `$ResourceParam("<<resource-name>>", "cdnUrl")` |
| `cdnCustomDomains` | Comma-separated list of custom domain names assigned to the [CDN](#cdn)
(only available if you configure custom domain names for the CDN). | `$ResourceParam("<<resource-name>>", "cdnCustomDomains")` |
| `cdnCustomDomainUrls` | Comma-separated list of custom domain name URLs of the [CDN](#cdn)
(only available if you configure custom domain names for the CDN). | `$ResourceParam("<<resource-name>>", "cdnCustomDomainUrls")` |


## Networking

[HTTP API Gateways](/resources/networking/http-api-gateway) and [Application Load Balancers](/resources/networking/application-load-balancer) expose default domains, custom domain lists, and CDN-related parameters via `$ResourceParam`. [Network Load Balancers](/resources/networking/network-load-balancer) expose domain and custom domain parameters but do not support CDN attachment.

### HTTP API Gateway


## Referenceable Parameters: `http-api-gateway`
These values can be referenced with `$ResourceParam("<<resource-name>>", "<<parameter-name>>")`.

| Parameter | Description | Usage |
| --- | --- | --- |
| `domain` | Default domain name | `$ResourceParam("<<resource-name>>", "domain")` |
| `url` | Default URL | `$ResourceParam("<<resource-name>>", "url")` |
| `customDomains` | Comma-separated list of custom domain names assigned to the HTTP Api Gateway (only available if you use [custom domain names](#custom-domain-names)) | `$ResourceParam("<<resource-name>>", "customDomains")` |
| `customDomainUrls` | Comma-separated list of custom domain name URLs (only available if you use [custom domain names](#custom-domain-names)) | `$ResourceParam("<<resource-name>>", "customDomainUrls")` |
| `customDomainUrl` | URL of the first custom domain name connected to this resource (only available if you use [custom domain names](#custom-domain-names)) | `$ResourceParam("<<resource-name>>", "customDomainUrl")` |
| `cdnDomain` | Default domain of the [CDN distribution](#cdn) (only available if you DO NOT configure custom domain names for the CDN). | `$ResourceParam("<<resource-name>>", "cdnDomain")` |
| `cdnUrl` | Default url of the [CDN distribution](#cdn) (only available if you DO NOT configure custom domain names for the CDN). | `$ResourceParam("<<resource-name>>", "cdnUrl")` |
| `cdnCustomDomains` | Comma-separated list of custom domain names assigned to the [CDN](#cdn)
(only available if you configure custom domain names for the CDN). | `$ResourceParam("<<resource-name>>", "cdnCustomDomains")` |
| `cdnCustomDomainUrls` | Comma-separated list of custom domain name URLs of the [CDN](#cdn)
(only available if you configure custom domain names for the CDN). | `$ResourceParam("<<resource-name>>", "cdnCustomDomainUrls")` |


### Application Load Balancer


## Referenceable Parameters: `application-load-balancer`
These values can be referenced with `$ResourceParam("<<resource-name>>", "<<parameter-name>>")`.

| Parameter | Description | Usage |
| --- | --- | --- |
| `domain` | default domain name of load balancer | `$ResourceParam("<<resource-name>>", "domain")` |
| `customDomains` | Comma-separated list of custom domain names assigned to the Load balancer (only available if you use [custom domain names](#custom-domain-names)) | `$ResourceParam("<<resource-name>>", "customDomains")` |
| `cdnDomain` | Default domain of the [CDN distribution](#cdn) (only available if you DO NOT configure custom domain names for the CDN). | `$ResourceParam("<<resource-name>>", "cdnDomain")` |
| `cdnUrl` | Default url of the [CDN distribution](#cdn) (only available if you DO NOT configure custom domain names for the CDN). | `$ResourceParam("<<resource-name>>", "cdnUrl")` |
| `cdnCustomDomains` | Comma-separated list of custom domain names assigned to the [CDN](#cdn)
(only available if you configure custom domain names for the CDN). | `$ResourceParam("<<resource-name>>", "cdnCustomDomains")` |
| `cdnCustomDomainUrls` | Comma-separated list of custom domain name URLs of the [CDN](#cdn)
(only available if you configure custom domain names for the CDN). | `$ResourceParam("<<resource-name>>", "cdnCustomDomainUrls")` |


### Network Load Balancer


## Referenceable Parameters: `network-load-balancer`
These values can be referenced with `$ResourceParam("<<resource-name>>", "<<parameter-name>>")`.

| Parameter | Description | Usage |
| --- | --- | --- |
| `domain` | default domain name of load balancer | `$ResourceParam("<<resource-name>>", "domain")` |
| `customDomains` | Comma-separated list of custom domain names assigned to the Load balancer (only available if you use [custom domain names](#custom-domain-names)) | `$ResourceParam("<<resource-name>>", "customDomains")` |


## Messaging and orchestration

Stacktape messaging and orchestration resources expose ARNs and names via `$ResourceParam`, letting you pass event bus, state machine, and stream identifiers into workloads or stack outputs.

### Event bus


## Referenceable Parameters: `event-bus`
These values can be referenced with `$ResourceParam("<<resource-name>>", "<<parameter-name>>")`.

| Parameter | Description | Usage |
| --- | --- | --- |
| `arn` | Arn of the event bus | `$ResourceParam("<<resource-name>>", "arn")` |
| `archiveArn` | Arn of the event bus archive (available only if the archivation is enabled) | `$ResourceParam("<<resource-name>>", "archiveArn")` |


### State machine


## Referenceable Parameters: `state-machine`
These values can be referenced with `$ResourceParam("<<resource-name>>", "<<parameter-name>>")`.

| Parameter | Description | Usage |
| --- | --- | --- |
| `arn` | Arn of the state machine. | `$ResourceParam("<<resource-name>>", "arn")` |
| `name` | AWS (physical) name of the state machine. | `$ResourceParam("<<resource-name>>", "name")` |


### Kinesis stream


## Referenceable Parameters: `kinesis-stream`
These values can be referenced with `$ResourceParam("<<resource-name>>", "<<parameter-name>>")`.

| Parameter | Description | Usage |
| --- | --- | --- |
| `arn` | Arn of the Kinesis stream. | `$ResourceParam("<<resource-name>>", "arn")` |
| `name` | AWS (physical) name of the Kinesis stream. | `$ResourceParam("<<resource-name>>", "name")` |


## Security

Stacktape security resources expose identifiers and ARNs via `$ResourceParam` — user pool IDs, client IDs, and firewall ARNs.

### User auth pool


## Referenceable Parameters: `user-auth-pool`
These values can be referenced with `$ResourceParam("<<resource-name>>", "<<parameter-name>>")`.

| Parameter | Description | Usage |
| --- | --- | --- |
| `id` | Id of the userpool | `$ResourceParam("<<resource-name>>", "id")` |
| `clientId` | Id of the userpool | `$ResourceParam("<<resource-name>>", "clientId")` |
| `domain` | Domain of the userpool | `$ResourceParam("<<resource-name>>", "domain")` |


### Web application firewall


## Referenceable Parameters: `web-app-firewall`
These values can be referenced with `$ResourceParam("<<resource-name>>", "<<parameter-name>>")`.

| Parameter | Description | Usage |
| --- | --- | --- |
| `arn` | Arn of the `web-app-firewall`. | `$ResourceParam("<<resource-name>>", "arn")` |
| `scope` | Scope of the `web-app-firewall` (`regional` or `cdn`). | `$ResourceParam("<<resource-name>>", "scope")` |


## Platform resources

### Convex

[Convex](/resources/compute/convex) exposes backend URLs, dashboard URL, and sensitive credentials via `$ResourceParam`. The `adminKey` and `instanceSecret` parameters are sensitive and are never auto-injected by `connectTo` — reference them explicitly with `$ResourceParam` when needed.


## Referenceable Parameters: `convex`
These values can be referenced with `$ResourceParam("<<resource-name>>", "<<parameter-name>>")`.

| Parameter | Description | Usage |
| --- | --- | --- |
| `url` | Cloud origin (CONVEX_CLOUD_ORIGIN) used by frontend clients. | `$ResourceParam("<<resource-name>>", "url")` |
| `siteUrl` | HTTP-actions origin (CONVEX_SITE_ORIGIN) where httpAction() routes live. | `$ResourceParam("<<resource-name>>", "siteUrl")` |
| `dashboardUrl` | Admin dashboard URL. Only available when the dashboard is enabled. | `$ResourceParam("<<resource-name>>", "dashboardUrl")` |
| `adminKey` | Sensitive root credentials for the deployment, resolved from AWS Secrets Manager. Reference explicitly with $ResourceParam; never auto-injected by connectTo. | `$ResourceParam("<<resource-name>>", "adminKey")` |
| `instanceSecret` | Sensitive boot secret stored in AWS Secrets Manager. Almost never needed by user code. | `$ResourceParam("<<resource-name>>", "instanceSecret")` |


### AgentCore

Stacktape [AgentCore](/resources/ai/agentcore-runtime) resources expose referenceable parameters for wiring AI agent infrastructure. The following AgentCore resource types expose `id` and `arn` parameters via `$ResourceParam`:

- **AgentCore Runtime** — `id`, `arn`, `endpointName`, `endpointArn`. See [AgentCore Runtime](/resources/ai/agentcore-runtime).
- **AgentCore Memory** — `id`, `arn`. See [AgentCore Memory](/resources/ai/agentcore-memory).
- **AgentCore Gateway** — `id`, `arn`, `url`. See [AgentCore Gateway](/resources/ai/agentcore-gateway).
- **AgentCore Browser** — `id`, `arn`. See [AgentCore Browser](/resources/ai/agentcore-browser).
- **AgentCore Code Interpreter** — `id`, `arn`. See [AgentCore Code Interpreter](/resources/ai/agentcore-code-interpreter).

## Using parameters in practice

The `$ResourceParam` directive is most commonly used in environment variables and stack outputs. The examples below show the primary patterns for wiring resource outputs into your configuration.

### Environment variables

The most common use of `$ResourceParam` is injecting resource details into workloads via environment variables. Use it when you want to choose your own environment variable name, reference a specific documented parameter directly, or pass a value into a context that `connectTo` does not support.

In this example, the Lambda function uses `connectTo` for IAM permissions to access the bucket, and `$ResourceParam` to read the bucket's ARN into a custom environment variable.


Example (TypeScript):

```typescript
import { defineConfig, LambdaFunction, StacktapeLambdaBuildpackPackaging, Bucket } from 'stacktape';
export default defineConfig(() => {
  const uploads = new Bucket({});

  const processor = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/process.ts'
    }),
    environment: {
      UPLOAD_BUCKET_ARN: "$ResourceParam('uploads', 'arn')"
    },
    connectTo: [uploads]
  });

  return {
    resources: { uploads, processor }
  };
});
```


### Stack outputs

Use `$ResourceParam` in [stack outputs](/configuration/configuration-files) to surface deployment values in the terminal and stack info file. Outputs are useful for sharing endpoints with other teams, CI pipelines, or other stacks.


Example (TypeScript):

```typescript
import { defineConfig, HttpApiGateway } from 'stacktape';
export default defineConfig(() => {
  const gateway = new HttpApiGateway({});

  return {
    resources: { gateway },
    stackConfig: {
      outputs: [
        {
          name: 'apiUrl',
          value: "$ResourceParam('gateway', 'url')"
        }
      ]
    }
  };
});
```


Stack outputs can be exported for cross-stack use by setting `export: true`. Exported outputs can be referenced from other stacks using the `$CfStackOutput()` directive.

### Difference from connectTo

[`connectTo`](/configuration/connecting-resources) is a higher-level abstraction for wiring resources together. For supported resource types (databases, buckets, queues, Lambda functions, and others documented on the [connecting resources](/configuration/connecting-resources) page), `connectTo` grants IAM permissions, opens security group rules for network-accessible resources like databases and Redis, and injects a predefined set of environment variables automatically.

`$ResourceParam` gives you access to individual parameters without side effects — no permissions are granted and no security groups are modified. Use `$ResourceParam` when you want to:

- Choose your own environment variable name for a resource parameter
- Use a resource parameter outside an environment variable (e.g. in stack outputs or other resource properties)
- Reference one of the documented parameters directly from a resource type

Use `connectTo` when you want Stacktape's documented IAM, networking, and environment-variable wiring. For most workload-to-resource wiring, start with `connectTo` and add `$ResourceParam` for any additional parameters you need.

## FAQ

### How is $ResourceParam different from connectTo?

[`connectTo`](/configuration/connecting-resources) is a higher-level abstraction that, for supported resource types, grants IAM permissions, opens security group rules, and injects a predefined set of environment variables. `$ResourceParam` gives you access to individual parameters without any side effects — no permissions are granted and no security groups are modified. Use `connectTo` for standard access patterns; use `$ResourceParam` for specific values, non-standard wiring, or resource types not covered by `connectTo`.

### Can I reference resources from other stacks?

`$ResourceParam` references resources defined in the same Stacktape configuration. To share values across stacks, use [stack outputs](/configuration/configuration-files) with `export: true`. The source stack's exported values can then be referenced from other stacks using the `$CfStackOutput()` directive, as documented on the `StackOutput` type's `export` property.

### What happens if I reference a parameter that doesn't exist?

If you reference a resource name not defined in your config, or a parameter name not supported by that resource type, the configuration is invalid. Check the parameter tables on this page to confirm the parameter name is supported for the resource type you are referencing.

### Are CDN parameters always available?

CDN-related parameters (`cdnDomain`, `cdnUrl`, `cdnCustomDomains`, `cdnCustomDomainUrls`) are only available on resources that have a `cdn` configuration block attached. Several resource types expose CDN parameters when configured — including [buckets](/resources/storage/s3-bucket), [hosting buckets](/resources/frontend/static-hosting), [web services](/resources/compute/web-service), [Application Load Balancers](/resources/networking/application-load-balancer), and [HTTP API Gateways](/resources/networking/http-api-gateway). Check the per-resource parameter table above for the exact CDN parameter names exposed by each type.

### How do relational database parameters differ between engine types?

Standard RDS engines (Postgres, MySQL, MariaDB) expose core parameters: host, port, connection string, JDBC connection string, and database name. Aurora engines (Aurora PostgreSQL, Aurora MySQL) additionally expose reader endpoints — reader host and reader connection strings — for distributing read traffic. Read replica parameters are a separate set, available only when read replicas are explicitly configured. See the [relational database](/resources/databases/relational-database) resource page and the parameter table above for the full list.

### Can I use $ResourceParam in hooks and scripts?

Yes. [Scripts](/configuration/hooks-and-scripts) and lifecycle hooks can use `$ResourceParam` to reference resource outputs — the `environment` and `parameters` properties of a script accept directives like `$ResourceParam()`, which resolve at deploy time. A common pattern is passing a database connection string into an `afterDeploy` migration script.
