// This file is auto-generated. Do not edit manually.
// Source: aws-networkfirewall-firewallpolicy.json

/** Resource type definition for AWS::NetworkFirewall::FirewallPolicy */
export type AwsNetworkfirewallFirewallpolicy = {
  /**
   * @minLength 1
   * @maxLength 128
   * @pattern ^[a-zA-Z0-9-]+$
   */
  FirewallPolicyName: string;
  FirewallPolicyArn?: string;
  FirewallPolicy: {
    /** @uniqueItems false */
    StatelessDefaultActions: string[];
    /** @uniqueItems false */
    StatelessFragmentDefaultActions: string[];
    /** @uniqueItems false */
    StatelessCustomActions?: {
      /**
       * @minLength 1
       * @maxLength 128
       * @pattern ^[a-zA-Z0-9]+$
       */
      ActionName: string;
      ActionDefinition: {
        PublishMetricAction?: {
          /** @uniqueItems false */
          Dimensions: {
            /**
             * @minLength 1
             * @maxLength 128
             * @pattern ^[a-zA-Z0-9-_ ]+$
             */
            Value: string;
          }[];
        };
      };
    }[];
    /** @uniqueItems false */
    StatelessRuleGroupReferences?: {
      ResourceArn: string;
      Priority: number;
    }[];
    /** @uniqueItems false */
    StatefulRuleGroupReferences?: {
      ResourceArn: string;
      Priority?: number;
      Override?: {
        Action?: "DROP_TO_ALERT";
      };
      DeepThreatInspection?: boolean;
    }[];
    /** @uniqueItems false */
    StatefulDefaultActions?: string[];
    StatefulEngineOptions?: {
      RuleOrder?: "DEFAULT_ACTION_ORDER" | "STRICT_ORDER";
      StreamExceptionPolicy?: "DROP" | "CONTINUE" | "REJECT";
      FlowTimeouts?: {
        /**
         * @minimum 60
         * @maximum 6000
         */
        TcpIdleTimeoutSeconds?: number;
      };
    };
    PolicyVariables?: {
      RuleVariables?: Record<string, {
        /** @uniqueItems false */
        Definition?: string[];
      }>;
    };
    TLSInspectionConfigurationArn?: string;
    EnableTLSSessionHolding?: boolean;
  };
  /**
   * @minLength 36
   * @maxLength 36
   * @pattern ^([0-9a-f]{8})-([0-9a-f]{4}-){3}([0-9a-f]{12})$
   */
  FirewallPolicyId?: string;
  /**
   * @minLength 1
   * @maxLength 512
   * @pattern ^.*$
   */
  Description?: string;
  /** @uniqueItems true */
  Tags?: {
    /**
     * @minLength 1
     * @maxLength 128
     * @pattern ^.*$
     */
    Key: string;
    /**
     * @minLength 0
     * @maxLength 255
     * @pattern ^.*$
     */
    Value: string;
  }[];
};
