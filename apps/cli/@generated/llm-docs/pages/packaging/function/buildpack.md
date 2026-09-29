# Buildpack for Lambda

The `buildpack` packaging type (`BuildpackLambdaPackaging`) builds a Python, Java, Go, Ruby, .NET or Rust [Lambda function](/resources/compute/lambda-function) from its source. Stacktape picks the language from the entry file's extension and the toolchain version from the function's `runtime`. It installs dependencies and compiles the code in Docker, then zips the result into the deployment package.

For JavaScript and TypeScript functions, use [`js-bundle`](/packaging/function/js-bundle).


> **Info:** The Lambda `buildpack` is a separate builder from the [container `buildpack`](/packaging/containers/buildpack). It produces a Lambda zip on the Lambda build image of the function's runtime, and has its own options.


## When to use

Use `buildpack` for Lambda functions in Python, Java, Go, Ruby, .NET or Rust with a standard dependency file.

Use [`custom-artifact`](/packaging/function/custom-artifact) instead when your CI already produces the deployment package, or when the build needs tools that the buildpack does not run.

PHP is not supported as a Lambda function. Run PHP applications as a container service with the [container `buildpack`](/packaging/containers/buildpack).

## Basic example

`entryfilePath` is the only required property. It is relative to the Stacktape configuration file.


Example (TypeScript):

```typescript
import { defineConfig, LambdaFunction, BuildpackLambdaPackaging } from 'stacktape';
export default defineConfig(() => {
  const processor = new LambdaFunction({
    packaging: new BuildpackLambdaPackaging({
      entryfilePath: './src/process.py'
    }),
    runtime: 'python3.13',
    memory: 512,
    timeout: 60
  });

  return {
    resources: { processor }
  };
});
```


Example (YAML):

```yaml
resources:
  processor:
    type: function
    properties:
      # stp-focus
      packaging:
        type: buildpack
        properties:
          entryfilePath: ./src/process.py
      runtime: python3.13
      # stp-end-focus
      memory: 512
      timeout: 60
```


`memory` and `timeout` are [Lambda function](/resources/compute/lambda-function) settings, not packaging options.

## Supported languages

| Language | Entry file | Dependencies read from | Runtime | Options |
|---|---|---|---|---|
| Python | `.py` | `pyproject.toml`, `uv.lock`, `requirements.txt`, `Pipfile` | `python3.x` | [`python`](#python) |
| Java | `.java` | `build.gradle`, `pom.xml` | `javaXX` | [`java`](#java) |
| Go | `.go` | `go.mod` | `provided.al2023` | None |
| Ruby | `.rb` | `Gemfile` | `rubyX.X` | None |
| .NET | `.cs` | `*.csproj` | `dotnetX` | [`dotnet`](#net) |
| Rust | `.rs` | `Cargo.toml` | `provided.al2023` | None |

Stacktape uses the dependency file nearest to the entry file. The build runs in Docker, so Docker must be running.

## Runtime and language versions

The function's `runtime` property decides the language version. The build uses the Lambda build image of that runtime, so the artifact matches the environment it runs in. When `runtime` is not set, Stacktape selects a default runtime from the entry file's extension. Set `runtime` explicitly to pin a version.


Example (TypeScript):

```typescript
import { defineConfig, LambdaFunction, BuildpackLambdaPackaging } from 'stacktape';

export default defineConfig(() => {
  const reports = new LambdaFunction({
    packaging: new BuildpackLambdaPackaging({
      entryfilePath: './src/main/java/com/example/Handler.java'
    }),
    runtime: 'java21',
    memory: 1024
  });

  return {
    resources: { reports }
  };
});
```


See [Lambda function runtime](/resources/compute/lambda-function#runtime-resources) for the list of runtime identifiers.

## Handler function

`handlerFunction` names the function in the entry file that Lambda invokes. It is ignored for Rust, where the compiled binary is the handler.

## Python

Stacktape resolves and installs Python dependencies with `uv`. It finds the dependency file automatically; set `python.packageManagerFile` when it is somewhere else.

| Option | Purpose |
|---|---|
| `packageManagerFile` | Path to `requirements.txt`, `Pipfile`, `pyproject.toml` or `uv.lock`. When both `pyproject.toml` and `uv.lock` exist, the lock file is used. |
| `uvOptionalDependencies` | Extras from `pyproject.toml` to include. Passed to `uv pip compile` as `--extra`. |
| `uvWithGroups` | Dependency groups to include. Passed as `--group`. |
| `uvWithoutGroups` | Dependency groups to exclude. Passed as `--no-group`. |
| `uvOnlyGroups` | Include only these groups, without the project dependencies and default groups. Passed as `--only-group`. |


Example (TypeScript):

```typescript
import { defineConfig, LambdaFunction, BuildpackLambdaPackaging } from 'stacktape';

export default defineConfig(() => {
  const api = new LambdaFunction({
    packaging: new BuildpackLambdaPackaging({
      entryfilePath: './app/main.py',
      python: {
        packageManagerFile: './pyproject.toml',
        uvWithGroups: ['lambda']
      }
    }),
    runtime: 'python3.12'
  });

  return {
    resources: { api }
  };
});
```


## Java

Stacktape builds Java functions with Gradle. Set `java.useMaven: true` to build with Maven instead. `java.packageManagerFile` points to the `build.gradle` or `pom.xml` build file.


Example (TypeScript):

```typescript
import { defineConfig, LambdaFunction, BuildpackLambdaPackaging } from 'stacktape';

export default defineConfig(() => {
  const processor = new LambdaFunction({
    packaging: new BuildpackLambdaPackaging({
      entryfilePath: './src/main/java/Handler.java',
      java: {
        useMaven: true,
        packageManagerFile: './pom.xml'
      }
    }),
    runtime: 'java21',
    memory: 1024,
    timeout: 60
  });

  return {
    resources: { processor }
  };
});
```


Java functions start more slowly than interpreted languages because of JVM startup. 1024 MB of memory is a reasonable starting point.

## Go and Ruby

Go and Ruby have no language options. Point `entryfilePath` to the Go `main` package file or the Ruby handler file. Go modules and Bundler dependencies are installed from `go.mod` and `Gemfile`.

## .NET

`dotnet.projectFile` points to the function's `.csproj` project file.


Example (TypeScript):

```typescript
import { defineConfig, LambdaFunction, BuildpackLambdaPackaging } from 'stacktape';

export default defineConfig(() => {
  const dotnetApi = new LambdaFunction({
    packaging: new BuildpackLambdaPackaging({
      entryfilePath: './src/Handler.cs',
      dotnet: {
        projectFile: './src/MyFunction.csproj'
      }
    }),
    runtime: 'dotnet8',
    memory: 512,
    timeout: 30
  });

  return {
    resources: { dotnetApi }
  };
});
```


## Rust

Rust functions are built with [cargo-lambda](https://www.cargo-lambda.info). Set `entryfilePath` to `src/main.rs` and `runtime` to `provided.al2023`. The compiled binary becomes the function's `bootstrap` file, and `handlerFunction` is ignored.


Example (TypeScript):

```typescript
import { defineConfig, LambdaFunction, BuildpackLambdaPackaging } from 'stacktape';
export default defineConfig(() => {
  const resizer = new LambdaFunction({
    packaging: new BuildpackLambdaPackaging({
      entryfilePath: './src/main.rs'
    }),
    runtime: 'provided.al2023',
    architecture: 'arm64',
    memory: 256
  });

  return {
    resources: { resizer }
  };
});
```


Example (YAML):

```yaml
resources:
  resizer:
    type: function
    properties:
      # stp-focus
      packaging:
        type: buildpack
        properties:
          entryfilePath: ./src/main.rs
      runtime: provided.al2023
      # stp-end-focus
      architecture: arm64
      memory: 256
```


## Including and excluding files

`includeFiles` adds files that the function reads at runtime, such as templates or model files. `excludeFiles` removes files from the deployment package. Both take glob patterns relative to the Stacktape configuration file.

## Build caching

Stacktape caches deployment packages by a checksum of their inputs. When the source, dependencies and options have not changed, the function is not built again.

## API reference


### Definition: `BuildpackLambdaPackagingProps`

Builds a Python, Java, Go, Ruby, .NET or Rust Lambda function from its source.

The complete property-level reference is included in `llms-api-reference.txt` and indexed under route `/config-reference/deployment-artifacts` with definition name `BuildpackLambdaPackagingProps`.

| Property | Required | Type | Default |
| --- | --- | --- | --- |
| `entryfilePath` | yes | `string` | - |
| `dotnet` | no | `DotnetBuildpackConfig` | - |
| `excludeFiles` | no | `Array<string>` | - |
| `handlerFunction` | no | `string` | - |
| `includeFiles` | no | `Array<string>` | - |
| `java` | no | `JavaBuildpackConfig` | - |
| `python` | no | `PythonBuildpackConfig` | - |


### Python options


### Definition: `PythonBuildpackConfig`

Python options of the Lambda buildpack.

The complete property-level reference is included in `llms-api-reference.txt` and indexed under route `/config-reference/deployment-artifacts` with definition name `PythonBuildpackConfig`.

| Property | Required | Type | Default |
| --- | --- | --- | --- |
| `packageManagerFile` | no | `string` | - |
| `uvOnlyGroups` | no | `Array<string>` | - |
| `uvOptionalDependencies` | no | `Array<string>` | - |
| `uvWithGroups` | no | `Array<string>` | - |
| `uvWithoutGroups` | no | `Array<string>` | - |


### Java options


### Definition: `JavaBuildpackConfig`

Java options of the Lambda buildpack.

The complete property-level reference is included in `llms-api-reference.txt` and indexed under route `/config-reference/deployment-artifacts` with definition name `JavaBuildpackConfig`.

| Property | Required | Type | Default |
| --- | --- | --- | --- |
| `packageManagerFile` | no | `string` | - |
| `useMaven` | no | `boolean` | - |


### .NET options


### Definition: `DotnetBuildpackConfig`

.NET options of the Lambda buildpack.

The complete property-level reference is included in `llms-api-reference.txt` and indexed under route `/config-reference/deployment-artifacts` with definition name `DotnetBuildpackConfig`.

| Property | Required | Type | Default |
| --- | --- | --- | --- |
| `projectFile` | no | `string` | - |


## FAQ

### Where did `pythonVersion` and the other version options go?

The function's `runtime` decides the language version. Set `runtime: 'python3.12'`, `runtime: 'java21'` or `runtime: 'dotnet8'` on the function. See [Upgrading from v3](/getting-started/upgrading-from-v3).

### Can I build a PHP Lambda function?

No. Run PHP as a container with the [container `buildpack`](/packaging/containers/buildpack), which detects Composer and Laravel projects.
