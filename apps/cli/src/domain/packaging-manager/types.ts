import type { HelperLambdaData } from '@utils/helper-lambdas';
import type { StpWorkloadType } from '@domain-services/config-manager/resolved-types/resources';
import type { BatchJobContainer, BatchJobResources } from '@stacktape/config/batch-jobs';
import type {
  BatchJobContainerPackaging,
  ContainerWorkloadContainerPackaging,
  LambdaPackaging
} from '@stacktape/config/deployment-artifacts';
import type {
  ContainerWorkloadContainer,
  ContainerWorkloadResourcesConfig
} from '@stacktape/config/multi-container-workloads';

/**
 * Every packaging `type` literal. `buildpack` and `js-bundle` name a Lambda packaging on a function and a container
 * packaging on a service; the resource decides which, so code branching on the literal alone must also know the
 * target.
 */
export type SupportedPackagingType =
  | ContainerWorkloadContainerPackaging['type']
  | BatchJobContainerPackaging['type']
  | LambdaPackaging['type'];

/** What a packaging builds: a Lambda archive or a container image. Decided by the resource, not by the config. */
export type PackagingTarget = 'lambda' | 'container';

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

export type EnrichedBjContainerProps = BatchJobContainer & {
  workloadName: string;
  workloadType: StpWorkloadType;
  jobName: string;
  resources: BatchJobResources;
};
