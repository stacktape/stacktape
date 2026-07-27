// This file is auto-generated. Do not edit manually.
// Source: aws-connect-trafficdistributiongroup.json

/** Resource Type definition for AWS::Connect::TrafficDistributionGroup */
export type AwsConnectTrafficdistributiongroup = {
  /**
   * The identifier of the Amazon Connect instance that has been replicated.
   * @minLength 1
   * @maxLength 250
   * @pattern ^arn:(aws|aws-us-gov):connect:[a-z]{2}-[a-z]+-[0-9]{1}:[0-9]{1,20}:instance/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$
   */
  InstanceArn: string;
  /**
   * The identifier of the traffic distribution group.
   * @pattern ^arn:(aws|aws-us-gov):connect:[a-z]{2}-[a-z]+-[0-9]{1}:[0-9]{1,20}:traffic-distribution-group/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$
   */
  TrafficDistributionGroupArn?: string;
  /**
   * A description for the traffic distribution group.
   * @minLength 1
   * @maxLength 250
   * @pattern (^[\S].*[\S]$)|(^[\S]$)
   */
  Description?: string;
  /**
   * The name for the traffic distribution group.
   * @minLength 1
   * @maxLength 128
   * @pattern (^[\S].*[\S]$)|(^[\S]$)
   */
  Name: string;
  /**
   * The status of the traffic distribution group.
   * @enum ["CREATION_IN_PROGRESS","ACTIVE","CREATION_FAILED","PENDING_DELETION","DELETION_FAILED","UPDATE_IN_PROGRESS"]
   */
  Status?: "CREATION_IN_PROGRESS" | "ACTIVE" | "CREATION_FAILED" | "PENDING_DELETION" | "DELETION_FAILED" | "UPDATE_IN_PROGRESS";
  /**
   * One or more tags.
   * @maxItems 50
   * @uniqueItems true
   */
  Tags?: {
    /**
     * The key name of the tag. You can specify a value that is 1 to 128 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
    /**
     * The value for the tag. You can specify a value that is 1 to 256 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 1
     * @maxLength 256
     */
    Value: string;
  }[];
  /** If this is the default traffic distribution group. */
  IsDefault?: boolean;
};
