// This file is auto-generated. Do not edit manually.
// Source: aws-cleanrooms-idmappingtable.json

/** Represents an association between an ID mapping workflow and a collaboration */
export type AwsCleanroomsIdmappingtable = {
  IdMappingTableIdentifier?: string;
  /** @maxLength 200 */
  Arn?: string;
  InputReferenceConfig: {
    /**
     * @minLength 20
     * @maxLength 2048
     */
    InputReferenceArn: string;
    ManageResourcePolicies: boolean;
  };
  MembershipIdentifier: string;
  /** @maxLength 100 */
  MembershipArn?: string;
  CollaborationIdentifier?: string;
  /** @maxLength 100 */
  CollaborationArn?: string;
  /**
   * @maxLength 255
   * @pattern ^[\u0020-\uD7FF\uE000-\uFFFD\uD800\uDBFF-\uDC00\uDFFF\t\r\n]*$
   */
  Description?: string;
  /**
   * @maxLength 128
   * @pattern ^[a-zA-Z0-9_](([a-zA-Z0-9_ ]+-)*([a-zA-Z0-9_ ]+))?$
   */
  Name: string;
  InputReferenceProperties?: {
    /**
     * @minItems 2
     * @maxItems 2
     */
    IdMappingTableInputSource: ({
      IdNamespaceAssociationId: string;
      /** @enum ["SOURCE","TARGET"] */
      Type: "SOURCE" | "TARGET";
    })[];
  };
  /**
   * @minLength 4
   * @maxLength 2048
   */
  KmsKeyArn?: string;
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
};
