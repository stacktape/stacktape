import type {
  DotnetLanguageSpecificConfig,
  EsLanguageSpecificConfig,
  GoLanguageSpecificConfig,
  JavaLanguageSpecificConfig,
  PhpLanguageSpecificConfig,
  PyLanguageSpecificConfig,
  RubyLanguageSpecificConfig,
  SupportedDotnetVersion,
  SupportedJavaVersion,
  SupportedPhpVersion,
  SupportedPythonPackageManager,
  SupportedPythonVersion,
  SupportedRubyVersion
} from '@stacktape/config/deployment-artifacts';

export type SupportedEsPackageManager = 'yarn' | 'npm' | 'pnpm' | 'deno' | 'bun';

export type DockerBuildOutputArchitecture = 'linux/amd64' | 'linux/arm64';

export type PackagingEventType =
  | 'BUILD_CODE'
  | 'BUILD_HOSTING_BUCKET'
  | 'BUILD_IMAGE'
  | 'BUILD_NEXTJS_PROJECT'
  | 'BUILD_SSR_WEB_PROJECT'
  | 'BUNDLING_NEXTJS_FUNCTIONS'
  | 'BUNDLING_SSR_WEB_FUNCTIONS'
  | 'CALCULATE_CHECKSUM'
  | 'CALCULATE_SIZE'
  | 'CREATE_DOCKERFILE'
  | 'RESOLVE_DEPENDENCIES'
  | 'ZIP_PACKAGE';

export type PackagingProgressLogger = {
  readonly eventContext: {
    instanceId?: string | undefined;
  };
  startEvent(params: {
    eventType: PackagingEventType;
    description: string;
    [key: string]: unknown;
  }): Promise<unknown> | void;
  updateEvent(params: { eventType: PackagingEventType; [key: string]: unknown }): Promise<unknown> | void;
  finishEvent(params: {
    eventType: PackagingEventType;
    finalMessage?: string | undefined;
    [key: string]: unknown;
  }): Promise<unknown> | void;
};

export type PackagingErrorDetails = {
  type: 'BUILD_CODE' | 'NIXPACKS' | 'PACK' | 'PACKAGING';
  message: string;
  hint?: string | undefined;
  stack?: string | undefined;
  cause?: unknown;
};

export type CreatePackagingError = (details: PackagingErrorDetails) => Error;

export type ProcessResult = {
  stdout: string;
  stderr: string;
  exitCode: number;
};

export type ExecuteProcess = (
  command: string,
  args: string[],
  options: {
    cwd?: string | undefined;
    disableStderr?: boolean | undefined;
    disableStdout?: boolean | undefined;
    env?: Record<string, unknown> | undefined;
    inheritEnvVarsExcept?: string[] | undefined;
    onOutputLine?: (line: string, stream: 'stdout' | 'stderr') => void | undefined;
  }
) => Promise<ProcessResult>;

export type RunDocker = (
  commands: string[],
  options?: {
    cwd?: string | undefined;
    env?: Record<string, string> | undefined;
    redactedValues?: string[] | undefined;
    skipHandleError?: boolean | undefined;
    stdinInput?: string | undefined;
  }
) => Promise<ProcessResult>;

export type BuildDockerImage = (input: {
  buildContextPath: string;
  dockerfilePath?: string | undefined;
  imageTag: string;
  buildArgs?: Record<string, string> | undefined;
  dockerBuildOutputArchitecture?: DockerBuildOutputArchitecture | undefined;
  cacheFromRef?: string | undefined;
  cacheToRef?: string | undefined;
}) => Promise<{
  size: number;
  id: string;
  created: number;
  dockerOutput: string | undefined;
  duration: number;
}>;

export type GetDockerImageDetails = (tag: string) => Promise<{
  size: number;
  id: string;
  created: number;
}>;

export type CheckDockerImageExists = (tag: string) => Promise<boolean>;

export type ArchiveItem = (input: {
  format: 'zip' | 'tgz';
  absoluteSourcePath: string;
  absoluteDestDirPath?: string | undefined;
  fileNameBase?: string | undefined;
  executablePatterns?: string[] | undefined;
  compressionLevel?: number | undefined;
  store?: boolean | undefined;
  useNativeZip?: boolean | undefined;
}) => Promise<string>;

export type InstallDependencies = (input: {
  rootProjectDirPath: string;
  progressLogger: PackagingProgressLogger;
}) => Promise<unknown>;

export type RunPack = (input: {
  args: string[];
  cwd: string;
  onOutputLine?: (line: string) => void | undefined;
}) => Promise<ProcessResult>;

export type RunNixpacks = (input: { args: string[]; cwd: string }) => Promise<ProcessResult>;

export type LoadModuleExport = <T>(input: { filePath: string; exportName: string }) => Promise<T>;

export type LanguageBuildActions = {
  createPackagingError: CreatePackagingError;
  runDocker: RunDocker;
};

export type LambdaArtifactActions = LanguageBuildActions & {
  archiveItem: ArchiveItem;
};

export type ImageBuildActions = LanguageBuildActions & {
  buildDockerImage: BuildDockerImage;
};

export type DockerImageInspectionActions = {
  checkDockerImageExists: CheckDockerImageExists;
  getDockerImageDetails: GetDockerImageDetails;
};

export type EsBuildActions = LanguageBuildActions & {
  installDependencies: InstallDependencies;
  nativeDependencyInstallationRootPath: string;
  sourceMapInstallPath?: string | undefined;
};

export type StpBuildpackInput = {
  entryfilePath: string;
  languageSpecificConfig?:
    | DotnetLanguageSpecificConfig
    | EsLanguageSpecificConfig
    | GoLanguageSpecificConfig
    | JavaLanguageSpecificConfig
    | PhpLanguageSpecificConfig
    | PyLanguageSpecificConfig
    | RubyLanguageSpecificConfig
    | undefined;
  requiresGlibcBinaries?: boolean | undefined;
  customDockerBuildCommands?: string[] | undefined;
  excludeDependencies?: string[] | undefined;
  excludeFiles?: string[] | undefined;
  name: string;
  sizeLimit?: number | undefined;
  cwd: string;
  existingDigests: string[];
  additionalDigestInput?: string | undefined;
  progressLogger: PackagingProgressLogger;
  invocationId: string;
  keepNames?: boolean | undefined;
  includeFiles?: string[] | undefined;
  distFolderPath: string;
  externals?: string[] | undefined;
  rebuildBinaries?: boolean | undefined;
  debug?: boolean | undefined;
  dockerBuildOutputArchitecture?: DockerBuildOutputArchitecture | undefined;
};

/**
 * A package resolved while analysing an ECMAScript dependency graph.
 *
 * This is deliberately distinct from the split bundler's dependency contract:
 * callers of the regular bundler also use the resolved path and dependency
 * relationship when deciding what Docker must install.
 */
export type ResolvedPackageDependency = {
  name: string;
  path: string;
  version: string;
  parentModulePath?: string | undefined;
  dependencyType: 'root' | 'standard' | 'optional-peer' | 'peer';
  note?: string | undefined;
};

export type LanguageSpecificBundleOutput = {
  es?: {
    dependenciesToInstallInDocker?: ResolvedPackageDependency[] | undefined;
    packageManager?: SupportedEsPackageManager | undefined;
    dynamicallyImportedModules?: string[] | undefined;
  };
  py?: {
    packageManager: SupportedPythonPackageManager;
    pythonVersion: SupportedPythonVersion;
  };
  java?: {
    useMaven: boolean;
    javaVersion: SupportedJavaVersion;
  };
  ruby?: {
    rubyVersion: SupportedRubyVersion;
  };
  php?: {
    phpVersion: SupportedPhpVersion;
  };
  dotnet?: {
    dotnetVersion: SupportedDotnetVersion;
  };
};

export type CreateBundleOutput = {
  digest: string;
  outcome: 'skipped' | 'bundled';
  distIndexFilePath: string;
  distFolderPath: string;
  sourceFiles: { path: string }[];
  languageSpecificBundleOutput: LanguageSpecificBundleOutput;
};

/**
 * Shared progress-message vocabulary for packaging results. Every workload
 * whose artifact is reused verbatim reports the SAME sentence: the CLI's
 * progress presenter collapses children with identical outcomes into one counted row
 * ("21 unchanged — reused from previous deploy"), which only works when the
 * wording matches everywhere.
 */
export const packagingMessages = {
  unchanged: 'Unchanged (reused from previous deploy)',
  containerImage: (sizeMb: number | string) => `Container image · ${sizeMb} MB`,
  lambdaBundle: ({ size, zippedSize }: { size: string; zippedSize: string }) =>
    `Lambda bundle · ${size} (${zippedSize} zipped)`
} as const;

export type PackagingOutput = {
  /**
   * A number when the artifact was measured; `null` for cached/skipped results and for bundled ES image development
   * builds. Pre-zipped custom artifacts report the sum of their ZIP entries' uncompressed sizes. `undefined` remains
   * in the boundary type for compatibility with callers that may still construct a legacy output.
   */
  size: number | null | undefined;
  zippedSize?: number | undefined;
  imageName?: string | undefined;
  digest: string;
  outcome: 'skipped' | 'bundled';
  sourceFiles?: { path: string }[] | undefined;
  artifactPath?: string | undefined;
  distFolderPath?: string | undefined;
  details?: Record<string, unknown> | undefined;
  jobName: string;
  /** All npm modules resolved during bundling (for Lambda functions). */
  resolvedModules?: string[] | undefined;
};
