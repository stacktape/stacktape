import type { SupportedAWSRegion } from '@stacktape/config/aws-regions';
import type { StacktapeCommand } from 'src/config/cli/types';

/** Stable stack identity and invocation data shared by config normalization and synthesis. */
export type StackContext = Readonly<{
  accountId: string;
  command: StacktapeCommand;
  globallyUniqueStackHash: string;
  invocationId: string;
  projectName: string;
  region: SupportedAWSRegion;
  stackName: string;
  stage: string;
  workingDir: string;
}>;
