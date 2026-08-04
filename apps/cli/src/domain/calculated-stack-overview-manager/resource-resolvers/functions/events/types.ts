import type {
  StpHelperLambdaFunction,
  StpLambdaFunction
} from '@domain-services/config-manager/resolved-types/functions';
import type { StpIamRoleStatement } from '@stacktape/config/shared';

export type EventResolverProps = {
  allLambdaResources: (StpLambdaFunction | StpHelperLambdaFunction)[];
  policyStatementsFromEvents: { [workloadName: string]: StpIamRoleStatement[] };
};
