// This file is auto-generated. Do not edit manually.
// Source: aws-networkfirewall-rulegroup.json

/** Resource type definition for AWS::NetworkFirewall::RuleGroup */
export type AwsNetworkfirewallRulegroup = {
  /**
   * @minLength 1
   * @maxLength 128
   * @pattern ^[a-zA-Z0-9-]+$
   */
  RuleGroupName: string;
  RuleGroupArn?: string;
  /**
   * @minLength 36
   * @maxLength 36
   * @pattern ^([0-9a-f]{8})-([0-9a-f]{4}-){3}([0-9a-f]{12})$
   */
  RuleGroupId?: string;
  RuleGroup?: {
    RuleVariables?: {
      IPSets?: Record<string, {
        /** @uniqueItems false */
        Definition?: string[];
      }>;
      PortSets?: Record<string, {
        /** @uniqueItems false */
        Definition?: string[];
      }>;
    };
    ReferenceSets?: {
      IPSetReferences?: Record<string, {
        ReferenceArn?: string;
      }>;
    };
    RulesSource: {
      RulesString?: string;
      RulesSourceList?: {
        /** @uniqueItems false */
        Targets: string[];
        /** @uniqueItems false */
        TargetTypes: ("TLS_SNI" | "HTTP_HOST")[];
        GeneratedRulesType: "ALLOWLIST" | "DENYLIST" | "ALERTLIST" | "REJECTLIST";
      };
      /** @uniqueItems false */
      StatefulRules?: ({
        /** @enum ["PASS","DROP","ALERT","REJECT"] */
        Action: "PASS" | "DROP" | "ALERT" | "REJECT";
        Header: {
          /** @enum ["IP","TCP","UDP","ICMP","HTTP","FTP","TLS","SMB","DNS","DCERPC","SSH","SMTP","IMAP","MSN","KRB5","IKEV2","TFTP","NTP","DHCP"] */
          Protocol: "IP" | "TCP" | "UDP" | "ICMP" | "HTTP" | "FTP" | "TLS" | "SMB" | "DNS" | "DCERPC" | "SSH" | "SMTP" | "IMAP" | "MSN" | "KRB5" | "IKEV2" | "TFTP" | "NTP" | "DHCP";
          /**
           * @minLength 1
           * @maxLength 1024
           * @pattern ^.*$
           */
          Source: string;
          SourcePort: string;
          /** @enum ["FORWARD","ANY"] */
          Direction: "FORWARD" | "ANY";
          /**
           * @minLength 1
           * @maxLength 1024
           * @pattern ^.*$
           */
          Destination: string;
          DestinationPort: string;
        };
        /** @uniqueItems false */
        RuleOptions: {
          /**
           * @minLength 1
           * @maxLength 128
           * @pattern ^.*$
           */
          Keyword: string;
          /** @uniqueItems false */
          Settings?: string[];
        }[];
      })[];
      StatelessRulesAndCustomActions?: {
        /** @uniqueItems false */
        StatelessRules: ({
          RuleDefinition: {
            MatchAttributes: {
              /** @uniqueItems false */
              Sources?: {
                /**
                 * @minLength 1
                 * @maxLength 255
                 * @pattern ^([a-fA-F\d:\.]+/\d{1,3})$
                 */
                AddressDefinition: string;
              }[];
              /** @uniqueItems false */
              Destinations?: {
                /**
                 * @minLength 1
                 * @maxLength 255
                 * @pattern ^([a-fA-F\d:\.]+/\d{1,3})$
                 */
                AddressDefinition: string;
              }[];
              /** @uniqueItems false */
              SourcePorts?: {
                FromPort: number;
                ToPort: number;
              }[];
              /** @uniqueItems false */
              DestinationPorts?: {
                FromPort: number;
                ToPort: number;
              }[];
              /** @uniqueItems false */
              Protocols?: number[];
              /** @uniqueItems false */
              TCPFlags?: ({
                /** @uniqueItems false */
                Flags: ("FIN" | "SYN" | "RST" | "PSH" | "ACK" | "URG" | "ECE" | "CWR")[];
                /** @uniqueItems false */
                Masks?: ("FIN" | "SYN" | "RST" | "PSH" | "ACK" | "URG" | "ECE" | "CWR")[];
              })[];
            };
            /** @uniqueItems false */
            Actions: string[];
          };
          /**
           * @minimum 1
           * @maximum 65535
           */
          Priority: number;
        })[];
        /** @uniqueItems false */
        CustomActions?: {
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
      };
    };
    StatefulRuleOptions?: {
      RuleOrder?: "DEFAULT_ACTION_ORDER" | "STRICT_ORDER";
    };
  };
  /** @enum ["STATELESS","STATEFUL"] */
  Type: "STATELESS" | "STATEFUL";
  Capacity: number;
  SummaryConfiguration?: {
    /** @uniqueItems false */
    RuleOptions?: ("SID" | "MSG" | "METADATA")[];
  };
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
