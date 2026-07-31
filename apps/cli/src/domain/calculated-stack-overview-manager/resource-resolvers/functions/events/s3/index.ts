import type {
  StpHelperLambdaFunction,
  StpLambdaFunction
} from '@domain-services/config-manager/resolved-types/functions';
import type { StpIamRoleStatement } from '@stacktape/config/shared';
export const resolveS3Events = ({
  lambdaFunction: _
}: {
  lambdaFunction: StpLambdaFunction | StpHelperLambdaFunction;
}): StpIamRoleStatement[] => {
  // @note actual resolving of s3 events is done in helper-lambdas/stacktapeServiceLambda.ts

  return [];
};
