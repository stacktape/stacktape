// This file is auto-generated. Do not edit manually.
// Source: aws-nimblestudio-studio.json

/** Represents a studio that contains other Nimble Studio resources */
export type AwsNimblestudioStudio = {
  /** <p>The IAM role that Studio Admins will assume when logging in to the Nimble Studio portal.</p> */
  AdminRoleArn: string;
  /**
   * <p>A friendly name for the studio.</p>
   * @minLength 0
   * @maxLength 64
   */
  DisplayName: string;
  /**
   * <p>The Amazon Web Services Region where the studio resource is located.</p>
   * @minLength 0
   * @maxLength 50
   * @pattern [a-z]{2}-?(iso|gov)?-{1}[a-z]*-{1}[0-9]
   */
  HomeRegion?: string;
  /**
   * <p>The Amazon Web Services SSO application client ID used to integrate with Amazon Web Services SSO
   * to enable Amazon Web Services SSO users to log in to Nimble Studio portal.</p>
   */
  SsoClientId?: string;
  StudioEncryptionConfiguration?: {
    KeyType: "AWS_OWNED_KEY" | "CUSTOMER_MANAGED_KEY";
    /**
     * <p>The ARN for a KMS key that is used to encrypt studio data.</p>
     * @minLength 4
     * @pattern ^arn:.*
     */
    KeyArn?: string;
  };
  StudioId?: string;
  /**
   * <p>The studio name that is used in the URL of the Nimble Studio portal when accessed by Nimble
   * Studio users.</p>
   * @minLength 3
   * @maxLength 64
   * @pattern ^[a-z0-9]*$
   */
  StudioName: string;
  /** <p>The address of the web page for the studio.</p> */
  StudioUrl?: string;
  Tags?: Record<string, string>;
  /** <p>The IAM role that Studio Users will assume when logging in to the Nimble Studio portal.</p> */
  UserRoleArn: string;
};
