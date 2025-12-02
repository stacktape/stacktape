// This file is auto-generated. Do not edit manually.
// Source: aws-ec2-trafficmirrorfilterrule.json

/** Resource Type definition for for AWS::EC2::TrafficMirrorFilterRule */
export type AwsEc2Trafficmirrorfilterrule = {
  /** The destination port range. */
  DestinationPortRange?: {
    /** The first port in the Traffic Mirror port range. */
    FromPort: number;
    /** The last port in the Traffic Mirror port range. */
    ToPort: number;
  };
  /** The description of the Traffic Mirror Filter rule. */
  Description?: string;
  /** The source port range. */
  SourcePortRange?: {
    /** The first port in the Traffic Mirror port range. */
    FromPort: number;
    /** The last port in the Traffic Mirror port range. */
    ToPort: number;
  };
  /** The action to take on the filtered traffic (accept/reject). */
  RuleAction: string;
  /** The source CIDR block to assign to the Traffic Mirror Filter rule. */
  SourceCidrBlock: string;
  /** The number of the Traffic Mirror rule. */
  RuleNumber: number;
  /** The destination CIDR block to assign to the Traffic Mirror rule. */
  DestinationCidrBlock: string;
  /** The ID of the Traffic Mirror Filter rule. */
  TrafficMirrorFilterRuleId?: string;
  /** The ID of the filter that this rule is associated with. */
  TrafficMirrorFilterId: string;
  /** The direction of traffic (ingress/egress). */
  TrafficDirection: string;
  /** The number of protocol, for example 17 (UDP), to assign to the Traffic Mirror rule. */
  Protocol?: number;
  /**
   * Any tags assigned to the Traffic Mirror Filter rule.
   * @uniqueItems false
   */
  Tags?: {
    Key: string;
    Value: string;
  }[];
};
