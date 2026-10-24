import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { deployedStackOverviewManager } from '@domain-services/deployed-stack-overview-manager';
import { injectedParameterEnvVarName } from '@stacktape/naming/workload-names';
import { isIntrinsic } from '@stacktape/cloudformation/intrinsics';
import type { DevNetworkPlacement } from '@domain-services/dev-network/placement';

export const getResolvedConnectToEnvironmentVariables = ({
  connectTo,
  localResolve
}: {
  connectTo: string[];
  localResolve: boolean;
}) => {
  return (connectTo || [])
    .map((stpResourceReference) => {
      const resourceInfo = (
        localResolve ? deployedStackOverviewManager : calculatedStackOverviewManager
      ).getStpResource({ nameChain: stpResourceReference });
      if (resourceInfo) {
        return Object.entries(resourceInfo.referencableParams).map(([paramName, param]) => {
          const varName = injectedParameterEnvVarName(stpResourceReference, paramName);
          return {
            Name: varName,
            Value: (isIntrinsic(param.value) ? param.value : `${param.value}`) as string
          };
        });
      }
      return [];
    })
    .flat()
    .filter(Boolean);
};

export const mergeConnectToEnvironmentVariables = <
  TExplicit extends { Name?: unknown },
  TConnected extends { Name?: unknown }
>(
  explicitVariables: TExplicit[],
  connectToVariables: TConnected[]
): (TExplicit | TConnected)[] => {
  const explicitNames = new Set(explicitVariables.map(({ Name }) => Name));
  return [...explicitVariables, ...connectToVariables.filter(({ Name }) => !explicitNames.has(Name))];
};

/**
 * The variables `connectTo` would inject for each local database a dev function reaches through the dev box, with the
 * relay address, plus what the database's clients need besides them (the DynamoDB endpoint).
 */
export const getDevNetworkEnvironmentVariables = ({
  placement,
  functionName
}: {
  placement: DevNetworkPlacement;
  functionName: string;
}) =>
  (placement.functions[functionName] || []).flatMap((resourceName) => {
    const resource = placement.localResources[resourceName];
    if (!resource) return [];
    return [
      ...Object.entries(resource.params).map(([paramName, value]) => ({
        Name: injectedParameterEnvVarName(resourceName, paramName),
        Value: value
      })),
      ...Object.entries(resource.environment).map(([Name, Value]) => ({ Name, Value }))
    ];
  });
