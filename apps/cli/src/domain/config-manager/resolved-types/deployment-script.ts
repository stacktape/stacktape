import type { StpLambdaFunction } from '@domain-services/config-manager/resolved-types/functions';
import type { DeploymentScript } from '@stacktape/config/deployment-script';

export type StpDeploymentScript = DeploymentScript['properties'] & {
  name: string;
  type: DeploymentScript['type'];
  configParentResourceType: DeploymentScript['type'];
  nameChain: string[];
  _nestedResources: {
    scriptFunction: StpLambdaFunction;
  };
};
