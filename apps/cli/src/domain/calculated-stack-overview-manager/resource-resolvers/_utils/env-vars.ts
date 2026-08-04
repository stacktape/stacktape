import { isIntrinsic, type CloudFormationValue } from '@stacktape/cloudformation/intrinsics';

import { configManager } from '@domain-services/config-manager';

export const resolveDirectivesForEnvironmentVariables = async ({
  vars,
  useLocalResolve
}: {
  vars: { Name: string; Value: CloudFormationValue<string> }[];
  useLocalResolve?: boolean;
}): Promise<{ Name: string; Value: CloudFormationValue<string> }[]> => {
  const resolvedVars = await configManager.resolveDirectives<{ Name: string; Value: CloudFormationValue<string> }[]>({
    itemToResolve: vars,
    resolveRuntime: true,
    useLocalResolve
  });
  return resolvedVars.map(({ Name, Value }) => {
    if (isIntrinsic(Value)) {
      return { Name, Value };
    }
    return { Name, Value: String(Value) };
  });
};
