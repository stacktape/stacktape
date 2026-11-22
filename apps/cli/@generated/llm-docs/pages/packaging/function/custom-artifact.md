# Custom artifact

Use `custom-artifact` when you build the Lambda deployment package yourself, for example with a custom compiler step, a monorepo build tool or a separate CI job. Point `packagePath` at a zip file, a directory or a single file; Stacktape zips directories and single files for you and deploys the result. It works for [Lambda functions](/resources/compute/lambda-function), [edge functions](/resources/compute/edge-function), [deployment scripts](/resources/advanced/deployment-scripts) and [custom resources](/resources/advanced/custom-resources).

If you have no build step of your own, let Stacktape build: [`js-bundle`](/packaging/function/js-bundle) for JavaScript and TypeScript, [`buildpack`](/packaging/function/buildpack) for Python, Java, Go, Ruby, .NET and Rust. With `custom-artifact`, source maps and code shared between functions are up to you.

## Basic example

Specify `packagePath` and `handler` in the packaging, and `runtime` on the Lambda resource:


Example (TypeScript):

```typescript
import { defineConfig, LambdaFunction, CustomArtifactLambdaPackaging } from 'stacktape';
export default defineConfig(() => {
  const api = new LambdaFunction({
    packaging: new CustomArtifactLambdaPackaging({
      packagePath: './dist/lambda.zip',
      handler: 'index.js:default'
    }),
    runtime: 'nodejs22.x'
  });

  return {
    resources: { api }
  };
});
```


## Configuration

`CustomArtifactLambdaPackaging` has two required properties, `packagePath` and `handler`; the function also needs a `runtime`. All other Lambda settings (`memory`, `timeout`, environment variables, etc.) are configured on the [Lambda function](/resources/compute/lambda-function) resource itself, not on the packaging.

### packagePath

`packagePath` is the path to your deployment package. It can be:

| Input type | Behavior |
|------------|----------|
| A `.zip` file | Deployed directly |
| A directory | Automatically zipped before deployment |
| A non-zip file | Automatically zipped before deployment |

You don't need to zip your output manually if your build produces a directory. Point `packagePath` at the directory and Stacktape handles the zipping.

### handler

The `handler` property tells Lambda which function to invoke when the Lambda is triggered. The syntax is `filepath:functionName`.

For example, `index.js:default` invokes the `default` export from `index.js` at the artifact root, and `handlers/process.js:main` invokes `main` from `handlers/process.js`. Stacktape turns the path into Lambda's handler format by dropping the file extension: `handlers/process.main`.

Java and .NET artifacts use Lambda's own handler format, which Stacktape passes through as written: `com.example.Handler::handleRequest` for Java, `Assembly::Namespace.Class::Method` for .NET.

Set `handler` here and `runtime` on the Lambda resource: Stacktape does not infer them from the artifact.


Example (TypeScript):

```typescript
import { defineConfig, LambdaFunction, CustomArtifactLambdaPackaging } from 'stacktape';
export default defineConfig(() => {
  const processor = new LambdaFunction({
    packaging: new CustomArtifactLambdaPackaging({
      packagePath: './build/output',
      handler: 'process.js:main'
    }),
    runtime: 'nodejs22.x',
    memory: 512,
    timeout: 60
  });

  return {
    resources: { processor }
  };
});
```


In this example, `packagePath` points to a directory. Stacktape zips it automatically, and Lambda invokes the `main` export from `process.js` at the root of the resulting package. The `memory` and `timeout` properties are [Lambda function](/resources/compute/lambda-function) settings, not part of the packaging configuration.

## Using with a custom build step

Custom artifact packaging works well with an external build step in your CI pipeline or local workflow. Run your build tool to produce the artifact, then point `packagePath` at the output.

Make sure the build runs before `stacktape deploy` so that `packagePath` contains the artifact you intend to release.

A typical CI workflow:

```bash
npm run build
```

```bash
stacktape deploy --stage production
```

The build step is entirely decoupled from Stacktape: Stacktape reads the artifact at `packagePath` at deploy time.

## Directory packaging example

Custom artifact packaging accepts directories as input. When your build produces a directory, point `packagePath` at the directory root:


Example (TypeScript):

```typescript
import { defineConfig, LambdaFunction, CustomArtifactLambdaPackaging } from 'stacktape';
export default defineConfig(() => {
  const fn = new LambdaFunction({
    packaging: new CustomArtifactLambdaPackaging({
      packagePath: './lambda-build',
      handler: 'app.py:handler'
    }),
    runtime: 'python3.12',
    memory: 256,
    timeout: 30
  });

  return {
    resources: { fn }
  };
});
```


Stacktape zips the directory before deployment. Make sure the file referenced by `handler` is located at the expected path inside the package: in this case, `app.py` must be at the root of the `./lambda-build` directory. As with the previous example, `memory` and `timeout` are [Lambda function](/resources/compute/lambda-function) settings configured alongside packaging.

## FAQ

### What value do I set for the handler property?

The `handler` property uses `filepath:functionName` syntax and points at the file *inside the deployment package*, not your source. For a TypeScript Lambda compiled to JavaScript, reference the output `.js`, not the source `.ts`: if your build emits `dist/index.js` with an exported `handler`, set `handler: 'index.js:handler'` and point `packagePath` at `dist`.

### Why does my custom artifact deploy but fail at runtime?

The most common cause is a `handler` path that doesn't match the file structure inside your zip. Unzip the artifact locally and confirm the handler file exists at the path Lambda will see: a mismatch typically surfaces as a module-not-found or handler-not-found error at invocation time. Use [`stacktape logs`](/cli/logs) to view the error.


### Definition: `CustomArtifactLambdaPackagingProps`

The complete property-level reference is included in `llms-api-reference.txt` and indexed under route `/config-reference/deployment-artifacts` with definition name `CustomArtifactLambdaPackagingProps`.

| Property | Required | Type | Default |
| --- | --- | --- | --- |
| `handler` | yes | `string` | - |
| `packagePath` | yes | `string` | - |
