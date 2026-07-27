// This file is auto-generated. Do not edit manually.
// Source: aws-cloudformation-publisher.json

/** Register as a publisher in the CloudFormation Registry. */
export type AwsCloudformationPublisher = {
  /**
   * Whether you accept the terms and conditions for publishing extensions in the CloudFormation
   * registry. You must accept the terms and conditions in order to publish public extensions to the
   * CloudFormation registry. The terms and conditions can be found at
   * https://cloudformation-registry-documents.s3.amazonaws.com/Terms_and_Conditions_for_AWS_CloudFormation_Registry_Publishers.pdf
   */
  AcceptTermsAndConditions: boolean;
  /**
   * The reserved publisher id for this type, or the publisher id assigned by CloudFormation for
   * publishing in this region.
   * @minLength 1
   * @maxLength 40
   * @pattern [0-9a-zA-Z-]{1,40}
   */
  PublisherId?: string;
  /**
   * If you are using a Bitbucket or GitHub account for identity verification, the Amazon Resource Name
   * (ARN) for your connection to that account.
   * @pattern arn:aws(-[w]+)*:.+:.+:[0-9]{12}:.+
   */
  ConnectionArn?: string;
  /**
   * Whether the publisher is verified.
   * @enum ["VERIFIED","UNVERIFIED"]
   */
  PublisherStatus?: "VERIFIED" | "UNVERIFIED";
  /**
   * The URL to the publisher's profile with the identity provider.
   * @maxLength 1024
   * @pattern (http:|https:)+[^s]+[w]
   */
  PublisherProfile?: string;
  /**
   * The type of account used as the identity provider when registering this publisher with
   * CloudFormation.
   * @enum ["AWS_Marketplace","GitHub","Bitbucket"]
   */
  IdentityProvider?: "AWS_Marketplace" | "GitHub" | "Bitbucket";
};
