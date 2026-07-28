import type { BatchJobContainer, BatchJobResources } from '@stacktape/config/batch-jobs';
import type {
  BatchJobContainerPackaging,
  ContainerWorkloadContainerPackaging,
  CustomDockerfileBjImagePackaging,
  CustomDockerfileCwImagePackaging,
  DotnetLanguageSpecificConfig,
  EsLanguageSpecificConfig,
  ExternalBuildpackBjImagePackaging,
  ExternalBuildpackCwImagePackaging,
  JavaLanguageSpecificConfig,
  LambdaPackaging,
  NixpacksBjImagePackaging,
  NixpacksCwImagePackaging,
  PhpLanguageSpecificConfig,
  PrebuiltBjImagePackaging,
  PrebuiltCwImagePackaging,
  PyLanguageSpecificConfig,
  StpBuildpackBjImagePackaging,
  StpBuildpackBjImagePackagingProps,
  StpBuildpackCwImagePackaging,
  StpBuildpackCwImagePackagingProps,
  StpBuildpackLambdaPackaging,
  StpBuildpackLambdaPackagingProps,
  SupportedDotnetVersion,
  SupportedJavaVersion,
  SupportedPhpVersion,
  SupportedPythonPackageManager,
  SupportedPythonVersion,
  SupportedRubyVersion
} from '@stacktape/config/deployment-artifacts';
import type {
  ContainerWorkloadContainer,
  ContainerWorkloadResourcesConfig
} from '@stacktape/config/multi-container-workloads';

declare global {
type StpBuildpackInput = StpBuildpackLambdaPackagingProps &
  StpBuildpackCwImagePackagingProps &
  StpBuildpackBjImagePackagingProps & {
    name: string;
    sizeLimit?: number;
    cwd: string;
    isDev?: boolean;
    args: StacktapeArgs;
    existingDigests: string[];
    additionalDigestInput?: string;
    progressLogger: ProgressLogger;
    invocationId: string;
    keepNames?: boolean;
    includeFiles?: string[];
    distFolderPath: string;
    externals?: string[];
    rebuildBinaries?: boolean;
    debug?: boolean;
    dockerBuildOutputArchitecture?: DockerBuildOutputArchitecture;
  };

type SupportedPackagingType =
  | StpBuildpackLambdaPackaging['type']
  | StpBuildpackBjImagePackaging['type']
  | StpBuildpackCwImagePackaging['type']
  | ExternalBuildpackBjImagePackaging['type']
  | ExternalBuildpackCwImagePackaging['type']
  | PrebuiltBjImagePackaging['type']
  | PrebuiltCwImagePackaging['type']
  | CustomDockerfileBjImagePackaging['type']
  | CustomDockerfileCwImagePackaging['type']
  | NixpacksBjImagePackaging['type']
  | NixpacksCwImagePackaging['type']
  | LambdaPackaging['type'];

type EsSpecificPackagingProps = EsLanguageSpecificConfig & {
  languageType: 'es';
  nodeTarget: string;
  tsConfigPath: string;
  minify: boolean;
};
type PythonSpecificPackagingProps = PyLanguageSpecificConfig;
type GoSpecificPackagingProps = Record<string, never>;
type JavaSpecificPackagingProps = JavaLanguageSpecificConfig;
type RubySpecificPackagingProps = Record<string, never>;
type CSharpSpecificPackagingProps = Record<string, never>;
type PhpSpecificPackagingProps = PhpLanguageSpecificConfig;
type DotnetSpecificPackagingProps = DotnetLanguageSpecificConfig;

type PackagingOutput = {
  size: number;
  zippedSize?: number;
  imageName?: string;
  digest: string;
  outcome: 'skipped' | 'bundled';
  sourceFiles?: { path: string }[];
  artifactPath?: string;
  distFolderPath?: string;
  details?: Record<string, any>;
  jobName: string;
  /** All npm modules resolved during bundling (for Lambda functions) */
  resolvedModules?: string[];
};

type CreateBundleOutput = {
  digest: string;
  outcome: 'skipped' | 'bundled';
  distIndexFilePath: string;
  distFolderPath: string;
  sourceFiles: { path: string }[];
  languageSpecificBundleOutput: LanguageSpecificBundleOutput;
};

type LanguageSpecificBundleOutput = {
  es?: {
    dependenciesToInstallInDocker?: ModuleInfo[];
    packageManager?: SupportedEsPackageManager;
    dynamicallyImportedModules?: string[];
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

type PackageWorkloadOutput = {
  jobName: string;
  digest: string;
  skipped: boolean;
  size: number;
  artifactPath?: string;
  /** All npm modules resolved during bundling (for Lambda functions) */
  resolvedModules?: string[];
};

type ModuleInfo = {
  name: string;
  path: string;
  version: string;
  parentModulePath?: string;
  dependencyType: 'root' | 'standard' | 'optional-peer' | 'peer';
  note?: string;
};

type SupportedEsPackageManager = 'yarn' | 'npm' | 'pnpm' | 'deno' | 'bun';

type PackageWorkloadInput = {
  /**
   * #### Workload Name
   *
   * ---
   *
   * The name of the parent resource this workload belongs to (e.g., `web-service`, `worker-service`).
   */
  workloadName: string;
  /**
   * #### Job Name
   *
   * ---
   *
   * The name of the specific job (e.g., a container or function) within the resource. This is important for resources that can have multiple jobs, like a `multi-container-workload`.
   */
  jobName: string;
  packaging: ContainerWorkloadContainerPackaging | BatchJobContainerPackaging | LambdaPackaging | HelperLambdaPackaging;
};

type HelperLambdaPackaging = {
  type: 'helper-lambda';
  properties: HelperLambdaData;
};

type AllSupportedPackagingConfig = ContainerWorkloadContainerPackaging | BatchJobContainerPackaging | LambdaPackaging;

type EnrichedCwContainerProps = ContainerWorkloadContainer & {
  workloadName: string;
  workloadType: StpWorkloadType;
  jobName: string;
  resources: ContainerWorkloadResourcesConfig;
};

type EnrichedWebServiceContainerProps = EnrichedCwContainerProps;

type EnrichedBjContainerProps = BatchJobContainer & {
  workloadName: string;
  workloadType: StpWorkloadType;
  jobName: string;
  resources: BatchJobResources;
};

type DockerBuildOutputArchitecture = 'linux/amd64' | 'linux/arm64'; // default for linux
}
