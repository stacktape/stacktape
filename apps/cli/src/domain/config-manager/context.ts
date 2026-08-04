import type { StackContext } from '@domain-services/stack-context';
import type { HelperLambdaDetails } from '@utils/helper-lambdas';
import type { ConfigResolverContext } from './config-resolver';

export type IssueDetectionContext = Readonly<{
  organization?: Readonly<{
    issuesAllProjectsEnabled?: boolean;
    issuesEnabledStages?: readonly string[];
    issuesEventSamplingRate?: number;
  }>;
  projects?: readonly Readonly<{
    issuesEnabled?: boolean;
    name: string;
  }>[];
}>;

/** Inputs captured by the command composition layer before configuration normalization begins. */
export type ConfigManagerInitContext = Readonly<{
  helperLambdaDetails: HelperLambdaDetails;
  issueDetection: IssueDetectionContext;
  resolver: ConfigResolverContext;
  stack: StackContext;
}>;
