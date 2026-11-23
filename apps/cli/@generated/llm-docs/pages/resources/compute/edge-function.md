# Edge function

An edge function is a Lambda@Edge function that CloudFront runs on requests and responses of a
[CDN](/resources/networking/cdn), at locations close to your users. Use it for small decisions before or after the
origin: redirects, URL rewrites, security headers, A/B routing or a quick token check.

It can't use environment variables or reach anything in your VPC, and a viewer-side function gets at most 128 MB and
5 seconds. Lambda@Edge costs $0.60 per million requests plus run time, with no free tier
([Lambda@Edge pricing](https://aws.amazon.com/lambda/pricing/)). For rules a CDN can express without code, such as
caching or path routing, use the [CDN settings](/resources/networking/cdn); for application logic, a
[Lambda function](/resources/compute/lambda-function).

## Basic example

This edge function adds a security header to every response of a bucket's CDN:


Example (TypeScript):

```typescript
import { defineConfig, Bucket, EdgeLambdaFunction, JsBundleLambdaPackaging } from 'stacktape';
export default defineConfig(() => {
  const securityHeaders = new EdgeLambdaFunction({
    packaging: new JsBundleLambdaPackaging({
      entryfilePath: './src/edge/security-headers.ts'
    })
  });

  const website = new Bucket({
    cdn: {
      enabled: true,
      edgeFunctions: {
        onResponse: 'securityHeaders'
      }
    }
  });

  return {
    resources: { securityHeaders, website }
  };
});
```


The handler gets the CloudFront event and returns the changed response:

```ts
export const handler = async (event: any) => {
  const { response } = event.Records[0].cf;
  response.headers['x-frame-options'] = [{ key: 'X-Frame-Options', value: 'DENY' }];
  return response;
};
```

After the deploy, `curl -I` on the CDN URL of any file in the bucket shows `x-frame-options: DENY`. Stacktape deploys
edge functions to `us-east-1`, as CloudFront requires, whatever your stack's region.

## CDN attachment

A CDN's `edgeFunctions` names the function for one of four hooks: `onRequest` and `onResponse` run between the
viewer and CloudFront; `onOriginRequest` and `onOriginResponse` run between CloudFront and your origin, only on cache
misses. Route rewrites can attach their own functions. See [Edge functions on the CDN](/resources/networking/cdn#edge-functions).

## Runtime limits

`memory` defaults to 128 MB and `timeout` to 3 seconds. Viewer hooks (`onRequest`, `onResponse`) allow at most 128 MB
and 5 seconds; origin hooks allow up to 10,240 MB and 30 seconds. Raise them only for an origin hook that needs it.


Example (TypeScript):

```typescript
import { defineConfig, EdgeLambdaFunction, JsBundleLambdaPackaging } from 'stacktape';

export default defineConfig(() => {
  const edgeRewrite = new EdgeLambdaFunction({
    packaging: new JsBundleLambdaPackaging({
      entryfilePath: './src/edge-rewrite.ts',
      handlerFunction: 'handler'
    }),
    memory: 128,
    timeout: 3
  });

  return { resources: { edgeRewrite } };
});
```


`runtime` comes from the file extension. Edge functions run Node.js (`nodejs24.x`, `nodejs22.x`, `nodejs20.x`,
`nodejs18.x`) or Python (`python3.13` to `python3.8`).

## Packaging

Edge functions use Lambda packaging:

| Type | Use it for |
|---|---|
| [`js-bundle`](/packaging/function/js-bundle) | A JavaScript or TypeScript entry file (`handlerFunction` names the export) |
| [`buildpack`](/packaging/function/buildpack) | A Python entry file and its dependencies |
| [`custom-artifact`](/packaging/function/custom-artifact) | A package your own build produces (`packagePath`, `handler` as `file:function`) |


Example (TypeScript):

```typescript
import { defineConfig, EdgeLambdaFunction, JsBundleLambdaPackaging } from 'stacktape';

export default defineConfig(() => {
  const edgeRewrite = new EdgeLambdaFunction({
    packaging: new JsBundleLambdaPackaging({
      entryfilePath: './src/edge-rewrite.ts',
      handlerFunction: 'handler'
    })
  });

  return { resources: { edgeRewrite } };
});
```


Example (TypeScript):

```typescript
import { defineConfig, EdgeLambdaFunction, CustomArtifactLambdaPackaging } from 'stacktape';

export default defineConfig(() => {
  const edgeRewrite = new EdgeLambdaFunction({
    packaging: new CustomArtifactLambdaPackaging({
      packagePath: './dist/edge-rewrite.zip',
      handler: 'index.js:handler'
    })
  });

  return { resources: { edgeRewrite } };
});
```


## Permissions

`connectTo` on an edge function grants IAM permissions only, for example to read a bucket. It injects no
variables, because edge functions can't have any. Add other AWS permissions with `iamRoleStatements`.


Example (TypeScript):

```typescript
import {
  defineConfig,
  Bucket,
  EdgeLambdaFunction,
  JsBundleLambdaPackaging
} from 'stacktape';

export default defineConfig(() => {
  const assets = new Bucket({});

  const edgeRewrite = new EdgeLambdaFunction({
    packaging: new JsBundleLambdaPackaging({
      entryfilePath: './src/edge-rewrite.ts',
      handlerFunction: 'handler'
    }),
    connectTo: ['assets'],
    iamRoleStatements: [
      {
        Action: ['ses:SendEmail'],
        Resource: ['*']
      }
    ]
  });

  return { resources: { assets, edgeRewrite } };
});
```


## Logging

Edge functions write their logs to CloudWatch in the region where CloudFront ran them, which is often not your stack's
region. Look for them in the region closest to the users who made the requests. `logging` sets retention and
forwarding.

## Configuration reference


### Definition: `EdgeLambdaFunctionProps`

The complete property-level reference is included in `llms-api-reference.txt` and indexed under route `/config-reference/edge-lambda-function` with definition name `EdgeLambdaFunctionProps`.

| Property | Required | Type | Default |
| --- | --- | --- | --- |
| `packaging` | yes | `js-bundle \| buildpack \| custom-artifact` | - |
| `connectTo` | no | `Array<string>` | - |
| `iamRoleStatements` | no | `Array<StpIamRoleStatement>` | - |
| `logging` | no | `LambdaFunctionLogging` | - |
| `memory` | no | `number` | `128` |
| `runtime` | no | `string: "nodejs18.x" \| "nodejs20.x" \| "nodejs22.x" \| "nodejs24.x" \| "python3.10" \| "python3.11" \| "python3.12" \| "python3.13" \| "python3.14" \| "python3.8" \| "python3.9"` | - |
| `timeout` | no | `number` | `3` |


## Referenceable parameters


## Referenceable Parameters: `edge-lambda-function`
These values can be referenced with `$ResourceParam("<<resource-name>>", "<<parameter-name>>")`.

| Parameter | Description | Usage |
| --- | --- | --- |


## Next steps

- [CDN](/resources/networking/cdn): attach the function to a distribution's routes.
- [Logs](/observability/logs): read what the function prints.
- [Lambda function](/resources/compute/lambda-function): for work that doesn't need to run at the edge.
