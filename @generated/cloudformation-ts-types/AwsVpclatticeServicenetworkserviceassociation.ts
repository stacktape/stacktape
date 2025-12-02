// This file is auto-generated. Do not edit manually.
// Source: aws-vpclattice-servicenetworkserviceassociation.json

/** Associates a service with a service network. */
export type AwsVpclatticeServicenetworkserviceassociation = {
  /**
   * @minLength 20
   * @maxLength 2048
   * @pattern ^arn:[a-z0-9\-]+:vpc-lattice:[a-zA-Z0-9\-]+:\d{12}:servicenetworkserviceassociation/snsa-[0-9a-z]{17}$
   */
  Arn?: string;
  CreatedAt?: string;
  DnsEntry?: {
    DomainName?: string;
    HostedZoneId?: string;
  };
  /**
   * @minLength 17
   * @maxLength 2048
   * @pattern ^snsa-[0-9a-z]{17}$
   */
  Id?: string;
  /**
   * @minLength 20
   * @maxLength 2048
   * @pattern ^arn:[a-z0-9\-]+:vpc-lattice:[a-zA-Z0-9\-]+:\d{12}:servicenetwork/sn-[0-9a-z]{17}$
   */
  ServiceNetworkArn?: string;
  /**
   * @minLength 20
   * @maxLength 20
   * @pattern ^sn-[0-9a-z]{17}$
   */
  ServiceNetworkId?: string;
  /**
   * @minLength 20
   * @maxLength 2048
   * @pattern ^((sn-[0-9a-z]{17})|(arn:[a-z0-9\-]+:vpc-lattice:[a-zA-Z0-9\-]+:\d{12}:servicenetwork/sn-[0-9a-z]{17}))$
   */
  ServiceNetworkIdentifier?: string;
  /**
   * @minLength 3
   * @maxLength 63
   * @pattern ^(?!servicenetwork-)(?![-])(?!.*[-]$)(?!.*[-]{2})[a-z0-9-]+$
   */
  ServiceNetworkName?: string;
  /**
   * @minLength 20
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
   * @minLength 20
   * @maxLength 2048
   * @pattern ^((svc-[0-9a-z]{17})|(arn:[a-z0-9\-]+:vpc-lattice:[a-zA-Z0-9\-]+:\d{12}:service/svc-[0-9a-z]{17}))$
   */
  ServiceIdentifier?: string;
  /**
   * @minLength 3
   * @maxLength 40
   * @pattern ^(?!svc-)(?![-])(?!.*[-]$)(?!.*[-]{2})[a-z0-9-]+$
   */
  ServiceName?: string;
  /** @enum ["CREATE_IN_PROGRESS","ACTIVE","DELETE_IN_PROGRESS","CREATE_FAILED","DELETE_FAILED"] */
  Status?: "CREATE_IN_PROGRESS" | "ACTIVE" | "DELETE_IN_PROGRESS" | "CREATE_FAILED" | "DELETE_FAILED";
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
