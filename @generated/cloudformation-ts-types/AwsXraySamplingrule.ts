// This file is auto-generated. Do not edit manually.
// Source: aws-xray-samplingrule.json

/** This schema provides construct and validation rules for AWS-XRay SamplingRule resource parameters. */
export type AwsXraySamplingrule = {
  SamplingRule?: {
    /** Matches attributes derived from the request. */
    Attributes?: Record<string, string>;
    /**
     * The percentage of matching requests to instrument, after the reservoir is exhausted.
     * @minimum 0
     * @maximum 1
     */
    FixedRate: number;
    /**
     * Matches the hostname from a request URL.
     * @maxLength 64
     */
    Host: string;
    /**
     * Matches the HTTP method from a request URL.
     * @maxLength 10
     */
    HTTPMethod: string;
    /**
     * The priority of the sampling rule.
     * @minimum 1
     * @maximum 9999
     */
    Priority: number;
    /**
     * A fixed number of matching requests to instrument per second, prior to applying the fixed rate. The
     * reservoir is not used directly by services, but applies to all services using the rule
     * collectively.
     * @minimum 0
     */
    ReservoirSize: number;
    /**
     * Matches the ARN of the AWS resource on which the service runs.
     * @maxLength 500
     */
    ResourceARN: string;
    RuleARN?: string;
    RuleName?: string;
    /**
     * Matches the name that the service uses to identify itself in segments.
     * @maxLength 64
     */
    ServiceName: string;
    /**
     * Matches the origin that the service uses to identify its type in segments.
     * @maxLength 64
     */
    ServiceType: string;
    /**
     * Matches the path from a request URL.
     * @maxLength 128
     */
    URLPath: string;
    /**
     * The version of the sampling rule format (1)
     * @minimum 1
     */
    Version?: number;
  };
  SamplingRuleRecord?: {
    /** When the rule was created, in Unix time seconds. */
    CreatedAt?: string;
    /** When the rule was modified, in Unix time seconds. */
    ModifiedAt?: string;
    SamplingRule?: {
      /** Matches attributes derived from the request. */
      Attributes?: Record<string, string>;
      /**
       * The percentage of matching requests to instrument, after the reservoir is exhausted.
       * @minimum 0
       * @maximum 1
       */
      FixedRate: number;
      /**
       * Matches the hostname from a request URL.
       * @maxLength 64
       */
      Host: string;
      /**
       * Matches the HTTP method from a request URL.
       * @maxLength 10
       */
      HTTPMethod: string;
      /**
       * The priority of the sampling rule.
       * @minimum 1
       * @maximum 9999
       */
      Priority: number;
      /**
       * A fixed number of matching requests to instrument per second, prior to applying the fixed rate. The
       * reservoir is not used directly by services, but applies to all services using the rule
       * collectively.
       * @minimum 0
       */
      ReservoirSize: number;
      /**
       * Matches the ARN of the AWS resource on which the service runs.
       * @maxLength 500
       */
      ResourceARN: string;
      RuleARN?: string;
      RuleName?: string;
      /**
       * Matches the name that the service uses to identify itself in segments.
       * @maxLength 64
       */
      ServiceName: string;
      /**
       * Matches the origin that the service uses to identify its type in segments.
       * @maxLength 64
       */
      ServiceType: string;
      /**
       * Matches the path from a request URL.
       * @maxLength 128
       */
      URLPath: string;
      /**
       * The version of the sampling rule format (1)
       * @minimum 1
       */
      Version?: number;
    };
  };
  SamplingRuleUpdate?: {
    /** Matches attributes derived from the request. */
    Attributes?: Record<string, string>;
    /**
     * The percentage of matching requests to instrument, after the reservoir is exhausted.
     * @minimum 0
     * @maximum 1
     */
    FixedRate?: number;
    /**
     * Matches the hostname from a request URL.
     * @maxLength 64
     */
    Host?: string;
    /**
     * Matches the HTTP method from a request URL.
     * @maxLength 10
     */
    HTTPMethod?: string;
    /**
     * The priority of the sampling rule.
     * @minimum 1
     * @maximum 9999
     */
    Priority?: number;
    /**
     * A fixed number of matching requests to instrument per second, prior to applying the fixed rate. The
     * reservoir is not used directly by services, but applies to all services using the rule
     * collectively.
     * @minimum 0
     */
    ReservoirSize?: number;
    /**
     * Matches the ARN of the AWS resource on which the service runs.
     * @maxLength 500
     */
    ResourceARN?: string;
    RuleARN?: string;
    RuleName?: string;
    /**
     * Matches the name that the service uses to identify itself in segments.
     * @maxLength 64
     */
    ServiceName?: string;
    /**
     * Matches the origin that the service uses to identify its type in segments.
     * @maxLength 64
     */
    ServiceType?: string;
    /**
     * Matches the path from a request URL.
     * @maxLength 128
     */
    URLPath?: string;
  };
  RuleARN?: string;
  RuleName?: string;
  Tags?: {
    /** The key name of the tag. */
    Key: string;
    /** The value for the tag. */
    Value: string;
  }[];
};
