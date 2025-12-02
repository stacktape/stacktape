// This file is auto-generated. Do not edit manually.
// Source: aws-vpclattice-authpolicy.json

/** Creates or updates the auth policy. */
export type AwsVpclatticeAuthpolicy = {
  /**
   * @minLength 17
   * @maxLength 200
   * @pattern ^((((sn)|(svc))-[0-9a-z]{17})|(arn(:[a-z0-9]+([.-][a-z0-9]+)*){2}(:([a-z0-9]+([.-][a-z0-9]+)*)?){2}:((servicenetwork/sn)|(service/svc))-[0-9a-z]{17}))$
   */
  ResourceIdentifier: string;
  Policy: Record<string, unknown>;
  /** @enum ["ACTIVE","INACTIVE"] */
  State?: "ACTIVE" | "INACTIVE";
};
