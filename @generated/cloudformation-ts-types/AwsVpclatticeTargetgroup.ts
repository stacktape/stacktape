// This file is auto-generated. Do not edit manually.
// Source: aws-vpclattice-targetgroup.json

/**
 * A target group is a collection of targets, or compute resources, that run your application or
 * service. A target group can only be used by a single service.
 */
export type AwsVpclatticeTargetgroup = {
  /**
   * @minLength 20
   * @maxLength 2048
   * @pattern ^arn:[a-z0-9\-]+:vpc-lattice:[a-zA-Z0-9\-]+:\d{12}:targetgroup/tg-[0-9a-z]{17}$
   */
  Arn?: string;
  Config?: {
    /**
     * @minimum 1
     * @maximum 65535
     */
    Port?: number;
    /** @enum ["HTTP","HTTPS","TCP"] */
    Protocol?: "HTTP" | "HTTPS" | "TCP";
    /**
     * @default "HTTP1"
     * @enum ["HTTP1","HTTP2","GRPC"]
     */
    ProtocolVersion?: "HTTP1" | "HTTP2" | "GRPC";
    /**
     * @default "IPV4"
     * @enum ["IPV4","IPV6"]
     */
    IpAddressType?: "IPV4" | "IPV6";
    /** @enum ["V1","V2"] */
    LambdaEventStructureVersion?: "V1" | "V2";
    /**
     * @minLength 5
     * @maxLength 2048
     * @pattern ^vpc-(([0-9a-z]{8})|([0-9a-z]{17}))$
     */
    VpcIdentifier?: string;
    HealthCheck?: {
      Enabled?: boolean;
      /** @enum ["HTTP","HTTPS"] */
      Protocol?: "HTTP" | "HTTPS";
      /** @enum ["HTTP1","HTTP2"] */
      ProtocolVersion?: "HTTP1" | "HTTP2";
      /**
       * @minimum 1
       * @maximum 65535
       */
      Port?: number;
      /**
       * @minLength 0
       * @maxLength 2048
       * @pattern (^/[a-zA-Z0-9@:%_+.~#?&/=-]*$|(^$))
       */
      Path?: string;
      /**
       * @minimum 5
       * @maximum 300
       */
      HealthCheckIntervalSeconds?: number;
      /**
       * @minimum 1
       * @maximum 120
       */
      HealthCheckTimeoutSeconds?: number;
      /**
       * @minimum 2
       * @maximum 10
       */
      HealthyThresholdCount?: number;
      /**
       * @minimum 2
       * @maximum 10
       */
      UnhealthyThresholdCount?: number;
      Matcher?: {
        /**
         * @minLength 3
         * @maxLength 2000
         * @pattern ^[0-9-,]+$
         */
        HttpCode: string;
      };
    };
  };
  CreatedAt?: string;
  /**
   * @minLength 20
   * @maxLength 20
   * @pattern ^tg-[0-9a-z]{17}$
   */
  Id?: string;
  LastUpdatedAt?: string;
  /**
   * @minLength 3
   * @maxLength 128
   * @pattern ^(?!tg-)(?![-])(?!.*[-]$)(?!.*[-]{2})[a-z0-9-]+$
   */
  Name?: string;
  /** @enum ["CREATE_IN_PROGRESS","ACTIVE","DELETE_IN_PROGRESS","CREATE_FAILED","DELETE_FAILED"] */
  Status?: "CREATE_IN_PROGRESS" | "ACTIVE" | "DELETE_IN_PROGRESS" | "CREATE_FAILED" | "DELETE_FAILED";
  /** @enum ["IP","LAMBDA","INSTANCE","ALB"] */
  Type: "IP" | "LAMBDA" | "INSTANCE" | "ALB";
  /**
   * @default []
   * @minItems 0
   * @maxItems 100
   */
  Targets?: {
    Id: string;
    /**
     * @minimum 1
     * @maximum 65535
     */
    Port?: number;
  }[];
  /**
   * @minItems 0
   * @maxItems 50
   * @uniqueItems true
   */
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
