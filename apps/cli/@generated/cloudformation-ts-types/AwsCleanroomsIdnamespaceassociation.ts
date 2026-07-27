// This file is auto-generated. Do not edit manually.
// Source: aws-cleanrooms-idnamespaceassociation.json

/** Represents an association between an ID namespace and a collaboration */
export type AwsCleanroomsIdnamespaceassociation = {
  IdNamespaceAssociationIdentifier?: string;
  /** @maxLength 256 */
  Arn?: string;
  MembershipIdentifier: string;
  /** @maxLength 100 */
  MembershipArn?: string;
  CollaborationIdentifier?: string;
  /** @maxLength 100 */
  CollaborationArn?: string;
  InputReferenceConfig: {
    /** @maxLength 256 */
    InputReferenceArn: string;
    ManageResourcePolicies: boolean;
  };
  /** @uniqueItems true */
  Tags?: {
    /**
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
    /**
     * @minLength 1
     * @maxLength 256
     */
    Value: string;
  }[];
  /**
   * @minLength 1
   * @maxLength 100
   * @pattern ^(?!\s*$)[\u0020-\uD7FF\uE000-\uFFFD\uD800\uDBFF-\uDC00\uDFFF\t]*$
   */
  Name: string;
  /**
   * @maxLength 255
   * @pattern ^[\u0020-\uD7FF\uE000-\uFFFD\uD800\uDBFF-\uDC00\uDFFF\t\r\n]*$
   */
  Description?: string;
  IdMappingConfig?: {
    AllowUseAsDimensionColumn: boolean;
  };
  InputReferenceProperties?: {
    /** @enum ["SOURCE","TARGET"] */
    IdNamespaceType?: "SOURCE" | "TARGET";
    IdMappingWorkflowsSupported?: Record<string, unknown>[];
  };
};
