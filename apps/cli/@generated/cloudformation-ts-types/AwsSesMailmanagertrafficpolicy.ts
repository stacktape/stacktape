// This file is auto-generated. Do not edit manually.
// Source: aws-ses-mailmanagertrafficpolicy.json

/** Definition of AWS::SES::MailManagerTrafficPolicy Resource Type */
export type AwsSesMailmanagertrafficpolicy = {
  DefaultAction: "ALLOW" | "DENY";
  /** @minimum 1 */
  MaxMessageSizeBytes?: number;
  PolicyStatements: ({
    /** @minItems 1 */
    Conditions: ({
      StringExpression: {
        Evaluate: {
          Attribute: "RECIPIENT";
        } | {
          Analysis: {
            /** @pattern ^[a-zA-Z0-9:_/+=,@.#-]+$ */
            Analyzer: string;
            /**
             * @minLength 1
             * @maxLength 256
             * @pattern ^(addon\.)?[\sa-zA-Z0-9_]+$
             */
            ResultField: string;
          };
        };
        Operator: "EQUALS" | "NOT_EQUALS" | "STARTS_WITH" | "ENDS_WITH" | "CONTAINS";
        Values: string[];
      };
    } | {
      IpExpression: {
        Evaluate: {
          Attribute: "SENDER_IP";
        };
        Operator: "CIDR_MATCHES" | "NOT_CIDR_MATCHES";
        Values: string[];
      };
    } | {
      Ipv6Expression: {
        Evaluate: {
          Attribute: "SENDER_IPV6";
        };
        Operator: "CIDR_MATCHES" | "NOT_CIDR_MATCHES";
        Values: string[];
      };
    } | {
      TlsExpression: {
        Evaluate: {
          Attribute: "TLS_PROTOCOL";
        };
        Operator: "MINIMUM_TLS_VERSION" | "IS";
        Value: "TLS1_2" | "TLS1_3";
      };
    } | {
      BooleanExpression: {
        Evaluate: {
          Analysis: {
            /** @pattern ^[a-zA-Z0-9:_/+=,@.#-]+$ */
            Analyzer: string;
            /**
             * @minLength 1
             * @maxLength 256
             * @pattern ^(addon\.)?[\sa-zA-Z0-9_]+$
             */
            ResultField: string;
          };
        } | {
          IsInAddressList: {
            Attribute: "RECIPIENT";
            /**
             * @minItems 1
             * @maxItems 1
             * @uniqueItems true
             */
            AddressLists: string[];
          };
        };
        Operator: "IS_TRUE" | "IS_FALSE";
      };
    })[];
    Action: "ALLOW" | "DENY";
  })[];
  /**
   * @minItems 0
   * @maxItems 200
   */
  Tags?: {
    /**
     * @minLength 1
     * @maxLength 128
     * @pattern ^[a-zA-Z0-9/_\+=\.:@\-]+$
     */
    Key: string;
    /**
     * @minLength 0
     * @maxLength 256
     * @pattern ^[a-zA-Z0-9/_\+=\.:@\-]*$
     */
    Value: string;
  }[];
  TrafficPolicyArn?: string;
  /**
   * @minLength 1
   * @maxLength 100
   */
  TrafficPolicyId?: string;
  /**
   * @minLength 3
   * @maxLength 63
   * @pattern ^[A-Za-z0-9_\-]+$
   */
  TrafficPolicyName?: string;
};
