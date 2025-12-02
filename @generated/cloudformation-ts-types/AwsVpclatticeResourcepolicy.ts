// This file is auto-generated. Do not edit manually.
// Source: aws-vpclattice-resourcepolicy.json

/**
 * Retrieves information about the resource policy. The resource policy is an IAM policy created by
 * AWS RAM on behalf of the resource owner when they share a resource.
 */
export type AwsVpclatticeResourcepolicy = {
  /**
   * @minLength 20
   * @maxLength 200
   * @pattern ^arn(:[a-z0-9]+([.-][a-z0-9]+)*){2}(:([a-z0-9]+([.-][a-z0-9]+)*)?){2}:((servicenetwork/sn)|(service/svc)|(resourceconfiguration/rcfg))-[0-9a-z]{17}$
   */
  ResourceArn: string;
  Policy: Record<string, unknown>;
};
