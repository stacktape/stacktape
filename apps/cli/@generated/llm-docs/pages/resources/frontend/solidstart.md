# SolidStart

A `solidstart-web` deploys a SolidStart app with server rendering on AWS. Stacktape builds the app, runs the server code in a
Lambda function, puts static assets in S3 and serves both through a CloudFront CDN. You pay per request and for traffic.
No server runs while nobody visits; the stored assets still cost a little.

For a site with no server rendering, [static hosting](/resources/frontend/static-hosting) is simpler and has no function to pay for. To run SolidStart as a long-running Node server instead, use a
[web service](/resources/compute/web-service).

## Basic example

No adapter to install: Stacktape builds with Nitro's `aws-lambda` preset (it sets `NITRO_PRESET=aws-lambda`
for the build).


Example (TypeScript):

```typescript
import { defineConfig, SolidStartWeb } from 'stacktape';
export default defineConfig({ projectName: 'my-app', region: 'eu-west-1' }, () => {
  const web = new SolidStartWeb({
    appDirectory: '.'
  });

  return {
    resources: { web }
  };
});
```


Example (YAML):

```yaml
projectName: my-app
region: eu-west-1
resources:
  web:
    type: solidstart-web
    properties:
      appDirectory: .
```


`appDirectory` is the folder with `app.config.ts`, relative to the Stacktape config. `.` (the default) fits an app at the
repository root; in a monorepo, point it at the app's folder, such as `./apps/web`.

Set your own `projectName` and `region`. In an existing app, [`stacktape init`](/getting-started/deploy-an-existing-app)
writes this file for you. Run `stacktape deploy --stage dev`. The deploy builds the app and prints its URL, a CloudFront address until you add a
custom domain. Open it and check a server-rendered page and a static asset.

## Build and dev mode

Stacktape runs `vinxi build` in `appDirectory`. Set `buildCommand` when your repository builds through a script, for
example `pnpm --filter web build`.

[`stacktape dev`](/local-development/dev-mode-overview) starts `vinxi dev` locally. Change it with `dev.command`, and
with `dev.workingDirectory` (relative to the project root) when the command must run from another folder. Neither
changes the deployed build.

```typescript
new SolidStartWeb({
  appDirectory: './apps/web',
  buildCommand: 'pnpm --filter web build',
  dev: { command: 'pnpm --filter web dev' }
})
```

## Server function

`serverLambda` tunes the function that renders pages:

- `memory`: 1024 MB by default, 128 to 10,240. More memory also means more CPU; 1,769 MB is one vCPU.
- `timeout`: 30 seconds by default, which is also the maximum.
- `joinDefaultVpc: true`: needed to reach a relational database or Redis. The function then has no direct internet
  access; S3 and DynamoDB stay reachable through VPC endpoints.
- `logging`: retention and forwarding of its CloudWatch logs.

## Connect to resources

`connectTo` gives the server code access to other resources and injects their parameters as environment variables:


Example (TypeScript):

```typescript
import { defineConfig, SolidStartWeb, RelationalDatabase, RdsEnginePostgres, $Secret } from 'stacktape';

export default defineConfig(() => {
  const mainDatabase = new RelationalDatabase({
    engine: new RdsEnginePostgres({ version: '16', primaryInstance: { instanceSize: 'db.t4g.micro' } }),
    credentials: { masterUserPassword: $Secret('main-database-password') }
  });

  const web = new SolidStartWeb({
    appDirectory: '.',
    connectTo: [mainDatabase],
    serverLambda: { joinDefaultVpc: true }
  });

  return {
    resources: { mainDatabase, web }
  };
});
```


The server code reads `STP_MAIN_DATABASE_CONNECTION_STRING`. See
[Connecting resources](/configuration/connecting-resources) for what each resource injects. Set other values with
`environment`, and secrets with [`$Secret()`](/configuration/directives). `environment` applies to the build and to
the server function, so variables the framework inlines into browser code at build time work too. A value from this
stack that isn't deployed yet, such as the URL of a new custom domain, is left out of the build with a warning; the next
deploy includes it. For AWS services that `connectTo` doesn't cover, add `iamRoleStatements`.

To run database migrations on each deploy, set `releaseCommand`, for example `npx prisma migrate deploy`. It runs once
in the VPC before the new code goes live; see [release commands](/deployment-and-lifecycle/release-commands).

## Custom domain

```typescript
new SolidStartWeb({
  appDirectory: '.',
  customDomains: [{ domainName: 'www.example.com' }]
})
```

Set the domain up once before the first deploy that uses it: run `stacktape domain add --region <your region>` for the
root domain, point your registrar at the Route 53 hosted zone it creates, and run it again until the certificates are
issued. The CDN needs a certificate in `us-east-1`, which the command requests too. Without an issued certificate, the
deploy stops with an error. Stacktape then creates the DNS record and renews the certificate.

To keep DNS at another provider, request an ACM certificate in `us-east-1` yourself, set `customCertificateArn` and
`disableDnsRecordCreation: true`, and point a CNAME at the CloudFront domain. [Custom domains](/resources/networking/custom-domains)
covers both paths.

## Firewall

`useFirewall` puts a [web application firewall](/resources/security/web-application-firewall) in front of the CDN. The
firewall resource needs `scope: 'cdn'`.

```typescript
new SolidStartWeb({ appDirectory: '.', useFirewall: 'firewall' })
```

## Caching

The defaults cache static assets on the CDN and send page requests to the function. To cache server-rendered pages
that change rarely, and save function runs, add rules per path:

```typescript
new SolidStartWeb({
  appDirectory: '.',
  cdn: {
    pathCachingOverrides: [{ path: '/blog/*', cachingOptions: { defaultTTL: 300 } }]
  }
})
```

Don't cache pages that depend on cookies or the signed-in user; every visitor would get the cached copy.

- `cdn.defaultCachingOptions` sets caching (`minTTL`, `defaultTTL`, `maxTTL`) for all server responses.
- `fileOptions` sets headers such as `Cache-Control` on static files matching an `includePattern`.
- Stacktape clears the CDN cache after each deploy; `cdn.disableInvalidationAfterDeploy: true` turns that off.

## Configuration reference


### Definition: `SolidStartWebProps`

The complete property-level reference is included in `llms-api-reference.txt` and indexed under route `/config-reference/solidstart-web` with definition name `SolidStartWebProps`.

| Property | Required | Type | Default |
| --- | --- | --- | --- |
| `appDirectory` | no | `string` | `.` |
| `buildCommand` | no | `string` | - |
| `cdn` | no | `SsrWebCdnConfig` | - |
| `connectTo` | no | `Array<string>` | - |
| `customDomains` | no | `Array<DomainConfiguration>` | - |
| `dev` | no | `SsrWebDevConfig` | - |
| `environment` | no | `Array<EnvironmentVar>` | - |
| `fileOptions` | no | `Array<DirectoryUploadFilter>` | - |
| `iamRoleStatements` | no | `Array<StpIamRoleStatement>` | - |
| `releaseCommand` | no | `ReleaseCommand \| option-2` | - |
| `serverLambda` | no | `SsrWebServerLambdaConfig` | - |
| `useFirewall` | no | `string` | - |


## Referenceable parameters


## Referenceable Parameters: `solidstart-web`
These values can be referenced with `$ResourceParam("<<resource-name>>", "<<parameter-name>>")`.

| Parameter | Description | Usage |
| --- | --- | --- |
| `url` | Website URL | `$ResourceParam("<<resource-name>>", "url")` |


## Next steps

- [Custom domains](/resources/networking/custom-domains): put the app on your own domain.
- [Release commands](/deployment-and-lifecycle/release-commands): run migrations before new code goes live.
- [Dev mode](/local-development/dev-mode-overview): run the app locally against your stack.
