# Upgrading from v3

Stacktape v4 makes deliberate breaking changes. v4 does not accept the old names, so update your configuration before deploying with v4. This page covers packaging, removed resource parameters and what the first v4 deployment changes in an existing stack.

## Deployed stacks

Deploying a v4 configuration over a stack created by v3 is an ordinary stack update. Databases, buckets, DynamoDB tables, Redis clusters, EFS file systems, user pools, Kinesis streams and SQS queues keep their CloudFormation logical IDs and physical names, so they are neither replaced nor deleted. Default domains keep their names as well. Stacktape checks this before every deployment: the change plan printed by `stacktape deploy` lists every resource it would replace or delete, and it stops for confirmation when one of them holds data.

The first v4 deployment adds a log subscription filter to every function and container log group for issue detection. On stacks without databases, load balancers or private service discovery, it also deletes Stacktape's internal tagging schedule (an EventBridge rule and its Lambda permission), which had nothing to tag. Alarms configured for the whole organization in the Console are applied by v4 the same way v3 applied them.

Container services without gradual deployments shut down more gracefully in v4. The default container `stopTimeout` is 30 seconds instead of 2, and a load balancer gives an old container 30 seconds instead of 5 to finish its requests. The first v4 deployment therefore registers a new task definition and replaces the running containers, as a code change would. Set `stopTimeout: 2` on a container to keep the v3 shutdown window.

Code-only deployments of web services behind the default HTTP API finish once the new tasks are `RUNNING` and API Gateway can discover them, plus a 4-second routing allowance. Old tasks drain in the background. No health check is added by default, so this does not confirm that the new application works. Add an `internalHealthCheck` for application failure detection and automatic rollback. HTTP API tasks also gain a managed drain container, which waits 35 seconds before ECS signals the application so cached routes can expire. This uses one of ECS's 10 container slots and has a 16 MiB memory limit. The protection applies once those task definitions are running; the first rollout still retires the previous unprotected tasks. Keep an application shutdown delay or use a maintenance window for that transition. Services with an `internalHealthCheck`, and ALB/NLB services, keep their existing health-based completion checks. Full CloudFormation deployments still wait for the ECS rollout. See [web-service health checks](/resources/compute/web-service#health-checks).

## Target AWS account

v3 stack commands ignored `--profile` and `AWS_PROFILE` for accounts connected with Stacktape-managed access. They deployed to `--awsAccount`, the saved default, or the organization's only connected account. In v4, when `--awsAccount` is not set, `--profile`, `AWS_PROFILE` or AWS keys in the environment choose the connected account they belong to. If they belong to an account that is not connected, the command stops before changing anything.

Check scripts and CI jobs that set an AWS profile or AWS keys for a different account than the one they deploy to. Pass `--awsAccount <name>` in them, or remove the AWS settings. See [Choosing the account for a CLI command](/stacktape-console/connecting-your-aws-account#choosing-the-account-for-a-cli-command).

## Removed resource parameters

The `MultiContainerWorkload` class no longer has a `logGroupArn` property, and `$ResourceParam('<workload>', 'logGroupArn')` is rejected. Stacktape never published this parameter, so a v3 configuration using it could not deploy.

A multi-container workload has one log group per container. To reference one, use [`$CfResourceParam`](/configuration/directives) with the log group's CloudFormation logical ID: the workload name and the container name in PascalCase, followed by `LogGroup`. For the `app` container of a workload named `orders`, use `$CfResourceParam('OrdersAppLogGroup', 'Arn')`. A container with `logging.disabled` has no log group. Run [`stacktape synth`](/cli/synth) to check the logical IDs in the generated template.

## Packaging

v4 replaces the v3 packaging types with a smaller set:

| v3 type | v4 type | v4 class |
|---|---|---|
| `stacktape-lambda-buildpack`, JavaScript or TypeScript entry file | `js-bundle` | `JsBundleLambdaPackaging` |
| `stacktape-lambda-buildpack`, Python, Java, Go, Ruby or .NET entry file | `buildpack` | `BuildpackLambdaPackaging` |
| `stacktape-image-buildpack`, JavaScript or TypeScript entry file | `js-bundle` | `JsBundleImagePackaging` |
| `stacktape-image-buildpack`, other languages | `buildpack` | `BuildpackImagePackaging` |
| `nixpacks` | `buildpack` | `BuildpackImagePackaging` |
| `external-buildpack` | `buildpack` or `dockerfile` | `BuildpackImagePackaging` or `DockerfilePackaging` |
| `custom-dockerfile` | `dockerfile` | `DockerfilePackaging` |
| `custom-artifact` | `custom-artifact` (unchanged) | `CustomArtifactLambdaPackaging` |
| `prebuilt-image` | `prebuilt-image` (unchanged) | `PrebuiltImagePackaging` |

In TypeScript configurations, rename the classes in both the `new ...Packaging(...)` calls and the `import` list.

### JavaScript and TypeScript Lambda functions

Rename the type to `js-bundle` and move the options from `languageSpecificConfig` up one level.

Before:

```yaml
resources:
  api:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: ./src/api.ts
          languageSpecificConfig:
            nodeVersion: 22
            outputModuleFormat: esm
```

After:

```yaml
resources:
  api:
    type: function
    properties:
      packaging:
        type: js-bundle
        properties:
          entryfilePath: ./src/api.ts
          nodeVersion: 22
          outputModuleFormat: esm
```

See [JS Bundle for Lambda](/packaging/function/js-bundle).

### Python, Java, Go, Ruby and .NET Lambda functions

Rename the type to `buildpack`. Rename `languageSpecificConfig` to `python`, `java` or `dotnet`, depending on the language. Delete the version fields and set the function's `runtime` instead. Go and Ruby have no options, so delete their `languageSpecificConfig`.

Before:

```yaml
resources:
  processor:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: ./src/process.py
          languageSpecificConfig:
            pythonVersion: 3.12
            packageManagerFile: ./pyproject.toml
            minify: false
```

After:

```yaml
resources:
  processor:
    type: function
    properties:
      runtime: python3.12
      packaging:
        type: buildpack
        properties:
          entryfilePath: ./src/process.py
          python:
            packageManagerFile: ./pyproject.toml
```

See [Buildpack for Lambda](/packaging/function/buildpack).

### Rust Lambda functions

v3 had no Rust support, so Rust functions used `custom-artifact` with a hook that ran cargo-lambda. In v4, delete the hook and use `buildpack`.

Before:

```yaml
hooks:
  beforeDeploy:
    - scriptName: buildRust
scripts:
  buildRust:
    type: local-script
    properties:
      executeCommand: cargo lambda build --release --output-format zip
resources:
  resizer:
    type: function
    properties:
      runtime: provided.al2023
      packaging:
        type: custom-artifact
        properties:
          packagePath: ./target/lambda/resizer/bootstrap.zip
```

After:

```yaml
resources:
  resizer:
    type: function
    properties:
      runtime: provided.al2023
      packaging:
        type: buildpack
        properties:
          entryfilePath: src/main.rs
```

### JavaScript and TypeScript container services

Rename the type to `js-bundle` and move the options from `languageSpecificConfig` up one level. `requiresGlibcBinaries` and `customDockerBuildCommands` stay where they are.

Before:

```yaml
resources:
  api:
    type: web-service
    properties:
      packaging:
        type: stacktape-image-buildpack
        properties:
          entryfilePath: ./src/server.ts
          requiresGlibcBinaries: true
          languageSpecificConfig:
            emitTsDecoratorMetadata: true
      resources:
        cpu: 0.25
        memory: 512
```

After:

```yaml
resources:
  api:
    type: web-service
    properties:
      packaging:
        type: js-bundle
        properties:
          entryfilePath: ./src/server.ts
          requiresGlibcBinaries: true
          emitTsDecoratorMetadata: true
      resources:
        cpu: 0.25
        memory: 512
```

The v4 image installs nothing beside the runtime by default. v3 images ran `tini` and shipped `curl` and `openssl`:

- ECS and AWS Batch now start the init process (`initProcessEnabled`), so stop signals still reach your server.
- `curl` is installed only when the container's `internalHealthCheck` command calls it. If a script in the image calls `curl`, or your code runs the `openssl` command, add it with `customDockerBuildCommands`, for example `apk add --no-cache curl`.
- The OpenSSL libraries that Prisma loads are still in the image. When your code, or a package installed beside the bundle, uses Prisma, the Alpine image also gets the `openssl` command, which Prisma 5 needs to choose its query engine.

See [JS Bundle for Containers](/packaging/containers/js-bundle).

### Python and other non-JavaScript container services

Rename the type to `buildpack`. The container `buildpack` builds the whole project directory, so replace `entryfilePath` with `sourceDirectoryPath`. Replace `runAppAs` with a `startCommand` that starts the server on `$PORT`, and add the server (for example `uvicorn` or `gunicorn`) to the project's dependencies.

Before:

```yaml
resources:
  api:
    type: web-service
    properties:
      packaging:
        type: stacktape-image-buildpack
        properties:
          entryfilePath: ./app/main.py:app
          languageSpecificConfig:
            runAppAs: ASGI
            packageManagerFile: ./pyproject.toml
      resources:
        cpu: 0.5
        memory: 1024
```

After:

```yaml
resources:
  api:
    type: web-service
    properties:
      packaging:
        type: buildpack
        properties:
          sourceDirectoryPath: .
          startCommand: uvicorn app.main:app --host 0.0.0.0 --port $PORT
      resources:
        cpu: 0.5
        memory: 1024
```

For a WSGI app, use gunicorn, for example `gunicorn --bind 0.0.0.0:$PORT app.main:app`. When a FastAPI, Flask or Django project uses the conventional module layout, the start command is detected and `startCommand` can be omitted.

The v4 images are Debian-based and larger than the v3 Alpine images. See [Buildpack for Containers](/packaging/containers/buildpack).

### Nixpacks

Rename the type to `buildpack` and `startCmd` to `startCommand`. Nixpacks phases have no direct equivalent: move install and build commands to `installCommand` and `buildCommand`, and use `railpackConfig` for anything else.

Before:

```yaml
resources:
  web:
    type: web-service
    properties:
      packaging:
        type: nixpacks
        properties:
          sourceDirectoryPath: ./web
          startCmd: node dist/server.js
          phases:
            - name: build
              cmds:
                - npm run build
      resources:
        cpu: 0.25
        memory: 512
```

After:

```yaml
resources:
  web:
    type: web-service
    properties:
      packaging:
        type: buildpack
        properties:
          sourceDirectoryPath: ./web
          startCommand: node dist/server.js
          buildCommand: npm run build
      resources:
        cpu: 0.25
        memory: 512
```

### External buildpacks

Cloud Native Buildpacks and the pack CLI are no longer supported. Try `buildpack`, which detects most projects without configuration. If you depended on a specific builder or buildpack, write a Dockerfile and use `dockerfile`.

Before:

```yaml
resources:
  web:
    type: web-service
    properties:
      packaging:
        type: external-buildpack
        properties:
          sourceDirectoryPath: ./web
          builder: paketobuildpacks/builder-jammy-base
      resources:
        cpu: 0.25
        memory: 512
```

After:

```yaml
resources:
  web:
    type: web-service
    properties:
      packaging:
        type: buildpack
        properties:
          sourceDirectoryPath: ./web
      resources:
        cpu: 0.25
        memory: 512
```

### Custom Dockerfiles

Rename the type to `dockerfile`. The properties are unchanged.

Before:

```yaml
resources:
  worker:
    type: worker-service
    properties:
      packaging:
        type: custom-dockerfile
        properties:
          buildContextPath: ./worker
          dockerfilePath: Dockerfile.prod
      resources:
        cpu: 0.5
        memory: 1024
```

After:

```yaml
resources:
  worker:
    type: worker-service
    properties:
      packaging:
        type: dockerfile
        properties:
          buildContextPath: ./worker
          dockerfilePath: Dockerfile.prod
      resources:
        cpu: 0.5
        memory: 1024
```

See [Dockerfile](/packaging/containers/dockerfile).

### Removed packaging properties

- `languageSpecificConfig`: its options are direct properties of `js-bundle`, or `python`, `java` and `dotnet` on the Lambda `buildpack`.
- `pythonVersion`, `javaVersion`, `rubyVersion` and `dotnetVersion` on Lambda functions: set the function's `runtime`.
- `packageManager`, `minify` and `runAppAs` for Python Lambda functions.
- `entryfilePath`, `runAppAs`, `languageSpecificConfig`, `requiresGlibcBinaries` and `customDockerBuildCommands` for non-JavaScript container services. Use `sourceDirectoryPath`, `startCommand`, `aptPackages` or a Dockerfile.
- `startCmd`, `phases`, `providers`, `buildImage`, `startRunImage` and `startOnlyIncludeFiles` from `nixpacks`. Use `startCommand`, `installCommand`, `buildCommand`, `aptPackages` or `railpackConfig`.
- `builder` and `buildpacks` from `external-buildpack`.
- PHP Lambda functions. Run PHP as a container with [`buildpack`](/packaging/containers/buildpack).
