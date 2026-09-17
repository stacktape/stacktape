import type { StackContext } from '@domain-services/stack-context';
import type { HelperLambdaDetails } from '@utils/helper-lambdas';
import type { ConfigResolverContext } from './config-resolver';

/** The organization-wide security scanning switch, as the Console reported it for this session. */
export type SecurityScanningContext = Readonly<{
  organization?: Readonly<{
    securityScanningEnabled?: boolean;
  }>;
}>;

/** Inputs captured by the command composition layer before configuration normalization begins. */
export type ConfigManagerInitContext = Readonly<{
  helperLambdaDetails: HelperLambdaDetails;
  /** Absent when the command never loaded organization data; scanning then follows the config file alone. */
  securityScanning?: SecurityScanningContext;
  resolver: ConfigResolverContext;
  stack: StackContext;
}>;
