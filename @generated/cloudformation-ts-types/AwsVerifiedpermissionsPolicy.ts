// This file is auto-generated. Do not edit manually.
// Source: aws-verifiedpermissions-policy.json

/** Definition of AWS::VerifiedPermissions::Policy Resource Type */
export type AwsVerifiedpermissionsPolicy = {
  Definition: {
    Static: {
      /**
       * @minLength 0
       * @maxLength 150
       */
      Description?: string;
      /**
       * @minLength 1
       * @maxLength 10000
       */
      Statement: string;
    };
  } | {
    TemplateLinked: {
      /**
       * @minLength 1
       * @maxLength 200
       * @pattern ^[a-zA-Z0-9-]*$
       */
      PolicyTemplateId: string;
      Principal?: {
        /**
         * @minLength 1
         * @maxLength 200
         * @pattern ^.*$
         */
        EntityType: string;
        /**
         * @minLength 1
         * @maxLength 200
         * @pattern ^.*$
         */
        EntityId: string;
      };
      Resource?: {
        /**
         * @minLength 1
         * @maxLength 200
         * @pattern ^.*$
         */
        EntityType: string;
        /**
         * @minLength 1
         * @maxLength 200
         * @pattern ^.*$
         */
        EntityId: string;
      };
    };
  };
  /**
   * @minLength 1
   * @maxLength 200
   * @pattern ^[a-zA-Z0-9-]*$
   */
  PolicyId?: string;
  /**
   * @minLength 1
   * @maxLength 200
   * @pattern ^[a-zA-Z0-9-]*$
   */
  PolicyStoreId: string;
  PolicyType?: "STATIC" | "TEMPLATE_LINKED";
};
