import { buildResourceName } from './utils';

export const helperLambdaAwsResourceNames = {
  originRequestEdgeLambda(stackName: string, region: string) {
    return buildResourceName({
      proposedResourceName: `${stackName}-stpOReq-${region}`,
      lengthLimit: 64
    });
  },
  originResponseEdgeLambda(stackName: string, region: string) {
    return buildResourceName({
      proposedResourceName: `${stackName}-stpORes-${region}`,
      lengthLimit: 64
    });
  },
  edgeDeploymentBucket(globallyUniqueStackHash: string) {
    return `stp-edge-deployment-bucket-${globallyUniqueStackHash}`;
  }
};
