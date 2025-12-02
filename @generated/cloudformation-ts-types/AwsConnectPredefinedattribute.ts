// This file is auto-generated. Do not edit manually.
// Source: aws-connect-predefinedattribute.json

/** Resource Type definition for AWS::Connect::PredefinedAttribute */
export type AwsConnectPredefinedattribute = {
  /**
   * The identifier of the Amazon Connect instance.
   * @pattern ^arn:aws[-a-z0-9]*:connect:[-a-z0-9]*:[0-9]{12}:instance/[-a-zA-Z0-9]*$
   */
  InstanceArn: string;
  /**
   * The name of the predefined attribute.
   * @minLength 1
   * @maxLength 100
   */
  Name: string;
  /** The values of a predefined attribute. */
  Values?: {
    StringList?: string[];
  };
  /**
   * The assigned purposes of the predefined attribute.
   * @minItems 1
   * @maxItems 10
   */
  Purposes?: string[];
  /**
   * Custom metadata associated to a Predefined attribute that controls how the attribute behaves when
   * used by upstream services.
   */
  AttributeConfiguration?: {
    /**
     * Enables customers to enforce strict validation on the specific values that this predefined
     * attribute can hold.
     */
    EnableValueValidationOnAssociation?: boolean;
    /** Allows the predefined attribute to show up and be managed in the Amazon Connect UI. */
    IsReadOnly?: boolean;
  };
  /**
   * Last modified region.
   * @pattern [a-z]{2}(-[a-z]+){1,2}(-[0-9])?
   */
  LastModifiedRegion?: string;
  /** Last modified time. */
  LastModifiedTime?: number;
};
