interface DockerBuildArg {
  /**
   * #### Argument name
   */
  argName: string;
  /**
   * #### Argument value
   */
  value: string;
}

interface EsLanguageSpecificConfig {
  /**
   * #### The path to the `tsconfig.json` file.
   *
   * ---
   *
   * This is primarily used to resolve path aliases during the build process.
   */
  tsConfigPath?: string;
  /**
   * #### Emit TypeScript decorator metadata. Required by NestJS, TypeORM, and similar frameworks.
   */
  emitTsDecoratorMetadata?: boolean;
  /**
   * #### A list of dependencies to exclude from the main bundle.
   *
   * ---
   *
   * These dependencies will be treated as "external" and will not be bundled directly into your application's code.
   * Instead, they will be installed separately in the deployment package.
   * Use `*` to exclude all dependencies from the bundle.
   */
  dependenciesToExcludeFromBundle?: string[];
  /**
   * #### Output module format: `cjs` (CommonJS) or `esm` (ES Modules, enables top-level `await`).
   *
   * ---
   *
   * **Note:** Some npm packages don't support ESM. ESM may also produce less readable stack traces.
   *
   * @default 'cjs'
   */
  outputModuleFormat?: 'cjs' | 'esm';
  /**
   * #### The major version of Node.js to use.
   *
   * @default 18
   */
  nodeVersion?: 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24;
  /**
   * #### Skip generating source maps. Reduces package size but makes production errors harder to debug.
   */
  disableSourceMaps?: boolean;
  /**
   * #### Save source maps to a local directory instead of uploading them to AWS.
   *
   * ---
   *
   * Useful for uploading to external error tracking (Sentry, Datadog, etc.). CloudWatch stack traces won't be mapped.
   */
  outputSourceMapsTo?: string;
  /**
   * #### A list of dependencies to exclude from the deployment package.
   *
   * ---
   *
   * This only applies to dependencies that are not statically bundled.
   * To exclude a dependency from the static bundle, use `dependenciesToExcludeFromBundle`.
   * Use `*` to exclude all non-bundled dependencies.
   */
  dependenciesToExcludeFromDeploymentPackage?: string[];
}

interface PyLanguageSpecificConfig {
  /**
   * #### The path to your project's dependency file.
   *
   * ---
   *
   * This can be a `requirements.txt`, `Pipfile`, or `pyproject.toml` file.
   */
  packageManagerFile?: string;
  /**
   * #### The Python package manager to use.
   *
   * ---
   *
   * Stacktape uses `uv` for dependency resolution and installation. This option is kept
   * for compatibility and must be set to `uv` if provided.
   */
  packageManager?: SupportedPythonPackageManager;
  /**
   * #### The version of Python to use.
   *
   * @default 3.9
   */
  pythonVersion?: SupportedPythonVersion;
  /**
   * #### Python server type: `WSGI` (Flask, Django) or `ASGI` (FastAPI, Starlette).
   *
   * ---
   *
   * Only for `stacktape-image-buildpack`. Auto-binds to the `PORT` env var.
   * Set `entryfilePath` to `module/file.py:app` (e.g., `app/main.py:app`).
   */
  runAppAs?: SupportedPythonRunAppAs;
  /**
   * #### Minify Python code to reduce package size. Makes production stack traces harder to read.
   *
   * @default true
   */
  minify?: boolean;
}

type SupportedPythonVersion = 2.7 | 3.6 | 3.7 | 3.8 | 3.9 | 3.11 | 3.12 | 3.13 | 3.14;

type SupportedPythonPackageManager = 'uv';

type SupportedPythonRunAppAs = 'WSGI' | 'ASGI';

interface JavaLanguageSpecificConfig {
  /**
   * #### Specifies whether to use Maven instead of Gradle.
   *
   * ---
   *
   * By default, Stacktape uses Gradle to build Java projects.
   */
  useMaven?: boolean;
  /**
   * #### The path to your project's build file (`pom.xml` for Maven or `build.gradle` for Gradle).
   */
  packageManagerFile?: string;
  /**
   * #### The version of Java to use.
   *
   * @default 11
   */
  javaVersion?: SupportedJavaVersion;
}

type SupportedJavaVersion = 8 | 11 | 17 | 19;

interface GoLanguageSpecificConfig {}

interface RubyLanguageSpecificConfig {
  /**
   * #### The version of Ruby to use.
   *
   * @default 3.3
   */
  rubyVersion?: SupportedRubyVersion;
}

type SupportedRubyVersion = 3.2 | 3.3;

interface PhpLanguageSpecificConfig {
  /**
   * #### The version of PHP to use.
   *
   * @default 8.3
   */
  phpVersion?: SupportedPhpVersion;
}

type SupportedPhpVersion = 8.2 | 8.3;

interface DotnetLanguageSpecificConfig {
  /**
   * #### The path to your .NET project file (.csproj).
   */
  projectFile?: string;
  /**
   * #### The version of .NET to use.
   *
   * @default 8
   */
  dotnetVersion?: SupportedDotnetVersion;
}

type SupportedDotnetVersion = 6 | 8;

interface StpBuildpackSharedProps {
  /**
   * #### Path to your app's entry point, relative to the Stacktape config file.
   *
   * ---
   *
   * For JS/TS: code is bundled into a single file. Dependencies with native binaries are installed separately.
   * For Python: use `module/file.py:app` format when using `runAppAs` (WSGI/ASGI).
   */
  entryfilePath: string;
  /**
   * #### A glob pattern of files to explicitly include in the deployment package.
   *
   * ---
   *
   * The path is relative to your Stacktape configuration file.
   */
  includeFiles?: string[];
  /**
   * #### A glob pattern of files to explicitly exclude from the deployment package.
   *
   * ---
   */
  excludeFiles?: string[];
  /**
   * #### A list of dependencies to exclude from the deployment package.
   */
  excludeDependencies?: string[];
  /**
   * #### Language-specific packaging configuration.
   */
  languageSpecificConfig?:
    | EsLanguageSpecificConfig
    | PyLanguageSpecificConfig
    | JavaLanguageSpecificConfig
    | GoLanguageSpecificConfig
    | PhpLanguageSpecificConfig
    | DotnetLanguageSpecificConfig
    | RubyLanguageSpecificConfig;
}

interface StpBuildpackLambdaPackagingProps extends StpBuildpackSharedProps {
  /**
   * #### The name of the handler function to be executed when the Lambda is invoked.
   */
  handlerFunction?: string;
}

/**
 * #### A zero-config buildpack that packages your code for AWS Lambda.
 *
 * ---
 *
 * The `stacktape-lambda-buildpack` automatically bundles your code and dependencies into an optimized Lambda deployment package.
 *
 * **Supported languages:** JavaScript, TypeScript, Python, Java, Go, Ruby, PHP, and .NET.
 *
 * For JS/TS, your code is bundled into a single file. Source maps are automatically generated.
 * Packages are cached based on a checksum, so unchanged code is not re-packaged.
 */
interface StpBuildpackLambdaPackaging {
  type: 'stacktape-lambda-buildpack';
  properties: StpBuildpackLambdaPackagingProps;
}

interface CustomArtifactLambdaPackagingProps {
  /**
   * #### The path to a pre-built deployment package.
   *
   * ---
   *
   * If the path points to a directory or a non-zip file, Stacktape will automatically zip it for you.
   */
  packagePath: string;
  /**
   * #### The handler function to be executed when the Lambda is invoked.
   *
   * ---
   *
   * The syntax is `{{filepath}}:{{functionName}}`.
   *
   * Example: `my-lambda/index.js:default`
   */
  handler?: string;
}

/**
 * #### Uses a pre-built artifact for Lambda deployment.
 *
 * ---
 *
 * With `custom-artifact`, you provide a path to your own pre-built deployment package.
 * If the specified path is a directory or an unzipped file, Stacktape will automatically zip it.
 *
 * This is useful when you have custom build processes or need full control over the packaging.
 */
interface CustomArtifactLambdaPackaging {
  type: 'custom-artifact';
  properties: CustomArtifactLambdaPackagingProps;
}

/**
 * #### Configures a pre-built container image.
 */
interface PrebuiltImageBjPackagingProps {
  /**
   * #### The name or URL of the container image.
   */
  image: string; // image name or url
  /**
   * #### A command to be executed when the container starts.
   *
   * ---
   *
   * This overrides the `CMD` instruction in the Dockerfile.
   *
   * Example: `['/app/start.sh']`
   */
  command?: string[];
}

/**
 * #### Configures a pre-built container image.
 */
interface PrebuiltImageCwPackagingProps extends PrebuiltImageBjPackagingProps {
  /**
   * #### The ARN of a secret containing credentials for a private container registry.
   *
   * ---
   *
   * The secret must be a JSON object with `username` and `password` keys.
   * You can create secrets using the `stacktape secret:create` command.
   */
  repositoryCredentialsSecretArn?: string;
  /**
   * #### A script to be executed when the container starts.
   *
   * ---
   *
   * This overrides the `ENTRYPOINT` instruction in the Dockerfile.
   */
  entryPoint?: string[];
}

interface PrebuiltBjImagePackaging {
  type: 'prebuilt-image';
  properties: PrebuiltImageBjPackagingProps;
}

/**
 * #### Uses a pre-built container image.
 *
 * ---
 *
 * With `prebuilt-image`, you provide a reference to an existing container image.
 * This can be a public image from Docker Hub or a private image from any container registry.
 *
 * For private registries, configure `repositoryCredentialsSecretArn` with credentials stored in AWS Secrets Manager.
 */
interface PrebuiltCwImagePackaging {
  type: 'prebuilt-image';
  properties: PrebuiltImageCwPackagingProps;
}

/**
 * #### Configures an image to be built by Stacktape from a specified Dockerfile.
 */
interface CustomDockerfileBjImagePackagingProps {
  /**
   * #### The path to the Dockerfile, relative to `buildContextPath`.
   */
  dockerfilePath?: string;
  /**
   * #### The path to the build context directory, relative to your Stacktape configuration file.
   */
  buildContextPath: string;
  /**
   * #### A list of arguments to pass to the `docker build` command.
   */
  buildArgs?: DockerBuildArg[];
  /**
   * #### A command to be executed when the container starts.
   *
   * ---
   *
   * This overrides the `CMD` instruction in the Dockerfile.
   *
   * Example: `['/app/start.sh']`
   */
  command?: string[];
}

/**
 * #### Configures an image to be built by Stacktape from a specified Dockerfile.
 */
interface CustomDockerfileCwImagePackagingProps extends CustomDockerfileBjImagePackagingProps {
  /**
   * #### A script to be executed when the container starts.
   *
   * ---
   *
   * This overrides the `ENTRYPOINT` instruction in the Dockerfile.
   */
  entryPoint?: string[];
}

interface CustomDockerfileBjImagePackaging {
  type: 'custom-dockerfile';
  properties: CustomDockerfileBjImagePackagingProps;
}

/**
 * #### Builds a container image from your own Dockerfile.
 *
 * ---
 *
 * With `custom-dockerfile`, you provide a path to your Dockerfile and build context.
 * Stacktape builds the image and uploads it to a managed ECR repository.
 *
 * This gives you full control over the container environment and is ideal for complex setups.
 */
interface CustomDockerfileCwImagePackaging {
  type: 'custom-dockerfile';
  properties: CustomDockerfileCwImagePackagingProps;
}

interface ExternalBuildpackBjImagePackagingProps {
  /**
   * #### The Buildpack Builder to use.
   *
   * ---
   *
   * @default "paketobuildpacks/builder-jammy-base"
   */
  builder?: string;
  /**
   * #### The specific Buildpack to use.
   *
   * ---
   *
   * By default, the buildpack is detected automatically.
   */
  buildpacks?: string[];
  /**
   * #### The path to the source code directory.
   */
  sourceDirectoryPath: string;
  /**
   * #### A command to be executed when the container starts.
   *
   * ---
   *
   * Example: `['/app/start.sh']`
   */
  command?: string[];
}

interface ExternalBuildpackCwImagePackagingProps extends ExternalBuildpackBjImagePackagingProps {}

interface ExternalBuildpackBjImagePackaging {
  type: 'external-buildpack';
  properties: ExternalBuildpackBjImagePackagingProps;
}

/**
 * #### Builds a container image using an external buildpack.
 *
 * ---
 *
 * External buildpacks (buildpacks.io) automatically detect your application type
 * and build an optimized container image with zero configuration.
 *
 * The default builder is `paketobuildpacks/builder-jammy-base`.
 * You can find buildpacks for almost any language or framework.
 */
interface ExternalBuildpackCwImagePackaging {
  type: 'external-buildpack';
  properties: ExternalBuildpackCwImagePackagingProps;
}

interface NixpacksPhase {
  /**
   * #### The name of the build phase.
   */
  name: string;
  /**
   * #### A list of shell commands to execute in this phase.
   */
  cmds?: string[];
  /**
   * #### A list of Nix packages to install in this phase.
   */
  nixPkgs?: string[];
  /**
   * #### A list of Nix libraries to include in this phase.
   */
  nixLibs?: string[];
  /**
   * #### A list of Nix overlay files to apply in this phase.
   */
  nixOverlay?: string[];
  /**
   * #### The Nixpkgs archive to use.
   */
  nixpkgsArchive?: string;
  /**
   * #### A list of APT packages to install in this phase.
   */
  aptPkgs?: string[];
  /**
   * #### A list of directories to cache between builds to speed up subsequent builds.
   */
  cacheDirectories?: string[];
  /**
   * #### A list of file paths to include in this phase; all other files will be excluded.
   */
  onlyIncludeFiles?: string[];
}

interface NixpacksBjImagePackagingProps {
  /**
   * #### The path to the source code directory.
   */
  sourceDirectoryPath: string;
  /**
   * #### The base image to use for building the application.
   *
   * ---
   *
   * For more details, see the [Nixpacks documentation](https://nixpacks.com/docs/configuration/file#build-image).
   */
  buildImage?: string;
  /**
   * #### A list of providers to use for determining the build and runtime environments.
   */
  providers?: string[];
  /**
   * #### The command to execute when starting the application.
   *
   * ---
   *
   * This overrides the default start command inferred by Nixpacks.
   */
  startCmd?: string;
  /**
   * #### The base image to use for running the application.
   */
  startRunImage?: string;
  /**
   * #### A list of file paths to include in the runtime environment; all other files will be excluded.
   */
  startOnlyIncludeFiles?: string[];
  /**
   * #### The build phases for the application.
   */
  phases?: NixpacksPhase[];
}

interface NixpacksCwImagePackagingProps extends NixpacksBjImagePackagingProps {}

interface NixpacksBjImagePackaging {
  type: 'nixpacks';
  properties: NixpacksBjImagePackagingProps;
}

/**
 * #### Builds a container image using Nixpacks.
 *
 * ---
 *
 * Nixpacks automatically detects your application type and builds an optimized container image.
 * In most cases, no configuration is required.
 *
 * It supports a wide range of languages and frameworks out of the box.
 */
interface NixpacksCwImagePackaging {
  type: 'nixpacks';
  properties: NixpacksCwImagePackagingProps;
}

/**
 * #### Configures an image to be built automatically by Stacktape from your source code.
 */
interface StpBuildpackBjImagePackagingProps extends StpBuildpackSharedProps {
  /**
   * #### Language-specific packaging configuration.
   */
  languageSpecificConfig?:
    | EsLanguageSpecificConfig
    | PyLanguageSpecificConfig
    | JavaLanguageSpecificConfig
    | GoLanguageSpecificConfig
    | PhpLanguageSpecificConfig
    | DotnetLanguageSpecificConfig
    | RubyLanguageSpecificConfig;
  /**
   * #### Use glibc instead of musl (Alpine default). Enable if native dependencies require glibc.
   *
   * ---
   *
   * Results in a larger image. Common packages needing this: `sharp`, `canvas`, `bcrypt`, `puppeteer`.
   */
  requiresGlibcBinaries?: boolean;
  /**
   * #### A list of commands to be executed during the `docker build` process.
   *
   * ---
   *
   * These commands are executed using the `RUN` directive in the Dockerfile.
   * This is useful for installing additional system dependencies in your container.
   */
  customDockerBuildCommands?: string[];
}

/**
 * #### Configures an image to be built automatically by Stacktape from your source code.
 */
interface StpBuildpackCwImagePackagingProps extends StpBuildpackBjImagePackagingProps {}

interface StpBuildpackBjImagePackaging {
  type: 'stacktape-image-buildpack';
  properties: StpBuildpackBjImagePackagingProps;
}

/**
 * #### A zero-config buildpack that creates a container image from your source code.
 *
 * ---
 *
 * The `stacktape-image-buildpack` automatically bundles your code and dependencies into an optimized container image.
 *
 * **Supported languages:** JavaScript, TypeScript, Python, Java, and Go.
 *
 * For JS/TS, your code is bundled into a single file with source maps.
 * The resulting image is uploaded to a managed ECR repository.
 */
interface StpBuildpackCwImagePackaging {
  type: 'stacktape-image-buildpack';
  properties: StpBuildpackCwImagePackagingProps;
}
