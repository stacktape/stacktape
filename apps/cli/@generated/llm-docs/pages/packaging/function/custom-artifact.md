# Custom Artifact

Custom artifact packaging lets you bring a pre-built Lambda deployment package to Stacktape. Point `packagePath` at a zip file, a directory, or a non-zip file — Stacktape automatically zips directories and non-zip files, then deploys the result. This packaging mode applies only to [Lambda function](/resources/compute/lambda-function) resources.

## When to use

Choose custom artifact packaging when:

- Your CI/CD pipeline already produces a deployment zip and you want Stacktape to deploy it without re-bundling.
- You need full control over what goes into the package — native binaries, pre-compiled assets, vendored dependencies.
- You're migrating an existing Lambda project to Stacktape and want to keep your existing build step unchanged.
- You have a custom build process and need full control over what gets packaged.

## When NOT to use

Skip custom artifact packaging if you're writing TypeScript, JavaScript, Python, Java, Go, Ruby, PHP, or .NET and don't have a custom build step — the [Stacktape buildpack](/packaging/function/stacktape-buildpack) is simpler. For JS/TS, the buildpack bundles code into a single file and automatically generates source maps — no build configuration beyond an entry file path.

Use the buildpack if you want Stacktape to manage the build. Use custom artifact if you manage the build yourself.

## Basic example

The minimal custom artifact configuration points `packagePath` at your pre-built artifact:


Example (TypeScript):

```typescript
import { defineConfig, LambdaFunction, CustomArtifactLambdaPackaging } from 'stacktape';
export default defineConfig(() => {
  const api = new LambdaFunction({
    packaging: new CustomArtifactLambdaPackaging({
      packagePath: './dist/lambda.zip'
    })
  });

  return {
    resources: { api }
  };
});
```


## Configuration

`CustomArtifactLambdaPackaging` exposes two properties: the required `packagePath` and an optional `handler`. All other Lambda runtime settings (`memory`, `timeout`, environment variables, etc.) are configured on the [Lambda function](/resources/compute/lambda-function) resource itself, not on the packaging.

### packagePath

The `packagePath` property is the only required field. It specifies the path to your pre-built deployment package.

Stacktape accepts three input shapes:

| Input type | Behavior |
|------------|----------|
| A `.zip` file | Deployed directly |
| A directory | Automatically zipped before deployment |
| A non-zip file | Automatically zipped before deployment |

You don't need to zip your output manually if your build produces a directory. Point `packagePath` at the directory and Stacktape handles the zipping.

### handler

The `handler` property tells Lambda which function to invoke when the Lambda is triggered. The syntax is `filepath:functionName`.

For example, `my-lambda/index.js:default` means "call the `default` export from `my-lambda/index.js` inside the deployment package."

The `handler` property is optional. Set it explicitly when you need to specify which function inside the artifact serves as the entry point.


Example (TypeScript):

```typescript
import { defineConfig, LambdaFunction, CustomArtifactLambdaPackaging } from 'stacktape';
export default defineConfig(() => {
  const processor = new LambdaFunction({
    packaging: new CustomArtifactLambdaPackaging({
      packagePath: './build/output',
      handler: 'handlers/process.js:main'
    }),
    memory: 512,
    timeout: 60
  });

  return {
    resources: { processor }
  };
});
```


In this example, `packagePath` points to a directory. Stacktape zips it automatically, and Lambda invokes the `main` export from `handlers/process.js` inside the resulting package. The `memory` and `timeout` properties are [Lambda function](/resources/compute/lambda-function) settings, not part of the packaging configuration.

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

The build step is entirely decoupled from Stacktape — Stacktape reads the artifact at `packagePath` at deploy time.

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
    memory: 256,
    timeout: 30
  });

  return {
    resources: { fn }
  };
});
```


Stacktape zips the directory before deployment. Make sure the file referenced by `handler` is located at the expected path inside the package — in this case, `app.py` must be at the root of the `./lambda-build` directory. As with the previous example, `memory` and `timeout` are [Lambda function](/resources/compute/lambda-function) settings configured alongside packaging.

## Comparison with Stacktape buildpack

| | Custom Artifact | Stacktape Buildpack |
|---|---|---|
| **Build responsibility** | You build the artifact | Stacktape builds from source |
| **Configuration** | `packagePath` + optional `handler` | `entryfilePath` + language config |
| **Supported languages** | Any Lambda-compatible artifact you build yourself | JS, TS, Python, Java, Go, Ruby, PHP, .NET |
| **JS/TS bundling** | Your responsibility | Automatic single-file bundle |
| **Source maps** | Your responsibility | Automatic (JS/TS) |
| **Best for** | Custom build processes, pre-built CI artifacts | Standard app code with minimal config |


> **Info:** Both packaging modes produce a Lambda deployment package. The difference is who builds the artifact — you or Stacktape.


## FAQ

### When should I use custom artifact instead of the Stacktape buildpack?

Use custom artifact packaging when your project has a custom build process that the buildpack can't replicate, or when your CI pipeline already produces a tested zip and you want Stacktape to deploy it directly. If you're writing standard TypeScript or Python without special build requirements, the [Stacktape buildpack](/packaging/function/stacktape-buildpack) is simpler and handles bundling automatically.

### Do I have to zip my artifact myself?

No. `packagePath` accepts a `.zip` file, a directory, or any single non-zip file (for example, a compiled Go binary). A `.zip` is deployed as-is; a directory or non-zip file is zipped automatically before deployment — convenient when your build tool outputs a folder or a single binary rather than a ready-made zip.

### What value do I set for the handler property?

The `handler` property uses `filepath:functionName` syntax and points at the file *inside the deployment package*, not your source. For a TypeScript Lambda compiled to JavaScript, reference the output `.js`, not the source `.ts` — if your build emits `dist/index.js` with an exported `handler`, set `handler: 'index.js:handler'` and point `packagePath` at `dist`.

### Why does my custom artifact deploy but fail at runtime?

The most common cause is a `handler` path that doesn't match the file structure inside your zip. Unzip the artifact locally and confirm the handler file exists at the path Lambda will see — a mismatch typically surfaces as a module-not-found or handler-not-found error at invocation time. Use [`stacktape logs`](/cli/logs) to view the error.


### Definition: `CustomArtifactLambdaPackagingProps`

The complete property-level reference is included in `llms-api-reference.txt` and indexed under route `/config-reference/deployment-artifacts` with definition name `CustomArtifactLambdaPackagingProps`.

| Property | Required | Type | Default |
| --- | --- | --- | --- |
| `packagePath` | yes | `string` | - |
| `handler` | no | `string` | - |
