import type { Output } from '@aws-sdk/client-cloudformation';
import { outputNames } from '@stacktape/naming/stack-output-names';

/**
 * Whether the next deploy of the stage is its first one: the stack does not exist, or no deploy of it has completed.
 *
 * A first deploy creates the deployment bucket, image repository and service log group as the stack's first operation,
 * while the workloads build. When the build, upload or full stack update then fails, the stack keeps only those
 * resources. Every completed deploy records its version as a stack output, and a failed update does not change the
 * outputs, so a stack without that output has never been deployed.
 */
export const isFirstDeployOfStack = (stack: { Outputs?: Pick<Output, 'OutputKey'>[] } | null | undefined): boolean =>
  !stack?.Outputs?.some(({ OutputKey }) => OutputKey === outputNames.deploymentVersion());
