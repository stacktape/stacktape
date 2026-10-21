import type { SecurityScanningLevel } from '@stacktape/console-api/security';
import type { StackContext } from '@domain-services/stack-context';
import type { HelperLambdaDetails } from '@utils/helper-lambdas';
import type { ConfigResolverContext } from './config-resolver';

/** What the Console checks for deploys into the target AWS account, as it reported it for this session. */
export type SecurityScanningAccount = Readonly<{
  name: string;
  /** Absent from an older Console: scanning then follows the config file alone. */
  securityScanning?: SecurityScanningLevel;
}>;

export type SecurityScanningContext = Readonly<{
  /** Read only when the policy is needed: the target account may not be resolved yet when the context is built. */
  awsAccount?: () => SecurityScanningAccount | undefined;
}>;

/** Inputs captured by the command composition layer before configuration normalization begins. */
export type ConfigManagerInitContext = Readonly<{
  helperLambdaDetails: HelperLambdaDetails;
  /** Absent when the command never loaded organization data; scanning then follows the config file alone. */
  securityScanning?: SecurityScanningContext;
  resolver: ConfigResolverContext;
  stack: StackContext;
}>;
