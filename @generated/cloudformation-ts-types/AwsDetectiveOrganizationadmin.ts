// This file is auto-generated. Do not edit manually.
// Source: aws-detective-organizationadmin.json

/** Resource schema for AWS::Detective::OrganizationAdmin */
export type AwsDetectiveOrganizationadmin = {
  /**
   * The account ID of the account that should be registered as your Organization's delegated
   * administrator for Detective
   * @pattern [0-9]{12}
   */
  AccountId: string;
  /** The Detective graph ARN */
  GraphArn?: string;
};
