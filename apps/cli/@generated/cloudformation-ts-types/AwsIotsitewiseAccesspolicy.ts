// This file is auto-generated. Do not edit manually.
// Source: aws-iotsitewise-accesspolicy.json

/** Resource schema for AWS::IoTSiteWise::AccessPolicy */
export type AwsIotsitewiseAccesspolicy = {
  /** The ID of the access policy. */
  AccessPolicyId?: string;
  /** The ARN of the access policy. */
  AccessPolicyArn?: string;
  /** The identity for this access policy. Choose either a user or a group but not both. */
  AccessPolicyIdentity: {
    User?: {
      /** The AWS SSO ID of the user. */
      id?: string;
    };
    IamUser?: {
      /** The ARN of the IAM user. */
      arn?: string;
    };
    IamRole?: {
      /** The ARN of the IAM role. */
      arn?: string;
    };
  };
  /** The permission level for this access policy. Valid values are ADMINISTRATOR or VIEWER. */
  AccessPolicyPermission: string;
  /**
   * The AWS IoT SiteWise Monitor resource for this access policy. Choose either portal or project but
   * not both.
   */
  AccessPolicyResource: {
    Portal?: {
      /** The ID of the portal. */
      id?: string;
    };
    Project?: {
      /** The ID of the project. */
      id?: string;
    };
  };
};
