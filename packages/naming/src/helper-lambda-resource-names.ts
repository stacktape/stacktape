import { buildResourceName } from './resource-names';

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
  },
  /** One prober function per (account, region), shared by every stack that defines uptime checks there. */
  uptimeProberFunction() {
    return 'stacktape-uptime-prober';
  },
  /** IAM roles are account-global; one role serves the prober function in every region. */
  uptimeProberRole() {
    return 'stacktape-uptime-prober-role';
  },
  uptimeProberScheduleRule() {
    return 'stacktape-uptime-prober-tick';
  },
  uptimeProberLogGroup() {
    return `/aws/lambda/${this.uptimeProberFunction()}`;
  },
  /** Regional staging bucket for the prober artifact, shared by every stack in the account. */
  uptimeProberArtifactsBucket(accountIdShortHash: string, region: string) {
    return `stp-uptime-prober-${accountIdShortHash}-${region}`;
  },
  uptimeManifestParameterPrefix() {
    return '/stacktape/uptime-checks';
  },
  /** One SSM parameter per (stack, check) under the shared prefix, written into every probe region. */
  uptimeManifestParameter(stackName: string, checkName: string) {
    return `${this.uptimeManifestParameterPrefix()}/${stackName}/${checkName}`;
  }
};
