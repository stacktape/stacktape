// This file is auto-generated. Do not edit manually.
// Source: aws-route53profiles-profileresourceassociation.json

/** Resource Type definition for AWS::Route53Profiles::ProfileResourceAssociation */
export type AwsRoute53profilesProfileresourceassociation = {
  /** The ID of the  profile that you associated the resource to that is specified by ResourceArn. */
  ProfileId: string;
  /** Primary Identifier for  Profile Resource Association */
  Id?: string;
  /** The name of an association between the  Profile and resource. */
  Name: string;
  /** The arn of the resource that you associated to the  Profile. */
  ResourceArn: string;
  /** A JSON-formatted string with key-value pairs specifying the properties of the associated resource. */
  ResourceProperties?: string;
  /** The type of the resource associated to the  Profile. */
  ResourceType?: string;
};
