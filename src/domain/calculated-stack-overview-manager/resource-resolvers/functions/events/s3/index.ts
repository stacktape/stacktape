export const resolveS3Events = ({
  lambdaFunction: _
}: {
  lambdaFunction: StpLambdaFunction | StpHelperLambdaFunction;
}): StpIamRoleStatement[] => {
  // @note actual resolving of s3 events is done in helper-lambdas/stacktapeServiceLambda.ts

  return [];
};
