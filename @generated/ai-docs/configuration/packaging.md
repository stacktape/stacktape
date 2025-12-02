# Packaging

This document describes how Stacktape packages your code for deployment.

## Packaging Lambda functions

### stacktape-lambda-buildpack

The `stacktape-lambda-buildpack` is a built-in, zero-config, and highly optimized buildpack that creates a Lambda artifact from an entry file path.

*   **Supported languages**: Javascript, Typescript, Python, Java, and Go.
*   **Caching**: Your deployment packages are cached. Stacktape creates a checksum from all the necessary files (including package manager lockfiles). If a workload with the same checksum has already been deployed, the packaging and deployment are skipped.
*   **Upload**: Lambda function packages are zipped and uploaded to a pre-created _S3 bucket_. The upload uses S3 Transfer Acceleration, which sends the package to the nearest AWS edge location and then routes it to the bucket over the Amazon backbone network. This is faster and more secure but incurs additional transfer costs ($0.04 per GB). To disable this, set `deploymentConfiguration.useS3TransferAcceleration` to `false` in your `stacktape.yml` file.

```yaml
resources:
  myLambda:
    type: function
    properties:
      # {start-highlight}
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: path/to/my-lambda.ts
      # {stop-highlight}
      timeout: 10
      memory: 2048
```

#### Javascript and Typescript

*   Your source code and all its external dependencies are bundled into a single file. This ensures that you only ship the minimum required code. Stacktape uses [esbuild](https://esbuild.github.io/) for this process.
*   Source maps are automatically generated and included in your deployment package. The generated code also includes the [source-map-support](https://github.com/evanw/node-source-map-support) library to make them usable.
*   If a dependency uses a dynamic `require()` and cannot be statically built, it will be copied as-is instead.
*   If a dependency has a binary dependency, it will be installed in a Docker container (based on the runtime used) and copied to the deployment package. This ensures that your binary dependencies are usable even when deploying from a different operating system (such as Windows or macOS).

#### Python

*   Your source code and all its dependencies are packaged into a zip archive using Docker, so you do not need to have Python installed for deployment.
*   **Supported versions**: `3.7`, `3.8`, and `3.9` (default).
*   **Package managers**: [pip](https://pip.pypa.io/en/stable/), [pipenv](https://pipenv.pypa.io/en/latest/), and [poetry](https://python-poetry.org/) are supported.
*   If your dependencies are defined in a non-standard file, you can specify its location using `languageSpecificProperties.packageManagerFile` and `languageSpecificProperties.packageManager`.

#### Java

*   Your source code and all its dependencies are packaged into a zip archive using Docker, so you do not need to have Java installed for deployment.
*   **Supported versions**: `8` and `11` (default).
*   **Build tools**: [Gradle](https://gradle.org/) (default) and [Maven](https://maven.apache.org/) are supported.
*   If your project uses Maven, set `languageSpecificProperties.useMaven` to `true`. Stacktape will [convert your Maven project to a Gradle project](https://docs.gradle.org/current/userguide/migrating_from_maven.html) and build it with Gradle, which is 2-10 times faster than Maven.

#### Go

*   Your source code and all its dependencies are packaged into a zip archive using Docker, so you do not need to have Go installed for deployment.

### custom-artifact

With `custom-artifact`, you provide a path to your own pre-built artifact. If the specified path is a directory or an unzipped file, Stacktape will zip it. The zipped package is then uploaded to a pre-created _S3 bucket_ using S3 Transfer Acceleration.

## Packaging containers

This section applies to [web services](../../compute-resources/web-services/index.md), [private services](../../compute-resources/private-services/index.md), [worker services](../../compute-resources/worker-services/index.md), [multi-container workloads](../../compute-resources/multi-container-workloads/index.md), and [batch jobs](../../compute-resources/batch-jobs/index.md).

### stacktape-image-buildpack

The `stacktape-image-buildpack` is a built-in, zero-config, and highly optimized buildpack that creates a runnable container image from your source code.

*   **Supported languages**: Javascript, Typescript, Python, Java, and Go.
*   The image is uploaded to a pre-created _ECR repository_.

#### Javascript and Typescript

*   Your source code and all its external dependencies are bundled into a single file. This ensures that you only ship the minimum required code. Stacktape uses [esbuild](https://esbuild.github.io/) for this process.
*   Source maps are automatically generated and included in your deployment package. The generated code also includes the [source-map-support](https://github.com/evanw/node-source-map-support) library to make them usable.
*   If a dependency uses a dynamic `require()` and cannot be statically built, it will be copied as-is instead.
*   If a dependency has a binary dependency, it will be installed in a Docker container using a Docker [multi-stage build](https://docs.docker.com/develop/develop-images/multistage-build/).
*   The base image used is the latest LTS version of Node.js (`node:18-alpine` if your app does not require glibc-based binaries, or `node:18` if it does).

#### Python

*   Your source code and all its dependencies are copied to a Docker container.
*   **Supported versions**: `3.7`, `3.8`, and `3.9` (default).
*   **Package managers**: [pip](https://pip.pypa.io/en/stable/), [pipenv](https://pipenv.pypa.io/en/latest/), and [poetry](https://python-poetry.org/) are supported.
*   If your dependencies are defined in a non-standard file, you can specify its location using `languageSpecificProperties.packageManagerFile` and `languageSpecificProperties.packageManager`.
*   **Base image**: `public.ecr.aws/docker/library/python:${pythonVersion}-alpine` (if your app does not require glibc-based binaries) or `public.ecr.aws/docker/library/python:${pythonVersion}` (if it does).

#### Java

*   Your source code and all its dependencies are copied to a Docker container.
*   **Supported versions**: `8` and `11` (default).
*   **Build tools**: [Gradle](https://gradle.org/) (default) and [Maven](https://maven.apache.org/) are supported.
*   If your project uses Maven, set `languageSpecificProperties.useMaven` to `true`. Stacktape will [convert your Maven project to a Gradle project](https://docs.gradle.org/current/userguide/migrating_from_maven.html) and build it with Gradle, which is 2-10 times faster than Maven.
*   **Base image**: `public.ecr.aws/docker/library/gradle:7.5.1-jdk${javaVersion}-alpine` (if your app does not require glibc-based binaries) or `public.ecr.aws/docker/library/gradle:7.5.1-jdk${javaVersion}` (if it does).

#### Go

*   Your source code and all its dependencies are copied to a Docker container.
*   **Base image**: `public.ecr.aws/docker/library/golang-alpine` (if your app does not require glibc-based binaries) or `public.ecr.aws/docker/library/golang` (if it does).

```yaml
resources:
  webService:
    type: web-service
    properties:
      # {start-highlight}
      packaging:
        type: stacktape-image-buildpack
        properties:
          entryfilePath: src/main.ts
      # {stop-highlight}
      resources:
        cpu: 2
        memory: 2048
```

### external-buildpack

The `external-buildpack` option builds an image using a zero-config [external buildpack](https://buildpacks.io/docs/).

*   You can find a buildpack for almost any language or framework. The default buildpack is `paketobuildpacks/builder:base`. You can configure the buildpack using the `buildpack` property.
*   The buildpack scans the specified source directory and automatically determines how to build the image for your application.
*   The image is uploaded to a pre-created _ECR repository_.

```yaml
resources:
  webService:
    type: web-service
    properties:
      # {start-highlight}
      packaging:
        type: external-buildpack
        properties:
          sourceDirectoryPath: ./src
          builder: heroku/buildpacks:20
      # {stop-highlight}
      resources:
        cpu: 2
        memory: 2048
```

### nixpacks

The `nixpacks` option builds an image using [Nixpacks](https://nixpacks.com/docs).

*   In most cases, building and deploying an application with Nixpacks requires no configuration.
*   Nixpacks scans the specified source directory and automatically determines how to build the image for your application.
*   The image is uploaded to a pre-created _ECR repository_.

```yaml
resources:
  webService:
    type: web-service
    properties:
      # {start-highlight}
      packaging:
        type: nixpacks
        properties:
          sourceDirectoryPath: ./src
      # {stop-highlight}
      resources:
        cpu: 2
        memory: 2048
```

### custom-dockerfile

The `custom-dockerfile` option builds an image from your own [Dockerfile](https://docs.docker.com/engine/reference/builder/).

*   You must configure `buildContextPath`. Stacktape will look for a Dockerfile in this directory (or use the one specified by `dockerfilePath`).
*   The image is uploaded to a pre-created _ECR repository_.

```yaml
resources:
  webService:
    type: web-service
    properties:
      # {start-highlight}
      packaging:
        type: custom-dockerfile
        properties:
          buildContextPath: ./server
          dockerfilePath: Dockerfile
      # {stop-highlight}
      resources:
        cpu: 2
        memory: 2048
```

### prebuilt-image

The `prebuilt-image` option uses a pre-built image.

*   To use private images, you must configure `repositoryCredentialsSecretArn`. The body of the secret should have the following format: `{"username": "<<privateRegistryUsername>>", "password": "<<privateRegistryPassword>>"}`.
*   Secrets can be managed with Stacktape. For more information, see the [secrets documentation](../../security-resources/secrets/index.md).

```yaml
resources:
  webService:
    type: web-service
    properties:
      # {start-highlight}
      packaging:
        type: prebuilt-image
        properties:
          image: httpd:latest
      # {stop-highlight}
      resources:
        cpu: 2
        memory: 2048
```

## API reference

{/*  */}