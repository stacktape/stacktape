// This file is auto-generated. Do not edit manually.
// Source: aws-qbusiness-permission.json

/** Definition of AWS::QBusiness::Permission Resource Type */
export type AwsQbusinessPermission = {
  /**
   * @minLength 36
   * @maxLength 36
   * @pattern ^[a-zA-Z0-9][a-zA-Z0-9-]{35}$
   */
  ApplicationId: string;
  /**
   * @minLength 1
   * @maxLength 100
   * @pattern ^[a-zA-Z0-9_-]+$
   */
  StatementId: string;
  /**
   * @minItems 1
   * @maxItems 10
   */
  Actions: string[];
  /**
   * @minItems 1
   * @maxItems 10
   */
  Conditions?: {
    /** @enum ["StringEquals"] */
    ConditionOperator: "StringEquals";
    /** @pattern ^aws:PrincipalTag/qbusiness-dataaccessor:[a-zA-Z]+ */
    ConditionKey: string;
    /**
     * @minItems 1
     * @maxItems 1
     * @pattern ^[a-zA-Z0-9][a-zA-Z0-9_-]*$
     */
    ConditionValues: string[];
  }[];
  /**
   * @minLength 1
   * @maxLength 1284
   * @pattern ^arn:aws:iam::[0-9]{12}:role/[a-zA-Z0-9_/+=,.@-]+$
   */
  Principal: string;
};
