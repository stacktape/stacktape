// This file is auto-generated. Do not edit manually.
// Source: aws-ec2-verifiedaccessendpoint.json

/** The AWS::EC2::VerifiedAccessEndpoint resource creates an AWS EC2 Verified Access Endpoint. */
export type AwsEc2Verifiedaccessendpoint = {
  /** The ID of the AWS Verified Access endpoint. */
  VerifiedAccessEndpointId?: string;
  /** The ID of the AWS Verified Access group. */
  VerifiedAccessGroupId: string;
  /** The ID of the AWS Verified Access instance. */
  VerifiedAccessInstanceId?: string;
  /** The endpoint status. */
  Status?: string;
  /**
   * The IDs of the security groups for the endpoint.
   * @uniqueItems true
   */
  SecurityGroupIds?: string[];
  /** The options for network-interface type endpoint. */
  NetworkInterfaceOptions?: {
    /** The ID of the network interface. */
    NetworkInterfaceId?: string;
    /**
     * The IP port number.
     * @minimum 1
     * @maximum 65535
     */
    Port?: number;
    /**
     * The list of port ranges.
     * @uniqueItems true
     */
    PortRanges?: {
      /**
       * The first port in the range.
       * @minimum 1
       * @maximum 65535
       */
      FromPort?: number;
      /**
       * The last port in the range.
       * @minimum 1
       * @maximum 65535
       */
      ToPort?: number;
    }[];
    /** The IP protocol. */
    Protocol?: string;
  };
  /** The load balancer details if creating the AWS Verified Access endpoint as load-balancer type. */
  LoadBalancerOptions?: {
    /** The ARN of the load balancer. */
    LoadBalancerArn?: string;
    /**
     * The IP port number.
     * @minimum 1
     * @maximum 65535
     */
    Port?: number;
    /**
     * The list of port range.
     * @uniqueItems true
     */
    PortRanges?: {
      /**
       * The first port in the range.
       * @minimum 1
       * @maximum 65535
       */
      FromPort?: number;
      /**
       * The last port in the range.
       * @minimum 1
       * @maximum 65535
       */
      ToPort?: number;
    }[];
    /** The IP protocol. */
    Protocol?: string;
    /**
     * The IDs of the subnets.
     * @uniqueItems true
     */
    SubnetIds?: string[];
  };
  /** The options for rds type endpoint. */
  RdsOptions?: {
    /** The IP protocol. */
    Protocol?: string;
    /**
     * The IP port number.
     * @minimum 1
     * @maximum 65535
     */
    Port?: number;
    /** The ARN of the RDS DB instance. */
    RdsDbInstanceArn?: string;
    /** The ARN of the RDS DB cluster. */
    RdsDbClusterArn?: string;
    /** The ARN of the RDS DB proxy. */
    RdsDbProxyArn?: string;
    /** The RDS endpoint. */
    RdsEndpoint?: string;
    /**
     * The IDs of the subnets.
     * @uniqueItems true
     */
    SubnetIds?: string[];
  };
  /** The options for cidr type endpoint. */
  CidrOptions?: {
    /** The IP address range, in CIDR notation. */
    Cidr?: string;
    /**
     * The list of port range.
     * @uniqueItems true
     */
    PortRanges?: {
      /**
       * The first port in the range.
       * @minimum 1
       * @maximum 65535
       */
      FromPort?: number;
      /**
       * The last port in the range.
       * @minimum 1
       * @maximum 65535
       */
      ToPort?: number;
    }[];
    /** The IP protocol. */
    Protocol?: string;
    /**
     * The IDs of the subnets.
     * @uniqueItems true
     */
    SubnetIds?: string[];
  };
  /**
   * The type of AWS Verified Access endpoint. Incoming application requests will be sent to an IP
   * address, load balancer or a network interface depending on the endpoint type specified.The type of
   * AWS Verified Access endpoint. Incoming application requests will be sent to an IP address, load
   * balancer or a network interface depending on the endpoint type specified.
   */
  EndpointType: string;
  /** A DNS name that is generated for the endpoint. */
  EndpointDomain?: string;
  /** A custom identifier that gets prepended to a DNS name that is generated for the endpoint. */
  EndpointDomainPrefix?: string;
  /** Returned if endpoint has a device trust provider attached. */
  DeviceValidationDomain?: string;
  /** The ARN of a public TLS/SSL certificate imported into or created with ACM. */
  DomainCertificateArn?: string;
  /**
   * The type of attachment used to provide connectivity between the AWS Verified Access endpoint and
   * the application.
   */
  AttachmentType: string;
  /** The DNS name for users to reach your application. */
  ApplicationDomain?: string;
  /** The creation time. */
  CreationTime?: string;
  /** The last updated time. */
  LastUpdatedTime?: string;
  /** A description for the AWS Verified Access endpoint. */
  Description?: string;
  /** The AWS Verified Access policy document. */
  PolicyDocument?: string;
  /** The status of the Verified Access policy. */
  PolicyEnabled?: boolean;
  /**
   * An array of key-value pairs to apply to this resource.
   * @uniqueItems true
   */
  Tags?: {
    /**
     * The key name of the tag. You can specify a value that is 1 to 128 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
    /**
     * The value for the tag. You can specify a value that is 0 to 256 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 0
     * @maxLength 256
     */
    Value: string;
  }[];
  /** The configuration options for customer provided KMS encryption. */
  SseSpecification?: {
    /** KMS Key Arn used to encrypt the group policy */
    KmsKeyArn?: string;
    /** Whether to encrypt the policy with the provided key or disable encryption */
    CustomerManagedKeyEnabled?: boolean;
  };
};
