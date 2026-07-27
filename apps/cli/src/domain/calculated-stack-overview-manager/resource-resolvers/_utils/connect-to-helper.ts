import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { deployedStackOverviewManager } from '@domain-services/deployed-stack-overview-manager';
import { injectedParameterEnvVarName } from '@shared/naming/utils';
import { isCloudformationFunction } from '@utils/cloudformation';

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
            Value: (isCloudformationFunction(param.value) ? param.value : `${param.value}`) as string
          };
        });
      }
      return [];
    })
    .flat()
    .filter(Boolean);
};
