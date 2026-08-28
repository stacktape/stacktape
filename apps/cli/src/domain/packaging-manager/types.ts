import type { HelperLambdaData } from '@utils/helper-lambdas';
import type { ProgressReporter as ProgressLogger } from '@application-services/operation-manager';
import type { StpWorkloadType } from '@domain-services/config-manager/resolved-types/resources';
import type { StacktapeArgs } from 'src/config/cli/types';
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
  StpBuildpackLambdaPackagingProps
} from '@stacktape/config/deployment-artifacts';
import type {
  ContainerWorkloadContainer,
  ContainerWorkloadResourcesConfig
} from '@stacktape/config/multi-container-workloads';
import type { DockerBuildOutputArchitecture } from '@stacktape/packaging/runtime-contracts';

export type StpBuildpackInput = StpBuildpackLambdaPackagingProps &
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

export type SupportedPackagingType =
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

export type EsSpecificPackagingProps = EsLanguageSpecificConfig & {
  languageType: 'es';
  nodeTarget: string;
  tsConfigPath: string;
  minify: boolean;
};
export type PythonSpecificPackagingProps = PyLanguageSpecificConfig;
export type GoSpecificPackagingProps = Record<string, never>;
export type JavaSpecificPackagingProps = JavaLanguageSpecificConfig;
export type RubySpecificPackagingProps = Record<string, never>;
export type CSharpSpecificPackagingProps = Record<string, never>;
export type PhpSpecificPackagingProps = PhpLanguageSpecificConfig;
export type DotnetSpecificPackagingProps = DotnetLanguageSpecificConfig;

export type PackageWorkloadOutput = {
  jobName: string;
  digest: string;
  skipped: boolean;
  /** Carried through from `PackagingOutput`; `null` and `undefined` both reach event data. */
  size: number | null | undefined;
  artifactPath?: string;
  /** All npm modules resolved during bundling (for Lambda functions) */
  resolvedModules?: string[];
};

export type PackageWorkloadInput = {
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

export type HelperLambdaPackaging = {
  type: 'helper-lambda';
  properties: HelperLambdaData;
};

export type AllSupportedPackagingConfig =
  | ContainerWorkloadContainerPackaging
  | BatchJobContainerPackaging
  | LambdaPackaging;

export type EnrichedCwContainerProps = ContainerWorkloadContainer & {
  workloadName: string;
  workloadType: StpWorkloadType;
  jobName: string;
  resources: ContainerWorkloadResourcesConfig;
};

export type EnrichedWebServiceContainerProps = EnrichedCwContainerProps;

export type EnrichedBjContainerProps = BatchJobContainer & {
  workloadName: string;
  workloadType: StpWorkloadType;
  jobName: string;
  resources: BatchJobResources;
};
