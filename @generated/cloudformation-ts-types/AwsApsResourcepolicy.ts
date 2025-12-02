// This file is auto-generated. Do not edit manually.
// Source: aws-aps-resourcepolicy.json

/** Resource Type definition for AWS::APS::ResourcePolicy */
export type AwsApsResourcepolicy = {
  /**
   * The Arn of an APS Workspace that the PolicyDocument will be attached to.
   * @pattern ^arn:(aws|aws-us-gov|aws-cn):aps:[a-z0-9-]+:[0-9]+:workspace/[a-zA-Z0-9-]+$
   */
  WorkspaceArn: string;
  /** The JSON to use as the Resource-based Policy. */
  PolicyDocument: string;
};
