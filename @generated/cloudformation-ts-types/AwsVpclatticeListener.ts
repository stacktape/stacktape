// This file is auto-generated. Do not edit manually.
// Source: aws-vpclattice-listener.json

/**
 * Creates a listener for a service. Before you start using your Amazon VPC Lattice service, you must
 * add one or more listeners. A listener is a process that checks for connection requests to your
 * services.
 */
export type AwsVpclatticeListener = {
  /**
   * @minLength 20
   * @maxLength 2048
   * @pattern ^arn(:[a-z0-9]+([.-][a-z0-9]+)*){2}(:([a-z0-9]+([.-][a-z0-9]+)*)?){2}:service/svc-[0-9a-z]{17}/listener/listener-[0-9a-z]{17}$
   */
  Arn?: string;
  DefaultAction: {
    Forward?: {
      /**
       * @minItems 1
       * @maxItems 10
       */
      TargetGroups: {
        /**
         * @minLength 20
         * @maxLength 2048
         * @pattern ^((tg-[0-9a-z]{17})|(arn:[a-z0-9\-]+:vpc-lattice:[a-zA-Z0-9\-]+:\d{12}:targetgroup/tg-[0-9a-z]{17}))$
         */
        TargetGroupIdentifier: string;
        /**
         * @minimum 0
         * @maximum 999
         */
        Weight?: number;
      }[];
    };
    FixedResponse?: {
      /**
       * @minimum 100
       * @maximum 599
       */
      StatusCode: number;
    };
  };
  /**
   * @minLength 26
   * @maxLength 26
   * @pattern ^listener-[0-9a-z]{17}$
   */
  Id?: string;
  /**
   * @minLength 3
   * @maxLength 63
   * @pattern ^(?!listener-)(?![-])(?!.*[-]$)(?!.*[-]{2})[a-z0-9-]+$
   */
  Name?: string;
  /**
   * @minimum 1
   * @maximum 65535
   */
  Port?: number;
  /** @enum ["HTTP","HTTPS","TLS_PASSTHROUGH"] */
  Protocol: "HTTP" | "HTTPS" | "TLS_PASSTHROUGH";
  /**
   * @minLength 21
   * @maxLength 2048
   * @pattern ^arn:[a-z0-9\-]+:vpc-lattice:[a-zA-Z0-9\-]+:\d{12}:service/svc-[0-9a-z]{17}$
   */
  ServiceArn?: string;
  /**
   * @minLength 21
   * @maxLength 21
   * @pattern ^svc-[0-9a-z]{17}$
   */
  ServiceId?: string;
  /**
   * @minLength 21
   * @maxLength 2048
   * @pattern ^((svc-[0-9a-z]{17})|(arn:[a-z0-9\-]+:vpc-lattice:[a-zA-Z0-9\-]+:\d{12}:service/svc-[0-9a-z]{17}))$
   */
  ServiceIdentifier?: string;
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
