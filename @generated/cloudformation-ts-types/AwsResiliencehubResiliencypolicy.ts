// This file is auto-generated. Do not edit manually.
// Source: aws-resiliencehub-resiliencypolicy.json

/** Resource Type Definition for Resiliency Policy. */
export type AwsResiliencehubResiliencypolicy = {
  /**
   * Name of Resiliency Policy.
   * @pattern ^[A-Za-z0-9][A-Za-z0-9_\-]{1,59}$
   */
  PolicyName: string;
  /**
   * Description of Resiliency Policy.
   * @maxLength 500
   */
  PolicyDescription?: string;
  /**
   * Data Location Constraint of the Policy.
   * @enum ["AnyLocation","SameContinent","SameCountry"]
   */
  DataLocationConstraint?: "AnyLocation" | "SameContinent" | "SameCountry";
  /**
   * Resiliency Policy Tier.
   * @enum ["MissionCritical","Critical","Important","CoreServices","NonCritical"]
   */
  Tier: "MissionCritical" | "Critical" | "Important" | "CoreServices" | "NonCritical";
  Policy: {
    AZ: {
      /** RTO in seconds. */
      RtoInSecs: number;
      /** RPO in seconds. */
      RpoInSecs: number;
    };
    Hardware: {
      /** RTO in seconds. */
      RtoInSecs: number;
      /** RPO in seconds. */
      RpoInSecs: number;
    };
    Software: {
      /** RTO in seconds. */
      RtoInSecs: number;
      /** RPO in seconds. */
      RpoInSecs: number;
    };
    Region?: {
      /** RTO in seconds. */
      RtoInSecs: number;
      /** RPO in seconds. */
      RpoInSecs: number;
    };
  };
  /**
   * Amazon Resource Name (ARN) of the Resiliency Policy.
   * @pattern ^arn:(aws|aws-cn|aws-iso|aws-iso-[a-z]{1}|aws-us-gov):[A-Za-z0-9][A-Za-z0-9_/.-]{0,62}:([a-z]{2}-((iso[a-z]{0,1}-)|(gov-)){0,1}[a-z]+-[0-9]):[0-9]{12}:[A-Za-z0-9][A-Za-z0-9:_/+=,@.-]{0,1023}$
   */
  PolicyArn?: string;
  Tags?: Record<string, string>;
};
