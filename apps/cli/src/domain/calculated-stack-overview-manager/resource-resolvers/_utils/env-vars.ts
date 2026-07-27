import type { Value as CfValue } from '@cloudform/dataTypes';
import { configManager } from '@domain-services/config-manager';
import { isCloudformationFunction } from '@utils/cloudformation';

export const resolveDirectivesForEnvironmentVariables = async ({
  vars,
  useLocalResolve
}: {
  vars: { Name: string; Value: CfValue<string> }[];
  useLocalResolve?: boolean;
}): Promise<{ Name: string; Value: CfValue<string> }[]> => {
  const resolvedVars = await configManager.resolveDirectives<{ Name: string; Value: CfValue<string> }[]>({
    itemToResolve: vars,
    resolveRuntime: true,
    useLocalResolve
  });
  return resolvedVars.map(({ Name, Value }) => {
    if (isCloudformationFunction(Value)) {
      return { Name, Value };
    }
    return { Name, Value: String(Value) };
  });
};
